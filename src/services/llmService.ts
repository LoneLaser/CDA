import type {
  LLMConfig,
  LLMProvider,
  AIAnalysisType,
  AIAnalysisRequest,
  DescriptiveStats,
  CorrelationResult,
  ColumnMeta,
} from '../types';

// ─── Constants ───

export const PROVIDER_MODELS: Record<LLMProvider, { id: string; label: string }[]> = {
  openai: [
    { id: 'gpt-4o', label: 'GPT-4o' },
    { id: 'gpt-4o-mini', label: 'GPT-4o Mini' },
    { id: 'gpt-4-turbo', label: 'GPT-4 Turbo' },
    { id: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo' },
  ],
  anthropic: [
    { id: 'claude-sonnet-4-20250514', label: 'Claude Sonnet 4' },
    { id: 'claude-3-5-haiku-20241022', label: 'Claude 3.5 Haiku' },
    { id: 'claude-3-5-sonnet-20241022', label: 'Claude 3.5 Sonnet' },
  ],
  gemini: [
    { id: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash' },
    { id: 'gemini-2.0-flash-lite', label: 'Gemini 2.0 Flash Lite' },
    { id: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro' },
    { id: 'gemini-1.5-flash', label: 'Gemini 1.5 Flash' },
  ],
};

export const DEFAULT_MODELS: Record<LLMProvider, string> = {
  openai: 'gpt-4o-mini',
  anthropic: 'claude-3-5-haiku-20241022',
  gemini: 'gemini-2.0-flash',
};

// ─── Prompt Builder ───

const ANALYSIS_LABELS: Record<AIAnalysisType, string> = {
  summary: 'Dataset Summary & Overview',
  patterns: 'Pattern Detection & Trends',
  anomalies: 'Anomaly & Outlier Explanation',
  recommendations: 'Actionable Recommendations',
  custom: 'Custom Analysis',
};

function formatStats(stats: DescriptiveStats[]): string {
  if (!stats.length) return 'No descriptive statistics available.';
  return stats
    .map(
      (s) =>
        `  ${s.column}: mean=${s.mean.toFixed(2)}, median=${s.median.toFixed(2)}, std=${s.stdDev.toFixed(2)}, min=${s.min}, max=${s.max}, skew=${s.skewness.toFixed(2)}, kurt=${s.kurtosis.toFixed(2)}`,
    )
    .join('\n');
}

function formatCorrelations(corrs: CorrelationResult[]): string {
  if (!corrs.length) return 'No correlation data available.';
  const significant = corrs.filter((c) => c.significant);
  if (!significant.length) return 'No statistically significant correlations found (p < 0.05).';
  return significant
    .sort((a, b) => Math.abs(b.pearson) - Math.abs(a.pearson))
    .slice(0, 15)
    .map(
      (c) =>
        `  ${c.column1} ↔ ${c.column2}: Pearson=${c.pearson.toFixed(3)}, Spearman=${c.spearman.toFixed(3)}, p=${c.pValue.toFixed(4)}`,
    )
    .join('\n');
}

function formatColumns(columns: ColumnMeta[]): string {
  return columns
    .map(
      (c) =>
        `  ${c.name} (${c.type}) — ${c.uniqueCount} unique, ${c.nullCount} nulls, nullable=${c.nullable}`,
    )
    .join('\n');
}

function formatSample(rows: Record<string, unknown>[]): string {
  if (!rows.length) return 'No sample data available.';
  return rows
    .slice(0, 5)
    .map((r, i) => `  Row ${i + 1}: ${JSON.stringify(r)}`)
    .join('\n');
}

export function buildPrompt(request: AIAnalysisRequest): string {
  const sections: string[] = [
    `You are an expert data analyst. Analyze the following dataset and provide a detailed ${ANALYSIS_LABELS[request.type]}.`,
    '',
    `## Dataset: "${request.datasetName}"`,
    `Rows: ${request.rowCount.toLocaleString()}`,
    `Columns (${request.columns.length}):`,
    formatColumns(request.columns),
  ];

  if (request.descriptiveStats?.length) {
    sections.push('', '## Descriptive Statistics (Numeric Columns):', formatStats(request.descriptiveStats));
  }

  if (request.correlations?.length) {
    sections.push('', '## Significant Correlations:', formatCorrelations(request.correlations));
  }

  if (request.sampleRows?.length) {
    sections.push('', '## Sample Rows:', formatSample(request.sampleRows));
  }

  // Type-specific instructions
  const instructions: Record<AIAnalysisType, string> = {
    summary:
      'Provide a comprehensive summary: what this dataset represents, key characteristics of each column, data quality observations, and overall structure. Use clear sections with headers.',
    patterns:
      'Identify meaningful patterns, trends, and relationships in the data. Look for: seasonal patterns, clusters, monotonic trends, distribution shapes, and feature interactions. Explain the significance of each finding.',
    anomalies:
      'Identify and explain potential anomalies, outliers, and unusual patterns. For each anomaly: describe what is unusual, which columns are affected, possible explanations, and recommended actions.',
    recommendations:
      'Based on the data characteristics and statistics, provide actionable recommendations for: further analysis, data cleaning improvements, potential predictive models, visualization suggestions, and business insights.',
    custom: request.customPrompt ?? 'Provide any relevant analysis insights.',
  };

  sections.push('', '## Instructions:', instructions[request.type]);
  sections.push(
    '',
    'Format your response in Markdown with clear headers, bullet points, and bold key terms. Be specific and reference actual column names and values.',
  );

  return sections.join('\n');
}

// ─── API Callers ───

interface LLMResponse {
  content: string;
  tokenUsage?: { prompt: number; completion: number; total: number };
}

async function callOpenAI(config: LLMConfig, prompt: string): Promise<LLMResponse> {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model: config.model,
      messages: [
        { role: 'system', content: 'You are an expert data analyst providing clear, actionable insights from dataset statistics.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.3,
      max_tokens: 2048,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(
      (err as { error?: { message?: string } })?.error?.message ?? `OpenAI API error: ${res.status} ${res.statusText}`,
    );
  }

  const data = await res.json() as {
    choices: { message: { content: string } }[];
    usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
  };

  return {
    content: data.choices[0]?.message?.content ?? '',
    tokenUsage: data.usage
      ? { prompt: data.usage.prompt_tokens, completion: data.usage.completion_tokens, total: data.usage.total_tokens }
      : undefined,
  };
}

async function callAnthropic(config: LLMConfig, prompt: string): Promise<LLMResponse> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': config.apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: config.model,
      max_tokens: 2048,
      messages: [{ role: 'user', content: prompt }],
      system: 'You are an expert data analyst providing clear, actionable insights from dataset statistics.',
      temperature: 0.3,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(
      (err as { error?: { message?: string } })?.error?.message ?? `Anthropic API error: ${res.status} ${res.statusText}`,
    );
  }

  const data = await res.json() as {
    content: { type: string; text: string }[];
    usage?: { input_tokens: number; output_tokens: number };
  };

  const text = data.content
    .filter((b) => b.type === 'text')
    .map((b) => b.text)
    .join('');

  return {
    content: text,
    tokenUsage: data.usage
      ? { prompt: data.usage.input_tokens, completion: data.usage.output_tokens, total: data.usage.input_tokens + data.usage.output_tokens }
      : undefined,
  };
}

// ─── Public API ───

export async function queryLLM(config: LLMConfig, prompt: string): Promise<LLMResponse> {
  switch (config.provider) {
    case 'openai':
      return callOpenAI(config, prompt);
    case 'anthropic':
      return callAnthropic(config, prompt);
    case 'gemini':
      return callGemini(config, prompt);
    default:
      throw new Error(`Unsupported LLM provider: ${config.provider}`);
  }
}

async function callGemini(config: LLMConfig, prompt: string): Promise<LLMResponse> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${config.model}:generateContent?key=${config.apiKey}`;
  
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            { text: `You are an expert data analyst providing clear, actionable insights from dataset statistics.\n\n${prompt}` },
          ],
        },
      ],
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 2048,
      },
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(
      (err as { error?: { message?: string } })?.error?.message ?? `Gemini API error: ${res.status} ${res.statusText}`,
    );
  }

  const data = await res.json() as {
    candidates?: { content: { parts: { text: string }[] } }[];
    usageMetadata?: { promptTokenCount: number; candidatesTokenCount: number; totalTokenCount: number };
  };

  const text = data.candidates?.[0]?.content?.parts?.map((p) => p.text).join('') ?? '';

  return {
    content: text,
    tokenUsage: data.usageMetadata
      ? {
          prompt: data.usageMetadata.promptTokenCount,
          completion: data.usageMetadata.candidatesTokenCount,
          total: data.usageMetadata.totalTokenCount,
        }
      : undefined,
  };
}

/**
 * Run a complete AI analysis: build prompt from dataset context, call LLM, return result.
 */
export async function runAIAnalysis(
  config: LLMConfig,
  request: AIAnalysisRequest,
): Promise<LLMResponse & { prompt: string }> {
  const prompt = buildPrompt(request);
  const response = await queryLLM(config, prompt);
  return { ...response, prompt };
}
