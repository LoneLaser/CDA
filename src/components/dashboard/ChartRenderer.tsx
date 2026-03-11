// Copyright (c) 2026 Justin Glaser. All rights reserved.
// Use of this source code is governed by a license that can be
// found in the LICENSE file in the root of this repository.

import { useMemo } from 'react';
import {
  BarChart, Bar,
  LineChart, Line,
  AreaChart, Area,
  ScatterChart, Scatter,
  PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import type { ChartType, ChartConfig } from '../../types';

interface ChartRendererProps {
  type: ChartType;
  config: ChartConfig;
  data: Record<string, unknown>[];
  columns: { name: string; type: string }[];
  width?: number;
  height?: number;
}

const PALETTE = [
  '#6366f1', '#14b8a6', '#f59e0b', '#ef4444', '#8b5cf6',
  '#06b6d4', '#f97316', '#ec4899', '#22c55e', '#64748b',
];

const tooltipStyle = {
  backgroundColor: '#1e293b',
  border: '1px solid #475569',
  borderRadius: '8px',
  fontSize: '12px',
  color: '#f1f5f9',
};

/**
 * Universal chart renderer — takes a chart type + config and renders the appropriate Recharts chart.
 */
export function ChartRenderer({ type, config, data }: ChartRendererProps) {
  const { xColumn, yColumn, aggregation, groupBy } = config;

  const chartData = useMemo(() => {
    if (type === 'stat-card') return data;
    if (type === 'pie') return buildPieData(data, xColumn, yColumn, aggregation);
    if (type === 'histogram') return buildHistogramData(data, xColumn ?? yColumn ?? '');
    if (type === 'scatter') return buildScatterData(data, xColumn ?? '', yColumn ?? '');
    if (groupBy && aggregation) return buildAggregated(data, xColumn ?? '', yColumn ?? '', aggregation, groupBy);
    return buildSeriesData(data, xColumn ?? '', yColumn ?? '', aggregation);
  }, [type, data, xColumn, yColumn, aggregation, groupBy]);

  if (!chartData || chartData.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-xs text-surface-500">
        No data to display. Configure columns.
      </div>
    );
  }

  switch (type) {
    case 'bar':
      return (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 8, right: 12, bottom: 4, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
            <XAxis dataKey="x" tick={axisTick} axisLine={{ stroke: '#475569' }} tickLine={false} />
            <YAxis tick={axisTick} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={tooltipStyle} />
            <Bar dataKey="y" fill={PALETTE[0]} radius={[3, 3, 0, 0]} maxBarSize={50} name={yColumn ?? 'Value'} />
          </BarChart>
        </ResponsiveContainer>
      );

    case 'line':
      return (
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 8, right: 12, bottom: 4, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
            <XAxis dataKey="x" tick={axisTick} axisLine={{ stroke: '#475569' }} tickLine={false} />
            <YAxis tick={axisTick} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={tooltipStyle} />
            <Line
              type="monotone"
              dataKey="y"
              stroke={PALETTE[0]}
              strokeWidth={2}
              dot={{ r: 2.5, fill: PALETTE[0] }}
              activeDot={{ r: 4 }}
              name={yColumn ?? 'Value'}
            />
          </LineChart>
        </ResponsiveContainer>
      );

    case 'area':
      return (
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 8, right: 12, bottom: 4, left: 0 }}>
            <defs>
              <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={PALETTE[0]} stopOpacity={0.3} />
                <stop offset="95%" stopColor={PALETTE[0]} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
            <XAxis dataKey="x" tick={axisTick} axisLine={{ stroke: '#475569' }} tickLine={false} />
            <YAxis tick={axisTick} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={tooltipStyle} />
            <Area
              type="monotone"
              dataKey="y"
              stroke={PALETTE[0]}
              fill="url(#areaGrad)"
              strokeWidth={2}
              name={yColumn ?? 'Value'}
            />
          </AreaChart>
        </ResponsiveContainer>
      );

    case 'scatter':
      return (
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 8, right: 12, bottom: 4, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis dataKey="x" tick={axisTick} axisLine={{ stroke: '#475569' }} tickLine={false} name={xColumn} type="number" />
            <YAxis dataKey="y" tick={axisTick} axisLine={false} tickLine={false} name={yColumn} type="number" />
            <Tooltip contentStyle={tooltipStyle} />
            <Scatter data={chartData} fill={PALETTE[0]} fillOpacity={0.7} />
          </ScatterChart>
        </ResponsiveContainer>
      );

    case 'pie':
      return (
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              outerRadius="75%"
              innerRadius="40%"
              paddingAngle={2}
              label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
              labelLine={{ stroke: '#64748b' }}
            >
              {chartData.map((_: unknown, i: number) => (
                <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
              ))}
            </Pie>
            <Tooltip contentStyle={tooltipStyle} />
            <Legend wrapperStyle={{ fontSize: 11, color: '#94a3b8' }} />
          </PieChart>
        </ResponsiveContainer>
      );

    case 'histogram':
      return (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 8, right: 12, bottom: 4, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
            <XAxis dataKey="bin" tick={axisTick} axisLine={{ stroke: '#475569' }} tickLine={false} />
            <YAxis tick={axisTick} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={tooltipStyle} />
            <Bar dataKey="count" fill={PALETTE[4]} radius={[3, 3, 0, 0]} name="Frequency" />
          </BarChart>
        </ResponsiveContainer>
      );

    case 'stat-card':
      return <StatCardContent data={data} config={config} />;

    case 'table':
      return <MiniTable data={data} xColumn={xColumn} yColumn={yColumn} />;

    default:
      return (
        <div className="flex items-center justify-center h-full text-xs text-surface-500">
          Unsupported chart type: {type}
        </div>
      );
  }
}

/* ─── Stat Card ─── */
function StatCardContent({
  data,
  config,
}: {
  data: Record<string, unknown>[];
  config: ChartConfig;
}) {
  const col = config.yColumn ?? config.xColumn;
  if (!col) {
    return <div className="flex items-center justify-center h-full text-xs text-surface-500">Select a column</div>;
  }

  const nums = data
    .map((r) => r[col])
    .filter((v): v is number => typeof v === 'number' && isFinite(v));

  const agg = config.aggregation ?? 'avg';
  let value: number;
  switch (agg) {
    case 'sum': value = nums.reduce((a, b) => a + b, 0); break;
    case 'count': value = nums.length; break;
    case 'min': value = Math.min(...nums); break;
    case 'max': value = Math.max(...nums); break;
    case 'avg':
    default: value = nums.length > 0 ? nums.reduce((a, b) => a + b, 0) / nums.length : 0;
  }

  return (
    <div className="flex flex-col items-center justify-center h-full gap-1">
      <span className="text-[10px] uppercase tracking-wider text-surface-400 font-medium">
        {agg} of {col}
      </span>
      <span className="text-2xl font-bold text-surface-50 font-mono">
        {formatNum(value)}
      </span>
      <span className="text-[10px] text-surface-500">{nums.length.toLocaleString()} values</span>
    </div>
  );
}

/* ─── Mini Table ─── */
function MiniTable({
  data,
  xColumn,
  yColumn,
}: {
  data: Record<string, unknown>[];
  xColumn?: string;
  yColumn?: string;
}) {
  const cols = [xColumn, yColumn].filter(Boolean) as string[];
  if (cols.length === 0) {
    return <div className="flex items-center justify-center h-full text-xs text-surface-500">Select columns</div>;
  }

  const rows = data.slice(0, 50);

  return (
    <div className="overflow-auto h-full">
      <table className="w-full text-[11px]">
        <thead className="sticky top-0 bg-surface-800">
          <tr>
            {cols.map((c) => (
              <th key={c} className="text-left py-1.5 px-2 text-surface-400 font-medium border-b border-surface-700/50">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-b border-surface-800/50 hover:bg-surface-700/20">
              {cols.map((c) => (
                <td key={c} className="py-1 px-2 text-surface-300 font-mono truncate max-w-[120px]">
                  {String(row[c] ?? '')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ─── Data Builders ─── */

function buildSeriesData(
  data: Record<string, unknown>[],
  xCol: string,
  yCol: string,
  aggregation?: string,
): { x: string; y: number }[] {
  if (!xCol || !yCol) return [];

  if (aggregation && aggregation !== 'count') {
    // Group by X, aggregate Y
    const groups = new Map<string, number[]>();
    for (const row of data) {
      const key = String(row[xCol] ?? '');
      const val = row[yCol];
      if (typeof val === 'number' && isFinite(val)) {
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key)!.push(val);
      }
    }

    return Array.from(groups.entries()).map(([key, vals]) => ({
      x: key,
      y: round(aggregate(vals, aggregation)),
    }));
  }

  // Raw values (first 500 rows)
  return data.slice(0, 500).map((row) => ({
    x: String(row[xCol] ?? ''),
    y: Number(row[yCol]) || 0,
  }));
}

function buildAggregated(
  data: Record<string, unknown>[],
  _xCol: string,
  yCol: string,
  aggregation: string,
  groupBy: string,
): { x: string; y: number }[] {
  const groups = new Map<string, number[]>();
  for (const row of data) {
    const key = String(row[groupBy] ?? '');
    const val = row[yCol];
    if (typeof val === 'number' && isFinite(val)) {
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(val);
    }
  }

  return Array.from(groups.entries())
    .map(([key, vals]) => ({ x: key, y: round(aggregate(vals, aggregation)) }))
    .sort((a, b) => b.y - a.y)
    .slice(0, 50);
}

function buildPieData(
  data: Record<string, unknown>[],
  xCol?: string,
  yCol?: string,
  aggregation?: string,
): { name: string; value: number }[] {
  const groupCol = xCol ?? '';
  const valCol = yCol ?? '';

  if (!groupCol) return [];

  if (!valCol || aggregation === 'count') {
    // Count by group
    const freq = new Map<string, number>();
    for (const row of data) {
      const key = String(row[groupCol] ?? '');
      freq.set(key, (freq.get(key) ?? 0) + 1);
    }
    return Array.from(freq.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 15)
      .map(([name, value]) => ({ name, value }));
  }

  const groups = new Map<string, number[]>();
  for (const row of data) {
    const key = String(row[groupCol] ?? '');
    const val = row[valCol];
    if (typeof val === 'number' && isFinite(val)) {
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(val);
    }
  }

  return Array.from(groups.entries())
    .map(([name, vals]) => ({ name, value: round(aggregate(vals, aggregation ?? 'sum')) }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 15);
}

function buildHistogramData(data: Record<string, unknown>[], col: string): { bin: string; count: number }[] {
  if (!col) return [];
  const nums = data
    .map((r) => r[col])
    .filter((v): v is number => typeof v === 'number' && isFinite(v));

  if (nums.length === 0) return [];

  const sorted = [...nums].sort((a, b) => a - b);
  const min = sorted[0];
  const max = sorted[sorted.length - 1];
  const bins = 20;

  if (min === max) return [{ bin: String(min), count: nums.length }];

  const width = (max - min) / bins;
  const result: { bin: string; count: number }[] = [];

  for (let i = 0; i < bins; i++) {
    const lo = min + i * width;
    const hi = i === bins - 1 ? max + 0.001 : min + (i + 1) * width;
    const count = sorted.filter((v) => v >= lo && v < hi).length;
    result.push({ bin: fmtBin(lo), count });
  }

  return result;
}

function buildScatterData(
  data: Record<string, unknown>[],
  xCol: string,
  yCol: string,
): { x: number; y: number }[] {
  if (!xCol || !yCol) return [];

  return data
    .slice(0, 2000)
    .map((row) => {
      const x = row[xCol];
      const y = row[yCol];
      if (typeof x === 'number' && isFinite(x) && typeof y === 'number' && isFinite(y)) {
        return { x, y };
      }
      return null;
    })
    .filter(Boolean) as { x: number; y: number }[];
}

function aggregate(vals: number[], agg: string): number {
  switch (agg) {
    case 'sum': return vals.reduce((a, b) => a + b, 0);
    case 'avg': return vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
    case 'min': return Math.min(...vals);
    case 'max': return Math.max(...vals);
    case 'count': return vals.length;
    default: return vals.reduce((a, b) => a + b, 0);
  }
}

const axisTick = { fontSize: 10, fill: '#94a3b8' };

function round(n: number, d = 2): number {
  const f = 10 ** d;
  return Math.round(n * f) / f;
}

function formatNum(n: number): string {
  if (Math.abs(n) >= 1e9) return (n / 1e9).toFixed(2) + 'B';
  if (Math.abs(n) >= 1e6) return (n / 1e6).toFixed(2) + 'M';
  if (Math.abs(n) >= 1e3) return (n / 1e3).toFixed(1) + 'K';
  if (Number.isInteger(n)) return n.toLocaleString();
  return n.toFixed(2);
}

function fmtBin(n: number): string {
  if (Math.abs(n) >= 1e6) return (n / 1e6).toFixed(1) + 'M';
  if (Math.abs(n) >= 1e3) return (n / 1e3).toFixed(1) + 'K';
  if (Number.isInteger(n)) return String(n);
  return n.toFixed(1);
}
