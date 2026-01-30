CREATE TABLE IF NOT EXISTS public.releases (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  platform TEXT NOT NULL,
  arch TEXT,
  version TEXT NOT NULL,
  file_name TEXT NOT NULL,
  storage_bucket TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  file_size BIGINT,
  content_type TEXT,
  is_active BOOLEAN NOT NULL DEFAULT FALSE,
  release_notes TEXT,
  updated_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT releases_platform_check CHECK (platform IN ('android', 'ios', 'windows', 'macos', 'linux')),
  CONSTRAINT releases_arch_check CHECK (arch IS NULL OR arch IN ('intel', 'apple-silicon'))
);

CREATE INDEX IF NOT EXISTS releases_lookup_idx
  ON public.releases (platform, arch, is_active, created_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS releases_unique_idx
  ON public.releases (platform, COALESCE(arch, ''), version);
