import { getApiGatewayBase } from './apiGatewayBase.js';

/**
 * Public HTTP base for API gateway (auth + core user routes share this in typical setups).
 */
export function apiBaseUrl() {
  return getApiGatewayBase();
}

/** Base URL for browser-loaded upload assets (profiles, documents). */
function uploadAssetBase() {
  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin.replace(/\/$/, '');
  }
  const gateway = getApiGatewayBase();
  return gateway || 'http://localhost:8080';
}

function normalizeUploadPath(url, folder = 'documents') {
  if (!url) return null;
  const trimmed = String(url).trim();
  if (!trimmed) return null;

  if (trimmed.startsWith('/uploads/')) return trimmed;
  if (trimmed.startsWith('uploads/')) return `/${trimmed}`;
  if (trimmed.startsWith('/')) return trimmed;
  return `/uploads/${folder}/${trimmed}`;
}

/**
 * Build an absolute URL for uploaded assets or relative API paths.
 * Rewrites legacy frontend-only hosts (3005/5173) to the current origin or gateway.
 */
export function resolvePublicAssetUrl(url, folder = 'documents') {
  if (!url) return null;
  const raw = String(url).trim();
  if (!raw) return null;
  if (raw.startsWith('data:')) return raw;

  const gateway = getApiGatewayBase() || 'http://localhost:8080';
  const base = uploadAssetBase();

  if (raw.startsWith('http://') || raw.startsWith('https://')) {
    try {
      const parsed = new URL(raw);
      if (parsed.pathname.startsWith('/uploads/')) {
        const wrongFrontendHost =
          parsed.hostname === 'localhost'
          && (parsed.port === '3005' || parsed.port === '5173' || parsed.port === '4173');
        if (wrongFrontendHost) {
          return `${base}${parsed.pathname}${parsed.search}`;
        }
        return `${gateway}${parsed.pathname}${parsed.search}`;
      }
    } catch {
      return raw;
    }
    return raw;
  }

  const path = normalizeUploadPath(raw, folder);
  if (!path) return null;
  return `${base}${path}`;
}
