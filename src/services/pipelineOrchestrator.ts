// Copyright (c) 2026 Justin Glaser. All rights reserved.
// Use of this source code is governed by a license that can be
// found in the LICENSE file in the root of this repository.

import { db } from '../db';
import { loadBronzeRows } from './bronzeIngestion';
import { cleanData, type CleaningReport } from './cleaningEngine';
import { profileData } from './profilingEngine';
import { materializeGold, type GoldSummary } from './goldMaterializer';
import type { ColumnType, ProfileStats, DatasetMeta, StageStatus } from '../types';

const BATCH_SIZE = 500;

export interface PipelineCallbacks {
  onStatusChange: (stage: 'bronze' | 'silver' | 'gold', status: StageStatus) => void;
  onProgress: (message: string) => void;
  onComplete: (result: PipelineResult) => void;
  onError: (error: Error) => void;
}

export interface PipelineResult {
  datasetId: string;
  cleaningReport: CleaningReport;
  profile: ProfileStats;
  goldSummary: GoldSummary;
  silverRowCount: number;
  goldRowCount: number;
}

/**
 * Runs the full Medallion pipeline: Bronze → Silver → Gold
 * 
 * - Bronze: Already done during file upload (rows stored in IndexedDB)
 * - Silver: Load Bronze rows → clean → profile → store Silver rows + profile
 * - Gold: Take Silver rows → materialize aggregations → store Gold rows + summary
 */
export async function runPipeline(
  dataset: DatasetMeta,
  callbacks: PipelineCallbacks,
): Promise<void> {
  const { id: datasetId } = dataset;

  try {
    // ─── Silver Layer ───
    callbacks.onStatusChange('silver', 'processing');
    callbacks.onProgress('Loading Bronze data...');

    const bronzeRows = await loadBronzeRows(datasetId);
    callbacks.onProgress(`Loaded ${bronzeRows.length} Bronze rows`);

    // Prepare column type info
    const columnTypes = dataset.columns.map((c) => ({
      name: c.name,
      type: c.type as ColumnType,
    }));

    // Clean
    callbacks.onProgress('Cleaning data (dedup, type coercion, null handling)...');
    const { rows: cleanedRows, report: cleaningReport } = cleanData(bronzeRows, columnTypes);
    callbacks.onProgress(
      `Cleaned: ${cleaningReport.duplicatesRemoved} duplicates removed, ${cleaningReport.nullsFilled} nulls filled`,
    );

    // Profile
    callbacks.onProgress('Profiling columns...');
    const activeColumns = columnTypes.filter((c) => !cleaningReport.columnsDropped.includes(c.name));
    const profile = profileData(datasetId, cleanedRows, activeColumns);
    callbacks.onProgress(`Profiled ${profile.columns.length} columns (${profile.completenessScore}% complete)`);

    // Store Silver rows in batches
    callbacks.onProgress('Storing Silver rows...');
    await db.silver.where('datasetId').equals(datasetId).delete(); // Clear any previous
    for (let i = 0; i < cleanedRows.length; i += BATCH_SIZE) {
      const batch = cleanedRows.slice(i, i + BATCH_SIZE).map((data, idx) => ({
        datasetId,
        rowIndex: i + idx,
        data,
      }));
      await db.silver.bulkAdd(batch);
    }

    // Store profile
    await db.profiles.put({
      id: datasetId,
      datasetId,
      profile: profile as unknown as Record<string, unknown>,
      generatedAt: profile.generatedAt,
    });

    // Update dataset status
    await db.datasets.update(datasetId, { silverStatus: 'done' });
    callbacks.onStatusChange('silver', 'done');
    callbacks.onProgress('Silver layer complete');

    // ─── Gold Layer ───
    callbacks.onStatusChange('gold', 'processing');
    callbacks.onProgress('Materializing Gold layer...');

    const { rows: goldRows, summary: goldSummary } = materializeGold(cleanedRows, activeColumns);

    // Store Gold rows in batches
    await db.gold.where('datasetId').equals(datasetId).delete();
    for (let i = 0; i < goldRows.length; i += BATCH_SIZE) {
      const batch = goldRows.slice(i, i + BATCH_SIZE).map((data, idx) => ({
        datasetId,
        rowIndex: i + idx,
        data,
      }));
      await db.gold.bulkAdd(batch);
    }

    await db.datasets.update(datasetId, { goldStatus: 'done' });
    callbacks.onStatusChange('gold', 'done');
    callbacks.onProgress('Gold layer complete — pipeline finished');

    callbacks.onComplete({
      datasetId,
      cleaningReport,
      profile,
      goldSummary,
      silverRowCount: cleanedRows.length,
      goldRowCount: goldRows.length,
    });
  } catch (error) {
    // Mark current stage as error
    const currentStage = await getCurrentStage(datasetId);
    if (currentStage === 'silver') {
      await db.datasets.update(datasetId, { silverStatus: 'error' });
    } else {
      await db.datasets.update(datasetId, { goldStatus: 'error' });
    }
    callbacks.onStatusChange(currentStage, 'error');
    callbacks.onError(error instanceof Error ? error : new Error(String(error)));
  }
}

async function getCurrentStage(datasetId: string): Promise<'silver' | 'gold'> {
  const ds = await db.datasets.get(datasetId);
  if (ds?.silverStatus !== 'done') return 'silver';
  return 'gold';
}

/** Load Silver rows for a dataset */
export async function loadSilverRows(datasetId: string): Promise<Record<string, unknown>[]> {
  const records = await db.silver.where('datasetId').equals(datasetId).sortBy('rowIndex');
  return records.map((r) => r.data);
}

/** Load Gold rows for a dataset */
export async function loadGoldRows(datasetId: string): Promise<Record<string, unknown>[]> {
  const records = await db.gold.where('datasetId').equals(datasetId).sortBy('rowIndex');
  return records.map((r) => r.data);
}

/** Load profile for a dataset */
export async function loadProfile(datasetId: string): Promise<ProfileStats | null> {
  const record = await db.profiles.get(datasetId);
  return record ? (record.profile as unknown as ProfileStats) : null;
}
