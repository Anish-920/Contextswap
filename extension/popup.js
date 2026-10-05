const DEFAULT_API_BASE = 'http://localhost:5000/api';

const el = (id) => document.getElementById(id);

function sendMessage(msg) {
  return new Promise((resolve) => chrome.runtime.sendMessage(msg, resolve));
}

function show(view) {
  ['loginView', 'registerView', 'mainView'].forEach((id) => el(id).classList.add('hidden'));
  el(view).classList.remove('hidden');
  el('logoutBtn').classList.toggle('hidden', view !== 'mainView');
}

async function apiFetch(path, options = {}) {
  const res = await fetch(`${DEFAULT_API_BASE}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

function timeAgo(dateStr) {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const mins = Math.round(diffMs / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.round(hrs / 24)}d ago`;
}

function renderWorkspaces(workspaces) {
  const list = el('workspaceList');
  list.innerHTML = '';

  if (!workspaces.length) {
    list.innerHTML = '<li class="empty">No workspaces yet — save your current tabs above.</li>';
    return;
  }

  workspaces.forEach((w) => {
    const li = document.createElement('li');
    li.className = 'workspaceItem';
    li.innerHTML = `
      <div class="name">${escapeHtml(w.name)}</div>
      <div class="meta">${w.tabs.length} tabs · ${timeAgo(w.updatedAt)} · restored ${w.restoreCount || 0}x</div>
      <div class="actions">
        <button class="btnRestore" data-id="${w._id}">Restore</button>
        <button class="btnDelete" data-id="${w._id}">Delete</button>
      </div>
    `;
    list.appendChild(li);
  });

  list.querySelectorAll('.btnRestore').forEach((btn) =>
    btn.addEventListener('click', async () => {
      btn.textContent = 'Restoring...';
      const res = await sendMessage({ type: 'RESTORE_WORKSPACE', id: btn.dataset.id });
      btn.textContent = 'Restore';
      if (!res.ok) alert(res.error);
    })
  );

  list.querySelectorAll('.btnDelete').forEach((btn) =>
    btn.addEventListener('click', async () => {
      if (!confirm('Delete this workspace?')) return;
      const res = await sendMessage({ type: 'DELETE_WORKSPACE', id: btn.dataset.id });
      if (res.ok) loadWorkspaces();
      else alert(res.error);
    })
  );
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

async function loadWorkspaces(query = '') {
  const res = await sendMessage({ type: 'LIST_WORKSPACES', query });
  if (res.ok) renderWorkspaces(res.data);
}

async function init() {
  const auth = await sendMessage({ type: 'GET_AUTH' });
  if (auth.ok && auth.data.token) {
    show('mainView');
    loadWorkspaces();
  } else {
    show('loginView');
  }
}

// --- Auth wiring ---
el('showRegister').addEventListener('click', (e) => { e.preventDefault(); show('registerView'); });
el('showLogin').addEventListener('click', (e) => { e.preventDefault(); show('loginView'); });

el('loginBtn').addEventListener('click', async () => {
  el('loginError').textContent = '';
  try {
    const data = await apiFetch('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: el('loginEmail').value, password: el('loginPassword').value }),
    });
    await sendMessage({ type: 'SET_AUTH', token: data.token, user: data.user });
    show('mainView');
    loadWorkspaces();
  } catch (err) {
    el('loginError').textContent = err.message;
  }
});

el('registerBtn').addEventListener('click', async () => {
  el('registerError').textContent = '';
  try {
    const data = await apiFetch('/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        name: el('regName').value,
        email: el('regEmail').value,
        password: el('regPassword').value,
      }),
    });
    await sendMessage({ type: 'SET_AUTH', token: data.token, user: data.user });
    show('mainView');
    loadWorkspaces();
  } catch (err) {
    el('registerError').textContent = err.message;
  }
});

el('logoutBtn').addEventListener('click', async () => {
  await sendMessage({ type: 'LOGOUT' });
  show('loginView');
});

// --- Workspace actions ---
el('saveBtn').addEventListener('click', async () => {
  const statusEl = el('saveStatus');
  statusEl.textContent = 'Capturing & classifying tabs...';
  const res = await sendMessage({ type: 'SAVE_WORKSPACE', name: el('workspaceName').value.trim() });
  if (res.ok) {
    statusEl.textContent = `Saved "${res.data.name}" (${res.data.tabs.length} tabs)`;
    el('workspaceName').value = '';
    loadWorkspaces();
  } else {
    statusEl.textContent = '';
    alert(res.error);
  }
});

let searchTimer;
el('searchInput').addEventListener('input', (e) => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => loadWorkspaces(e.target.value.trim()), 250);
});

init();
