export type RequestDeploymentRegion = 'CN' | 'INTL';

export function inferRegionFromHost(host: string): RequestDeploymentRegion | null {
  const normalized = (host || '').toLowerCase();
  if (!normalized) return null;
  if (normalized.includes('mornscience.top')) return 'CN';
  if (normalized.includes('mornhub.lat')) return 'INTL';
  return null;
}

export function getDeploymentRegionFromRequest(request: Request): RequestDeploymentRegion {
  const headerRegion = request.headers.get('x-deployment-region')?.toUpperCase() || '';
  if (headerRegion === 'CN' || headerRegion === 'INTL') return headerRegion as RequestDeploymentRegion;

  const hostHeader =
    request.headers.get('x-forwarded-host') ||
    request.headers.get('x-original-host') ||
    request.headers.get('host') ||
    '';
  const inferred = inferRegionFromHost(hostHeader);
  if (inferred) return inferred;

  const envRegion = process.env.NEXT_PUBLIC_DEPLOYMENT_REGION;
  if (envRegion === 'CN' || envRegion === 'INTL') return envRegion;

  return 'INTL';
}

export function isChinaRequest(request: Request): boolean {
  return getDeploymentRegionFromRequest(request) === 'CN';
}

