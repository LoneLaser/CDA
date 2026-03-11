// Copyright (c) 2026 Justin Glaser. All rights reserved.
// Use of this source code is governed by a license that can be
// found in the LICENSE file in the root of this repository.

import { useMemo } from 'react';
import type { CorrelationResult } from '../../types';
import { getCorrelationValue } from '../../services/correlationAnalysis';

interface CorrelationHeatmapProps {
  correlations: CorrelationResult[];
  columns: string[];
  mode: 'pearson' | 'spearman';
}

/**
 * Interactive correlation matrix heatmap.
 * Renders a grid of cells colored by correlation strength.
 */
export function CorrelationHeatmap({ correlations, columns, mode }: CorrelationHeatmapProps) {
  const matrix = useMemo(() => {
    return columns.map((row) =>
      columns.map((col) => {
        if (row === col) return 1;
        return getCorrelationValue(correlations, row, col, mode);
      }),
    );
  }, [correlations, columns, mode]);

  if (columns.length === 0) {
    return (
      <div className="text-center text-surface-400 text-sm py-8">
        No numeric columns available for correlation analysis.
      </div>
    );
  }

  const cellSize = columns.length <= 6 ? 56 : columns.length <= 10 ? 44 : 36;
  const labelWidth = 120;
  const headerHeight = 120;

  return (
    <div className="overflow-auto">
      {/* Legend */}
      <div className="flex items-center gap-3 mb-4">
        <span className="text-xs text-surface-400">-1</span>
        <div className="flex-1 h-3 rounded-full bg-gradient-to-r from-rose-500 via-surface-700 to-primary-500 max-w-[200px]" />
        <span className="text-xs text-surface-400">+1</span>
        <span className="text-xs text-surface-500 ml-2">
          {mode === 'pearson' ? 'Pearson (linear)' : 'Spearman (monotonic)'}
        </span>
      </div>

      <div className="inline-block">
        <svg
          width={labelWidth + columns.length * cellSize + 2}
          height={headerHeight + columns.length * cellSize + 2}
          className="overflow-visible"
        >
          {/* Column headers (rotated) */}
          {columns.map((col, i) => (
            <text
              key={`header-${col}`}
              x={labelWidth + i * cellSize + cellSize / 2}
              y={headerHeight - 6}
              textAnchor="start"
              className="fill-surface-300 text-[10px] font-mono"
              transform={`rotate(-45, ${labelWidth + i * cellSize + cellSize / 2}, ${headerHeight - 6})`}
            >
              {truncateLabel(col, 14)}
            </text>
          ))}

          {/* Row labels + cells */}
          {columns.map((rowCol, rowIdx) => (
            <g key={`row-${rowCol}`}>
              {/* Row label */}
              <text
                x={labelWidth - 8}
                y={headerHeight + rowIdx * cellSize + cellSize / 2 + 4}
                textAnchor="end"
                className="fill-surface-300 text-[10px] font-mono"
              >
                {truncateLabel(rowCol, 14)}
              </text>

              {/* Cells */}
              {columns.map((colCol, colIdx) => {
                const value = matrix[rowIdx][colIdx];
                const fill = correlationColor(value);
                const showText = cellSize >= 36;

                return (
                  <g key={`cell-${rowIdx}-${colIdx}`}>
                    <rect
                      x={labelWidth + colIdx * cellSize}
                      y={headerHeight + rowIdx * cellSize}
                      width={cellSize - 2}
                      height={cellSize - 2}
                      rx={4}
                      fill={fill}
                      className="transition-opacity hover:opacity-80 cursor-default"
                    >
                      <title>
                        {rowCol} × {colCol}: {value.toFixed(3)}
                      </title>
                    </rect>
                    {showText && (
                      <text
                        x={labelWidth + colIdx * cellSize + (cellSize - 2) / 2}
                        y={headerHeight + rowIdx * cellSize + (cellSize - 2) / 2 + 4}
                        textAnchor="middle"
                        className={`text-[10px] font-mono ${Math.abs(value) > 0.5 ? 'fill-white' : 'fill-surface-300'}`}
                      >
                        {value.toFixed(2)}
                      </text>
                    )}
                  </g>
                );
              })}
            </g>
          ))}
        </svg>
      </div>
    </div>
  );
}

/**
 * Map a correlation value [-1, 1] to a color.
 * Negative: rose/red, Zero: neutral gray, Positive: indigo/blue
 */
function correlationColor(value: number): string {
  const v = Math.max(-1, Math.min(1, value));
  const abs = Math.abs(v);

  if (abs < 0.05) return '#334155'; // surface-700

  if (v > 0) {
    // Positive: indigo
    if (abs < 0.3) return '#3730a3'; // primary-800
    if (abs < 0.5) return '#4338ca'; // primary-700
    if (abs < 0.7) return '#4f46e5'; // primary-600
    return '#6366f1'; // primary-500
  } else {
    // Negative: rose
    if (abs < 0.3) return '#9f1239'; // rose-800
    if (abs < 0.5) return '#be123c'; // rose-700
    if (abs < 0.7) return '#e11d48'; // rose-600
    return '#f43f5e'; // rose-500
  }
}

function truncateLabel(s: string, maxLen: number): string {
  return s.length > maxLen ? s.slice(0, maxLen - 1) + '…' : s;
}
