// Copyright (c) 2026 Justin Glaser. All rights reserved.
// Use of this source code is governed by a license that can be
// found in the LICENSE file in the root of this repository.

import { useState, useCallback } from 'react';
import type { ChartType, ChartConfig, ColumnMeta } from '../../types';
import {
  BarChart3, TrendingUp, CircleDot, PieChart, AreaChart,
  Activity, Hash, Table2, X,
} from 'lucide-react';

interface ChartConfigPanelProps {
  columns: ColumnMeta[];
  onAdd: (type: ChartType, title: string, config: ChartConfig) => void;
  onClose: () => void;
}

const CHART_TYPES: { type: ChartType; label: string; icon: React.ComponentType<{ className?: string }>; desc: string }[] = [
  { type: 'bar', label: 'Bar Chart', icon: BarChart3, desc: 'Compare values across categories' },
  { type: 'line', label: 'Line Chart', icon: TrendingUp, desc: 'Show trends over time or sequence' },
  { type: 'area', label: 'Area Chart', icon: AreaChart, desc: 'Trend with filled area' },
  { type: 'scatter', label: 'Scatter Plot', icon: CircleDot, desc: 'Show relationships between two variables' },
  { type: 'pie', label: 'Pie Chart', icon: PieChart, desc: 'Show proportions of a whole' },
  { type: 'histogram', label: 'Histogram', icon: Activity, desc: 'Distribution of a numeric column' },
  { type: 'stat-card', label: 'Stat Card', icon: Hash, desc: 'Single aggregated value' },
  { type: 'table', label: 'Data Table', icon: Table2, desc: 'Tabular view of columns' },
];

const AGGREGATIONS = [
  { value: 'sum', label: 'Sum' },
  { value: 'avg', label: 'Average' },
  { value: 'count', label: 'Count' },
  { value: 'min', label: 'Min' },
  { value: 'max', label: 'Max' },
] as const;

export function ChartConfigPanel({ columns, onAdd, onClose }: ChartConfigPanelProps) {
  const [chartType, setChartType] = useState<ChartType>('bar');
  const [title, setTitle] = useState('');
  const [xColumn, setXColumn] = useState('');
  const [yColumn, setYColumn] = useState('');
  const [aggregation, setAggregation] = useState<ChartConfig['aggregation']>('sum');

  const numericCols = columns.filter((c) => c.type === 'number');
  const allCols = columns;

  const needsX = !['stat-card', 'histogram'].includes(chartType);
  const needsAgg = ['bar', 'line', 'area', 'pie', 'stat-card'].includes(chartType);

  const handleAdd = useCallback(() => {
    const config: ChartConfig = {};
    if (xColumn) config.xColumn = xColumn;
    if (yColumn) config.yColumn = yColumn;
    if (aggregation && needsAgg) config.aggregation = aggregation;

    const autoTitle = title || generateTitle(chartType, xColumn, yColumn, aggregation);
    onAdd(chartType, autoTitle, config);
  }, [chartType, title, xColumn, yColumn, aggregation, needsAgg, onAdd]);

  const isValid = () => {
    if (chartType === 'stat-card') return !!yColumn;
    if (chartType === 'histogram') return !!xColumn || !!yColumn;
    if (chartType === 'scatter') return !!xColumn && !!yColumn;
    if (chartType === 'table') return !!xColumn || !!yColumn;
    return !!xColumn || !!yColumn;
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-surface-900 border border-surface-700/50 rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-surface-700/50">
          <div>
            <h3 className="text-base font-semibold text-surface-100">Add Chart</h3>
            <p className="text-xs text-surface-400 mt-0.5">Configure a new visualization card</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-surface-800 text-surface-400 hover:text-surface-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Chart Type Selection */}
          <div>
            <label className="block text-xs font-medium text-surface-300 mb-2">Chart Type</label>
            <div className="grid grid-cols-4 gap-2">
              {CHART_TYPES.map(({ type, label, icon: Icon }) => (
                <button
                  key={type}
                  onClick={() => setChartType(type)}
                  className={`flex flex-col items-center gap-1.5 p-2.5 rounded-lg border text-xs font-medium transition-all ${
                    chartType === type
                      ? 'bg-primary-600/20 border-primary-500/40 text-primary-300'
                      : 'bg-surface-800/50 border-surface-700/40 text-surface-400 hover:text-surface-200 hover:border-surface-600'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="block text-xs font-medium text-surface-300 mb-1.5">
              Title <span className="text-surface-500">(optional)</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Auto-generated if empty"
              className="w-full px-3 py-2 rounded-lg bg-surface-800 border border-surface-700/50 text-sm text-surface-100 placeholder:text-surface-500 focus:outline-none focus:border-primary-500/50 focus:ring-1 focus:ring-primary-500/25 transition-colors"
            />
          </div>

          {/* X Column */}
          {needsX && (
            <div>
              <label className="block text-xs font-medium text-surface-300 mb-1.5">
                {chartType === 'scatter' ? 'X Axis (numeric)' : 'X Axis / Category'}
              </label>
              <select
                value={xColumn}
                onChange={(e) => setXColumn(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-surface-800 border border-surface-700/50 text-sm text-surface-100 focus:outline-none focus:border-primary-500/50 transition-colors"
              >
                <option value="">Select column...</option>
                {(chartType === 'scatter' ? numericCols : allCols).map((c) => (
                  <option key={c.name} value={c.name}>
                    {c.name} ({c.type})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Histogram: column selection */}
          {chartType === 'histogram' && (
            <div>
              <label className="block text-xs font-medium text-surface-300 mb-1.5">
                Numeric Column
              </label>
              <select
                value={xColumn || yColumn}
                onChange={(e) => { setXColumn(e.target.value); setYColumn(e.target.value); }}
                className="w-full px-3 py-2 rounded-lg bg-surface-800 border border-surface-700/50 text-sm text-surface-100 focus:outline-none focus:border-primary-500/50 transition-colors"
              >
                <option value="">Select column...</option>
                {numericCols.map((c) => (
                  <option key={c.name} value={c.name}>{c.name}</option>
                ))}
              </select>
            </div>
          )}

          {/* Y Column */}
          {chartType !== 'histogram' && (
            <div>
              <label className="block text-xs font-medium text-surface-300 mb-1.5">
                {chartType === 'stat-card' ? 'Value Column' : chartType === 'pie' ? 'Value Column (numeric)' : 'Y Axis (numeric)'}
              </label>
              <select
                value={yColumn}
                onChange={(e) => setYColumn(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-surface-800 border border-surface-700/50 text-sm text-surface-100 focus:outline-none focus:border-primary-500/50 transition-colors"
              >
                <option value="">Select column...</option>
                {(chartType === 'table' ? allCols : numericCols).map((c) => (
                  <option key={c.name} value={c.name}>
                    {c.name} ({c.type})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Aggregation */}
          {needsAgg && (
            <div>
              <label className="block text-xs font-medium text-surface-300 mb-1.5">Aggregation</label>
              <div className="flex gap-2">
                {AGGREGATIONS.map(({ value, label }) => (
                  <button
                    key={value}
                    onClick={() => setAggregation(value)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      aggregation === value
                        ? 'bg-primary-600 text-white'
                        : 'bg-surface-800 text-surface-400 border border-surface-700/50 hover:text-surface-200'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-5 border-t border-surface-700/50">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm font-medium text-surface-400 hover:text-surface-200 hover:bg-surface-800 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleAdd}
            disabled={!isValid()}
            className="px-5 py-2 rounded-lg text-sm font-medium bg-primary-600 text-white hover:bg-primary-500 disabled:opacity-40 disabled:cursor-not-allowed transition-all hover:shadow-lg hover:shadow-primary-500/25"
          >
            Add to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}

function generateTitle(type: ChartType, x?: string, y?: string, agg?: string): string {
  const aggLabel = agg ? agg.charAt(0).toUpperCase() + agg.slice(1) : '';

  switch (type) {
    case 'bar': return `${aggLabel} of ${y || '?'} by ${x || '?'}`;
    case 'line': return `${y || '?'} trend over ${x || '?'}`;
    case 'area': return `${y || '?'} area over ${x || '?'}`;
    case 'scatter': return `${x || '?'} vs ${y || '?'}`;
    case 'pie': return `${x || '?'} distribution`;
    case 'histogram': return `${x || y || '?'} distribution`;
    case 'stat-card': return `${aggLabel} of ${y || '?'}`;
    case 'table': return `${x || ''} ${y ? `& ${y}` : ''}`.trim() || 'Data Table';
    default: return 'Chart';
  }
}
