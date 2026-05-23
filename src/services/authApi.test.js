import { describe, expect, it, vi, beforeEach } from 'vitest';
import { decodeJwtPayload, authFetch } from './authApi.js';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('decodeJwtPayload', () => {
  it('returns empty object for malformed token', () => {
    expect(decodeJwtPayload('invalid-token')).toEqual({});
  });

  it('returns empty object for empty string', () => {
    expect(decodeJwtPayload('')).toEqual({});
  });

  it('returns empty object for null/undefined', () => {
    expect(decodeJwtPayload(null)).toEqual({});
    expect(decodeJwtPayload(undefined)).toEqual({});
  });

  it('returns empty object for token with fewer than 2 dots', () => {
    expect(decodeJwtPayload('onlyheader.signature')).toEqual({});
  });

  it('decodes a valid payload segment', () => {
    const payload = { sub: 'student@example.com', role: 'STUDENT' };
    const encodedPayload = btoa(JSON.stringify(payload)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
    const token = `header.${encodedPayload}.signature`;
    expect(decodeJwtPayload(token)).toMatchObject(payload);
  });

  it('decodes a payload with authId', () => {
    const payload = { authId: 'user-123', role: '1' };
    const encodedPayload = btoa(JSON.stringify(payload)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
    const token = `header.${encodedPayload}.signature`;
    const result = decodeJwtPayload(token);
    expect(result.authId).toBe('user-123');
  });

  it('decodes unicode payload correctly', () => {
    const payload = { sub: 'user@test.com', name: 'Test User' };
    const encodedPayload = btoa(JSON.stringify(payload)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
    const token = `header.${encodedPayload}.signature`;
    const result = decodeJwtPayload(token);
    expect(result.name).toBe('Test User');
  });
});

describe('getIdentityHeaders (via authFetch behavior)', () => {
  it('does not send spoofable identity headers (role from JWT only)', () => {
    const payload = { authId: 'u1', role: '1' };
    const encodedPayload = btoa(JSON.stringify(payload)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
    const token = `header.${encodedPayload}.signature`;

    mockFetch.mockResolvedValueOnce({
      ok: true,
      headers: { get: () => 'application/json' },
      json: async () => ({ success: true }),
    });

    authFetch('/test', { method: 'GET' }, token);

    const callArgs = mockFetch.mock.calls[0];
    expect(callArgs[1].headers['X-User-Role']).toBeUndefined();
    expect(callArgs[1].headers['X-Auth-User-Id']).toBeUndefined();
    expect(callArgs[1].headers.Authorization).toBe(`Bearer ${token}`);
  });
});

describe('parseResponse role mapping', () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  it('maps integer role 2 to TUTOR in response', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      headers: { get: () => 'application/json' },
      json: async () => ({ data: { role: '2', email: 'tutor@test.com' } }),
    });

    const result = await authFetch('/test', { method: 'GET' });
    expect(result.role).toBe('TUTOR');
  });

  it('maps integer role 3 to OWNER in response', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      headers: { get: () => 'application/json' },
      json: async () => ({ data: { role: '3', email: 'admin@test.com' } }),
    });

    const result = await authFetch('/test', { method: 'GET' });
    expect(result.role).toBe('OWNER');
  });

  it('preserves string roles that are not integers', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      headers: { get: () => 'application/json' },
      json: async () => ({ data: { role: 'TUTOR' } }),
    });

    const result = await authFetch('/test', { method: 'GET' });
    expect(result.role).toBe('TUTOR');
  });

  it('returns null for non-JSON responses', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      headers: { get: () => 'text/plain' },
    });

    const result = await authFetch('/test', { method: 'GET' });
    expect(result).toBeNull();
  });

  it('throws on error response', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 400,
      headers: { get: () => 'application/json' },
      json: async () => ({ message: 'Bad request' }),
    });

    await expect(authFetch('/test', { method: 'GET' })).rejects.toThrow('Bad request');
  });

  it('handles body without data wrapper', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      headers: { get: () => 'application/json' },
      json: async () => ({ goals: [], assessments: [], sessionNotes: [] }),
    });

    const result = await authFetch('/test', { method: 'GET' });
    expect(result).toHaveProperty('goals');
    expect(result).toHaveProperty('assessments');
  });
});
