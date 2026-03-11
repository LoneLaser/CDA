// Copyright (c) 2026 Justin Glaser. All rights reserved.
// Use of this source code is governed by a license that can be
// found in the LICENSE file in the root of this repository.

import Dexie, { type Table } from 'dexie';

/* ─── Row stored in Bronze ─── */
export interface BronzeRecord {
  id?: number;
  datasetId: string;
  rowIndex: number;
  data: Record<string, unknown>;
}

/* ─── Dataset metadata ─── */
export interface DatasetRecord {
  id?: string;
  name: string;
  fileName: string;
  fileSize: number;
  rowCount: number;
  columnCount: number;
  columns: { name: string; type: string; nullable: boolean; uniqueCount: number; nullCount: number; sampleValues: unknown[] }[];
  uploadedAt: string;
  bronzeStatus: string;
  silverStatus: string;
  goldStatus: string;
}

/* ─── Profile result ─── */
export interface ProfileRecord {
  id?: string;
  datasetId: string;
  profile: Record<string, unknown>;
  generatedAt: string;
}

/* ─── Cleaned rows (Silver) ─── */
export interface SilverRecord {
  id?: number;
  datasetId: string;
  rowIndex: number;
  data: Record<string, unknown>;
}

/* ─── Gold rows ─── */
export interface GoldRecord {
  id?: number;
  datasetId: string;
  rowIndex: number;
  data: Record<string, unknown>;
}

/* ─── Analytics result ─── */
export interface AnalyticsRecord {
  id?: string;
  datasetId: string;
  type: string;
  config: Record<string, unknown>;
  result: Record<string, unknown>;
  createdAt: string;
}

/* ─── Dashboard config ─── */
export interface DashboardRecord {
  id?: string;
  name: string;
  datasetId: string;
  cards: Record<string, unknown>[];
  createdAt: string;
  updatedAt: string;
}

class CDADatabase extends Dexie {
  datasets!: Table<DatasetRecord, string>;
  bronze!: Table<BronzeRecord, number>;
  silver!: Table<SilverRecord, number>;
  gold!: Table<GoldRecord, number>;
  profiles!: Table<ProfileRecord, string>;
  analytics!: Table<AnalyticsRecord, string>;
  dashboards!: Table<DashboardRecord, string>;

  constructor() {
    super('CDA');

    this.version(1).stores({
      datasets: 'id, name, uploadedAt',
      bronze: '++id, datasetId, rowIndex',
      silver: '++id, datasetId, rowIndex',
      gold: '++id, datasetId, rowIndex',
      profiles: 'id, datasetId',
      analytics: 'id, datasetId, type',
      dashboards: 'id, datasetId',
    });
  }
}

export const db = new CDADatabase();
