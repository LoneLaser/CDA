import {
  mean,
  median,
  mode,
  standardDeviation,
  variance,
  quantile,
  interquartileRange,
  sampleSkewness,
  sampleKurtosis,
} from 'simple-statistics';
import type { DescriptiveStats } from '../types';

/**
 * Compute descriptive statistics for a single numeric column.
 */
export function computeDescriptiveStats(
  columnName: string,
  values: unknown[],
): DescriptiveStats | null {
  const nums = values.filter(
    (v): v is number => typeof v === 'number' && isFinite(v),
  );

  if (nums.length < 2) return null;

  const sorted = [...nums].sort((a, b) => a - b);
  const m = mean(sorted);
  const med = median(sorted);
  const mo = mode(sorted);
  const sd = standardDeviation(sorted);
  const v = variance(sorted);
  const q1 = quantile(sorted, 0.25);
  const q3 = quantile(sorted, 0.75);
  const iqr = interquartileRange(sorted);

  // Skewness/kurtosis need ≥3 values
  let skewness = 0;
  let kurtosis = 0;
  if (nums.length >= 3) {
    try {
      skewness = sampleSkewness(sorted);
    } catch {
      skewness = 0;
    }
  }
  if (nums.length >= 4) {
    try {
      kurtosis = sampleKurtosis(sorted);
    } catch {
      kurtosis = 0;
    }
  }

  return {
    column: columnName,
    count: nums.length,
    mean: r(m),
    median: r(med),
    mode: Array.isArray(mo) ? mo.map(r) : [r(mo)],
    stdDev: r(sd),
    variance: r(v),
    min: sorted[0],
    max: sorted[sorted.length - 1],
    q1: r(q1),
    q3: r(q3),
    iqr: r(iqr),
    skewness: r(skewness),
    kurtosis: r(kurtosis),
  };
}

/**
 * Compute descriptive stats for all numeric columns in a dataset.
 */
export function computeAllDescriptiveStats(
  rows: Record<string, unknown>[],
  numericColumns: string[],
): DescriptiveStats[] {
  const results: DescriptiveStats[] = [];

  for (const col of numericColumns) {
    const values = rows.map((r) => r[col]);
    const stat = computeDescriptiveStats(col, values);
    if (stat) results.push(stat);
  }

  return results;
}

function r(n: number, d = 4): number {
  const f = 10 ** d;
  return Math.round(n * f) / f;
}
