// Copyright (c) 2026 Justin Glaser. All rights reserved.
// Use of this source code is governed by a license that can be
// found in the LICENSE file in the root of this repository.

import { useState, useMemo } from 'react';
import type { ColumnMeta, ColumnType, ProfileStats } from '../../types';
import { ArrowRight, Check, RotateCcw, Info, Hash } from 'lucide-react';

export interface CrosswalkMapping {
  originalName: string;
  newName: string;
  originalType: ColumnType;
  newType: ColumnType;
  valueMap?: Record<string, number>;
  keepOriginal?: boolean;
}

interface CrosswalkEditorProps {
  columns: ColumnMeta[];
  profile?: ProfileStats | null;
  onApply: (mappings: CrosswalkMapping[]) => void;
  onCancel: () => void;
}

const COLUMN_TYPES: { value: ColumnType; label: string }[] = [
  { value: 'string', label: 'String' },
  { value: 'number', label: 'Number' },
  { value: 'boolean', label: 'Boolean' },
  { value: 'date', label: 'Date' },
];

export function CrosswalkEditor({ columns, profile, onApply, onCancel }: CrosswalkEditorProps) {
  const [mappings, setMappings] = useState<CrosswalkMapping[]>(() =>
    columns.map((col) => ({
      originalName: col.name,
      newName: col.name,
      originalType: col.type,
      newType: col.type,
    })),
  );
  const [expandedMaps, setExpandedMaps] = useState<Set<number>>(new Set());

  const hasChanges = useMemo(
    () =>
      mappings.some(
        (m) => m.originalName !== m.newName || m.originalType !== m.newType,
      ),
    [mappings],
  );

  const updateMapping = (index: number, field: 'newName', value: string) => {
    setMappings((prev) =>
      prev.map((m, i) =>
        i === index ? { ...m, [field]: value } : m,
      ),
    );
  };

  const handleTypeChange = (index: number, newType: ColumnType) => {
    const m = mappings[index];
    const col = columns[index];
    if (m.originalType === 'string' && newType === 'number') {
      const colProfile = profile?.columns.find((c) => c.name === m.originalName);
      const topVals = colProfile?.topValues?.map((tv) => tv.value) ?? [];
      const sampleVals = Array.from(
        new Set(
          col.sampleValues
            .map((v) => String(v))
            .filter((v) => v && v !== 'null' && v !== 'undefined'),
        ),
      );
      const allVals = Array.from(new Set([...topVals, ...sampleVals])).sort();
      const valueMap = Object.fromEntries(allVals.map((v, i) => [v, i]));
      setMappings((prev) =>
        prev.map((mapping, i) => (i === index ? { ...mapping, newType, valueMap } : mapping)),
      );
      setExpandedMaps((prev) => new Set([...prev, index]));
    } else {
      setMappings((prev) =>
        prev.map((mapping, i) =>
          i === index ? { ...mapping, newType, valueMap: undefined, keepOriginal: false } : mapping,
        ),
      );
      setExpandedMaps((prev) => {
        const next = new Set(prev);
        next.delete(index);
        return next;
      });
    }
  };

  const updateValueMapEntry = (index: number, val: string, code: number) => {
    setMappings((prev) =>
      prev.map((m, i) =>
        i === index && m.valueMap
          ? { ...m, valueMap: { ...m.valueMap, [val]: code } }
          : m,
      ),
    );
  };

  const toggleKeepOriginal = (index: number) => {
    setMappings((prev) =>
      prev.map((m, i) => (i === index ? { ...m, keepOriginal: !m.keepOriginal } : m)),
    );
  };

  const toggleExpandedMap = (index: number) => {
    setExpandedMaps((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const resetMapping = (index: number) => {
    setMappings((prev) =>
      prev.map((m, i) =>
        i === index
          ? { ...m, newName: m.originalName, newType: m.originalType, valueMap: undefined, keepOriginal: false }
          : m,
      ),
    );
    setExpandedMaps((prev) => {
      const next = new Set(prev);
      next.delete(index);
      return next;
    });
  };

  const resetAll = () => {
    setMappings((prev) =>
      prev.map((m) => ({
        ...m,
        newName: m.originalName,
        newType: m.originalType,
        valueMap: undefined,
        keepOriginal: false,
      })),
    );
    setExpandedMaps(new Set());
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
            When converting a <strong>String → Number</strong>, an auto-generated value map lets you encode categories as integers for correlation analysis while optionally preserving the original strings for filtering.
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
                const isStrToNum = m.originalType === 'string' && m.newType === 'number';
                const isExpanded = expandedMaps.has(idx);
                return (
                  <>
                    <tr
                      key={m.originalName}
                      className={`border-b ${isExpanded ? 'border-surface-700/20' : 'border-surface-800/50'} ${changed ? 'bg-primary-600/5' : ''}`}
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
                        <div className="flex items-center gap-1">
                          <select
                            value={m.newType}
                            onChange={(e) => handleTypeChange(idx, e.target.value as ColumnType)}
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
                          {isStrToNum && (
                            <button
                              onClick={() => toggleExpandedMap(idx)}
                              title="Edit integer value encoding map"
                              className={`p-1.5 rounded transition-colors ${
                                isExpanded
                                  ? 'bg-accent-600/20 text-accent-400'
                                  : 'text-surface-500 hover:text-surface-300 hover:bg-surface-800'
                              }`}
                            >
                              <Hash className="w-3 h-3" />
                            </button>
                          )}
                        </div>
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
                    {isStrToNum && isExpanded && (
                      <tr key={`${m.originalName}-valuemap`} className="border-b border-surface-800/50 bg-primary-600/3">
                        <td colSpan={5} className="px-4 pb-3 pt-1">
                          <div className="ml-2 p-3 rounded-lg bg-surface-800/60 border border-surface-700/40 space-y-2">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-1.5">
                                <Hash className="w-3.5 h-3.5 text-accent-400" />
                                <span className="text-xs font-medium text-surface-300">String → Integer Encoding</span>
                                <span className="text-[10px] text-surface-500">({Object.keys(m.valueMap ?? {}).length} values mapped)</span>
                              </div>
                              <label className="flex items-center gap-1.5 cursor-pointer select-none">
                                <input
                                  type="checkbox"
                                  checked={m.keepOriginal ?? false}
                                  onChange={() => toggleKeepOriginal(idx)}
                                  className="rounded border-surface-600 bg-surface-700"
                                />
                                <span className="text-[11px] text-surface-400">
                                  Keep <code className="text-surface-300 font-mono text-[10px]">{m.originalName}_original</code> for filtering
                                </span>
                              </label>
                            </div>
                            {Object.keys(m.valueMap ?? {}).length === 0 ? (
                              <p className="text-[11px] text-surface-500 italic">
                                No sample values found — values will be coerced with Number().
                              </p>
                            ) : (
                              <div className="grid grid-cols-2 gap-x-6 gap-y-1 max-h-40 overflow-y-auto pr-1">
                                {Object.entries(m.valueMap ?? {}).map(([val, code]) => (
                                  <div key={val} className="flex items-center gap-2">
                                    <span className="font-mono text-[11px] text-surface-400 truncate flex-1 min-w-0" title={val}>
                                      {val || <em className="text-surface-600">(empty)</em>}
                                    </span>
                                    <span className="text-surface-600 text-[10px]">→</span>
                                    <input
                                      type="number"
                                      value={code}
                                      onChange={(e) => updateValueMapEntry(idx, val, Number(e.target.value))}
                                      className="w-14 px-2 py-0.5 text-xs rounded bg-surface-700 border border-surface-600 text-surface-200 focus:outline-none focus:border-accent-500/50 text-right"
                                    />
                                  </div>
                                ))}
                              </div>
                            )}
                            <p className="text-[10px] text-surface-500">
                              Integer codes are used for correlations. Values not listed here map to <code>null</code>.
                            </p>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
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
