// Copyright (c) 2026 Justin Glaser. All rights reserved.
// Use of this source code is governed by a license that can be
// found in the LICENSE file in the root of this repository.

import { create } from 'zustand';
import type { DashboardConfig, DashboardCard } from '../types';
import { v4 as uuid } from 'uuid';

interface DashboardState {
  dashboards: DashboardConfig[];
  activeDashboardId: string | null;

  createDashboard: (name: string, datasetId: string) => string;
  deleteDashboard: (id: string) => void;
  setActiveDashboard: (id: string | null) => void;
  addCard: (dashboardId: string, card: Omit<DashboardCard, 'id'>) => void;
  updateCard: (dashboardId: string, cardId: string, updates: Partial<DashboardCard>) => void;
  removeCard: (dashboardId: string, cardId: string) => void;
  updateLayouts: (dashboardId: string, layouts: { id: string; x: number; y: number; w: number; h: number }[]) => void;

  getActiveDashboard: () => DashboardConfig | undefined;
}

export const useDashboardStore = create<DashboardState>((set, get) => ({
  dashboards: [],
  activeDashboardId: null,

  createDashboard: (name, datasetId) => {
    const id = uuid();
    const now = new Date().toISOString();
    const dashboard: DashboardConfig = {
      id,
      name,
      datasetId,
      cards: [],
      createdAt: now,
      updatedAt: now,
    };
    set((s) => ({ dashboards: [...s.dashboards, dashboard], activeDashboardId: id }));
    return id;
  },

  deleteDashboard: (id) =>
    set((s) => ({
      dashboards: s.dashboards.filter((d) => d.id !== id),
      activeDashboardId: s.activeDashboardId === id ? null : s.activeDashboardId,
    })),

  setActiveDashboard: (id) => set({ activeDashboardId: id }),

  addCard: (dashboardId, card) =>
    set((s) => ({
      dashboards: s.dashboards.map((d) =>
        d.id === dashboardId
          ? { ...d, cards: [...d.cards, { ...card, id: uuid() }], updatedAt: new Date().toISOString() }
          : d
      ),
    })),

  updateCard: (dashboardId, cardId, updates) =>
    set((s) => ({
      dashboards: s.dashboards.map((d) =>
        d.id === dashboardId
          ? {
              ...d,
              cards: d.cards.map((c) => (c.id === cardId ? { ...c, ...updates } : c)),
              updatedAt: new Date().toISOString(),
            }
          : d
      ),
    })),

  removeCard: (dashboardId, cardId) =>
    set((s) => ({
      dashboards: s.dashboards.map((d) =>
        d.id === dashboardId
          ? { ...d, cards: d.cards.filter((c) => c.id !== cardId), updatedAt: new Date().toISOString() }
          : d
      ),
    })),

  updateLayouts: (dashboardId, layouts) =>
    set((s) => ({
      dashboards: s.dashboards.map((d) =>
        d.id === dashboardId
          ? {
              ...d,
              cards: d.cards.map((c) => {
                const layout = layouts.find((l) => l.id === c.id);
                return layout ? { ...c, layout: { x: layout.x, y: layout.y, w: layout.w, h: layout.h } } : c;
              }),
              updatedAt: new Date().toISOString(),
            }
          : d
      ),
    })),

  getActiveDashboard: () => {
    const { dashboards, activeDashboardId } = get();
    return dashboards.find((d) => d.id === activeDashboardId);
  },
}));
