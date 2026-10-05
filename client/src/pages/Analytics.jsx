import React, { useEffect, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
import Navbar from '../components/Navbar.jsx';
import { api } from '../api/client.js';

const COLORS = ['#7c9cff', '#57c785', '#ffb454', '#ff6b6b', '#c792ea', '#4fd1e8', '#f78fb3', '#a3e635'];

function StatCard({ label, value }) {
  return (
    <div className="rounded-2xl border border-border bg-panel p-5">
      <p className="text-xs text-muted">{label}</p>
      <p className="mt-1 text-2xl font-bold">{value}</p>
    </div>
  );
}

export default function Analytics() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.getAnalytics().then(setData).catch((err) => setError(err.message));
  }, []);

  if (error) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <main className="mx-auto max-w-5xl px-6 py-8">
          <p className="text-sm text-red-400">{error}</p>
        </main>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <main className="mx-auto max-w-5xl px-6 py-8">
          <p className="text-sm text-muted">Loading analytics…</p>
        </main>
      </div>
    );
  }

  const categoryData = Object.entries(data.categoryCounts).map(([name, value]) => ({ name, value }));
  const topWorkspacesData = data.topWorkspaces.map((w) => ({ name: w.name, restores: w.restoreCount }));

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="mx-auto max-w-5xl px-6 py-8">
        <h1 className="mb-6 text-2xl font-bold">Productivity Analytics</h1>

        <div className="mb-8 grid grid-cols-2 gap-4 md:grid-cols-4">
          <StatCard label="Workspaces" value={data.totalWorkspaces} />
          <StatCard label="Tabs Tracked" value={data.totalTabs} />
          <StatCard label="Total Restores" value={data.totalRestores} />
          <StatCard label="Avg Tabs / Workspace" value={data.avgTabsPerWorkspace} />
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border border-border bg-panel p-5">
            <h2 className="mb-4 text-sm font-semibold text-muted">Tabs by Category</h2>
            {categoryData.length === 0 ? (
              <p className="text-sm text-muted">No data yet.</p>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie data={categoryData} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90} paddingAngle={2}>
                    {categoryData.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Legend wrapperStyle={{ fontSize: 11, color: '#8a90a0' }} />
                  <Tooltip contentStyle={{ background: '#161922', border: '1px solid #262b36', fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="rounded-2xl border border-border bg-panel p-5">
            <h2 className="mb-4 text-sm font-semibold text-muted">Most-Restored Workspaces</h2>
            {topWorkspacesData.length === 0 ? (
              <p className="text-sm text-muted">No data yet.</p>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={topWorkspacesData} layout="vertical" margin={{ left: 20 }}>
                  <XAxis type="number" tick={{ fontSize: 11, fill: '#8a90a0' }} allowDecimals={false} />
                  <YAxis dataKey="name" type="category" width={120} tick={{ fontSize: 11, fill: '#8a90a0' }} />
                  <Tooltip contentStyle={{ background: '#161922', border: '1px solid #262b36', fontSize: 12 }} />
                  <Bar dataKey="restores" fill="#7c9cff" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="mt-6 rounded-2xl border border-border bg-panel p-5">
          <h2 className="mb-4 text-sm font-semibold text-muted">Recent Activity</h2>
          {data.recentActivity.length === 0 ? (
            <p className="text-sm text-muted">No recent activity.</p>
          ) : (
            <ul className="divide-y divide-border">
              {data.recentActivity.map((w) => (
                <li key={w.id} className="flex items-center justify-between py-2.5 text-sm">
                  <span>{w.name}</span>
                  <span className="text-xs text-muted">
                    {w.tabCount} tabs · {new Date(w.updatedAt).toLocaleString()}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </main>
    </div>
  );
}
