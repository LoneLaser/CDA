// Copyright (c) 2026 Justin Glaser. All rights reserved.
// Use of this source code is governed by a license that can be
// found in the LICENSE file in the root of this repository.

import { create } from 'zustand';
import type { DatasetMeta, ProfileStats } from '../types';

interface DataState {
  datasets: DatasetMeta[];
  activeDatasetId: string | null;
  profiles: Record<string, ProfileStats>;
  rawData: Record<string, Record<string, unknown>[]>;
  cleanedData: Record<string, Record<string, unknown>[]>;
  goldData: Record<string, Record<string, unknown>[]>;

  setDatasets: (datasets: DatasetMeta[]) => void;
  addDataset: (dataset: DatasetMeta) => void;
  removeDataset: (id: string) => void;
  setActiveDataset: (id: string | null) => void;
  updateDatasetStatus: (id: string, updates: Partial<DatasetMeta>) => void;
  setProfile: (datasetId: string, profile: ProfileStats) => void;
  setRawData: (datasetId: string, data: Record<string, unknown>[]) => void;
  setCleanedData: (datasetId: string, data: Record<string, unknown>[]) => void;
  setGoldData: (datasetId: string, data: Record<string, unknown>[]) => void;

  getActiveDataset: () => DatasetMeta | undefined;
}

export const useDataStore = create<DataState>((set, get) => ({
  datasets: [],
  activeDatasetId: null,
  profiles: {},
  rawData: {},
  cleanedData: {},
  goldData: {},

  setDatasets: (datasets) => set({ datasets }),
  addDataset: (dataset) => set((s) => ({ datasets: [...s.datasets, dataset] })),
  removeDataset: (id) =>
    set((s) => ({
      datasets: s.datasets.filter((d) => d.id !== id),
      activeDatasetId: s.activeDatasetId === id ? null : s.activeDatasetId,
    })),
  setActiveDataset: (id) => set({ activeDatasetId: id }),
  updateDatasetStatus: (id, updates) =>
    set((s) => ({
      datasets: s.datasets.map((d) => (d.id === id ? { ...d, ...updates } : d)),
    })),
  setProfile: (datasetId, profile) =>
    set((s) => ({ profiles: { ...s.profiles, [datasetId]: profile } })),
  setRawData: (datasetId, data) =>
    set((s) => ({ rawData: { ...s.rawData, [datasetId]: data } })),
  setCleanedData: (datasetId, data) =>
    set((s) => ({ cleanedData: { ...s.cleanedData, [datasetId]: data } })),
  setGoldData: (datasetId, data) =>
    set((s) => ({ goldData: { ...s.goldData, [datasetId]: data } })),

  getActiveDataset: () => {
    const { datasets, activeDatasetId } = get();
    return datasets.find((d) => d.id === activeDatasetId);
  },
}));
