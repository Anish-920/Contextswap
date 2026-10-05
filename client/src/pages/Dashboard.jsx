import React, { useEffect, useState, useCallback } from 'react';
import Navbar from '../components/Navbar.jsx';
import WorkspaceCard from '../components/WorkspaceCard.jsx';
import { api } from '../api/client.js';

export default function Dashboard() {
  const [workspaces, setWorkspaces] = useState([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async (q = '') => {
    setLoading(true);
    setError('');
    try {
      const data = await api.getWorkspaces(q);
      setWorkspaces(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const t = setTimeout(() => load(query), 300);
    return () => clearTimeout(t);
  }, [query, load]);

  const handleRestore = async (id) => {
    try {
      await api.restoreWorkspace(id);
      load(query);
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this workspace? This cannot be undone.')) return;
    try {
      await api.deleteWorkspace(id);
      load(query);
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="mx-auto max-w-5xl px-6 py-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Your Workspaces</h1>
            <p className="text-sm text-muted mt-1">
              Saved via the ContextSwap browser extension. Restoring reopens every tab exactly as it was.
            </p>
          </div>
        </div>

        <input
          type="text"
          placeholder="Search workspaces by name, tab title, or URL..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="mb-6 w-full rounded-xl border border-border bg-panel px-4 py-2.5 text-sm focus:border-accent focus:outline-none"
        />

        {loading && <p className="text-sm text-muted">Loading workspaces…</p>}
        {error && <p className="text-sm text-red-400">{error}</p>}

        {!loading && !error && workspaces.length === 0 && (
          <div className="rounded-2xl border border-dashed border-border p-12 text-center">
            <p className="text-sm text-muted">
              No workspaces yet. Open the ContextSwap extension, log in, and click "Save Tabs" to
              capture your first workspace.
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {workspaces.map((w) => (
            <WorkspaceCard key={w._id} workspace={w} onRestore={handleRestore} onDelete={handleDelete} />
          ))}
        </div>
      </main>
    </div>
  );
}
