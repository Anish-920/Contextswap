// ContextSwap background service worker (Manifest V3)
// Handles tab capture, communication with the backend API, and workspace restore.

const DEFAULT_API_BASE = 'http://localhost:5000/api';

async function getApiBase() {
  const { apiBase } = await chrome.storage.local.get('apiBase');
  return apiBase || DEFAULT_API_BASE;
}

async function getToken() {
  const { token } = await chrome.storage.local.get('token');
  return token || null;
}

async function apiFetch(path, options = {}) {
  const apiBase = await getApiBase();
  const token = await getToken();

  const res = await fetch(`${apiBase}${path}`, {
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

// Captures all tabs in the current window (excluding chrome:// internal pages).
async function captureCurrentTabs() {
  const tabs = await chrome.tabs.query({ currentWindow: true });
  return tabs
    .filter((t) => t.url && !t.url.startsWith('chrome://') && !t.url.startsWith('chrome-extension://'))
    .map((t) => ({
      url: t.url,
      title: t.title || t.url,
      favIconUrl: t.favIconUrl || '',
      pinned: t.pinned,
    }));
}

// Saves the current window's tabs as a new, AI-classified workspace.
async function saveWorkspace(name) {
  const tabs = await captureCurrentTabs();
  if (tabs.length === 0) throw new Error('No capturable tabs open in this window');
  return apiFetch('/workspaces/capture', {
    method: 'POST',
    body: JSON.stringify({ tabs, name }),
  });
}

// Opens every tab belonging to a saved workspace in a new window, then logs the restore.
async function restoreWorkspace(workspaceId) {
  const workspace = await apiFetch(`/workspaces/${workspaceId}`);
  const urls = workspace.tabs.map((t) => t.url);
  if (urls.length === 0) throw new Error('Workspace has no tabs to restore');

  await chrome.windows.create({ url: urls });
  await apiFetch(`/workspaces/${workspaceId}/restore`, { method: 'POST' });
  return workspace;
}

async function listWorkspaces(query = '') {
  const qs = query ? `?q=${encodeURIComponent(query)}` : '';
  return apiFetch(`/workspaces${qs}`);
}

async function deleteWorkspace(id) {
  return apiFetch(`/workspaces/${id}`, { method: 'DELETE' });
}

// Message router — the popup UI talks to this service worker via chrome.runtime messages.
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  (async () => {
    try {
      switch (message.type) {
        case 'SAVE_WORKSPACE':
          sendResponse({ ok: true, data: await saveWorkspace(message.name) });
          break;
        case 'LIST_WORKSPACES':
          sendResponse({ ok: true, data: await listWorkspaces(message.query) });
          break;
        case 'RESTORE_WORKSPACE':
          sendResponse({ ok: true, data: await restoreWorkspace(message.id) });
          break;
        case 'DELETE_WORKSPACE':
          sendResponse({ ok: true, data: await deleteWorkspace(message.id) });
          break;
        case 'SET_AUTH': {
          await chrome.storage.local.set({ token: message.token, user: message.user });
          sendResponse({ ok: true });
          break;
        }
        case 'GET_AUTH': {
          const { token, user } = await chrome.storage.local.get(['token', 'user']);
          sendResponse({ ok: true, data: { token, user } });
          break;
        }
        case 'LOGOUT': {
          await chrome.storage.local.remove(['token', 'user']);
          sendResponse({ ok: true });
          break;
        }
        default:
          sendResponse({ ok: false, error: 'Unknown message type' });
      }
    } catch (err) {
      sendResponse({ ok: false, error: err.message });
    }
  })();
  return true; // keep the message channel open for the async response
});
