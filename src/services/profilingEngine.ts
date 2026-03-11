// Copyright (c) 2026 Justin Glaser. All rights reserved.
// Use of this source code is governed by a license that can be
// found in the LICENSE file in the root of this repository.

import type { ColumnType, ColumnProfile, ProfileStats } from '../types';

/**
 * Generates comprehensive column-level profiling stats for the Silver layer.
 * Produces: count, nulls, uniques, mean, median, stdDev, min, max,
 * histogram (for numbers), topValues (for strings), completeness score.
 */
export function profileData(
  datasetId: string,
  rows: Record<string, unknown>[],
  columns: { name: string; type: ColumnType }[],
): ProfileStats {
  const totalRows = rows.length;

  // Check duplicates on original data
  const fingerprints = new Set<string>();
  let duplicateRows = 0;
  for (const row of rows) {
    const fp = columns.map((c) => String(row[c.name] ?? '')).join('|');
    if (fingerprints.has(fp)) {
      duplicateRows++;
    } else {
      fingerprints.add(fp);
    }
  }

  let totalNonNull = 0;
  let totalCells = 0;

  const columnProfiles: ColumnProfile[] = columns.map((col) => {
    const values = rows.map((r) => r[col.name]);
    const nonNull = values.filter((v) => v !== null && v !== undefined && v !== '');
    const uniqueSet = new Set(nonNull.map(String));

    totalCells += values.length;
    totalNonNull += nonNull.length;

    const base: ColumnProfile = {
      name: col.name,
      type: col.type,
      count: values.length,
      nullCount: values.length - nonNull.length,
      uniqueCount: uniqueSet.size,
    };

    if (col.type === 'number') {
      const nums = nonNull.filter((v): v is number => typeof v === 'number' && isFinite(v));
      if (nums.length > 0) {
        const sorted = [...nums].sort((a, b) => a - b);
        const sum = nums.reduce((a, b) => a + b, 0);
        const mean = sum / nums.length;
        const variance = nums.reduce((acc, v) => acc + (v - mean) ** 2, 0) / nums.length;
        const stdDev = Math.sqrt(variance);
        const mid = Math.floor(sorted.length / 2);
        const median = sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;

        base.mean = round(mean);
        base.median = round(median);
        base.stdDev = round(stdDev);
        base.min = sorted[0];
        base.max = sorted[sorted.length - 1];
        base.histogram = buildHistogram(sorted);
      }
    } else if (col.type === 'string') {
      base.topValues = buildTopValues(nonNull.map(String));
      base.min = nonNull.length > 0 ? String(nonNull.reduce((a, b) => (String(a) < String(b) ? a : b))) : undefined;
      base.max = nonNull.length > 0 ? String(nonNull.reduce((a, b) => (String(a) > String(b) ? a : b))) : undefined;
    } else if (col.type === 'date') {
      const dates = nonNull
        .map((v) => (typeof v === 'string' ? new Date(v).getTime() : NaN))
        .filter((t) => !isNaN(t));
      if (dates.length > 0) {
        const sorted = [...dates].sort((a, b) => a - b);
        base.min = new Date(sorted[0]).toISOString();
        base.max = new Date(sorted[sorted.length - 1]).toISOString();
      }
    }

    return base;
  });

  const completenessScore = totalCells > 0 ? round((totalNonNull / totalCells) * 100) : 100;

  return {
    datasetId,
    columns: columnProfiles,
    totalRows,
    duplicateRows,
    completenessScore,
    generatedAt: new Date().toISOString(),
  };
}

function buildHistogram(sortedNums: number[], bins = 10): { bin: string; count: number }[] {
  if (sortedNums.length === 0) return [];

  const min = sortedNums[0];
  const max = sortedNums[sortedNums.length - 1];

  if (min === max) {
    return [{ bin: String(min), count: sortedNums.length }];
  }

  const binWidth = (max - min) / bins;
  const histogram: { bin: string; count: number }[] = [];

  for (let i = 0; i < bins; i++) {
    const lo = min + i * binWidth;
    const hi = i === bins - 1 ? max + 1 : min + (i + 1) * binWidth;
    const label = `${round(lo)}–${round(min + (i + 1) * binWidth)}`;
    const count = sortedNums.filter((v) => v >= lo && v < hi).length;
    histogram.push({ bin: label, count });
  }

  return histogram;
}

function buildTopValues(values: string[], limit = 10): { value: string; count: number }[] {
  const freq = new Map<string, number>();
  for (const v of values) {
    freq.set(v, (freq.get(v) ?? 0) + 1);
  }

  return Array.from(freq.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([value, count]) => ({ value, count }));
}

function round(n: number, decimals = 2): number {
  const f = 10 ** decimals;
  return Math.round(n * f) / f;
}
