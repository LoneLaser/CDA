// Copyright (c) 2026 Justin Glaser. All rights reserved.
// Use of this source code is governed by a license that can be
// found in the LICENSE file in the root of this repository.

import type { ReactNode } from 'react';

interface EmptyStateProps {
  icon: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-surface-800/80 border border-surface-700/50 mb-4">
        {icon}
      </div>
      <h3 className="text-base font-semibold text-surface-200 mb-1">{title}</h3>
      <p className="text-sm text-surface-400 max-w-md mb-6">{description}</p>
      {action}
    </div>
  );
}
