// Copyright (c) 2026 Justin Glaser. All rights reserved.
// Use of this source code is governed by a license that can be
// found in the LICENSE file in the root of this repository.

import type { StageStatus } from '../../types';
import { CheckCircle2, Clock, Loader2, AlertCircle } from 'lucide-react';

const statusConfig: Record<StageStatus, { icon: typeof Clock; color: string; label: string }> = {
  pending: { icon: Clock, color: 'text-surface-500', label: 'Pending' },
  processing: { icon: Loader2, color: 'text-primary-400', label: 'Processing' },
  done: { icon: CheckCircle2, color: 'text-success-400', label: 'Complete' },
  error: { icon: AlertCircle, color: 'text-danger-400', label: 'Error' },
};

export function StatusBadge({ status }: { status: StageStatus }) {
  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${config.color}`}>
      <Icon className={`w-3.5 h-3.5 ${status === 'processing' ? 'animate-spin' : ''}`} />
      {config.label}
    </span>
  );
}
