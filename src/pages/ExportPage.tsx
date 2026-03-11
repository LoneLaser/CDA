// Copyright (c) 2026 Justin Glaser. All rights reserved.
// Use of this source code is governed by a license that can be
// found in the LICENSE file in the root of this repository.

import { useState, useCallback, useEffect } from 'react';
import { Header } from '../components/layout';
import { Card, CardHeader, CardTitle, EmptyState } from '../components/common';
import { useDataStore } from '../stores/dataStore';
import { useAIStore } from '../stores/aiStore';
import { useUIStore } from '../stores/uiStore';
import { loadAnalytics, type AnalyticsBundle } from '../services/analyticsOrchestrator';
import {
  exportDataLayer,
  exportAnalyticsReport,
  exportStatsCSV,
  exportInsightsMarkdown,
  type ExportLayer,
  type ExportFormat,
} from '../services/exportService';
import {
  Download,
  FileSpreadsheet,
  FileJson,
  FileText,
  BarChart3,
  BrainCircuit,
  Database,
  Loader2,
  CheckCircle2,
  Layers,
} from 'lucide-react';

type ExportAction = 'data' | 'analytics' | 'stats-csv' | 'insights';

export function ExportPage() {
  const { datasets, activeDatasetId } = useDataStore();
  const insights = useAIStore((s) => s.insights);
  const addToast = useUIStore((s) => s.addToast);

  const activeDataset = datasets.find((d) => d.id === activeDatasetId);
  const pipelineDone = activeDataset?.status.gold === 'done';

  const [analyticsBundle, setAnalyticsBundle] = useState<AnalyticsBundle | null>(null);
  const [exporting, setExporting] = useState<string | null>(null);

  const datasetInsights = insights.filter(
    (i) => activeDataset && i.datasetId === activeDataset.id,
  );

  // Load analytics
  useEffect(() => {
    if (!activeDataset || !pipelineDone) {
      setAnalyticsBundle(null);
      return;
    }
    let cancelled = false;
    loadAnalytics(activeDataset.id).then((b) => {
      if (!cancelled) setAnalyticsBundle(b);
    });
    return () => { cancelled = true; };
  }, [activeDataset, pipelineDone]);

  const handleExport = useCallback(
    async (action: ExportAction, layer?: ExportLayer, format?: ExportFormat) => {
      if (!activeDataset) return;
      const key = `${action}-${layer ?? ''}-${format ?? ''}`;
      setExporting(key);

      try {
        switch (action) {
          case 'data':
            await exportDataLayer(activeDataset.id, activeDataset.name, layer!, format!);
            break;
          case 'analytics':
            if (analyticsBundle) exportAnalyticsReport(activeDataset, analyticsBundle);
            break;
          case 'stats-csv':
            if (analyticsBundle) exportStatsCSV(activeDataset, analyticsBundle.descriptive);
            break;
          case 'insights':
            exportInsightsMarkdown(activeDataset.name, datasetInsights);
            break;
        }
        addToast({ type: 'success', title: 'Exported', message: `File downloaded successfully` });
      } catch (err) {
        addToast({
          type: 'error',
          title: 'Export Failed',
          message: err instanceof Error ? err.message : 'Unknown error',
        });
      } finally {
        setExporting(null);
      }
    },
    [activeDataset, analyticsBundle, datasetInsights, addToast],
  );

  // ─── No dataset ───
  if (!activeDataset) {
    return (
      <div className="flex flex-col h-screen">
        <Header title="Export" subtitle="Download your data and reports" />
        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-5xl mx-auto">
            <Card>
              <EmptyState
                icon={<Download className="w-7 h-7 text-surface-500" />}
                title="No dataset selected"
                description="Select or upload a dataset from the Upload page first."
              />
            </Card>
          </div>
        </div>
      </div>
    );
  }

  const layers: { id: ExportLayer; label: string; status: string; rows: string }[] = [
    {
      id: 'bronze',
      label: 'Bronze (Raw)',
      status: activeDataset.status.bronze,
      rows: `${activeDataset.rowCount.toLocaleString()} rows`,
    },
    {
      id: 'silver',
      label: 'Silver (Cleaned)',
      status: activeDataset.status.silver,
      rows: pipelineDone ? 'Cleaned & profiled' : 'Not processed',
    },
    {
      id: 'gold',
      label: 'Gold (Analytics-Ready)',
      status: activeDataset.status.gold,
      rows: pipelineDone ? 'Optimized' : 'Not processed',
    },
  ];

  return (
    <div className="flex flex-col h-screen">
      <Header title="Export" subtitle={`Download data & reports — ${activeDataset.name}`} />

      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-5xl mx-auto space-y-6">
          {/* ─── Data Layers ─── */}
          <Card>
            <CardHeader>
              <CardTitle>
                <span className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-primary-400" />
                  Data Layers
                </span>
              </CardTitle>
            </CardHeader>
            <p className="text-xs text-surface-400 mb-4">
              Export processed data from any medallion layer as CSV or JSON.
            </p>
            <div className="space-y-3">
              {layers.map((layer) => {
                const available = layer.status === 'done';
                return (
                  <div
                    key={layer.id}
                    className={`flex items-center justify-between p-4 rounded-xl border transition-colors ${
                      available
                        ? 'border-surface-700/50 bg-surface-800/30'
                        : 'border-surface-800/40 bg-surface-900/20 opacity-50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-3 h-3 rounded-full ${
                        available ? 'bg-success-400' : 'bg-surface-600'
                      }`} />
                      <div>
                        <div className="text-sm font-medium text-surface-100">{layer.label}</div>
                        <div className="text-[10px] text-surface-500">{layer.rows}</div>
                      </div>
                    </div>
                    {available && (
                      <div className="flex items-center gap-2">
                        <ExportButton
                          icon={<FileSpreadsheet className="w-3.5 h-3.5" />}
                          label="CSV"
                          loading={exporting === `data-${layer.id}-csv`}
                          onClick={() => handleExport('data', layer.id, 'csv')}
                        />
                        <ExportButton
                          icon={<FileJson className="w-3.5 h-3.5" />}
                          label="JSON"
                          loading={exporting === `data-${layer.id}-json`}
                          onClick={() => handleExport('data', layer.id, 'json')}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </Card>

          {/* ─── Analytics Reports ─── */}
          <Card>
            <CardHeader>
              <CardTitle>
                <span className="flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-accent-400" />
                  Analytics Reports
                </span>
              </CardTitle>
            </CardHeader>
            <p className="text-xs text-surface-400 mb-4">
              Export computed statistics and correlation analysis.
            </p>
            <div className="space-y-3">
              <div className={`flex items-center justify-between p-4 rounded-xl border transition-colors ${
                analyticsBundle
                  ? 'border-surface-700/50 bg-surface-800/30'
                  : 'border-surface-800/40 bg-surface-900/20 opacity-50'
              }`}>
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${analyticsBundle ? 'bg-success-400' : 'bg-surface-600'}`} />
                  <div>
                    <div className="text-sm font-medium text-surface-100">Full Analytics Report</div>
                    <div className="text-[10px] text-surface-500">
                      {analyticsBundle
                        ? `${analyticsBundle.descriptive.length} stats, ${analyticsBundle.correlations.filter(c => c.significant).length} correlations`
                        : 'Run analytics first'
                      }
                    </div>
                  </div>
                </div>
                {analyticsBundle && (
                  <ExportButton
                    icon={<FileJson className="w-3.5 h-3.5" />}
                    label="JSON Report"
                    loading={exporting === 'analytics--'}
                    onClick={() => handleExport('analytics')}
                  />
                )}
              </div>

              <div className={`flex items-center justify-between p-4 rounded-xl border transition-colors ${
                analyticsBundle
                  ? 'border-surface-700/50 bg-surface-800/30'
                  : 'border-surface-800/40 bg-surface-900/20 opacity-50'
              }`}>
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${analyticsBundle ? 'bg-success-400' : 'bg-surface-600'}`} />
                  <div>
                    <div className="text-sm font-medium text-surface-100">Descriptive Statistics</div>
                    <div className="text-[10px] text-surface-500">
                      {analyticsBundle
                        ? `${analyticsBundle.descriptive.length} columns analyzed`
                        : 'Run analytics first'
                      }
                    </div>
                  </div>
                </div>
                {analyticsBundle && (
                  <ExportButton
                    icon={<FileSpreadsheet className="w-3.5 h-3.5" />}
                    label="CSV"
                    loading={exporting === 'stats-csv--'}
                    onClick={() => handleExport('stats-csv')}
                  />
                )}
              </div>
            </div>
          </Card>

          {/* ─── AI Insights ─── */}
          <Card>
            <CardHeader>
              <CardTitle>
                <span className="flex items-center gap-2">
                  <BrainCircuit className="w-4 h-4 text-violet-400" />
                  AI Insights
                </span>
              </CardTitle>
            </CardHeader>
            <p className="text-xs text-surface-400 mb-4">
              Export AI-generated analysis as a Markdown report.
            </p>
            <div className={`flex items-center justify-between p-4 rounded-xl border transition-colors ${
              datasetInsights.length > 0
                ? 'border-surface-700/50 bg-surface-800/30'
                : 'border-surface-800/40 bg-surface-900/20 opacity-50'
            }`}>
              <div className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full ${datasetInsights.length > 0 ? 'bg-success-400' : 'bg-surface-600'}`} />
                <div>
                  <div className="text-sm font-medium text-surface-100">AI Insights Report</div>
                  <div className="text-[10px] text-surface-500">
                    {datasetInsights.length > 0
                      ? `${datasetInsights.length} insight${datasetInsights.length !== 1 ? 's' : ''} available`
                      : 'Generate AI insights first'
                    }
                  </div>
                </div>
              </div>
              {datasetInsights.length > 0 && (
                <ExportButton
                  icon={<FileText className="w-3.5 h-3.5" />}
                  label="Markdown"
                  loading={exporting === 'insights--'}
                  onClick={() => handleExport('insights')}
                />
              )}
            </div>
          </Card>

          {/* ─── Info footer ─── */}
          <div className="flex items-center gap-2 px-1 text-xs text-surface-500">
            <Database className="w-3.5 h-3.5" />
            All exports are generated client-side. No data leaves your browser.
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Small export button ───

function ExportButton({
  icon,
  label,
  loading,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  loading: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-surface-700/60 text-surface-200 border border-surface-600/50 hover:bg-surface-700 hover:text-surface-100 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
    >
      {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : icon}
      {label}
      {!loading && <CheckCircle2 className="w-3 h-3 text-surface-500" />}
    </button>
  );
}
