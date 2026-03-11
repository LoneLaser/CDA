// Copyright (c) 2026 Justin Glaser. All rights reserved.
// Use of this source code is governed by a license that can be
// found in the LICENSE file in the root of this repository.

import { GripHorizontal, Trash2 } from 'lucide-react';
import { ChartRenderer } from './ChartRenderer';
import type { DashboardCard, ColumnMeta } from '../../types';

interface DashboardCardWrapperProps {
  card: DashboardCard;
  data: Record<string, unknown>[];
  columns: ColumnMeta[];
  onRemove: () => void;
}

/**
 * Wrapper card for a dashboard visualization.
 * Includes drag handle, title, and action buttons.
 */
export function DashboardCardWrapper({ card, data, columns, onRemove }: DashboardCardWrapperProps) {
  return (
    <div data-dashboard-card data-card-title={card.title} className="h-full flex flex-col rounded-xl border border-surface-700/50 bg-surface-800/50 backdrop-blur-sm overflow-hidden group">
      {/* Header / drag handle */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-surface-700/30 bg-surface-800/80 drag-handle cursor-grab active:cursor-grabbing">
        <div className="flex items-center gap-2 min-w-0">
          <GripHorizontal className="w-3.5 h-3.5 text-surface-600 shrink-0" />
          <span className="text-xs font-medium text-surface-200 truncate">{card.title}</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-surface-700/60 text-surface-400 shrink-0">
            {card.type}
          </span>
        </div>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={onRemove}
            className="p-1 rounded hover:bg-danger-600/20 text-surface-500 hover:text-danger-400 transition-colors"
            title="Remove card"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Chart Content */}
      <div className="flex-1 p-2 min-h-0">
        <ChartRenderer
          type={card.type}
          config={card.config}
          data={data}
          columns={columns.map((c) => ({ name: c.name, type: c.type }))}
        />
      </div>
    </div>
  );
}
