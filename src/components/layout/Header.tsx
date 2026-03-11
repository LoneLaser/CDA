// Copyright (c) 2026 Justin Glaser. All rights reserved.
// Use of this source code is governed by a license that can be
// found in the LICENSE file in the root of this repository.

import { useDataStore } from '../../stores';
import { Database, HardDrive } from 'lucide-react';

export function Header({ title, subtitle }: { title: string; subtitle?: string }) {
  const datasets = useDataStore((s) => s.datasets);
  const activeDataset = useDataStore((s) => s.getActiveDataset());

  return (
    <header className="flex items-center justify-between h-16 px-6 border-b border-surface-700/50 bg-surface-900/40 backdrop-blur-sm">
      <div>
        <h2 className="text-lg font-semibold text-surface-50">{title}</h2>
        {subtitle && <p className="text-xs text-surface-400 mt-0.5">{subtitle}</p>}
      </div>

      <div className="flex items-center gap-4">
        {/* Active dataset indicator */}
        {activeDataset && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary-600/10 border border-primary-500/20">
            <HardDrive className="w-3.5 h-3.5 text-primary-400" />
            <span className="text-xs font-medium text-primary-300">{activeDataset.name}</span>
          </div>
        )}

        {/* Dataset count badge */}
        <div className="flex items-center gap-1.5 text-xs text-surface-400">
          <Database className="w-3.5 h-3.5" />
          <span>{datasets.length} dataset{datasets.length !== 1 ? 's' : ''}</span>
        </div>
      </div>
    </header>
  );
}
