import axios from 'axios';

export interface SupabaseUser {
  id: string;
  email?: string;
}

export interface DeploymentRow {
  id: string;
  user_id: string;
  url: string | null;
  status: string;
  created_at: string;
}

interface SupabaseConfig {
  url: string;
  anonKey: string;
  serviceRoleKey: string;
}

function getSupabaseAuthConfig(): Pick<SupabaseConfig, 'url' | 'anonKey'> {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
  const anonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';

  if (!url || !anonKey) {
    throw new Error('Missing Supabase auth config. Required: SUPABASE_URL and SUPABASE_ANON_KEY');
  }

  return { url, anonKey };
}

function getSupabaseDbConfig(): Pick<SupabaseConfig, 'url' | 'serviceRoleKey'> {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

  if (!url || !serviceRoleKey) {
    throw new Error('Missing Supabase database config. Required: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  }

  return { url, serviceRoleKey };
}

export async function verifySupabaseJwt(token: string): Promise<SupabaseUser> {
  const { url, anonKey } = getSupabaseAuthConfig();

  const response = await axios.get(`${url}/auth/v1/user`, {
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${token}`
    }
  });

  return response.data as SupabaseUser;
}

export async function saveDeploymentRecord(input: {
  userId: string;
  url?: string;
  status: 'success' | 'failed';
}): Promise<DeploymentRow> {
  const { url, serviceRoleKey } = getSupabaseDbConfig();

  const response = await axios.post(
    `${url}/rest/v1/deployments`,
    {
      user_id: input.userId,
      url: input.url || null,
      status: input.status
    },
    {
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
        Prefer: 'return=representation',
        'Content-Type': 'application/json'
      }
    }
  );

  const rows = response.data as DeploymentRow[];
  if (!Array.isArray(rows) || rows.length === 0) {
    throw new Error('Supabase did not return a saved deployment row.');
  }

  return rows[0];
}

export async function getDeploymentsForUser(userId: string): Promise<DeploymentRow[]> {
  const { url, serviceRoleKey } = getSupabaseDbConfig();
  const response = await axios.get(
    `${url}/rest/v1/deployments?select=id,user_id,url,status,created_at&user_id=eq.${encodeURIComponent(userId)}&order=created_at.desc`,
    {
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`
      }
    }
  );

  return response.data as DeploymentRow[];
}
