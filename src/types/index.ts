// Copyright (c) 2026 Justin Glaser. All rights reserved.
// Use of this source code is governed by a license that can be
// found in the LICENSE file in the root of this repository.

export interface DatasetMeta {
  id: string;
  name: string;
  fileName: string;
  fileSize: number;
  rowCount: number;
  columnCount: number;
  columns: ColumnMeta[];
  uploadedAt: string;
  status: PipelineStatus;
}

export interface ColumnMeta {
  name: string;
  type: ColumnType;
  nullable: boolean;
  uniqueCount: number;
  nullCount: number;
  sampleValues: unknown[];
}

export type ColumnType = 'string' | 'number' | 'boolean' | 'date' | 'unknown';

export interface PipelineStatus {
  bronze: StageStatus;
  silver: StageStatus;
  gold: StageStatus;
}

export type StageStatus = 'pending' | 'processing' | 'done' | 'error';

export interface ProfileStats {
  datasetId: string;
  columns: ColumnProfile[];
  totalRows: number;
  duplicateRows: number;
  completenessScore: number;
  generatedAt: string;
}

export interface ColumnProfile {
  name: string;
  type: ColumnType;
  count: number;
  nullCount: number;
  uniqueCount: number;
  mean?: number;
  median?: number;
  stdDev?: number;
  min?: number | string;
  max?: number | string;
  histogram?: { bin: string; count: number }[];
  topValues?: { value: string; count: number }[];
}

export interface AnalyticsResult {
  id: string;
  datasetId: string;
  type: 'quantitative' | 'qualitative';
  config: Record<string, unknown>;
  result: Record<string, unknown>;
  createdAt: string;
}

export interface CorrelationResult {
  column1: string;
  column2: string;
  pearson: number;
  spearman: number;
  pValue: number;
  significant: boolean;
}

export interface DescriptiveStats {
  column: string;
  count: number;
  mean: number;
  median: number;
  mode: number[];
  stdDev: number;
  variance: number;
  min: number;
  max: number;
  q1: number;
  q3: number;
  iqr: number;
  skewness: number;
  kurtosis: number;
}

export interface DashboardConfig {
  id: string;
  name: string;
  datasetId: string;
  cards: DashboardCard[];
  createdAt: string;
  updatedAt: string;
}

export interface DashboardCard {
  id: string;
  type: ChartType;
  title: string;
  config: ChartConfig;
  layout: { x: number; y: number; w: number; h: number };
}

export type ChartType = 'bar' | 'line' | 'scatter' | 'pie' | 'area' | 'histogram' | 'heatmap' | 'stat-card' | 'table';

export interface ChartConfig {
  xColumn?: string;
  yColumn?: string;
  groupBy?: string;
  aggregation?: 'sum' | 'avg' | 'count' | 'min' | 'max';
  colorScheme?: string;
  [key: string]: unknown;
}

export interface OutlierInfo {
  column: string;
  count: number;
  lowerBound: number;
  upperBound: number;
  outlierIndices: number[];
}

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
}

// ─── LLM / AI Types ───

export type LLMProvider = 'openai' | 'anthropic' | 'gemini';

export interface LLMConfig {
  provider: LLMProvider;
  apiKey: string;
  model: string;
  baseUrl?: string;
}

export type AIAnalysisType =
  | 'summary'
  | 'patterns'
  | 'anomalies'
  | 'recommendations'
  | 'custom';

export interface AIInsight {
  id: string;
  datasetId: string;
  type: AIAnalysisType;
  prompt: string;
  response: string;
  model: string;
  provider: LLMProvider;
  createdAt: string;
  tokenUsage?: { prompt: number; completion: number; total: number };
}

export interface AIAnalysisRequest {
  type: AIAnalysisType;
  datasetName: string;
  columns: ColumnMeta[];
  rowCount: number;
  descriptiveStats?: DescriptiveStats[];
  correlations?: CorrelationResult[];
  sampleRows?: Record<string, unknown>[];
  customPrompt?: string;
}
