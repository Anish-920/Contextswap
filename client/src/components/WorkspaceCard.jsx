import React, { useState } from 'react';

const CATEGORY_COLORS = {
  Development: 'bg-blue-500/20 text-blue-300',
  'Research & Docs': 'bg-purple-500/20 text-purple-300',
  'Social Media': 'bg-pink-500/20 text-pink-300',
  'Video & Streaming': 'bg-red-500/20 text-red-300',
  Shopping: 'bg-amber-500/20 text-amber-300',
  'Email & Communication': 'bg-cyan-500/20 text-cyan-300',
  Productivity: 'bg-emerald-500/20 text-emerald-300',
  News: 'bg-orange-500/20 text-orange-300',
};

function categoryClass(cat) {
  return CATEGORY_COLORS[cat] || 'bg-white/10 text-muted';
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

export default function WorkspaceCard({ workspace, onRestore, onDelete }) {
  const [expanded, setExpanded] = useState(false);
  const [busy, setBusy] = useState(false);

  const handleRestore = async () => {
    setBusy(true);
    try {
      await onRestore(workspace._id);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-2xl border border-border bg-panel p-5 flex flex-col gap-3">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-base font-semibold">{workspace.name}</h3>
          <p className="text-xs text-muted mt-0.5">
            {workspace.tabs.length} tabs · updated {timeAgo(workspace.updatedAt)} · restored {workspace.restoreCount || 0}×
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleRestore}
            disabled={busy}
            className="rounded-lg bg-accent px-3 py-1.5 text-xs font-semibold text-ink disabled:opacity-50"
          >
            {busy ? 'Opening…' : 'Restore'}
          </button>
          <button
            onClick={() => onDelete(workspace._id)}
            className="rounded-lg border border-border px-3 py-1.5 text-xs text-red-300 hover:border-red-400"
          >
            Delete
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {workspace.categories.map((c) => (
          <span key={c} className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${categoryClass(c)}`}>
            {c}
          </span>
        ))}
      </div>

      <button
        onClick={() => setExpanded((v) => !v)}
        className="self-start text-xs text-accent hover:underline"
      >
        {expanded ? 'Hide tabs' : `Show ${workspace.tabs.length} tabs`}
      </button>

      {expanded && (
        <ul className="mt-1 flex flex-col gap-1.5 border-t border-border pt-3">
          {workspace.tabs.map((t, i) => (
            <li key={i} className="flex items-center gap-2 text-xs">
              {t.favIconUrl ? (
                <img src={t.favIconUrl} alt="" className="h-3.5 w-3.5 rounded-sm" />
              ) : (
                <span className="h-3.5 w-3.5 rounded-sm bg-white/10" />
              )}
              <a
                href={t.url}
                target="_blank"
                rel="noreferrer"
                className="truncate text-white/90 hover:text-accent"
                title={t.url}
              >
                {t.title}
              </a>
              <span className={`ml-auto shrink-0 rounded-full px-2 py-0.5 text-[10px] ${categoryClass(t.category)}`}>
                {t.category}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
