import { getApiGatewayBase } from '../utils/apiGatewayBase.js';
import { getIdentityHeaders } from './authApi.js';

const USER_API_BASE_URL = getApiGatewayBase();

async function recFetch(path, { method = 'GET', body, token } = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...getIdentityHeaders(token),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  const response = await fetch(`${USER_API_BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    let message = 'Recommendation request failed';
    try {
      const data = await response.json();
      message = data?.detail || data?.message || message;
    } catch {
      // ignore
    }
    throw new Error(message);
  }

  return response.json();
}

export async function fetchPersonalizedFeed(token) {
  return recFetch('/api/v1/recommendations/feed', { token });
}

export async function trackTutorInteraction({ token, tutorProfileId, interactionType, query, subject }) {
  const body = {
    interaction_type: interactionType,
    query: query || undefined,
    subject: subject || undefined,
  };
  if (tutorProfileId) {
    body.tutor_profile_id = tutorProfileId;
  }
  return recFetch('/api/v1/recommendations/interactions', {
    method: 'POST',
    token,
    body,
  });
}

export async function fetchSimilarTutors(tutorProfileId, token) {
  const res = await recFetch(`/api/v1/recommendations/tutors/${tutorProfileId}/similar`, { token });
  return res?.data || [];
}
