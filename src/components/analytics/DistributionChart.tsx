// Copyright (c) 2026 Justin Glaser. All rights reserved.
// Use of this source code is governed by a license that can be
// found in the LICENSE file in the root of this repository.

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Cell,
} from 'recharts';
import type { DescriptiveStats } from '../../types';

interface DistributionChartProps {
  columnName: string;
  values: number[];
  stats: DescriptiveStats;
  bins?: number;
}

/**
 * Histogram-style distribution chart for a numeric column.
 * Shows distribution bars with mean/median markers.
 */
export function DistributionChart({ columnName, values, stats, bins = 20 }: DistributionChartProps) {
  const data = buildHistogramData(values, bins);

  if (data.length === 0) {
    return (
      <div className="text-center text-surface-400 text-sm py-8">
        Not enough data to display distribution for "{columnName}".
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-4 mb-3 text-xs text-surface-400">
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm bg-primary-500 inline-block" />
          Distribution
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-0.5 bg-accent-400 inline-block" />
          Mean: {stats.mean}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-0.5 bg-warning-400 inline-block" />
          Median: {stats.median}
        </span>
      </div>

      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data} margin={{ top: 4, right: 8, bottom: 4, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 10, fill: '#94a3b8' }}
            axisLine={{ stroke: '#475569' }}
            tickLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            tick={{ fontSize: 10, fill: '#94a3b8' }}
            axisLine={false}
            tickLine={false}
            allowDecimals={false}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#1e293b',
              border: '1px solid #475569',
              borderRadius: '8px',
              fontSize: '12px',
              color: '#f1f5f9',
            }}
            labelStyle={{ color: '#94a3b8', marginBottom: 4 }}
            formatter={(value) => [String(value), 'Count']}
          />
          <Bar dataKey="count" radius={[3, 3, 0, 0]} maxBarSize={40}>
            {data.map((entry, idx) => {
              const isMeanBin = stats.mean >= entry.lo && stats.mean < entry.hi;
              const isMedianBin = stats.median >= entry.lo && stats.median < entry.hi;

              let fill = '#6366f1'; // primary-500
              if (isMeanBin && isMedianBin) fill = '#14b8a6'; // accent-500
              else if (isMeanBin) fill = '#818cf8'; // primary-400
              else if (isMedianBin) fill = '#2dd4bf'; // accent-400

              // Gradient opacity based on position
              const opacity = 0.6 + 0.4 * (entry.count / Math.max(...data.map((d) => d.count), 1));

              return (
                <Cell
                  key={`cell-${idx}`}
                  fill={fill}
                  fillOpacity={opacity}
                />
              );
            })}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

interface HistogramBin {
  label: string;
  lo: number;
  hi: number;
  count: number;
}

function buildHistogramData(values: number[], bins: number): HistogramBin[] {
  const nums = values.filter((v) => isFinite(v));
  if (nums.length === 0) return [];

  const sorted = [...nums].sort((a, b) => a - b);
  const min = sorted[0];
  const max = sorted[sorted.length - 1];

  if (min === max) {
    return [{ label: fmt(min), lo: min, hi: min + 1, count: nums.length }];
  }

  const binWidth = (max - min) / bins;
  const data: HistogramBin[] = [];

  for (let i = 0; i < bins; i++) {
    const lo = min + i * binWidth;
    const hi = i === bins - 1 ? max + 0.001 : min + (i + 1) * binWidth;
    const count = sorted.filter((v) => v >= lo && v < hi).length;

    data.push({
      label: fmt(lo),
      lo,
      hi,
      count,
    });
  }

  return data;
}

function fmt(n: number): string {
  if (Math.abs(n) >= 1e6) return (n / 1e6).toFixed(1) + 'M';
  if (Math.abs(n) >= 1e3) return (n / 1e3).toFixed(1) + 'K';
  if (Number.isInteger(n)) return String(n);
  return n.toFixed(1);
}
