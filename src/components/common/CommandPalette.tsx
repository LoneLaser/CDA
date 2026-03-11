import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Upload,
  GitBranch,
  FlaskConical,
  LayoutDashboard,
  BrainCircuit,
  Download,
  Search,
  Command,
} from 'lucide-react';

interface CommandItem {
  id: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  action: () => void;
  keywords: string[];
}

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const location = useLocation();

  const commands: CommandItem[] = [
    {
      id: 'upload',
      label: 'Upload',
      description: 'Upload and ingest datasets',
      icon: <Upload className="w-4 h-4" />,
      action: () => navigate('/'),
      keywords: ['upload', 'import', 'ingest', 'file', 'csv', 'json'],
    },
    {
      id: 'pipeline',
      label: 'Pipeline',
      description: 'Medallion architecture processing',
      icon: <GitBranch className="w-4 h-4" />,
      action: () => navigate('/pipeline'),
      keywords: ['pipeline', 'process', 'bronze', 'silver', 'gold', 'clean'],
    },
    {
      id: 'analytics',
      label: 'Analytics',
      description: 'Statistical analysis and correlations',
      icon: <FlaskConical className="w-4 h-4" />,
      action: () => navigate('/analytics'),
      keywords: ['analytics', 'statistics', 'correlation', 'descriptive', 'distribution'],
    },
    {
      id: 'dashboard',
      label: 'Dashboard',
      description: 'Build interactive visualizations',
      icon: <LayoutDashboard className="w-4 h-4" />,
      action: () => navigate('/dashboard'),
      keywords: ['dashboard', 'chart', 'visualization', 'graph', 'bar', 'pie'],
    },
    {
      id: 'ai-insights',
      label: 'AI Insights',
      description: 'LLM-powered data analysis',
      icon: <BrainCircuit className="w-4 h-4" />,
      action: () => navigate('/ai-insights'),
      keywords: ['ai', 'insights', 'llm', 'gpt', 'claude', 'analysis', 'summary'],
    },
    {
      id: 'export',
      label: 'Export',
      description: 'Download data and reports',
      icon: <Download className="w-4 h-4" />,
      action: () => navigate('/export'),
      keywords: ['export', 'download', 'csv', 'json', 'report', 'save'],
    },
  ];

  const filtered = query.trim()
    ? commands.filter((c) => {
        const q = query.toLowerCase();
        return (
          c.label.toLowerCase().includes(q) ||
          c.description.toLowerCase().includes(q) ||
          c.keywords.some((k) => k.includes(q))
        );
      })
    : commands;

  // Keyboard shortcut: Cmd+K / Ctrl+K
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen((o) => !o);
        setQuery('');
        setSelected(0);
      }
      if (e.key === 'Escape' && open) {
        e.preventDefault();
        setOpen(false);
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open]);

  // Focus input when open
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  // Close on location change
  useEffect(() => {
    setOpen(false);
  }, [location]);

  const handleSelect = useCallback(
    (index: number) => {
      const item = filtered[index];
      if (item) {
        item.action();
        setOpen(false);
      }
    },
    [filtered],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelected((s) => (s + 1) % filtered.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelected((s) => (s - 1 + filtered.length) % filtered.length);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        handleSelect(selected);
      }
    },
    [filtered.length, selected, handleSelect],
  );

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center pt-[20vh]"
      onClick={() => setOpen(false)}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

      {/* Panel */}
      <div
        className="relative w-full max-w-lg bg-surface-900 border border-surface-700/50 rounded-2xl shadow-2xl overflow-hidden animate-fade-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-surface-700/50">
          <Search className="w-5 h-5 text-surface-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setSelected(0); }}
            onKeyDown={handleKeyDown}
            placeholder="Type a command or search..."
            className="flex-1 bg-transparent text-sm text-surface-100 placeholder:text-surface-500 focus:outline-none"
          />
          <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-surface-800 border border-surface-700/50 text-[10px] text-surface-500 font-mono">
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div className="max-h-[320px] overflow-y-auto py-2">
          {filtered.length === 0 ? (
            <div className="py-8 text-center text-sm text-surface-500">No matching commands</div>
          ) : (
            filtered.map((item, index) => (
              <button
                key={item.id}
                onClick={() => handleSelect(index)}
                onMouseEnter={() => setSelected(index)}
                className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                  index === selected
                    ? 'bg-primary-600/15 text-primary-300'
                    : 'text-surface-200 hover:bg-surface-800/50'
                }`}
              >
                <div className={`shrink-0 ${index === selected ? 'text-primary-400' : 'text-surface-400'}`}>
                  {item.icon}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium">{item.label}</div>
                  <div className="text-[11px] text-surface-500 truncate">{item.description}</div>
                </div>
              </button>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center gap-4 px-4 py-2 border-t border-surface-700/50 text-[10px] text-surface-500">
          <span className="flex items-center gap-1">
            <kbd className="px-1 py-0.5 rounded bg-surface-800 border border-surface-700/50 font-mono">↑↓</kbd>
            navigate
          </span>
          <span className="flex items-center gap-1">
            <kbd className="px-1 py-0.5 rounded bg-surface-800 border border-surface-700/50 font-mono">↵</kbd>
            select
          </span>
          <span className="flex items-center gap-1">
            <Command className="w-3 h-3" />
            <kbd className="px-1 py-0.5 rounded bg-surface-800 border border-surface-700/50 font-mono">K</kbd>
            toggle
          </span>
        </div>
      </div>
    </div>
  );
}
