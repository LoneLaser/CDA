// Copyright (c) 2026 Justin Glaser. All rights reserved.
// Use of this source code is governed by a license that can be
// found in the LICENSE file in the root of this repository.

import type { DatasetMeta } from '../../types';
import { Card } from '../common';
import { StatusBadge } from '../common';
import { formatBytes } from '../../services/bronzeIngestion';
import {
  FileSpreadsheet,
  Columns3,
  Rows3,
  Clock,
  Trash2,
  ArrowRight,
} from 'lucide-react';

interface DatasetCardProps {
  dataset: DatasetMeta;
  isActive: boolean;
  onSelect: () => void;
  onDelete: () => void;
}

export function DatasetCard({ dataset, isActive, onSelect, onDelete }: DatasetCardProps) {
  const uploadDate = new Date(dataset.uploadedAt);
  const timeAgo = getTimeAgo(uploadDate);

  return (
    <Card
      hover
      className={`relative group transition-all duration-200 ${
        isActive ? 'ring-1 ring-primary-500/50 border-primary-500/30' : ''
      }`}
    >
      <div className="flex items-start gap-4">
        {/* Icon */}
        <div
          className={`flex items-center justify-center w-10 h-10 rounded-lg shrink-0 ${
            isActive
              ? 'bg-primary-500/20 border border-primary-500/30'
              : 'bg-surface-700/50 border border-surface-600/30'
          }`}
        >
          <FileSpreadsheet className={`w-5 h-5 ${isActive ? 'text-primary-400' : 'text-surface-400'}`} />
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="text-sm font-semibold text-surface-100 truncate">{dataset.name}</h4>
            <span className="text-[10px] text-surface-500 font-mono">{formatBytes(dataset.fileSize)}</span>
          </div>

          <p className="text-xs text-surface-500 truncate mb-2">{dataset.fileName}</p>

          {/* Stats row */}
          <div className="flex items-center gap-4 text-xs text-surface-400">
            <span className="flex items-center gap-1">
              <Rows3 className="w-3 h-3" />
              {dataset.rowCount.toLocaleString()} rows
            </span>
            <span className="flex items-center gap-1">
              <Columns3 className="w-3 h-3" />
              {dataset.columnCount} cols
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {timeAgo}
            </span>
          </div>

          {/* Pipeline status */}
          <div className="flex items-center gap-3 mt-3 pt-3 border-t border-surface-700/30">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-medium uppercase tracking-wider text-surface-500">Bronze</span>
              <StatusBadge status={dataset.status.bronze} />
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-medium uppercase tracking-wider text-surface-500">Silver</span>
              <StatusBadge status={dataset.status.silver} />
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-medium uppercase tracking-wider text-surface-500">Gold</span>
              <StatusBadge status={dataset.status.gold} />
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onSelect();
            }}
            className="p-1.5 rounded-md text-surface-400 hover:text-primary-400 hover:bg-primary-500/10 transition-colors"
            title="Select dataset"
          >
            <ArrowRight className="w-4 h-4" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="p-1.5 rounded-md text-surface-400 hover:text-danger-400 hover:bg-danger-500/10 transition-colors"
            title="Delete dataset"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </Card>
  );
}

function getTimeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString();
}
