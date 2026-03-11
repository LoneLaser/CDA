// Copyright (c) 2026 Justin Glaser. All rights reserved.
// Use of this source code is governed by a license that can be
// found in the LICENSE file in the root of this repository.

import type { LLMConfig, DescriptiveStats, CorrelationResult, ColumnMeta } from '../types';
import { queryLLM } from './llmService';

// ─── Types ───

export type InsightKind = 'themes' | 'sentiment' | 'quality' | 'narrative';

export interface LLMInsightResult {
  kind: InsightKind;
  title: string;
  markdown: string;
  model: string;
  tokenUsage?: { prompt: number; completion: number; total: number };
  generatedAt: string;
}

// ─── Prompt builders ───

function buildContext(
  datasetName: string,
  columns: ColumnMeta[],
  rowCount: number,
  stats?: DescriptiveStats[],
  correlations?: CorrelationResult[],
  sampleRows?: Record<string, unknown>[],
): string {
  const parts: string[] = [
    `Dataset: "${datasetName}"`,
    `Rows: ${rowCount.toLocaleString()}`,
    `Columns (${columns.length}):`,
    ...columns.map(
      (c) =>
        `  ${c.name} (${c.type}) — ${c.uniqueCount} unique, ${c.nullCount} nulls`,
    ),
  ];

  if (stats?.length) {
    parts.push(
      '',
      'Descriptive Statistics:',
      ...stats.map(
        (s) =>
          `  ${s.column}: mean=${s.mean.toFixed(2)}, median=${s.median.toFixed(2)}, std=${s.stdDev.toFixed(2)}, min=${s.min}, max=${s.max}, skew=${s.skewness.toFixed(2)}`,
      ),
    );
  }

  if (correlations?.length) {
    const sig = correlations
      .filter((c) => c.significant)
      .sort((a, b) => Math.abs(b.pearson) - Math.abs(a.pearson))
      .slice(0, 12);
    if (sig.length) {
      parts.push(
        '',
        'Top Significant Correlations:',
        ...sig.map(
          (c) =>
            `  ${c.column1} ↔ ${c.column2}: r=${c.pearson.toFixed(3)}, p=${c.pValue.toFixed(4)}`,
        ),
      );
    }
  }

  if (sampleRows?.length) {
    parts.push(
      '',
      'Sample Rows:',
      ...sampleRows
        .slice(0, 5)
        .map((r, i) => `  Row ${i + 1}: ${JSON.stringify(r)}`),
    );
  }

  return parts.join('\n');
}

const PROMPTS: Record<InsightKind, (ctx: string) => string> = {
  themes: (ctx) =>
    `You are an expert data analyst. Given the following dataset context, identify the major **themes** and **patterns** present in the data. Group related columns and observations into coherent themes. For each theme, explain what it represents, which columns contribute, and what the statistics reveal about it.\n\nFormat your response in Markdown with clear headers and bullet points. Be specific with column names and values.\n\n${ctx}`,

  sentiment: (ctx) =>
    `You are an expert data analyst. Given the following dataset context, perform a **sentiment and quality assessment** of the data. Evaluate:\n- Overall data health and completeness\n- Distribution shapes (normal, skewed, bimodal)\n- Potential biases or imbalances\n- Strength of relationships between variables\n- Confidence level in the data for decision-making\n\nProvide a sentiment score (Positive / Mixed / Negative) for the overall data quality and for each major variable group. Use Markdown.\n\n${ctx}`,

  quality: (ctx) =>
    `You are an expert data analyst. Given the following dataset context, perform a thorough **data quality audit**. Identify:\n- Missing data patterns and their impact\n- Potential outliers and anomalies (referencing actual stats)\n- Type mismatches or suspicious distributions\n- Duplicate or redundant information\n- Recommendations for cleaning and enrichment\n\nRate overall quality on a scale of 1-10 and provide specific, actionable fixes. Use Markdown with headers and bullet points.\n\n${ctx}`,

  narrative: (ctx) =>
    `You are an expert data storyteller. Given the following dataset context, write a compelling **data narrative** suitable for a non-technical stakeholder. The narrative should:\n- Open with the key headline finding\n- Walk through 3-5 major insights in plain language\n- Use concrete numbers and comparisons\n- End with recommended next steps\n\nWrite in a professional but accessible tone. Use Markdown for formatting.\n\n${ctx}`,
};

const TITLES: Record<InsightKind, string> = {
  themes: 'Thematic Extraction',
  sentiment: 'Sentiment & Quality Assessment',
  quality: 'Data Quality Audit',
  narrative: 'Data Narrative',
};

// ─── Public API ───

export async function runLLMInsight(
  config: LLMConfig,
  kind: InsightKind,
  datasetName: string,
  columns: ColumnMeta[],
  rowCount: number,
  stats?: DescriptiveStats[],
  correlations?: CorrelationResult[],
  sampleRows?: Record<string, unknown>[],
): Promise<LLMInsightResult> {
  const ctx = buildContext(datasetName, columns, rowCount, stats, correlations, sampleRows);
  const prompt = PROMPTS[kind](ctx);
  const response = await queryLLM(config, prompt);

  return {
    kind,
    title: TITLES[kind],
    markdown: response.content,
    model: config.model,
    tokenUsage: response.tokenUsage,
    generatedAt: new Date().toISOString(),
  };
}
