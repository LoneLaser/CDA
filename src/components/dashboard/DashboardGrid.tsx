// Copyright (c) 2026 Justin Glaser. All rights reserved.
// Use of this source code is governed by a license that can be
// found in the LICENSE file in the root of this repository.

import { useCallback, useMemo } from 'react';
import {
  GridLayout,
  useContainerWidth,
  verticalCompactor,
  type Layout,
} from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
import { DashboardCardWrapper } from './DashboardCardWrapper';
import type { DashboardCard, ColumnMeta } from '../../types';

interface DashboardGridProps {
  cards: DashboardCard[];
  data: Record<string, unknown>[];
  columns: ColumnMeta[];
  onLayoutChange: (layouts: { id: string; x: number; y: number; w: number; h: number }[]) => void;
  onRemoveCard: (cardId: string) => void;
}

export function DashboardGrid({
  cards,
  data,
  columns,
  onLayoutChange,
  onRemoveCard,
}: DashboardGridProps) {
  const { width, containerRef, mounted } = useContainerWidth({ initialWidth: 1200 });

  const layout: Layout = useMemo(
    () =>
      cards.map((card) => ({
        i: card.id,
        x: card.layout.x,
        y: card.layout.y,
        w: card.layout.w,
        h: card.layout.h,
        minW: 2,
        minH: 2,
      })),
    [cards],
  );

  const handleLayoutChange = useCallback(
    (newLayout: Layout) => {
      const mapped = newLayout.map((l) => ({
        id: l.i,
        x: l.x,
        y: l.y,
        w: l.w,
        h: l.h,
      }));
      onLayoutChange(mapped);
    },
    [onLayoutChange],
  );

  return (
    <div ref={containerRef}>
      {mounted && (
        <GridLayout
          className="dashboard-grid"
          width={width}
          layout={layout}
          gridConfig={{ cols: 12, rowHeight: 70, margin: [12, 12], containerPadding: [0, 0] }}
          dragConfig={{ handle: '.drag-handle' }}
          compactor={verticalCompactor}
          onLayoutChange={handleLayoutChange}
        >
          {cards.map((card) => (
            <div key={card.id}>
              <DashboardCardWrapper
                card={card}
                data={data}
                columns={columns}
                onRemove={() => onRemoveCard(card.id)}
              />
            </div>
          ))}
        </GridLayout>
      )}
    </div>
  );
}
