-- ========================================
-- Photo Review System Schema Migration
-- Human-in-the-loop photo moderation
-- ========================================

-- ========================================
-- EXTEND user_photos TABLE
-- ========================================

-- Add rejected_reason column
ALTER TABLE public.user_photos
ADD COLUMN IF NOT EXISTS rejected_reason TEXT;

-- Add reviewed_by column (references admin user)
ALTER TABLE public.user_photos
ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES public.users(id);

-- Add reviewed_at timestamp
ALTER TABLE public.user_photos
ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ;

-- Create index on audit_status for efficient filtering
CREATE INDEX IF NOT EXISTS idx_user_photos_audit_status
ON public.user_photos(audit_status);

-- Create index on reviewed_at for sorting
CREATE INDEX IF NOT EXISTS idx_user_photos_reviewed_at
ON public.user_photos(reviewed_at);

-- ========================================
-- AUDIT LOGS TABLE
-- ========================================

CREATE TABLE IF NOT EXISTS public.photo_audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  photo_id UUID REFERENCES public.user_photos(id) ON DELETE CASCADE,
  action VARCHAR(20) NOT NULL CHECK (action IN ('approved', 'rejected')),
  reason TEXT,
  reviewed_by UUID REFERENCES public.users(id),
  reviewed_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'
);

-- Create indexes for audit logs
CREATE INDEX IF NOT EXISTS idx_photo_audit_logs_photo_id
ON public.photo_audit_logs(photo_id);

CREATE INDEX IF NOT EXISTS idx_photo_audit_logs_reviewed_by
ON public.photo_audit_logs(reviewed_by);

CREATE INDEX IF NOT EXISTS idx_photo_audit_logs_reviewed_at
ON public.photo_audit_logs(reviewed_at);

-- Enable RLS on audit logs
ALTER TABLE public.photo_audit_logs ENABLE ROW LEVEL SECURITY;

-- ========================================
-- NOTIFICATIONS TABLE
-- ========================================

CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  action_url TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for notifications
CREATE INDEX IF NOT EXISTS idx_notifications_user_id
ON public.notifications(user_id);

CREATE INDEX IF NOT EXISTS idx_notifications_is_read
ON public.notifications(is_read);

CREATE INDEX IF NOT EXISTS idx_notifications_created_at
ON public.notifications(created_at);

-- Enable RLS on notifications
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Notifications policies
DROP POLICY IF EXISTS "Users can view own notifications" ON public.notifications;
CREATE POLICY "Users can view own notifications" ON public.notifications
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own notifications" ON public.notifications;
CREATE POLICY "Users can update own notifications" ON public.notifications
  FOR UPDATE USING (auth.uid() = user_id);

-- ========================================
-- ADMIN ROLES TABLE
-- ========================================

CREATE TABLE IF NOT EXISTS public.admin_roles (
  user_id UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  role VARCHAR(50) NOT NULL DEFAULT 'moderator' CHECK (role IN ('moderator', 'admin', 'super_admin')),
  permissions JSONB DEFAULT '{"can_review_photos": true}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on admin roles
ALTER TABLE public.admin_roles ENABLE ROW LEVEL SECURITY;

-- Admin roles policies
DROP POLICY IF EXISTS "Admins can view admin_roles" ON public.admin_roles;
CREATE POLICY "Admins can view admin_roles" ON public.admin_roles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.admin_roles ar
      WHERE ar.user_id = auth.uid()
    )
  );

-- ========================================
-- PHOTO AUDIT RLS POLICIES
-- ========================================

-- Photo audit logs policies - only admins can view
DROP POLICY IF EXISTS "Admins can view audit logs" ON public.photo_audit_logs;
CREATE POLICY "Admins can view audit logs" ON public.photo_audit_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.admin_roles ar
      WHERE ar.user_id = auth.uid()
    )
  );

-- Admins can insert audit logs
DROP POLICY IF EXISTS "Admins can insert audit logs" ON public.photo_audit_logs;
CREATE POLICY "Admins can insert audit logs" ON public.photo_audit_logs
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.admin_roles ar
      WHERE ar.user_id = auth.uid()
    )
  );

-- ========================================
-- ADMIN PHOTO REVIEW POLICIES
-- ========================================

-- Allow admins to update photo audit status
DROP POLICY IF EXISTS "Admins can update photo audit status" ON public.user_photos;
CREATE POLICY "Admins can update photo audit status" ON public.user_photos
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.admin_roles ar
      WHERE ar.user_id = auth.uid()
    )
  );

-- Allow admins to view all photos
DROP POLICY IF EXISTS "Admins can view all photos" ON public.user_photos;
CREATE POLICY "Admins can view all photos" ON public.user_photos
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.admin_roles ar
      WHERE ar.user_id = auth.uid()
    )
  );

-- ========================================
-- HELPER FUNCTIONS
-- ========================================

-- Function to check if user is admin
CREATE OR REPLACE FUNCTION public.is_admin(user_uuid UUID DEFAULT auth.uid())
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.admin_roles
    WHERE user_id = user_uuid
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get photo review statistics
CREATE OR REPLACE FUNCTION public.get_photo_review_stats()
RETURNS TABLE (
  total_pending BIGINT,
  total_approved BIGINT,
  total_rejected BIGINT,
  avg_review_time_hours NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*) FILTER (WHERE audit_status = 'pending') as total_pending,
    COUNT(*) FILTER (WHERE audit_status = 'approved') as total_approved,
    COUNT(*) FILTER (WHERE audit_status = 'rejected') as total_rejected,
    ROUND(
      AVG(
        EXTRACT(EPOCH FROM (reviewed_at - created_at)) / 3600
      ) FILTER (WHERE reviewed_at IS NOT NULL),
      2
    ) as avg_review_time_hours
  FROM public.user_photos;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================
-- TRIGGERS
-- ========================================

-- Function to auto-create notification on photo review
CREATE OR REPLACE FUNCTION public.notify_photo_review_result()
RETURNS TRIGGER AS $$
BEGIN
  -- Only trigger when audit_status changes from 'pending' to something else
  IF OLD.audit_status = 'pending' AND NEW.audit_status != 'pending' THEN
    INSERT INTO public.notifications (
      user_id,
      type,
      title,
      message,
      action_url,
      metadata
    ) VALUES (
      NEW.user_id,
      'photo_review',
      CASE
        WHEN NEW.audit_status = 'approved' THEN 'Photo Approved'
        ELSE 'Photo Review Update'
      END,
      CASE
        WHEN NEW.audit_status = 'approved' THEN 'Your photo has been approved and is now visible on your profile.'
        ELSE 'Your photo was not approved: ' || COALESCE(NEW.rejected_reason, 'Please upload a different photo.')
      END,
      '/dashboard/profile',
      jsonb_build_object(
        'photo_id', NEW.id,
        'status', NEW.audit_status
      )
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for photo review notification
DROP TRIGGER IF EXISTS on_photo_review_result ON public.user_photos;
CREATE TRIGGER on_photo_review_result
  AFTER UPDATE OF audit_status ON public.user_photos
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_photo_review_result();
