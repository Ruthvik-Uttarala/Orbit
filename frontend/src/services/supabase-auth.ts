export interface SupabaseUser {
  id: string;
  email?: string;
}

export interface SupabaseSession {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  expires_at: number;
  token_type?: string;
  user: SupabaseUser;
}

interface SupabaseAuthResponse {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  token_type?: string;
  user?: SupabaseUser;
  error?: string;
  error_description?: string;
}

const SESSION_KEY = 'orbit.supabase.session';

function getSupabaseConfig() {
  const url = import.meta.env.VITE_SUPABASE_URL;
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error('Missing Supabase configuration. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
  }

  return { url, anonKey };
}

async function requestAuth<T>(path: string, init: RequestInit = {}): Promise<T> {
  const { url, anonKey } = getSupabaseConfig();
  const response = await fetch(`${url}${path}`, {
    ...init,
    headers: {
      apikey: anonKey,
      'Content-Type': 'application/json',
      ...(init.headers || {})
    }
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = data?.msg || data?.error_description || data?.error || 'Supabase auth request failed';
    throw new Error(message);
  }

  return data as T;
}

function normalizeSession(data: SupabaseAuthResponse): SupabaseSession {
  if (!data.access_token || !data.refresh_token || !data.expires_in || !data.user) {
    throw new Error('Invalid auth session response from Supabase.');
  }

  return {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_in: data.expires_in,
    expires_at: Math.floor(Date.now() / 1000) + data.expires_in,
    token_type: data.token_type,
    user: data.user
  };
}

function isExpiring(session: SupabaseSession): boolean {
  const now = Math.floor(Date.now() / 1000);
  return session.expires_at - now < 60;
}

export function saveSession(session: SupabaseSession): void {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function clearSession(): void {
  localStorage.removeItem(SESSION_KEY);
}

export function getStoredSession(): SupabaseSession | null {
  const raw = localStorage.getItem(SESSION_KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as SupabaseSession;
  } catch {
    clearSession();
    return null;
  }
}

export async function signUp(email: string, password: string): Promise<{ session?: SupabaseSession; user?: SupabaseUser }> {
  const response = await requestAuth<{ session?: SupabaseAuthResponse; user?: SupabaseUser }>('/auth/v1/signup', {
    method: 'POST',
    body: JSON.stringify({ email, password })
  });

  const session = response.session ? normalizeSession(response.session) : undefined;
  if (session) {
    saveSession(session);
  }

  return {
    session,
    user: response.user
  };
}

export async function signIn(email: string, password: string): Promise<SupabaseSession> {
  const response = await requestAuth<SupabaseAuthResponse>('/auth/v1/token?grant_type=password', {
    method: 'POST',
    body: JSON.stringify({ email, password })
  });

  const session = normalizeSession(response);
  saveSession(session);
  return session;
}

export async function refreshSession(refreshToken: string): Promise<SupabaseSession> {
  const response = await requestAuth<SupabaseAuthResponse>('/auth/v1/token?grant_type=refresh_token', {
    method: 'POST',
    body: JSON.stringify({ refresh_token: refreshToken })
  });

  const session = normalizeSession(response);
  saveSession(session);
  return session;
}

export async function getUser(accessToken: string): Promise<SupabaseUser> {
  return requestAuth<SupabaseUser>('/auth/v1/user', {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`
    }
  });
}

export async function signOut(accessToken: string): Promise<void> {
  try {
    await requestAuth('/auth/v1/logout', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    });
  } finally {
    clearSession();
  }
}

export async function restoreSession(): Promise<SupabaseSession | null> {
  const stored = getStoredSession();
  if (!stored) {
    return null;
  }

  try {
    if (isExpiring(stored)) {
      return await refreshSession(stored.refresh_token);
    }

    await getUser(stored.access_token);
    return stored;
  } catch {
    clearSession();
    return null;
  }
}
