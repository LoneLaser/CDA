import { useState, useCallback, useEffect } from 'react';
import { Header } from '../components/layout';
import { Card, EmptyState, Button } from '../components/common';
import { AISettingsPanel, InsightCard, AnalysisRunner } from '../components/ai';
import { useDataStore } from '../stores/dataStore';
import { useAIStore } from '../stores/aiStore';
import { useUIStore } from '../stores/uiStore';
import { loadAnalytics, type AnalyticsBundle } from '../services/analyticsOrchestrator';
import { runAIAnalysis } from '../services/llmService';
import { db } from '../db';
import type { AIAnalysisType, AIAnalysisRequest } from '../types';
import {
  BrainCircuit,
  Settings,
  Trash2,
  Sparkles,
  Database,
  AlertCircle,
} from 'lucide-react';

export function AIInsightsPage() {
  const { datasets, activeDatasetId } = useDataStore();
  const {
    insights, loading, error,
    isConfigured, getLLMConfig,
    addInsight, clearInsights,
    setLoading, setError,
  } = useAIStore();
  const addToast = useUIStore((s) => s.addToast);

  const activeDataset = datasets.find((d) => d.id === activeDatasetId);
  const pipelineDone = activeDataset?.status.gold === 'done';

  const [showSettings, setShowSettings] = useState(false);
  const [analyticsBundle, setAnalyticsBundle] = useState<AnalyticsBundle | null>(null);
  const [sampleRows, setSampleRows] = useState<Record<string, unknown>[]>([]);

  // Load analytics + sample rows when dataset changes
  useEffect(() => {
    if (!activeDataset || !pipelineDone) {
      setAnalyticsBundle(null);
      setSampleRows([]);
      return;
    }

    let cancelled = false;
    (async () => {
      const [bundle, silverRecords] = await Promise.all([
        loadAnalytics(activeDataset.id),
        db.silver.where('datasetId').equals(activeDataset.id).limit(10).sortBy('rowIndex'),
      ]);
      if (cancelled) return;
      setAnalyticsBundle(bundle);
      setSampleRows(silverRecords.map((r) => r.data as Record<string, unknown>));
    })();

    return () => { cancelled = true; };
  }, [activeDataset, pipelineDone]);

  const datasetInsights = insights.filter(
    (i) => activeDataset && i.datasetId === activeDataset.id,
  );

  const handleRunAnalysis = useCallback(
    async (type: AIAnalysisType, customPrompt?: string) => {
      if (!activeDataset) return;

      const config = getLLMConfig();
      if (!config) {
        addToast({ type: 'warning', title: 'No API Key', message: 'Configure an API key in AI Settings first.' });
        setShowSettings(true);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const request: AIAnalysisRequest = {
          type,
          datasetName: activeDataset.name,
          columns: activeDataset.columns,
          rowCount: activeDataset.rowCount,
          descriptiveStats: analyticsBundle?.descriptive,
          correlations: analyticsBundle?.correlations,
          sampleRows,
          customPrompt,
        };

        const result = await runAIAnalysis(config, request);

        addInsight({
          datasetId: activeDataset.id,
          type,
          prompt: result.prompt,
          response: result.content,
          model: config.model,
          provider: config.provider,
          tokenUsage: result.tokenUsage,
        });

        addToast({ type: 'success', title: 'Analysis Complete', message: `${type} analysis finished` });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error occurred';
        setError(message);
        addToast({ type: 'error', title: 'Analysis Failed', message });
      } finally {
        setLoading(false);
      }
    },
    [activeDataset, analyticsBundle, sampleRows, getLLMConfig, addInsight, addToast, setLoading, setError],
  );

  // ─── No dataset ───
  if (!activeDataset) {
    return (
      <div className="flex flex-col h-screen">
        <Header title="AI Insights" subtitle="LLM-powered data analysis" />
        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-5xl mx-auto">
            <Card>
              <EmptyState
                icon={<BrainCircuit className="w-7 h-7 text-surface-500" />}
                title="No dataset selected"
                description="Select or upload a dataset from the Upload page first."
              />
            </Card>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen">
      <Header
        title="AI Insights"
        subtitle={`LLM-powered analysis — ${activeDataset.name}`}
      />

      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-5xl mx-auto space-y-5">
          {/* ─── Toolbar ─── */}
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${isConfigured() ? 'bg-success-400' : 'bg-surface-600'}`} />
                <span className="text-xs text-surface-400">
                  {isConfigured() ? 'LLM Connected' : 'No API key configured'}
                </span>
              </div>
              <Button
                variant="secondary"
                size="sm"
                icon={<Settings className="w-4 h-4" />}
                onClick={() => setShowSettings(true)}
              >
                AI Settings
              </Button>
            </div>
            <div className="flex items-center gap-3">
              {!pipelineDone && (
                <span className="text-xs text-surface-500 flex items-center gap-1.5">
                  <Database className="w-3.5 h-3.5" />
                  Run the pipeline first for best results
                </span>
              )}
              {!analyticsBundle && pipelineDone && (
                <span className="text-xs text-surface-500 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  Run Analytics first for richer AI insights
                </span>
              )}
              {datasetInsights.length > 0 && (
                <button
                  onClick={() => {
                    clearInsights(activeDataset.id);
                    addToast({ type: 'info', title: 'Insights Cleared', message: 'All insights for this dataset removed' });
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-surface-400 hover:text-danger-400 hover:bg-danger-600/10 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Clear Insights
                </button>
              )}
            </div>
          </div>

          {/* ─── Error Alert ─── */}
          {error && (
            <div className="flex items-start gap-3 p-4 rounded-xl border border-danger-500/30 bg-danger-600/10">
              <AlertCircle className="w-5 h-5 text-danger-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium text-danger-300">Analysis Error</p>
                <p className="text-xs text-danger-400/80 mt-0.5">{error}</p>
              </div>
            </div>
          )}

          {/* ─── Analysis Runner ─── */}
          <AnalysisRunner
            loading={loading}
            disabled={!isConfigured()}
            onRun={handleRunAnalysis}
          />

          {/* ─── Context Info ─── */}
          {pipelineDone && (
            <div className="grid grid-cols-4 gap-3">
              {[
                { label: 'Rows', value: activeDataset.rowCount.toLocaleString() },
                { label: 'Columns', value: activeDataset.columnCount.toString() },
                { label: 'Numeric Stats', value: analyticsBundle ? `${analyticsBundle.descriptive.length} cols` : 'Not computed' },
                { label: 'Correlations', value: analyticsBundle ? `${analyticsBundle.correlations.filter(c => c.significant).length} significant` : 'Not computed' },
              ].map((s) => (
                <div
                  key={s.label}
                  className="p-3 rounded-xl bg-surface-800/40 border border-surface-700/30"
                >
                  <div className="text-[10px] text-surface-500 uppercase tracking-wider">{s.label}</div>
                  <div className="text-sm font-semibold text-surface-200 mt-0.5">{s.value}</div>
                </div>
              ))}
            </div>
          )}

          {/* ─── Insights List ─── */}
          {datasetInsights.length > 0 ? (
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-surface-200 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary-400" />
                Analysis Results ({datasetInsights.length})
              </h3>
              {datasetInsights.map((insight) => (
                <InsightCard key={insight.id} insight={insight} />
              ))}
            </div>
          ) : (
            <Card>
              <EmptyState
                icon={<Sparkles className="w-7 h-7 text-surface-500" />}
                title="No insights yet"
                description={
                  isConfigured()
                    ? 'Select an analysis type above and click "Run Analysis" to get AI-powered insights about your data.'
                    : 'Configure an API key in AI Settings to start generating AI insights.'
                }
                action={
                  !isConfigured() ? (
                    <Button
                      variant="primary"
                      size="md"
                      icon={<Settings className="w-4 h-4" />}
                      onClick={() => setShowSettings(true)}
                    >
                      Configure AI
                    </Button>
                  ) : undefined
                }
              />
            </Card>
          )}
        </div>
      </div>

      {/* ─── Settings Modal ─── */}
      {showSettings && <AISettingsPanel onClose={() => setShowSettings(false)} />}
    </div>
  );
}
