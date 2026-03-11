// Copyright (c) 2026 Justin Glaser. All rights reserved.
// Use of this source code is governed by a license that can be
// found in the LICENSE file in the root of this repository.

import { useState } from 'react';
import type { AIAnalysisType } from '../../types';
import {
  FileText,
  Search,
  AlertTriangle,
  Lightbulb,
  MessageSquare,
  Play,
  Loader2,
} from 'lucide-react';

const analysisTypes: { type: AIAnalysisType; icon: typeof FileText; label: string; description: string; color: string }[] = [
  { type: 'summary', icon: FileText, label: 'Summary', description: 'Comprehensive dataset overview and characteristics', color: 'from-blue-500 to-blue-600' },
  { type: 'patterns', icon: Search, label: 'Patterns', description: 'Identify trends, clusters, and feature relationships', color: 'from-emerald-500 to-emerald-600' },
  { type: 'anomalies', icon: AlertTriangle, label: 'Anomalies', description: 'Detect and explain outliers and unusual patterns', color: 'from-amber-500 to-amber-600' },
  { type: 'recommendations', icon: Lightbulb, label: 'Recommendations', description: 'Actionable suggestions for further analysis', color: 'from-violet-500 to-violet-600' },
  { type: 'custom', icon: MessageSquare, label: 'Custom', description: 'Ask your own question about the data', color: 'from-teal-500 to-teal-600' },
];

interface AnalysisRunnerProps {
  loading: boolean;
  disabled: boolean;
  onRun: (type: AIAnalysisType, customPrompt?: string) => void;
}

export function AnalysisRunner({ loading, disabled, onRun }: AnalysisRunnerProps) {
  const [selectedType, setSelectedType] = useState<AIAnalysisType>('summary');
  const [customPrompt, setCustomPrompt] = useState('');

  const handleRun = () => {
    if (selectedType === 'custom' && !customPrompt.trim()) return;
    onRun(selectedType, selectedType === 'custom' ? customPrompt.trim() : undefined);
  };

  return (
    <div className="rounded-xl border border-surface-700/50 bg-surface-800/50 backdrop-blur-sm p-5 space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-surface-100 mb-1">Run AI Analysis</h3>
        <p className="text-xs text-surface-400">
          Choose an analysis type and let AI examine your dataset statistics.
        </p>
      </div>

      {/* Analysis Type Grid */}
      <div className="grid grid-cols-5 gap-2">
        {analysisTypes.map(({ type, icon: Icon, label, description, color }) => (
          <button
            key={type}
            onClick={() => setSelectedType(type)}
            disabled={loading}
            className={`flex flex-col items-center gap-2 p-3 rounded-xl border text-center transition-all ${
              selectedType === type
                ? 'border-primary-500/50 bg-primary-600/10 ring-1 ring-primary-500/25'
                : 'border-surface-700/40 bg-surface-800/30 hover:border-surface-600/60'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            <div className={`p-2 rounded-lg bg-gradient-to-br ${color} shadow-sm`}>
              <Icon className="w-4 h-4 text-white" />
            </div>
            <div>
              <div className="text-xs font-medium text-surface-100">{label}</div>
              <div className="text-[9px] text-surface-500 leading-tight mt-0.5 hidden lg:block">
                {description}
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* Custom prompt area */}
      {selectedType === 'custom' && (
        <div>
          <label className="block text-xs font-medium text-surface-300 mb-1.5">Your Question</label>
          <textarea
            value={customPrompt}
            onChange={(e) => setCustomPrompt(e.target.value)}
            placeholder="e.g. What are the main factors affecting sales conversion rates?"
            rows={3}
            className="w-full px-3 py-2 rounded-lg bg-surface-800 border border-surface-700/50 text-sm text-surface-100 placeholder:text-surface-500 focus:outline-none focus:border-primary-500/50 focus:ring-1 focus:ring-primary-500/25 transition-colors resize-none"
          />
        </div>
      )}

      {/* Run button */}
      <div className="flex items-center justify-between">
        <span className="text-[11px] text-surface-500">
          {loading ? 'Analyzing...' : 'Analysis sends dataset statistics to the selected LLM'}
        </span>
        <button
          onClick={handleRun}
          disabled={disabled || loading || (selectedType === 'custom' && !customPrompt.trim())}
          className="inline-flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-medium bg-primary-600 text-white hover:bg-primary-500 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm shadow-primary-500/25"
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Play className="w-4 h-4" />
          )}
          {loading ? 'Analyzing...' : 'Run Analysis'}
        </button>
      </div>
    </div>
  );
}
