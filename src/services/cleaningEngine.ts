import type { ColumnType } from '../types';

export interface CleaningResult {
  rows: Record<string, unknown>[];
  report: CleaningReport;
}

export interface CleaningReport {
  originalRowCount: number;
  cleanedRowCount: number;
  duplicatesRemoved: number;
  nullsFilled: number;
  typeCoercions: number;
  columnsDropped: string[];
}

/**
 * Silver-layer cleaning pipeline:
 * 1. Drop columns that are >90% null
 * 2. Deduplicate rows (hash-based fingerprint)
 * 3. Coerce types (strings→numbers, strings→dates, strings→booleans)
 * 4. Fill remaining nulls with sensible defaults
 */
export function cleanData(
  rows: Record<string, unknown>[],
  columnTypes: { name: string; type: ColumnType }[],
): CleaningResult {
  if (rows.length === 0) {
    return {
      rows: [],
      report: {
        originalRowCount: 0,
        cleanedRowCount: 0,
        duplicatesRemoved: 0,
        nullsFilled: 0,
        typeCoercions: 0,
        columnsDropped: [],
      },
    };
  }

  const originalRowCount = rows.length;
  let nullsFilled = 0;
  let typeCoercions = 0;

  const colNames = columnTypes.map((c) => c.name);

  // 1. Drop columns that are >90% null
  const columnsDropped: string[] = [];
  const threshold = rows.length * 0.9;
  for (const col of colNames) {
    const nullCount = rows.filter((r) => isNullish(r[col])).length;
    if (nullCount >= threshold) {
      columnsDropped.push(col);
    }
  }

  const activeColumns = columnTypes.filter((c) => !columnsDropped.includes(c.name));

  // 2. Type coercion
  let cleaned = rows.map((row) => {
    const newRow: Record<string, unknown> = {};
    for (const col of activeColumns) {
      let val = row[col.name];

      if (!isNullish(val)) {
        const coerced = coerceValue(val, col.type);
        if (coerced !== val) typeCoercions++;
        val = coerced;
      }

      newRow[col.name] = val;
    }
    return newRow;
  });

  // 3. Deduplicate
  const seen = new Set<string>();
  const deduped: Record<string, unknown>[] = [];
  for (const row of cleaned) {
    const fingerprint = hashRow(row, activeColumns.map((c) => c.name));
    if (!seen.has(fingerprint)) {
      seen.add(fingerprint);
      deduped.push(row);
    }
  }
  const duplicatesRemoved = cleaned.length - deduped.length;
  cleaned = deduped;

  // 4. Fill nulls
  const defaults = computeDefaults(cleaned, activeColumns);
  for (const row of cleaned) {
    for (const col of activeColumns) {
      if (isNullish(row[col.name])) {
        row[col.name] = defaults[col.name];
        nullsFilled++;
      }
    }
  }

  return {
    rows: cleaned,
    report: {
      originalRowCount,
      cleanedRowCount: cleaned.length,
      duplicatesRemoved,
      nullsFilled,
      typeCoercions,
      columnsDropped,
    },
  };
}

function isNullish(val: unknown): boolean {
  return val === null || val === undefined || val === '' || val === 'null' || val === 'undefined' || val === 'NaN';
}

function coerceValue(val: unknown, type: ColumnType): unknown {
  if (isNullish(val)) return null;

  switch (type) {
    case 'number': {
      if (typeof val === 'number') return val;
      const str = String(val).replace(/,/g, '').trim();
      const num = Number(str);
      return isNaN(num) ? val : num;
    }
    case 'boolean': {
      if (typeof val === 'boolean') return val;
      const lower = String(val).toLowerCase().trim();
      if (lower === 'true' || lower === '1' || lower === 'yes') return true;
      if (lower === 'false' || lower === '0' || lower === 'no') return false;
      return val;
    }
    case 'date': {
      if (val instanceof Date) return val.toISOString();
      const str = String(val).trim();
      const ts = Date.parse(str);
      return isNaN(ts) ? val : new Date(ts).toISOString();
    }
    default:
      return typeof val === 'string' ? val.trim() : val;
  }
}

function hashRow(row: Record<string, unknown>, columns: string[]): string {
  const parts: string[] = [];
  for (const col of columns) {
    parts.push(String(row[col] ?? ''));
  }
  // Simple but effective string hash
  const str = parts.join('|');
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash + char) | 0;
  }
  return hash.toString(36);
}

function computeDefaults(
  rows: Record<string, unknown>[],
  columns: { name: string; type: ColumnType }[],
): Record<string, unknown> {
  const defaults: Record<string, unknown> = {};

  for (const col of columns) {
    switch (col.type) {
      case 'number': {
        const vals = rows
          .map((r) => r[col.name])
          .filter((v): v is number => typeof v === 'number' && !isNaN(v));
        defaults[col.name] = vals.length > 0 ? median(vals) : 0;
        break;
      }
      case 'boolean':
        defaults[col.name] = false;
        break;
      case 'date':
        defaults[col.name] = null;
        break;
      default: {
        // Mode (most frequent value) for strings
        const freq = new Map<string, number>();
        for (const r of rows) {
          const v = r[col.name];
          if (!isNullish(v)) {
            const s = String(v);
            freq.set(s, (freq.get(s) ?? 0) + 1);
          }
        }
        let best = '';
        let bestCount = 0;
        for (const [k, c] of freq) {
          if (c > bestCount) {
            best = k;
            bestCount = c;
          }
        }
        defaults[col.name] = best || 'Unknown';
        break;
      }
    }
  }

  return defaults;
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}
