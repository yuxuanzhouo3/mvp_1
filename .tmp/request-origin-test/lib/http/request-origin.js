"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getExternalRequestOrigin = getExternalRequestOrigin;
function getExternalRequestOrigin(request) {
    const configuredOrigin = getConfiguredAppOrigin();
    if (configuredOrigin)
        return configuredOrigin;
    const headers = request.headers;
    const forwardedProto = headers.get('x-forwarded-proto') ||
        headers.get('x-forwarded-protocol') ||
        headers.get('x-forwarded-scheme') ||
        headers.get('x-scheme');
    const forwardedHost = headers.get('x-forwarded-host') ||
        headers.get('x-original-host') ||
        headers.get('x-host');
    const protocol = forwardedProto ? forwardedProto.split(',')[0].trim() : undefined;
    const host = forwardedHost
        ? forwardedHost.split(',')[0].trim()
        : headers.get('host')?.split(',')[0].trim();
    if (protocol && host) {
        return `${protocol}://${host}`;
    }
    try {
        return new URL(request.url).origin;
    }
    catch {
        return '';
    }
}
function getConfiguredAppOrigin() {
    const raw = process.env.NEXT_PUBLIC_APP_URL?.trim() || process.env.APP_URL?.trim() || '';
    if (!raw)
        return null;
    const normalized = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
    try {
        return new URL(normalized).origin;
    }
    catch {
        return null;
    }
}
