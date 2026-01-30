INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'releases',
  'releases',
  false,
  2147483648,
  ARRAY[
    'application/octet-stream',
    'application/zip',
    'application/vnd.android.package-archive',
    'application/x-msdownload',
    'application/x-msi',
    'application/x-apple-diskimage',
    'application/x-apple-ios-app',
    'application/vnd.debian.binary-package',
    'application/x-rpm'
  ]
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;
