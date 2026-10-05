const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:5000/api';

async function request(path, options = {}) {
  const token = localStorage.getItem('cs_token');
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

export const api = {
  register: (payload) => request('/auth/register', { method: 'POST', body: JSON.stringify(payload) }),
  login: (payload) => request('/auth/login', { method: 'POST', body: JSON.stringify(payload) }),

  getWorkspaces: (q = '') => request(`/workspaces${q ? `?q=${encodeURIComponent(q)}` : ''}`),
  getWorkspace: (id) => request(`/workspaces/${id}`),
  createWorkspace: (payload) => request('/workspaces', { method: 'POST', body: JSON.stringify(payload) }),
  updateWorkspace: (id, payload) => request(`/workspaces/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
  deleteWorkspace: (id) => request(`/workspaces/${id}`, { method: 'DELETE' }),
  restoreWorkspace: (id) => request(`/workspaces/${id}/restore`, { method: 'POST' }),

  getAnalytics: () => request('/analytics/summary'),
};
