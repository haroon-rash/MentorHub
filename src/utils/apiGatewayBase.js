/**
 * API gateway base URL for auth and routed APIs.
 * - Development: set in `.env.development` or use Vite proxy with empty string + relative `/api` paths.
 * - Docker: build with `http://localhost:8080` (browser calls gateway directly; CORS enabled on gateway).
 */
export function getApiGatewayBase() {
  const keys = ['VITE_USER_API_BASE_URL', 'VITE_AUTH_API_BASE_URL', 'VITE_CORE_API_BASE_URL'];
  for (const key of keys) {
    const raw = import.meta.env[key];
    if (raw == null || raw === '') continue;
    const trimmed = String(raw).trim();
    if (trimmed !== '') {
      return trimmed.replace(/\/$/, '');
    }
  }
  return 'http://localhost:8080';
}
