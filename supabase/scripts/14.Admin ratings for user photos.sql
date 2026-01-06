-- Add admin rating columns to user_photos
ALTER TABLE public.user_photos
ADD COLUMN IF NOT EXISTS admin_rating INTEGER CHECK (admin_rating >= 1 AND admin_rating <= 100);

ALTER TABLE public.user_photos
ADD COLUMN IF NOT EXISTS rated_by UUID REFERENCES public.users(id);

ALTER TABLE public.user_photos
ADD COLUMN IF NOT EXISTS rated_at TIMESTAMPTZ;
