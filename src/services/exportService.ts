import { db } from '../db';
import type { DatasetMeta, DescriptiveStats, CorrelationResult, ColumnMeta } from '../types';
import type { AnalyticsBundle } from './analyticsOrchestrator';

// ─── CSV Builder ───

function escapeCSV(val: unknown): string {
  if (val === null || val === undefined) return '';
  const str = String(val);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function rowsToCSV(rows: Record<string, unknown>[], columns?: string[]): string {
  if (rows.length === 0) return '';
  const cols = columns ?? Object.keys(rows[0]);
  const header = cols.map(escapeCSV).join(',');
  const body = rows.map((r) => cols.map((c) => escapeCSV(r[c])).join(',')).join('\n');
  return `${header}\n${body}`;
}

// ─── Download Utility ───

function downloadBlob(content: string, filename: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ─── Public Export Functions ───

export type ExportLayer = 'bronze' | 'silver' | 'gold';
export type ExportFormat = 'csv' | 'json';

/**
 * Export a data layer (bronze/silver/gold) as CSV or JSON.
 */
export async function exportDataLayer(
  datasetId: string,
  datasetName: string,
  layer: ExportLayer,
  format: ExportFormat,
): Promise<void> {
  const table = layer === 'bronze' ? db.bronze : layer === 'silver' ? db.silver : db.gold;
  const records = await table.where('datasetId').equals(datasetId).sortBy('rowIndex');
  const rows = records.map((r) => r.data as Record<string, unknown>);

  const safeName = datasetName.replace(/[^a-zA-Z0-9_-]/g, '_');
  const ts = new Date().toISOString().slice(0, 10);

  if (format === 'csv') {
    downloadBlob(rowsToCSV(rows), `${safeName}_${layer}_${ts}.csv`, 'text/csv;charset=utf-8');
  } else {
    downloadBlob(JSON.stringify(rows, null, 2), `${safeName}_${layer}_${ts}.json`, 'application/json');
  }
}

/**
 * Export analytics results as a structured JSON report.
 */
export function exportAnalyticsReport(
  dataset: DatasetMeta,
  bundle: AnalyticsBundle,
): void {
  const report = {
    exportedAt: new Date().toISOString(),
    dataset: {
      name: dataset.name,
      fileName: dataset.fileName,
      rowCount: dataset.rowCount,
      columnCount: dataset.columnCount,
      columns: dataset.columns.map((c: ColumnMeta) => ({
        name: c.name,
        type: c.type,
        nullable: c.nullable,
        uniqueCount: c.uniqueCount,
        nullCount: c.nullCount,
      })),
    },
    analytics: {
      computedAt: bundle.computedAt,
      totalRows: bundle.totalRows,
      numericColumns: bundle.numericColumns,
      categoricalColumns: bundle.categoricalColumns,
      descriptiveStatistics: bundle.descriptive.map((s: DescriptiveStats) => ({
        column: s.column,
        count: s.count,
        mean: s.mean,
        median: s.median,
        mode: s.mode,
        stdDev: s.stdDev,
        variance: s.variance,
        min: s.min,
        max: s.max,
        q1: s.q1,
        q3: s.q3,
        iqr: s.iqr,
        skewness: s.skewness,
        kurtosis: s.kurtosis,
      })),
      correlations: bundle.correlations
        .filter((c: CorrelationResult) => c.significant)
        .map((c: CorrelationResult) => ({
          column1: c.column1,
          column2: c.column2,
          pearson: c.pearson,
          spearman: c.spearman,
          pValue: c.pValue,
        })),
    },
  };

  const safeName = dataset.name.replace(/[^a-zA-Z0-9_-]/g, '_');
  downloadBlob(
    JSON.stringify(report, null, 2),
    `${safeName}_analytics_report_${new Date().toISOString().slice(0, 10)}.json`,
    'application/json',
  );
}

/**
 * Export descriptive stats as CSV.
 */
export function exportStatsCSV(dataset: DatasetMeta, stats: DescriptiveStats[]): void {
  const rows = stats.map((s) => ({
    column: s.column,
    count: s.count,
    mean: s.mean,
    median: s.median,
    mode: s.mode.join('; '),
    stdDev: s.stdDev,
    variance: s.variance,
    min: s.min,
    max: s.max,
    q1: s.q1,
    q3: s.q3,
    iqr: s.iqr,
    skewness: s.skewness,
    kurtosis: s.kurtosis,
  }));
  const safeName = dataset.name.replace(/[^a-zA-Z0-9_-]/g, '_');
  downloadBlob(
    rowsToCSV(rows as unknown as Record<string, unknown>[]),
    `${safeName}_descriptive_stats_${new Date().toISOString().slice(0, 10)}.csv`,
    'text/csv;charset=utf-8',
  );
}

/**
 * Export AI insights as Markdown.
 */
export function exportInsightsMarkdown(
  datasetName: string,
  insights: { type: string; model: string; createdAt: string; response: string }[],
): void {
  const lines: string[] = [
    `# AI Insights Report — ${datasetName}`,
    `Exported: ${new Date().toISOString()}`,
    '',
  ];

  for (const insight of insights) {
    lines.push(
      `## ${insight.type.charAt(0).toUpperCase() + insight.type.slice(1)} Analysis`,
      `*Model: ${insight.model} · ${new Date(insight.createdAt).toLocaleString()}*`,
      '',
      insight.response,
      '',
      '---',
      '',
    );
  }

  const safeName = datasetName.replace(/[^a-zA-Z0-9_-]/g, '_');
  downloadBlob(
    lines.join('\n'),
    `${safeName}_ai_insights_${new Date().toISOString().slice(0, 10)}.md`,
    'text/markdown;charset=utf-8',
  );
}
