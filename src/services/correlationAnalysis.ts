import type { CorrelationResult } from '../types';

/**
 * Compute Pearson correlation coefficient between two numeric arrays.
 * Arrays must be the same length. NaN/Infinity pairs are excluded.
 */
function pearsonCorrelation(x: number[], y: number[]): number {
  const n = x.length;
  if (n < 3) return 0;

  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0, sumY2 = 0;

  for (let i = 0; i < n; i++) {
    sumX += x[i];
    sumY += y[i];
    sumXY += x[i] * y[i];
    sumX2 += x[i] * x[i];
    sumY2 += y[i] * y[i];
  }

  const numerator = n * sumXY - sumX * sumY;
  const denominator = Math.sqrt(
    (n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY),
  );

  if (denominator === 0) return 0;
  return numerator / denominator;
}

/**
 * Compute ranks for Spearman correlation.
 * Handles tied values with average ranking.
 */
function rank(arr: number[]): number[] {
  const indexed = arr.map((v, i) => ({ v, i }));
  indexed.sort((a, b) => a.v - b.v);

  const ranks = new Array<number>(arr.length);
  let i = 0;
  while (i < indexed.length) {
    let j = i;
    // Find ties
    while (j < indexed.length && indexed[j].v === indexed[i].v) {
      j++;
    }
    // Average rank for ties
    const avgRank = (i + j + 1) / 2; // 1-based
    for (let k = i; k < j; k++) {
      ranks[indexed[k].i] = avgRank;
    }
    i = j;
  }

  return ranks;
}

/**
 * Compute Spearman rank correlation coefficient.
 */
function spearmanCorrelation(x: number[], y: number[]): number {
  if (x.length < 3) return 0;
  const xRanks = rank(x);
  const yRanks = rank(y);
  return pearsonCorrelation(xRanks, yRanks);
}

/**
 * Approximate p-value for a correlation coefficient using the t-distribution approximation.
 * Uses the formula: t = r * sqrt((n-2) / (1 - r^2))
 * Then uses a two-tailed t-distribution p-value approximation.
 */
function correlationPValue(r: number, n: number): number {
  if (n < 3 || Math.abs(r) >= 1) return r === 0 ? 1 : 0;

  const t = r * Math.sqrt((n - 2) / (1 - r * r));
  const df = n - 2;

  // Approximation of two-tailed t-test p-value using the regularized incomplete beta function
  // Using a simpler approximation suitable for large df
  const x = df / (df + t * t);
  return regularizedIncompleteBeta(df / 2, 0.5, x);
}

/**
 * Rough regularized incomplete beta function approximation.
 * Suitable for p-value estimation. Uses a continued fraction expansion.
 */
function regularizedIncompleteBeta(a: number, b: number, x: number): number {
  if (x < 0 || x > 1) return 0;
  if (x === 0) return 0;
  if (x === 1) return 1;

  // Use log-beta and a series expansion
  const lnBeta = logGamma(a) + logGamma(b) - logGamma(a + b);
  const front = Math.exp(
    Math.log(x) * a + Math.log(1 - x) * b - lnBeta,
  ) / a;

  // Lentz's continued fraction algorithm
  const maxIter = 200;
  const eps = 1e-10;
  let f = 1, c = 1, d = 0;

  for (let i = 0; i <= maxIter; i++) {
    let m: number, numerator: number;

    if (i === 0) {
      numerator = 1;
    } else if (i % 2 === 0) {
      m = i / 2;
      numerator = (m * (b - m) * x) / ((a + 2 * m - 1) * (a + 2 * m));
    } else {
      m = (i - 1) / 2;
      numerator = -((a + m) * (a + b + m) * x) / ((a + 2 * m) * (a + 2 * m + 1));
    }

    d = 1 + numerator * d;
    if (Math.abs(d) < eps) d = eps;
    d = 1 / d;

    c = 1 + numerator / c;
    if (Math.abs(c) < eps) c = eps;

    f *= c * d;

    if (Math.abs(c * d - 1) < eps) break;
  }

  return front * (f - 1);
}

/**
 * Log gamma function using Stirling's approximation (Lanczos).
 */
function logGamma(z: number): number {
  const c = [
    76.18009172947146, -86.50532032941677, 24.01409824083091,
    -1.231739572450155, 0.1208650973866179e-2, -0.5395239384953e-5,
  ];
  let x = z;
  let y = z;
  let tmp = x + 5.5;
  tmp -= (x + 0.5) * Math.log(tmp);
  let ser = 1.000000000190015;
  for (let j = 0; j < 6; j++) {
    y += 1;
    ser += c[j] / y;
  }
  return -tmp + Math.log((2.5066282746310005 * ser) / x);
}

/**
 * Compute correlation matrix for all numeric column pairs.
 */
export function computeCorrelationMatrix(
  rows: Record<string, unknown>[],
  numericColumns: string[],
): CorrelationResult[] {
  const results: CorrelationResult[] = [];
  const columnData = new Map<string, number[]>();

  // Extract clean numeric arrays
  for (const col of numericColumns) {
    columnData.set(col, []);
  }

  for (const row of rows) {
    for (const col of numericColumns) {
      const v = row[col];
      if (typeof v === 'number' && isFinite(v)) {
        columnData.get(col)!.push(v);
      }
    }
  }

  // For paired analysis, we need to only use rows where both columns have valid data
  for (let i = 0; i < numericColumns.length; i++) {
    for (let j = i + 1; j < numericColumns.length; j++) {
      const col1 = numericColumns[i];
      const col2 = numericColumns[j];

      // Build paired arrays (only rows where both values are valid)
      const pairedX: number[] = [];
      const pairedY: number[] = [];

      for (const row of rows) {
        const v1 = row[col1];
        const v2 = row[col2];
        if (
          typeof v1 === 'number' && isFinite(v1) &&
          typeof v2 === 'number' && isFinite(v2)
        ) {
          pairedX.push(v1);
          pairedY.push(v2);
        }
      }

      const n = pairedX.length;
      const pearson = n >= 3 ? r(pearsonCorrelation(pairedX, pairedY)) : 0;
      const spearman = n >= 3 ? r(spearmanCorrelation(pairedX, pairedY)) : 0;
      const pValue = n >= 3 ? r(correlationPValue(pearson, n), 6) : 1;

      results.push({
        column1: col1,
        column2: col2,
        pearson,
        spearman,
        pValue,
        significant: pValue < 0.05,
      });
    }
  }

  return results;
}

/**
 * Get the correlation value between two specific columns from the matrix.
 */
export function getCorrelationValue(
  matrix: CorrelationResult[],
  col1: string,
  col2: string,
  type: 'pearson' | 'spearman' = 'pearson',
): number {
  if (col1 === col2) return 1;

  const entry = matrix.find(
    (r) =>
      (r.column1 === col1 && r.column2 === col2) ||
      (r.column1 === col2 && r.column2 === col1),
  );

  return entry ? entry[type] : 0;
}

function r(n: number, d = 4): number {
  const f = 10 ** d;
  return Math.round(n * f) / f;
}
