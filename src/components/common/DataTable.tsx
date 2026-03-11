import { useState, useMemo, useCallback } from 'react';
import { ChevronLeft, ChevronRight, ArrowUpDown, ArrowUp, ArrowDown, Search, X } from 'lucide-react';

interface DataTableProps {
  rows: Record<string, unknown>[];
  columns?: string[];
  pageSize?: number;
  maxHeight?: string;
  searchable?: boolean;
}

type SortDir = 'asc' | 'desc' | null;

export function DataTable({
  rows,
  columns: colOverride,
  pageSize = 25,
  maxHeight = '400px',
  searchable = false,
}: DataTableProps) {
  const [page, setPage] = useState(0);
  const [sortCol, setSortCol] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>(null);
  const [search, setSearch] = useState('');

  const columns = useMemo(() => {
    if (colOverride) return colOverride;
    if (rows.length === 0) return [];
    const set = new Set<string>();
    for (const row of rows.slice(0, 100)) {
      for (const key of Object.keys(row)) set.add(key);
    }
    return Array.from(set);
  }, [rows, colOverride]);

  // Filter rows by search
  const filteredRows = useMemo(() => {
    if (!search.trim()) return rows;
    const q = search.toLowerCase();
    return rows.filter((row) =>
      columns.some((col) => {
        const val = row[col];
        return val !== null && val !== undefined && String(val).toLowerCase().includes(q);
      }),
    );
  }, [rows, columns, search]);

  // Sort rows
  const sortedRows = useMemo(() => {
    if (!sortCol || !sortDir) return filteredRows;
    const sorted = [...filteredRows].sort((a, b) => {
      const av = a[sortCol];
      const bv = b[sortCol];
      if (av === null || av === undefined) return 1;
      if (bv === null || bv === undefined) return -1;
      if (typeof av === 'number' && typeof bv === 'number') return av - bv;
      return String(av).localeCompare(String(bv));
    });
    return sortDir === 'desc' ? sorted.reverse() : sorted;
  }, [filteredRows, sortCol, sortDir]);

  const totalPages = Math.ceil(sortedRows.length / pageSize);
  const pageRows = sortedRows.slice(page * pageSize, (page + 1) * pageSize);

  const handleSort = useCallback((col: string) => {
    if (sortCol !== col) {
      setSortCol(col);
      setSortDir('asc');
    } else if (sortDir === 'asc') {
      setSortDir('desc');
    } else if (sortDir === 'desc') {
      setSortCol(null);
      setSortDir(null);
    } else {
      setSortCol(col);
      setSortDir('asc');
    }
    setPage(0);
  }, [sortCol, sortDir]);

  if (rows.length === 0) {
    return <p className="text-sm text-surface-500 text-center py-8">No data to display</p>;
  }

  return (
    <div>
      {/* Search Bar */}
      {searchable && (
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0); }}
            placeholder="Search rows..."
            className="w-full pl-9 pr-8 py-2 rounded-lg bg-surface-800 border border-surface-700/50 text-sm text-surface-100 placeholder:text-surface-500 focus:outline-none focus:border-primary-500/50 focus:ring-1 focus:ring-primary-500/25 transition-colors"
          />
          {search && (
            <button
              onClick={() => { setSearch(''); setPage(0); }}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 text-surface-500 hover:text-surface-300"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      )}

      {/* Search result count */}
      {searchable && search && (
        <p className="text-[11px] text-surface-500 mb-2">
          {sortedRows.length.toLocaleString()} of {rows.length.toLocaleString()} rows match
        </p>
      )}

      <div className="overflow-auto rounded-lg border border-surface-700/50" style={{ maxHeight }}>
        <table className="w-full text-xs">
          <thead className="sticky top-0 z-10">
            <tr className="bg-surface-800 border-b border-surface-700/50">
              <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-surface-400 w-12">
                #
              </th>
              {columns.map((col) => (
                <th
                  key={col}
                  onClick={() => handleSort(col)}
                  className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-surface-400 whitespace-nowrap cursor-pointer hover:text-surface-200 select-none transition-colors group"
                >
                  <span className="inline-flex items-center gap-1">
                    {col}
                    {sortCol === col ? (
                      sortDir === 'asc' ? (
                        <ArrowUp className="w-3 h-3 text-primary-400" />
                      ) : (
                        <ArrowDown className="w-3 h-3 text-primary-400" />
                      )
                    ) : (
                      <ArrowUpDown className="w-3 h-3 opacity-0 group-hover:opacity-50 transition-opacity" />
                    )}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-800/50">
            {pageRows.map((row, idx) => (
              <tr
                key={page * pageSize + idx}
                className="hover:bg-surface-800/30 transition-colors"
              >
                <td className="px-3 py-1.5 text-surface-500 font-mono">
                  {page * pageSize + idx + 1}
                </td>
                {columns.map((col) => (
                  <td key={col} className="px-3 py-1.5 text-surface-200 whitespace-nowrap max-w-[200px] truncate">
                    {formatCell(row[col])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-3 px-1">
          <span className="text-xs text-surface-500">
            {(page * pageSize + 1).toLocaleString()}–{Math.min((page + 1) * pageSize, sortedRows.length).toLocaleString()} of{' '}
            {sortedRows.length.toLocaleString()} rows
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className="p-1 rounded text-surface-400 hover:text-surface-200 hover:bg-surface-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs text-surface-400 px-2">
              {page + 1} / {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              className="p-1 rounded text-surface-400 hover:text-surface-200 hover:bg-surface-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function formatCell(value: unknown): string {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'number') return value.toLocaleString(undefined, { maximumFractionDigits: 4 });
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  return String(value);
}
