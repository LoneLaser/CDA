import { db } from '../db';
import { computeAllDescriptiveStats } from './descriptiveStats';
import { computeCorrelationMatrix } from './correlationAnalysis';
import type { DescriptiveStats, CorrelationResult, ColumnType } from '../types';

export interface AnalyticsBundle {
  datasetId: string;
  descriptive: DescriptiveStats[];
  correlations: CorrelationResult[];
  numericColumns: string[];
  categoricalColumns: string[];
  totalRows: number;
  computedAt: string;
}

/**
 * Load Silver rows from IndexedDB for a given dataset.
 */
async function loadSilverData(datasetId: string): Promise<Record<string, unknown>[]> {
  const records = await db.silver.where('datasetId').equals(datasetId).sortBy('rowIndex');
  return records.map((r) => r.data as Record<string, unknown>);
}

/**
 * Run full analytics suite on a dataset:
 * - Descriptive statistics for all numeric columns
 * - Correlation matrix for all numeric column pairs
 */
export async function runAnalytics(
  datasetId: string,
  columns: { name: string; type: ColumnType }[],
  onProgress?: (msg: string) => void,
): Promise<AnalyticsBundle> {
  onProgress?.('Loading Silver data...');
  const rows = await loadSilverData(datasetId);

  const numericColumns = columns.filter((c) => c.type === 'number').map((c) => c.name);
  const categoricalColumns = columns.filter((c) => c.type === 'string').map((c) => c.name);

  onProgress?.(`Computing descriptive stats for ${numericColumns.length} numeric columns...`);
  const descriptive = computeAllDescriptiveStats(rows, numericColumns);

  onProgress?.(`Computing correlation matrix (${numericColumns.length} columns)...`);
  const correlations = computeCorrelationMatrix(rows, numericColumns);

  const bundle: AnalyticsBundle = {
    datasetId,
    descriptive,
    correlations,
    numericColumns,
    categoricalColumns,
    totalRows: rows.length,
    computedAt: new Date().toISOString(),
  };

  // Persist to IndexedDB
  await db.analytics.put({
    id: `analytics-${datasetId}`,
    datasetId,
    type: 'quantitative',
    config: {},
    result: bundle as unknown as Record<string, unknown>,
    createdAt: bundle.computedAt,
  });

  onProgress?.('Analytics complete');
  return bundle;
}

/**
 * Load previously computed analytics from IndexedDB.
 */
export async function loadAnalytics(datasetId: string): Promise<AnalyticsBundle | null> {
  const record = await db.analytics.get(`analytics-${datasetId}`);
  if (!record) return null;
  return record.result as unknown as AnalyticsBundle;
}
