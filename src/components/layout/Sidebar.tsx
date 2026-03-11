// Copyright (c) 2026 Justin Glaser. All rights reserved.
// Use of this source code is governed by a license that can be
// found in the LICENSE file in the root of this repository.

import { NavLink } from 'react-router-dom';
import {
  Upload,
  GitBranch,
  BarChart3,
  FlaskConical,
  LayoutDashboard,
  BrainCircuit,
  Download,
  ChevronLeft,
  ChevronRight,
  Database,
  Command,
  Sun,
  Moon,
} from 'lucide-react';
import { useUIStore } from '../../stores';

const navItems = [
  { to: '/', icon: Upload, label: 'Upload' },
  { to: '/pipeline', icon: GitBranch, label: 'Pipeline' },
  { to: '/analytics', icon: FlaskConical, label: 'Analytics' },
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/ai-insights', icon: BrainCircuit, label: 'AI Insights' },
  { to: '/export', icon: Download, label: 'Export' },
];

export function Sidebar() {
  const collapsed = useUIStore((s) => s.sidebarCollapsed);
  const toggle = useUIStore((s) => s.toggleSidebar);
  const theme = useUIStore((s) => s.theme);
  const toggleTheme = useUIStore((s) => s.toggleTheme);

  return (
    <aside
      className={`
        fixed top-0 left-0 z-40 h-screen flex flex-col
        bg-surface-900/80 backdrop-blur-xl border-r border-surface-700/50
        transition-all duration-300 ease-in-out
        ${collapsed ? 'w-[68px]' : 'w-[240px]'}
      `}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 h-16 border-b border-surface-700/50">
        <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-gradient-to-br from-primary-500 to-accent-500 shrink-0">
          <Database className="w-5 h-5 text-white" />
        </div>
        {!collapsed && (
          <div className="overflow-hidden animate-fade-in">
            <h1 className="text-sm font-bold text-surface-50 tracking-tight leading-tight">
              Comprehensive
            </h1>
            <p className="text-xs text-primary-400 font-medium leading-tight">
              Data Analyzer
            </p>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 px-2 space-y-1">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150
              ${
                isActive
                  ? 'bg-primary-600/20 text-primary-300 shadow-sm shadow-primary-500/10'
                  : 'text-surface-400 hover:text-surface-200 hover:bg-surface-800/60'
              }
              ${collapsed ? 'justify-center' : ''}
              `
            }
            title={collapsed ? label : undefined}
          >
            <Icon className="w-5 h-5 shrink-0" />
            {!collapsed && <span className="animate-fade-in">{label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* Stats preview */}
      {!collapsed && (
        <div className="px-4 py-3 mx-2 mb-3 rounded-lg bg-surface-800/50 border border-surface-700/40 animate-fade-in space-y-2">
          <div className="flex items-center gap-2 text-xs text-surface-400">
            <BarChart3 className="w-3.5 h-3.5" />
            <span>All processing runs locally</span>
          </div>
          <div className="flex items-center gap-2 text-[10px] text-surface-500">
            <Command className="w-3 h-3" />
            <span><kbd className="font-mono">⌘K</kbd> Quick navigation</span>
          </div>
        </div>
      )}

      {/* Theme toggle */}
      <button
        onClick={toggleTheme}
        className={`flex items-center gap-3 mx-2 mb-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-all
          text-surface-400 hover:text-surface-200 hover:bg-surface-800/60
          ${collapsed ? 'justify-center' : ''}
        `}
        title={collapsed ? (theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode') : undefined}
      >
        {theme === 'dark' ? <Sun className="w-5 h-5 shrink-0" /> : <Moon className="w-5 h-5 shrink-0" />}
        {!collapsed && (
          <span className="animate-fade-in">{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
        )}
      </button>

      {/* Collapse toggle */}
      <button
        onClick={toggle}
        className="flex items-center justify-center h-12 border-t border-surface-700/50 text-surface-500 hover:text-surface-300 hover:bg-surface-800/40 transition-colors"
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
      </button>
    </aside>
  );
}
