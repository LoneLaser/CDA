import { useState, useMemo } from 'react';
import type { ColumnMeta, ColumnType } from '../../types';
import { ArrowRight, Check, RotateCcw, Info } from 'lucide-react';

export interface CrosswalkMapping {
  originalName: string;
  newName: string;
  originalType: ColumnType;
  newType: ColumnType;
}

interface CrosswalkEditorProps {
  columns: ColumnMeta[];
  onApply: (mappings: CrosswalkMapping[]) => void;
  onCancel: () => void;
}

const COLUMN_TYPES: { value: ColumnType; label: string }[] = [
  { value: 'string', label: 'String' },
  { value: 'number', label: 'Number' },
  { value: 'boolean', label: 'Boolean' },
  { value: 'date', label: 'Date' },
];

export function CrosswalkEditor({ columns, onApply, onCancel }: CrosswalkEditorProps) {
  const [mappings, setMappings] = useState<CrosswalkMapping[]>(() =>
    columns.map((col) => ({
      originalName: col.name,
      newName: col.name,
      originalType: col.type,
      newType: col.type,
    })),
  );

  const hasChanges = useMemo(
    () =>
      mappings.some(
        (m) => m.originalName !== m.newName || m.originalType !== m.newType,
      ),
    [mappings],
  );

  const updateMapping = (index: number, field: 'newName' | 'newType', value: string) => {
    setMappings((prev) =>
      prev.map((m, i) =>
        i === index ? { ...m, [field]: value } : m,
      ),
    );
  };

  const resetMapping = (index: number) => {
    setMappings((prev) =>
      prev.map((m, i) =>
        i === index
          ? { ...m, newName: m.originalName, newType: m.originalType }
          : m,
      ),
    );
  };

  const resetAll = () => {
    setMappings((prev) =>
      prev.map((m) => ({
        ...m,
        newName: m.originalName,
        newType: m.originalType,
      })),
    );
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-surface-900 border border-surface-700/50 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[85vh] flex flex-col animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-surface-700/50">
          <div>
            <h2 className="text-base font-semibold text-surface-100">Data Crosswalk</h2>
            <p className="text-xs text-surface-400 mt-0.5">
              Rename columns or change their types before pipeline processing
            </p>
          </div>
          <button
            onClick={resetAll}
            disabled={!hasChanges}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-surface-400 hover:text-surface-200 hover:bg-surface-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset All
          </button>
        </div>

        {/* Info banner */}
        <div className="mx-5 mt-4 flex items-start gap-2 p-3 rounded-lg bg-primary-600/10 border border-primary-500/20">
          <Info className="w-4 h-4 text-primary-400 mt-0.5 shrink-0" />
          <p className="text-[11px] text-surface-300 leading-relaxed">
            Use this crosswalk to rename data elements or change column types before the data flows through the Silver and Gold pipeline stages. 
            Changes apply during ETL processing — original Bronze data remains untouched.
          </p>
        </div>

        {/* Mapping table */}
        <div className="flex-1 overflow-y-auto p-5">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-surface-700/50">
                <th className="text-left py-2 px-2 text-xs font-medium text-surface-400">Original Column</th>
                <th className="w-8" />
                <th className="text-left py-2 px-2 text-xs font-medium text-surface-400">New Name</th>
                <th className="text-left py-2 px-2 text-xs font-medium text-surface-400">Type</th>
                <th className="w-10" />
              </tr>
            </thead>
            <tbody>
              {mappings.map((m, idx) => {
                const changed = m.originalName !== m.newName || m.originalType !== m.newType;
                return (
                  <tr
                    key={m.originalName}
                    className={`border-b border-surface-800/50 ${changed ? 'bg-primary-600/5' : ''}`}
                  >
                    <td className="py-2 px-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs text-surface-300">{m.originalName}</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-surface-700/60 text-surface-500">
                          {m.originalType}
                        </span>
                      </div>
                    </td>
                    <td className="text-center">
                      <ArrowRight className={`w-3.5 h-3.5 mx-auto ${changed ? 'text-primary-400' : 'text-surface-600'}`} />
                    </td>
                    <td className="py-2 px-2">
                      <input
                        type="text"
                        value={m.newName}
                        onChange={(e) => updateMapping(idx, 'newName', e.target.value)}
                        className={`w-full px-2 py-1.5 rounded-lg text-xs font-mono bg-surface-800 border transition-colors focus:outline-none focus:border-primary-500/50 focus:ring-1 focus:ring-primary-500/25 ${
                          m.originalName !== m.newName
                            ? 'border-primary-500/40 text-primary-300'
                            : 'border-surface-700/50 text-surface-200'
                        }`}
                      />
                    </td>
                    <td className="py-2 px-2">
                      <select
                        value={m.newType}
                        onChange={(e) => updateMapping(idx, 'newType', e.target.value)}
                        className={`px-2 py-1.5 rounded-lg text-xs bg-surface-800 border transition-colors focus:outline-none focus:border-primary-500/50 ${
                          m.originalType !== m.newType
                            ? 'border-accent-500/40 text-accent-300'
                            : 'border-surface-700/50 text-surface-200'
                        }`}
                      >
                        {COLUMN_TYPES.map((t) => (
                          <option key={t.value} value={t.value}>
                            {t.label}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="py-2 px-2 text-center">
                      {changed && (
                        <button
                          onClick={() => resetMapping(idx)}
                          className="p-1 rounded hover:bg-surface-800 text-surface-500 hover:text-surface-300 transition-colors"
                          title="Reset this column"
                        >
                          <RotateCcw className="w-3 h-3" />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-5 border-t border-surface-700/50">
          <span className="text-xs text-surface-500">
            {hasChanges
              ? `${mappings.filter((m) => m.originalName !== m.newName || m.originalType !== m.newType).length} column(s) modified`
              : 'No changes — pipeline will use original columns'}
          </span>
          <div className="flex items-center gap-3">
            <button
              onClick={onCancel}
              className="px-4 py-2 rounded-lg text-sm font-medium text-surface-400 hover:text-surface-200 hover:bg-surface-800 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => onApply(mappings)}
              className="flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-medium bg-primary-600 text-white hover:bg-primary-500 transition-all"
            >
              <Check className="w-4 h-4" />
              {hasChanges ? 'Apply Crosswalk & Run Pipeline' : 'Run Pipeline (No Changes)'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
