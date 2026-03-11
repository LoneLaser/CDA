import type { ColumnType } from '../types';

export interface GoldResult {
  rows: Record<string, unknown>[];
  summary: GoldSummary;
}

export interface GoldSummary {
  rowCount: number;
  numericColumns: string[];
  categoricalColumns: string[];
  dateColumns: string[];
  aggregations: AggregationRow[];
}

export interface AggregationRow {
  column: string;
  sum?: number;
  avg?: number;
  min?: number;
  max?: number;
  count: number;
}

/**
 * Gold materialization layer:
 * - Selects and prepares analytics-ready columns
 * - Pre-computes aggregations for numeric columns
 * - Categorizes columns by type for downstream chart suggestions
 * - Stores the final clean, typed dataset
 */
export function materializeGold(
  rows: Record<string, unknown>[],
  columns: { name: string; type: ColumnType }[],
): GoldResult {
  if (rows.length === 0) {
    return {
      rows: [],
      summary: {
        rowCount: 0,
        numericColumns: [],
        categoricalColumns: [],
        dateColumns: [],
        aggregations: [],
      },
    };
  }

  const numericColumns = columns.filter((c) => c.type === 'number').map((c) => c.name);
  const categoricalColumns = columns.filter((c) => c.type === 'string').map((c) => c.name);
  const dateColumns = columns.filter((c) => c.type === 'date').map((c) => c.name);

  // Pre-compute aggregations for each numeric column
  const aggregations: AggregationRow[] = numericColumns.map((col) => {
    const vals = rows
      .map((r) => r[col])
      .filter((v): v is number => typeof v === 'number' && isFinite(v));

    if (vals.length === 0) {
      return { column: col, count: 0 };
    }

    const sum = vals.reduce((a, b) => a + b, 0);
    return {
      column: col,
      sum: round(sum),
      avg: round(sum / vals.length),
      min: Math.min(...vals),
      max: Math.max(...vals),
      count: vals.length,
    };
  });

  return {
    rows,
    summary: {
      rowCount: rows.length,
      numericColumns,
      categoricalColumns,
      dateColumns,
      aggregations,
    },
  };
}

function round(n: number, d = 2): number {
  const f = 10 ** d;
  return Math.round(n * f) / f;
}
