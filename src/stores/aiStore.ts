// Copyright (c) 2026 Justin Glaser. All rights reserved.
// Use of this source code is governed by a license that can be
// found in the LICENSE file in the root of this repository.

import { create } from 'zustand';
import { v4 as uuid } from 'uuid';
import type { LLMProvider, LLMConfig, AIInsight } from '../types';
import { DEFAULT_MODELS } from '../services/llmService';

// ─── localStorage helpers ───

const STORAGE_KEY = 'cda-ai-config';

interface PersistedConfig {
  provider: LLMProvider;
  model: string;
  openaiKey: string;
  anthropicKey: string;
  geminiKey: string;
  openaiEndpoint: string;
  anthropicEndpoint: string;
  geminiEndpoint: string;
}

function loadConfig(): PersistedConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<PersistedConfig>;
      return {
        provider: parsed.provider ?? 'openai',
        model: parsed.model ?? DEFAULT_MODELS.openai,
        openaiKey: parsed.openaiKey ?? '',
        anthropicKey: parsed.anthropicKey ?? '',
        geminiKey: parsed.geminiKey ?? '',
        openaiEndpoint: parsed.openaiEndpoint ?? '',
        anthropicEndpoint: parsed.anthropicEndpoint ?? '',
        geminiEndpoint: parsed.geminiEndpoint ?? '',
      };
    }
  } catch { /* ignore */ }
  return { provider: 'openai', model: DEFAULT_MODELS.openai, openaiKey: '', anthropicKey: '', geminiKey: '', openaiEndpoint: '', anthropicEndpoint: '', geminiEndpoint: '' };
}

function saveConfig(cfg: PersistedConfig) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cfg));
}

// ─── Store ───

interface AIState {
  // Config
  provider: LLMProvider;
  model: string;
  openaiKey: string;
  anthropicKey: string;
  geminiKey: string;
  openaiEndpoint: string;
  anthropicEndpoint: string;
  geminiEndpoint: string;

  // Runtime
  insights: AIInsight[];
  loading: boolean;
  error: string | null;

  // Actions - config
  setProvider: (p: LLMProvider) => void;
  setModel: (m: string) => void;
  setOpenAIKey: (k: string) => void;
  setAnthropicKey: (k: string) => void;
  setGeminiKey: (k: string) => void;
  setOpenAIEndpoint: (e: string) => void;
  setAnthropicEndpoint: (e: string) => void;
  setGeminiEndpoint: (e: string) => void;
  isConfigured: () => boolean;
  getLLMConfig: () => LLMConfig | null;

  // Actions - insights
  addInsight: (insight: Omit<AIInsight, 'id' | 'createdAt'>) => AIInsight;
  clearInsights: (datasetId?: string) => void;
  setLoading: (v: boolean) => void;
  setError: (e: string | null) => void;
}

const initial = loadConfig();

export const useAIStore = create<AIState>((set, get) => ({
  provider: initial.provider,
  model: initial.model,
  openaiKey: initial.openaiKey,
  anthropicKey: initial.anthropicKey,
  geminiKey: initial.geminiKey ?? '',
  openaiEndpoint: initial.openaiEndpoint ?? '',
  anthropicEndpoint: initial.anthropicEndpoint ?? '',
  geminiEndpoint: initial.geminiEndpoint ?? '',

  insights: [],
  loading: false,
  error: null,

  setProvider: (provider) => {
    const model = DEFAULT_MODELS[provider];
    set({ provider, model });
    const s = get();
    saveConfig({ provider, model, openaiKey: s.openaiKey, anthropicKey: s.anthropicKey, geminiKey: s.geminiKey, openaiEndpoint: s.openaiEndpoint, anthropicEndpoint: s.anthropicEndpoint, geminiEndpoint: s.geminiEndpoint });
  },

  setModel: (model) => {
    set({ model });
    const s = get();
    saveConfig({ provider: s.provider, model, openaiKey: s.openaiKey, anthropicKey: s.anthropicKey, geminiKey: s.geminiKey, openaiEndpoint: s.openaiEndpoint, anthropicEndpoint: s.anthropicEndpoint, geminiEndpoint: s.geminiEndpoint });
  },

  setOpenAIKey: (openaiKey) => {
    set({ openaiKey });
    const s = get();
    saveConfig({ provider: s.provider, model: s.model, openaiKey, anthropicKey: s.anthropicKey, geminiKey: s.geminiKey, openaiEndpoint: s.openaiEndpoint, anthropicEndpoint: s.anthropicEndpoint, geminiEndpoint: s.geminiEndpoint });
  },

  setAnthropicKey: (anthropicKey) => {
    set({ anthropicKey });
    const s = get();
    saveConfig({ provider: s.provider, model: s.model, openaiKey: s.openaiKey, anthropicKey, geminiKey: s.geminiKey, openaiEndpoint: s.openaiEndpoint, anthropicEndpoint: s.anthropicEndpoint, geminiEndpoint: s.geminiEndpoint });
  },

  setGeminiKey: (geminiKey) => {
    set({ geminiKey });
    const s = get();
    saveConfig({ provider: s.provider, model: s.model, openaiKey: s.openaiKey, anthropicKey: s.anthropicKey, geminiKey, openaiEndpoint: s.openaiEndpoint, anthropicEndpoint: s.anthropicEndpoint, geminiEndpoint: s.geminiEndpoint });
  },

  setOpenAIEndpoint: (openaiEndpoint) => {
    set({ openaiEndpoint });
    const s = get();
    saveConfig({ provider: s.provider, model: s.model, openaiKey: s.openaiKey, anthropicKey: s.anthropicKey, geminiKey: s.geminiKey, openaiEndpoint, anthropicEndpoint: s.anthropicEndpoint, geminiEndpoint: s.geminiEndpoint });
  },

  setAnthropicEndpoint: (anthropicEndpoint) => {
    set({ anthropicEndpoint });
    const s = get();
    saveConfig({ provider: s.provider, model: s.model, openaiKey: s.openaiKey, anthropicKey: s.anthropicKey, geminiKey: s.geminiKey, openaiEndpoint: s.openaiEndpoint, anthropicEndpoint, geminiEndpoint: s.geminiEndpoint });
  },

  setGeminiEndpoint: (geminiEndpoint) => {
    set({ geminiEndpoint });
    const s = get();
    saveConfig({ provider: s.provider, model: s.model, openaiKey: s.openaiKey, anthropicKey: s.anthropicKey, geminiKey: s.geminiKey, openaiEndpoint: s.openaiEndpoint, anthropicEndpoint: s.anthropicEndpoint, geminiEndpoint });
  },

  isConfigured: () => {
    const { provider, openaiKey, anthropicKey, geminiKey } = get();
    if (provider === 'openai') return openaiKey.length > 0;
    if (provider === 'anthropic') return anthropicKey.length > 0;
    return geminiKey.length > 0;
  },

  getLLMConfig: () => {
    const { provider, model, openaiKey, anthropicKey, geminiKey, openaiEndpoint, anthropicEndpoint, geminiEndpoint } = get();
    const apiKey = provider === 'openai' ? openaiKey : provider === 'anthropic' ? anthropicKey : geminiKey;
    const endpoint = provider === 'openai' ? openaiEndpoint : provider === 'anthropic' ? anthropicEndpoint : geminiEndpoint;
    if (!apiKey) return null;
    return { provider, model, apiKey, baseUrl: endpoint || undefined };
  },

  addInsight: (data) => {
    const insight: AIInsight = {
      ...data,
      id: uuid(),
      createdAt: new Date().toISOString(),
    };
    set((s) => ({ insights: [insight, ...s.insights] }));
    return insight;
  },

  clearInsights: (datasetId) => {
    if (datasetId) {
      set((s) => ({ insights: s.insights.filter((i) => i.datasetId !== datasetId) }));
    } else {
      set({ insights: [] });
    }
  },

  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
}));
