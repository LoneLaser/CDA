// Copyright (c) 2026 Justin Glaser. All rights reserved.
// Use of this source code is governed by a license that can be
// found in the LICENSE file in the root of this repository.

import { v4 as uuid } from 'uuid';
import { db } from '../db';
import type { DatasetRecord } from '../db';
import { parseFile } from './fileParser';
import type { ColumnType, DatasetMeta } from '../types';

const BATCH_SIZE = 500;

/** Infer column type from sample values */
function inferType(values: unknown[]): ColumnType {
  const nonNull = values.filter((v) => v !== null && v !== undefined && v !== '');
  if (nonNull.length === 0) return 'unknown';

  let numCount = 0;
  let boolCount = 0;
  let dateCount = 0;

  for (const v of nonNull.slice(0, 100)) {
    if (typeof v === 'number' || (typeof v === 'string' && !isNaN(Number(v)) && v.trim() !== '')) {
      numCount++;
    } else if (typeof v === 'boolean' || v === 'true' || v === 'false') {
      boolCount++;
    } else if (typeof v === 'string' && !isNaN(Date.parse(v)) && v.length > 6) {
      dateCount++;
    }
  }

  const sample = nonNull.slice(0, 100).length;
  const threshold = sample * 0.7;

  if (numCount >= threshold) return 'number';
  if (boolCount >= threshold) return 'boolean';
  if (dateCount >= threshold) return 'date';
  return 'string';
}

/** Ingest a file into the Bronze layer (IndexedDB) */
export async function ingestBronze(
  file: File,
  onProgress?: (msg: string) => void,
): Promise<DatasetMeta> {
  const id = uuid();

  onProgress?.('Parsing file...');
  const { rows, columns, errors } = await parseFile(file);

  if (errors.length > 0) {
    onProgress?.(`Parsed with ${errors.length} warning(s)`);
  }

  if (rows.length === 0) {
    throw new Error('File contains no data rows');
  }

  onProgress?.(`Detected ${rows.length} rows × ${columns.length} columns`);

  // Analyze columns
  const columnMetas = columns.map((colName) => {
    const values = rows.map((r) => r[colName]);
    const nonNull = values.filter((v) => v !== null && v !== undefined && v !== '');
    const uniqueSet = new Set(nonNull.map(String));

    return {
      name: colName,
      type: inferType(values),
      nullable: values.length !== nonNull.length,
      uniqueCount: uniqueSet.size,
      nullCount: values.length - nonNull.length,
      sampleValues: nonNull.slice(0, 5),
    };
  });

  // Store dataset metadata
  const datasetRecord: DatasetRecord = {
    id,
    name: file.name.replace(/\.[^.]+$/, ''),
    fileName: file.name,
    fileSize: file.size,
    rowCount: rows.length,
    columnCount: columns.length,
    columns: columnMetas,
    uploadedAt: new Date().toISOString(),
    bronzeStatus: 'processing',
    silverStatus: 'pending',
    goldStatus: 'pending',
  };

  await db.datasets.put(datasetRecord);

  // Store rows in batches
  onProgress?.('Storing in Bronze layer...');
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE).map((data, idx) => ({
      datasetId: id,
      rowIndex: i + idx,
      data,
    }));
    await db.bronze.bulkAdd(batch);
    onProgress?.(`Stored ${Math.min(i + BATCH_SIZE, rows.length)} / ${rows.length} rows`);
  }

  // Mark Bronze as done
  await db.datasets.update(id, { bronzeStatus: 'done' });

  onProgress?.('Bronze ingestion complete');

  return dbRecordToMeta(datasetRecord, 'done');
}

/** Convert a DB record back to our app's DatasetMeta type */
export function dbRecordToMeta(
  rec: DatasetRecord,
  bronzeOverride?: string,
): DatasetMeta {
  return {
    id: rec.id!,
    name: rec.name,
    fileName: rec.fileName,
    fileSize: rec.fileSize,
    rowCount: rec.rowCount,
    columnCount: rec.columnCount,
    columns: rec.columns.map((c) => ({
      ...c,
      type: c.type as ColumnType,
    })),
    uploadedAt: rec.uploadedAt,
    status: {
      bronze: (bronzeOverride ?? rec.bronzeStatus) as DatasetMeta['status']['bronze'],
      silver: rec.silverStatus as DatasetMeta['status']['silver'],
      gold: rec.goldStatus as DatasetMeta['status']['gold'],
    },
  };
}

/** Load all datasets from IndexedDB */
export async function loadAllDatasets(): Promise<DatasetMeta[]> {
  const records = await db.datasets.orderBy('uploadedAt').reverse().toArray();
  return records.map((r) => dbRecordToMeta(r));
}

/** Load raw Bronze rows for a dataset */
export async function loadBronzeRows(datasetId: string): Promise<Record<string, unknown>[]> {
  const records = await db.bronze.where('datasetId').equals(datasetId).sortBy('rowIndex');
  return records.map((r) => r.data);
}

/** Delete a dataset and all its associated data */
export async function deleteDataset(datasetId: string): Promise<void> {
  await Promise.all([
    db.datasets.delete(datasetId),
    db.bronze.where('datasetId').equals(datasetId).delete(),
    db.silver.where('datasetId').equals(datasetId).delete(),
    db.gold.where('datasetId').equals(datasetId).delete(),
    db.profiles.where('datasetId').equals(datasetId).delete(),
    db.analytics.where('datasetId').equals(datasetId).delete(),
    db.dashboards.where('datasetId').equals(datasetId).delete(),
  ]);
}

/** Format bytes to a human-readable string */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}
