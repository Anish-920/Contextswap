import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

const linkClass = ({ isActive }) =>
  `px-3 py-1.5 rounded-lg text-sm font-medium transition ${
    isActive ? 'bg-accent text-ink' : 'text-muted hover:text-white'
  }`;

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <nav className="flex items-center justify-between border-b border-border px-6 py-4">
      <div className="flex items-center gap-6">
        <span className="text-lg font-bold tracking-tight text-accent">ContextSwap</span>
        <div className="flex gap-1">
          <NavLink to="/" end className={linkClass}>Workspaces</NavLink>
          <NavLink to="/analytics" className={linkClass}>Analytics</NavLink>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-sm text-muted">{user?.name}</span>
        <button
          onClick={() => { logout(); navigate('/login'); }}
          className="rounded-lg border border-border px-3 py-1.5 text-sm text-muted hover:text-white hover:border-accent transition"
        >
          Log out
        </button>
      </div>
    </nav>
  );
}
