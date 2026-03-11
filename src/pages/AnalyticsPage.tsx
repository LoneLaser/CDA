import { useState, useCallback, useMemo } from 'react';
import { Header } from '../components/layout';
import { Card, EmptyState } from '../components/common';
import { CorrelationHeatmap, DistributionChart, StatsSummary } from '../components/analytics';
import { useDataStore } from '../stores/dataStore';
import { useUIStore } from '../stores/uiStore';
import { runAnalytics, loadAnalytics, type AnalyticsBundle } from '../services/analyticsOrchestrator';
import { db } from '../db';
import type { DescriptiveStats, ColumnType } from '../types';
import {
  FlaskConical,
  TrendingUp,
  BarChart3,
  BrainCircuit,
  Play,
  Loader2,
  ChevronDown,
  ChevronRight,
  Columns3,
  Grid3x3,
  ArrowLeftRight,
  CheckCircle2,
} from 'lucide-react';

type Tab = 'overview' | 'descriptive' | 'correlation' | 'distribution';
type CorrMode = 'pearson' | 'spearman';

export function AnalyticsPage() {
  const { datasets, activeDatasetId } = useDataStore();
  const addToast = useUIStore((s) => s.addToast);

  const activeDataset = datasets.find((d) => d.id === activeDatasetId);
  const pipelineDone = activeDataset?.status.gold === 'done';

  const [analytics, setAnalytics] = useState<AnalyticsBundle | null>(null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState('');
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [selectedColumn, setSelectedColumn] = useState<string | null>(null);
  const [corrMode, setCorrMode] = useState<CorrMode>('pearson');
  const [expandedStats, setExpandedStats] = useState<Set<string>>(new Set());

  // Cached column data for distribution charts
  const [silverRows, setSilverRows] = useState<Record<string, unknown>[]>([]);

  const handleRunAnalytics = useCallback(async () => {
    if (!activeDataset) return;

    setLoading(true);
    setProgress('Starting analytics...');
    setAnalytics(null);

    try {
      const columns = activeDataset.columns.map((c) => ({
        name: c.name,
        type: c.type as ColumnType,
      }));

      const bundle = await runAnalytics(activeDataset.id, columns, (msg) => setProgress(msg));

      // Load silver rows for distribution charts
      const rows = await db.silver
        .where('datasetId')
        .equals(activeDataset.id)
        .sortBy('rowIndex');
      setSilverRows(rows.map((r) => r.data as Record<string, unknown>));

      setAnalytics(bundle);
      setActiveTab('overview');

      if (bundle.descriptive.length > 0) {
        setSelectedColumn(bundle.descriptive[0].column);
      }

      addToast({
        type: 'success',
        title: 'Analytics Complete',
        message: `Computed stats for ${bundle.descriptive.length} columns, ${bundle.correlations.length} correlations`,
      });
    } catch (err) {
      addToast({
        type: 'error',
        title: 'Analytics Failed',
        message: err instanceof Error ? err.message : 'Unknown error',
      });
    } finally {
      setLoading(false);
      setProgress('');
    }
  }, [activeDataset, addToast]);

  // Try loading cached analytics on dataset switch
  const handleLoadCached = useCallback(async () => {
    if (!activeDataset) return;

    const cached = await loadAnalytics(activeDataset.id);
    if (cached) {
      setAnalytics(cached);
      if (cached.descriptive.length > 0) {
        setSelectedColumn(cached.descriptive[0].column);
      }

      // Load silver rows for distribution charts
      const rows = await db.silver
        .where('datasetId')
        .equals(activeDataset.id)
        .sortBy('rowIndex');
      setSilverRows(rows.map((r) => r.data as Record<string, unknown>));
    }
  }, [activeDataset]);

  // Auto-load cached when dataset changes
  useState(() => {
    if (activeDataset) handleLoadCached();
  });

  const toggleExpanded = (col: string) => {
    setExpandedStats((prev) => {
      const next = new Set(prev);
      if (next.has(col)) next.delete(col);
      else next.add(col);
      return next;
    });
  };

  const selectedStats = analytics?.descriptive.find((d) => d.column === selectedColumn) ?? null;

  // ─── No dataset selected ───
  if (!activeDataset) {
    return (
      <div className="flex flex-col h-screen">
        <Header title="Analytics" subtitle="Statistical analysis and insights" />
        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-5xl mx-auto">
            <Card>
              <EmptyState
                icon={<FlaskConical className="w-7 h-7 text-surface-500" />}
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
        title="Analytics"
        subtitle={`Statistical analysis — ${activeDataset.name}`}
      />

      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-6xl mx-auto space-y-5">
          {/* ─── Capability Cards ─── */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <CapabilityCard
              icon={TrendingUp}
              title="Descriptive Statistics"
              desc="Mean, median, std deviation, quartiles, skewness & kurtosis"
              color="text-primary-400"
              bg="bg-primary-500/10"
              border="border-primary-500/20"
              active={analytics !== null}
              count={analytics?.descriptive.length}
            />
            <CapabilityCard
              icon={BarChart3}
              title="Correlation Analysis"
              desc="Pearson & Spearman correlation with p-value significance"
              color="text-accent-400"
              bg="bg-accent-500/10"
              border="border-accent-500/20"
              active={analytics !== null}
              count={analytics?.correlations.length}
            />
            <CapabilityCard
              icon={BrainCircuit}
              title="LLM Insights"
              desc="AI-powered thematic extraction & sentiment analysis"
              color="text-warning-400"
              bg="bg-warning-500/10"
              border="border-warning-500/20"
              active={false}
              badge="Phase 6"
            />
          </div>

          {/* ─── Run Analytics Button ─── */}
          <div className="flex items-center gap-3">
            <button
              onClick={handleRunAnalytics}
              disabled={loading || !pipelineDone}
              className={`
                inline-flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium text-sm
                transition-all duration-200
                ${
                  !pipelineDone
                    ? 'bg-surface-700 text-surface-500 cursor-not-allowed'
                    : loading
                      ? 'bg-primary-600/60 text-primary-200 cursor-wait'
                      : 'bg-primary-600 text-white hover:bg-primary-500 hover:shadow-lg hover:shadow-primary-500/25 active:scale-[0.98]'
                }
              `}
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Play className="w-4 h-4" />
              )}
              {loading ? 'Running Analytics...' : 'Run Analytics'}
            </button>

            {!pipelineDone && (
              <span className="text-xs text-surface-500">
                Pipeline must complete before running analytics
              </span>
            )}

            {progress && (
              <span className="text-xs text-primary-400 animate-pulse">{progress}</span>
            )}

            {analytics && !loading && (
              <span className="text-xs text-success-400 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Computed {analytics.computedAt ? new Date(analytics.computedAt).toLocaleTimeString() : ''}
              </span>
            )}
          </div>

          {/* ─── Results ─── */}
          {analytics && (
            <>
              {/* Tab Navigation */}
              <div className="flex border-b border-surface-700/50">
                {(
                  [
                    { id: 'overview' as Tab, label: 'Overview', icon: Grid3x3 },
                    { id: 'descriptive' as Tab, label: 'Descriptive Stats', icon: Columns3 },
                    { id: 'correlation' as Tab, label: 'Correlations', icon: ArrowLeftRight },
                    { id: 'distribution' as Tab, label: 'Distributions', icon: BarChart3 },
                  ] as const
                ).map(({ id, label, icon: Icon }) => (
                  <button
                    key={id}
                    onClick={() => setActiveTab(id)}
                    className={`
                      flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors
                      ${activeTab === id
                        ? 'border-primary-500 text-primary-300'
                        : 'border-transparent text-surface-400 hover:text-surface-200 hover:border-surface-600'
                      }
                    `}
                  >
                    <Icon className="w-4 h-4" />
                    {label}
                  </button>
                ))}
              </div>

              {/* Tab Content */}
              {activeTab === 'overview' && (
                <OverviewTab analytics={analytics} />
              )}

              {activeTab === 'descriptive' && (
                <DescriptiveTab
                  analytics={analytics}
                  expandedStats={expandedStats}
                  toggleExpanded={toggleExpanded}
                />
              )}

              {activeTab === 'correlation' && (
                <CorrelationTab
                  analytics={analytics}
                  corrMode={corrMode}
                  setCorrMode={setCorrMode}
                />
              )}

              {activeTab === 'distribution' && (
                <DistributionTab
                  analytics={analytics}
                  silverRows={silverRows}
                  selectedColumn={selectedColumn}
                  setSelectedColumn={setSelectedColumn}
                  selectedStats={selectedStats}
                />
              )}
            </>
          )}

          {/* ─── Empty State ─── */}
          {!analytics && !loading && (
            <Card>
              <EmptyState
                icon={<FlaskConical className="w-7 h-7 text-surface-500" />}
                title="No analyses yet"
                description={
                  pipelineDone
                    ? 'Click "Run Analytics" to compute descriptive statistics and correlations.'
                    : 'Process the dataset through the pipeline first, then run analytics.'
                }
              />
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════ Sub-components ═══════════════ */

function CapabilityCard({
  icon: Icon,
  title,
  desc,
  color,
  bg,
  border,
  active,
  count,
  badge,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  desc: string;
  color: string;
  bg: string;
  border: string;
  active: boolean;
  count?: number;
  badge?: string;
}) {
  return (
    <Card hover>
      <div className="flex items-start justify-between">
        <div
          className={`flex items-center justify-center w-10 h-10 rounded-lg ${bg} border ${border} mb-3`}
        >
          <Icon className={`w-5 h-5 ${color}`} />
        </div>
        {active && count !== undefined && (
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-success-500/15 text-success-400 border border-success-500/25">
            {count} results
          </span>
        )}
        {badge && (
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-surface-700 text-surface-400">
            {badge}
          </span>
        )}
      </div>
      <h4 className="text-sm font-semibold text-surface-100 mb-1">{title}</h4>
      <p className="text-xs text-surface-400">{desc}</p>
    </Card>
  );
}

function OverviewTab({ analytics }: { analytics: AnalyticsBundle }) {
  const significantCorrs = analytics.correlations.filter((c) => c.significant);
  const strongCorrs = analytics.correlations
    .filter((c) => Math.abs(c.pearson) > 0.7)
    .sort((a, b) => Math.abs(b.pearson) - Math.abs(a.pearson));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
      {/* Summary Cards */}
      <Card>
        <h4 className="text-sm font-semibold text-surface-100 mb-4">Analysis Summary</h4>
        <div className="grid grid-cols-2 gap-3">
          <OverviewStat label="Total Rows" value={analytics.totalRows.toLocaleString()} />
          <OverviewStat label="Numeric Columns" value={analytics.numericColumns.length} />
          <OverviewStat label="Categorical Columns" value={analytics.categoricalColumns.length} />
          <OverviewStat label="Correlation Pairs" value={analytics.correlations.length} />
          <OverviewStat
            label="Significant Correlations"
            value={significantCorrs.length}
            accent
          />
          <OverviewStat
            label="Strong Correlations"
            value={strongCorrs.length}
            accent
          />
        </div>
      </Card>

      {/* Top Correlations */}
      <Card>
        <h4 className="text-sm font-semibold text-surface-100 mb-4">
          Strongest Correlations
        </h4>
        {strongCorrs.length === 0 ? (
          <p className="text-xs text-surface-400">
            No strong correlations (|r| &gt; 0.7) found.
          </p>
        ) : (
          <div className="space-y-2 max-h-[260px] overflow-y-auto">
            {strongCorrs.slice(0, 10).map((c) => (
              <div
                key={`${c.column1}-${c.column2}`}
                className="flex items-center justify-between rounded-lg bg-surface-800/60 border border-surface-700/40 px-3 py-2"
              >
                <div className="text-xs text-surface-200">
                  <span className="font-mono">{c.column1}</span>
                  <span className="text-surface-500 mx-1.5">×</span>
                  <span className="font-mono">{c.column2}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span
                    className={`text-xs font-mono font-semibold ${
                      c.pearson > 0 ? 'text-primary-400' : 'text-rose-400'
                    }`}
                  >
                    r = {c.pearson.toFixed(3)}
                  </span>
                  {c.significant && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-success-500/15 text-success-400">
                      p &lt; 0.05
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Quick Stats - highest/lowest mean, max variance */}
      <Card className="lg:col-span-2">
        <h4 className="text-sm font-semibold text-surface-100 mb-4">Quick Insights</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {analytics.descriptive.length > 0 && (
            <>
              <InsightCard
                label="Highest Mean"
                column={
                  analytics.descriptive.reduce((a, b) => (a.mean > b.mean ? a : b)).column
                }
                value={analytics.descriptive.reduce((a, b) => (a.mean > b.mean ? a : b)).mean}
              />
              <InsightCard
                label="Highest Variance"
                column={
                  analytics.descriptive.reduce((a, b) =>
                    a.variance > b.variance ? a : b,
                  ).column
                }
                value={analytics.descriptive.reduce((a, b) =>
                  a.variance > b.variance ? a : b,
                ).variance}
              />
              <InsightCard
                label="Most Skewed"
                column={
                  analytics.descriptive.reduce((a, b) =>
                    Math.abs(a.skewness) > Math.abs(b.skewness) ? a : b,
                  ).column
                }
                value={analytics.descriptive.reduce((a, b) =>
                  Math.abs(a.skewness) > Math.abs(b.skewness) ? a : b,
                ).skewness}
              />
              <InsightCard
                label="Widest Range"
                column={
                  analytics.descriptive.reduce((a, b) =>
                    a.max - a.min > b.max - b.min ? a : b,
                  ).column
                }
                value={(() => {
                  const d = analytics.descriptive.reduce((a, b) =>
                    a.max - a.min > b.max - b.min ? a : b,
                  );
                  return d.max - d.min;
                })()}
              />
            </>
          )}
        </div>
      </Card>
    </div>
  );
}

function DescriptiveTab({
  analytics,
  expandedStats,
  toggleExpanded,
}: {
  analytics: AnalyticsBundle;
  expandedStats: Set<string>;
  toggleExpanded: (col: string) => void;
}) {
  return (
    <div className="space-y-3">
      {analytics.descriptive.length === 0 ? (
        <Card>
          <p className="text-sm text-surface-400 text-center py-4">
            No numeric columns found for descriptive statistics.
          </p>
        </Card>
      ) : (
        analytics.descriptive.map((stat) => {
          const expanded = expandedStats.has(stat.column);
          return (
            <Card key={stat.column} padding={false}>
              <button
                onClick={() => toggleExpanded(stat.column)}
                className="w-full flex items-center justify-between p-4 hover:bg-surface-700/20 transition-colors rounded-t-xl"
              >
                <div className="flex items-center gap-3">
                  {expanded ? (
                    <ChevronDown className="w-4 h-4 text-surface-400" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-surface-400" />
                  )}
                  <span className="text-sm font-semibold text-surface-100 font-mono">
                    {stat.column}
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary-500/10 text-primary-400 border border-primary-500/20">
                    numeric
                  </span>
                </div>
                <StatsSummary stats={stat} compact />
              </button>
              {expanded && (
                <div className="px-4 pb-4 border-t border-surface-700/30 pt-4">
                  <StatsSummary stats={stat} />
                </div>
              )}
            </Card>
          );
        })
      )}
    </div>
  );
}

function CorrelationTab({
  analytics,
  corrMode,
  setCorrMode,
}: {
  analytics: AnalyticsBundle;
  corrMode: CorrMode;
  setCorrMode: (m: CorrMode) => void;
}) {
  return (
    <div className="space-y-4">
      {/* Mode Toggle */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-surface-400">Method:</span>
        <div className="flex rounded-lg border border-surface-700/50 overflow-hidden">
          {(['pearson', 'spearman'] as const).map((m) => (
            <button
              key={m}
              onClick={() => setCorrMode(m)}
              className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                corrMode === m
                  ? 'bg-primary-600 text-white'
                  : 'bg-surface-800 text-surface-400 hover:text-surface-200'
              }`}
            >
              {m.charAt(0).toUpperCase() + m.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Heatmap */}
      <Card>
        <h4 className="text-sm font-semibold text-surface-100 mb-4">
          Correlation Matrix
        </h4>
        <CorrelationHeatmap
          correlations={analytics.correlations}
          columns={analytics.numericColumns}
          mode={corrMode}
        />
      </Card>

      {/* Detailed Table */}
      <Card>
        <h4 className="text-sm font-semibold text-surface-100 mb-4">
          Correlation Details
        </h4>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-surface-700/50">
                <th className="text-left py-2 px-3 text-surface-400 font-medium">Column 1</th>
                <th className="text-left py-2 px-3 text-surface-400 font-medium">Column 2</th>
                <th className="text-right py-2 px-3 text-surface-400 font-medium">Pearson</th>
                <th className="text-right py-2 px-3 text-surface-400 font-medium">Spearman</th>
                <th className="text-right py-2 px-3 text-surface-400 font-medium">p-value</th>
                <th className="text-center py-2 px-3 text-surface-400 font-medium">Significant</th>
              </tr>
            </thead>
            <tbody>
              {analytics.correlations.map((c) => (
                <tr
                  key={`${c.column1}-${c.column2}`}
                  className="border-b border-surface-800/50 hover:bg-surface-700/20 transition-colors"
                >
                  <td className="py-2 px-3 font-mono text-surface-200">{c.column1}</td>
                  <td className="py-2 px-3 font-mono text-surface-200">{c.column2}</td>
                  <td className={`py-2 px-3 text-right font-mono ${corrColor(c.pearson)}`}>
                    {c.pearson.toFixed(4)}
                  </td>
                  <td className={`py-2 px-3 text-right font-mono ${corrColor(c.spearman)}`}>
                    {c.spearman.toFixed(4)}
                  </td>
                  <td className="py-2 px-3 text-right font-mono text-surface-300">
                    {c.pValue < 0.001 ? '<0.001' : c.pValue.toFixed(4)}
                  </td>
                  <td className="py-2 px-3 text-center">
                    {c.significant ? (
                      <span className="text-success-400">Yes</span>
                    ) : (
                      <span className="text-surface-500">No</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function DistributionTab({
  analytics,
  silverRows,
  selectedColumn,
  setSelectedColumn,
  selectedStats,
}: {
  analytics: AnalyticsBundle;
  silverRows: Record<string, unknown>[];
  selectedColumn: string | null;
  setSelectedColumn: (col: string) => void;
  selectedStats: DescriptiveStats | null;
}) {
  const numericValues = useMemo(() => {
    if (!selectedColumn || silverRows.length === 0) return [];
    return silverRows
      .map((r) => r[selectedColumn])
      .filter((v): v is number => typeof v === 'number' && isFinite(v));
  }, [selectedColumn, silverRows]);

  return (
    <div className="space-y-4">
      {/* Column Selector */}
      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-xs text-surface-400">Column:</span>
        <div className="flex flex-wrap gap-2">
          {analytics.numericColumns.map((col) => (
            <button
              key={col}
              onClick={() => setSelectedColumn(col)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                selectedColumn === col
                  ? 'bg-primary-600 text-white shadow-md shadow-primary-500/25'
                  : 'bg-surface-800 text-surface-400 border border-surface-700/50 hover:text-surface-200 hover:border-surface-600'
              }`}
            >
              {col}
            </button>
          ))}
        </div>
      </div>

      {/* Distribution Chart */}
      {selectedColumn && selectedStats && numericValues.length > 0 && (
        <Card>
          <h4 className="text-sm font-semibold text-surface-100 mb-4">
            Distribution — <span className="font-mono text-primary-300">{selectedColumn}</span>
          </h4>
          <DistributionChart
            columnName={selectedColumn}
            values={numericValues}
            stats={selectedStats}
          />
        </Card>
      )}

      {/* Stats for selected column */}
      {selectedStats && (
        <Card>
          <h4 className="text-sm font-semibold text-surface-100 mb-4">
            Statistics — <span className="font-mono text-primary-300">{selectedColumn}</span>
          </h4>
          <StatsSummary stats={selectedStats} />
        </Card>
      )}
    </div>
  );
}

/* ─── Utility sub-components ─── */

function OverviewStat({
  label,
  value,
  accent = false,
}: {
  label: string;
  value: number | string;
  accent?: boolean;
}) {
  return (
    <div className="rounded-lg border border-surface-700/50 bg-surface-800/60 p-3">
      <div className="text-[10px] uppercase tracking-wider text-surface-500 font-medium mb-1">
        {label}
      </div>
      <div className={`text-lg font-semibold font-mono ${accent ? 'text-primary-300' : 'text-surface-100'}`}>
        {value}
      </div>
    </div>
  );
}

function InsightCard({
  label,
  column,
  value,
}: {
  label: string;
  column: string;
  value: number;
}) {
  return (
    <div className="rounded-lg border border-surface-700/50 bg-surface-800/60 p-3">
      <div className="text-[10px] uppercase tracking-wider text-surface-500 font-medium mb-1">
        {label}
      </div>
      <div className="text-xs font-mono text-primary-300 mb-0.5 truncate" title={column}>
        {column}
      </div>
      <div className="text-sm font-semibold text-surface-100 font-mono">
        {formatCompact(value)}
      </div>
    </div>
  );
}

function corrColor(r: number): string {
  const abs = Math.abs(r);
  if (abs > 0.7) return r > 0 ? 'text-primary-400' : 'text-rose-400';
  if (abs > 0.4) return r > 0 ? 'text-primary-500' : 'text-rose-500';
  return 'text-surface-300';
}

function formatCompact(n: number): string {
  if (Math.abs(n) >= 1e9) return (n / 1e9).toFixed(2) + 'B';
  if (Math.abs(n) >= 1e6) return (n / 1e6).toFixed(2) + 'M';
  if (Math.abs(n) >= 1e3) return (n / 1e3).toFixed(1) + 'K';
  if (Number.isInteger(n)) return n.toLocaleString();
  return n.toFixed(4);
}
