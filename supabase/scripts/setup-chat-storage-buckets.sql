-- =========================================================
-- 聊天系统 Storage Buckets 设置脚本
-- 用于创建聊天所需的存储桶（图片、音频、视频）
-- =========================================================

-- 注意：此脚本需要在 Supabase Dashboard 的 SQL Editor 中执行
-- 或者通过 Supabase CLI 执行

-- 1. 创建 chat-images 存储桶（聊天图片）
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'chat-images',
  'chat-images',
  true,
  10485760, -- 10MB
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- 2. 创建 chat-audio 存储桶（聊天语音）
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'chat-audio',
  'chat-audio',
  true,
  10485760, -- 10MB
  ARRAY[
    -- 常见音频格式
    'audio/webm', 'audio/mp3', 'audio/mpeg', 'audio/ogg', 'audio/wav', 'audio/aac', 'audio/mp4',
    -- 扩展格式
    'audio/x-m4a', 'audio/m4a', 'audio/x-wav', 'audio/wave',
    'audio/flac', 'audio/x-flac', 'audio/opus', 'audio/vorbis',
    'audio/amr', 'audio/amr-wb', 'audio/3gpp', 'audio/3gpp2',
    'audio/x-aac', 'audio/aacp', 'audio/mp4a-latm', 'audio/x-caf', 'audio/basic',
    -- 视频容器（某些录音可能被识别为视频）
    'video/webm', 'video/mp4', 'video/3gpp'
  ]
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- 3. 创建 chat-videos 存储桶（聊天视频）
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'chat-videos',
  'chat-videos',
  true,
  52428800, -- 50MB
  ARRAY['video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- =========================================================
-- 设置 RLS 策略（Row Level Security）
-- =========================================================

-- chat-images 存储桶策略
-- 允许已认证用户上传图片
DROP POLICY IF EXISTS "Allow authenticated uploads to chat-images" ON storage.objects;
CREATE POLICY "Allow authenticated uploads to chat-images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'chat-images');

-- 允许公开访问图片
DROP POLICY IF EXISTS "Allow public read access to chat-images" ON storage.objects;
CREATE POLICY "Allow public read access to chat-images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'chat-images');

-- 允许用户删除自己上传的图片
DROP POLICY IF EXISTS "Allow users to delete own chat-images" ON storage.objects;
CREATE POLICY "Allow users to delete own chat-images"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'chat-images' AND auth.uid()::text = (storage.foldername(name))[1]);

-- chat-audio 存储桶策略
-- 允许已认证用户上传音频
DROP POLICY IF EXISTS "Allow authenticated uploads to chat-audio" ON storage.objects;
CREATE POLICY "Allow authenticated uploads to chat-audio"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'chat-audio');

-- 允许公开访问音频
DROP POLICY IF EXISTS "Allow public read access to chat-audio" ON storage.objects;
CREATE POLICY "Allow public read access to chat-audio"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'chat-audio');

-- 允许用户删除自己上传的音频
DROP POLICY IF EXISTS "Allow users to delete own chat-audio" ON storage.objects;
CREATE POLICY "Allow users to delete own chat-audio"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'chat-audio' AND auth.uid()::text = (storage.foldername(name))[1]);

-- chat-videos 存储桶策略
-- 允许已认证用户上传视频
DROP POLICY IF EXISTS "Allow authenticated uploads to chat-videos" ON storage.objects;
CREATE POLICY "Allow authenticated uploads to chat-videos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'chat-videos');

-- 允许公开访问视频
DROP POLICY IF EXISTS "Allow public read access to chat-videos" ON storage.objects;
CREATE POLICY "Allow public read access to chat-videos"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'chat-videos');

-- 允许用户删除自己上传的视频
DROP POLICY IF EXISTS "Allow users to delete own chat-videos" ON storage.objects;
CREATE POLICY "Allow users to delete own chat-videos"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'chat-videos' AND auth.uid()::text = (storage.foldername(name))[1]);

-- =========================================================
-- 完成
-- =========================================================

-- 验证存储桶是否创建成功
SELECT id, name, public, file_size_limit, allowed_mime_types
FROM storage.buckets
WHERE id IN ('chat-images', 'chat-audio', 'chat-videos');
