/**
 * Centralized API fetch helper that attaches cookies and Authorization headers automatically.
 */
export async function apiFetch(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
  const token = typeof window !== 'undefined' ? sessionStorage.getItem('mockinterview_auth_token') : null;

  const headers = new Headers(init.headers || {});
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  if (!headers.has('Content-Type') && init.body && typeof init.body === 'string') {
    headers.set('Content-Type', 'application/json');
  }

  const enhancedInit: RequestInit = {
    ...init,
    credentials: init.credentials || 'include',
    headers,
  };

  const response = await fetch(input, enhancedInit);

  // If response is 401 and not on auth endpoints, session may have expired
  if (response.status === 401 && typeof window !== 'undefined') {
    const urlStr = input.toString();
    if (!urlStr.includes('/auth/login') && !urlStr.includes('/auth/signup')) {
      window.dispatchEvent(new CustomEvent('auth:expired'));
    }
  }

  return response;
}
