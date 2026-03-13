// Copyright (c) 2026 Justin Glaser. All rights reserved.
// Use of this source code is governed by a license that can be
// found in the LICENSE file in the root of this repository.

import { useCallback, useEffect, useState } from 'react';
import { Header } from '../components/layout';
import { Card, EmptyState, StatusBadge, DataTable, Button } from '../components/common';
import { ProfileViewer } from '../components/pipeline/ProfileViewer';
import { CrosswalkEditor, type CrosswalkMapping } from '../components/pipeline/CrosswalkEditor';
import { useDataStore } from '../stores';
import { useUIStore } from '../stores/uiStore';
import { runPipeline, loadProfile, loadSilverRows, loadGoldRows } from '../services/pipelineOrchestrator';
import { applyCrosswalk } from '../services/crosswalkService';
import { formatBytes, loadBronzeRows } from '../services/bronzeIngestion';
import type { ProfileStats } from '../types';
import {
  GitBranch,
  Database,
  Sparkles,
  ArrowDown,
  FileSpreadsheet,
  Eye,
  ChevronDown,
  ChevronUp,
  Shuffle,
  Loader2,
} from 'lucide-react';

type PreviewLayer = 'bronze' | 'silver' | 'gold' | null;

const stages = [
  {
    name: 'Bronze',
    subtitle: 'Raw Ingestion',
    icon: Database,
    color: 'from-amber-500 to-amber-600',
    borderColor: 'border-amber-500/30',
    bgColor: 'bg-amber-500/10',
    desc: 'Raw data stored as uploaded — no transformations applied.',
    details: [
      'File is parsed (CSV via Papa Parse, JSON, or Excel via xlsx)',
      'Each row is stored as-is in the Bronze IndexedDB table',
      'Column names and types are auto-detected via sampling',
      'Original data is preserved as the immutable source of truth',
      'Metadata is recorded: row count, column count, file size, upload timestamp',
    ],
  },
  {
    name: 'Silver',
    subtitle: 'Cleansed & Profiled',
    icon: Sparkles,
    color: 'from-surface-300 to-surface-400',
    borderColor: 'border-surface-400/30',
    bgColor: 'bg-surface-400/10',
    desc: 'Deduplicated, type-inferred, cleaned, and profiled.',
    details: [
      'Columns that are >90% null are automatically dropped',
      'Type coercion: strings are cast to numbers, dates, or booleans where applicable',
      'Duplicate rows are removed using hash-based fingerprinting',
      'Remaining null values are filled with sensible defaults (median for numbers, mode for strings, false for booleans)',
      'Data profiling runs: unique counts, null counts, histograms, top values, completeness score',
      'If a crosswalk was applied, column renaming and type changes happen here',
    ],
  },
  {
    name: 'Gold',
    subtitle: 'Analytics-Ready',
    icon: FileSpreadsheet,
    color: 'from-yellow-400 to-yellow-500',
    borderColor: 'border-yellow-500/30',
    bgColor: 'bg-yellow-500/10',
    desc: 'Optimized, aggregated, and ready for analysis.',
    details: [
      'Columns are categorized as numeric, categorical, or date',
      'Pre-computed aggregations for each numeric column: sum, average, min, max, count',
      'Data is stored in its final typed form optimized for chart rendering and statistics',
      'The Gold layer powers the Analytics engine (descriptive stats, correlations) and Dashboard charts',
      'Aggregation summaries are persisted for fast export and AI prompt context injection',
    ],
  },
];

export function PipelinePage() {
  const datasets = useDataStore((s) => s.datasets);
  const activeDatasetId = useDataStore((s) => s.activeDatasetId);
  const setActiveDataset = useDataStore((s) => s.setActiveDataset);
  const updateDatasetStatus = useDataStore((s) => s.updateDatasetStatus);
  const setProfile = useDataStore((s) => s.setProfile);
  const addToast = useUIStore((s) => s.addToast);
  const activeDataset = datasets.find((d) => d.id === activeDatasetId);

  const [profile, setProfileState] = useState<ProfileStats | null>(null);
  const [previewLayer, setPreviewLayer] = useState<PreviewLayer>(null);
  const [previewRows, setPreviewRows] = useState<Record<string, unknown>[]>([]);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [showArchitecture, setShowArchitecture] = useState(true);
  const [showCrosswalk, setShowCrosswalk] = useState(false);
  const [rerunning, setRerunning] = useState(false);

  // Load profile when active dataset changes
  useEffect(() => {
    if (activeDatasetId) {
      loadProfile(activeDatasetId).then(setProfileState);
    } else {
      setProfileState(null);
    }
    setPreviewLayer(null);
    setPreviewRows([]);
  }, [activeDatasetId]);

  const handlePreview = async (layer: PreviewLayer) => {
    if (!activeDatasetId || layer === previewLayer) {
      setPreviewLayer(null);
      setPreviewRows([]);
      return;
    }
    setLoadingPreview(true);
    setPreviewLayer(layer);
    try {
      let rows: Record<string, unknown>[] = [];
      if (layer === 'bronze') rows = await loadBronzeRows(activeDatasetId);
      else if (layer === 'silver') rows = await loadSilverRows(activeDatasetId);
      else if (layer === 'gold') rows = await loadGoldRows(activeDatasetId);
      setPreviewRows(rows);
    } finally {
      setLoadingPreview(false);
    }
  };

  const handleCrosswalkApply = useCallback(
    async (mappings: CrosswalkMapping[]) => {
      if (!activeDataset) return;
      setShowCrosswalk(false);
      setRerunning(true);

      try {
        // Apply crosswalk to dataset columns metadata
        const { columns: newColumns } = applyCrosswalk([], activeDataset.columns, mappings);

        // Update dataset metadata with new column names/types
        const updatedDataset = {
          ...activeDataset,
          columns: newColumns,
        };
        updateDatasetStatus(activeDataset.id, { columns: newColumns });

        // Re-run pipeline with updated metadata
        await runPipeline(updatedDataset, {
          onStatusChange: (stage, status) => {
            updateDatasetStatus(activeDataset.id, {
              status: { ...activeDataset.status, [stage]: status },
            });
          },
          onProgress: () => {},
          onComplete: (result) => {
            setProfile(activeDataset.id, result.profile);
            setProfileState(result.profile);
            addToast({
              type: 'success',
              title: 'Crosswalk Applied',
              message: `Pipeline re-run complete with ${mappings.filter((m) => m.originalName !== m.newName || m.originalType !== m.newType).length} column(s) remapped`,
            });
          },
          onError: (err) => {
            addToast({ type: 'error', title: 'Pipeline Error', message: err.message });
          },
        }, mappings);
      } catch (err) {
        addToast({
          type: 'error',
          title: 'Crosswalk Failed',
          message: err instanceof Error ? err.message : 'Unknown error',
        });
      } finally {
        setRerunning(false);
      }
    },
    [activeDataset, updateDatasetStatus, setProfile, addToast],
  );

  return (
    <div className="flex flex-col h-screen">
      <Header title="Pipeline" subtitle="Medallion data processing pipeline" />

      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Collapsible architecture diagram */}
          <Card>
            <button
              onClick={() => setShowArchitecture((v) => !v)}
              className="flex items-center justify-between w-full"
            >
              <div className="flex items-center gap-2">
                <GitBranch className="w-4 h-4 text-primary-400" />
                <h3 className="text-sm font-semibold text-surface-200">Medallion Architecture</h3>
              </div>
              {showArchitecture ? (
                <ChevronUp className="w-4 h-4 text-surface-500" />
              ) : (
                <ChevronDown className="w-4 h-4 text-surface-500" />
              )}
            </button>

            {showArchitecture && (
              <div className="mt-4">
                <p className="text-xs text-surface-400 mb-4">
                  Your data flows through three layers of progressive refinement — from raw ingestion through
                  cleansing to analytics-ready output. All processing happens locally in your browser.
                </p>

                <div className="space-y-3">
                  {stages.map((stage, idx) => {
                    const Icon = stage.icon;
                    return (
                      <div key={stage.name}>
                        <div
                          className={`flex items-start gap-4 p-4 rounded-xl border ${stage.borderColor} ${stage.bgColor}`}
                        >
                          <div
                            className={`flex items-center justify-center w-10 h-10 rounded-lg bg-gradient-to-br ${stage.color} text-white shrink-0`}
                          >
                            <Icon className="w-5 h-5" />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-semibold text-surface-100">{stage.name}</p>
                              <span className="text-[10px] font-medium uppercase tracking-wider text-surface-500">
                                {stage.subtitle}
                              </span>
                            </div>
                            <p className="text-xs text-surface-400 mt-1">{stage.desc}</p>
                            <ul className="mt-2 space-y-1">
                              {stage.details.map((detail, dIdx) => (
                                <li key={dIdx} className="flex items-start gap-2 text-[11px] text-surface-400/80">
                                  <span className="text-surface-500 mt-0.5">•</span>
                                  <span>{detail}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>
                        {idx < stages.length - 1 && (
                          <div className="flex justify-center py-1">
                            <ArrowDown className="w-4 h-4 text-surface-600" />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </Card>

          {/* Pipeline runs */}
          <Card>
            <h3 className="text-sm font-semibold text-surface-200 mb-4">Pipeline Runs</h3>
            {datasets.length === 0 ? (
              <EmptyState
                icon={<GitBranch className="w-7 h-7 text-surface-500" />}
                title="No pipeline runs"
                description="Upload a dataset to trigger the Medallion pipeline processing."
              />
            ) : (
              <div className="space-y-2">
                {datasets.map((ds) => (
                  <button
                    key={ds.id}
                    onClick={() => setActiveDataset(ds.id === activeDatasetId ? null : ds.id)}
                    className={`flex items-center gap-4 p-3 rounded-lg w-full text-left transition-all ${
                      ds.id === activeDatasetId
                        ? 'bg-primary-600/10 border border-primary-500/30'
                        : 'bg-surface-800/40 border border-surface-700/30 hover:bg-surface-800/60'
                    }`}
                  >
                    <FileSpreadsheet className="w-5 h-5 text-surface-400 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-surface-200 truncate">{ds.name}</p>
                      <p className="text-xs text-surface-500">
                        {ds.rowCount.toLocaleString()} rows · {formatBytes(ds.fileSize)}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <StatusBadge status={ds.status.bronze} />
                      <ArrowDown className="w-3 h-3 text-surface-600 rotate-[-90deg]" />
                      <StatusBadge status={ds.status.silver} />
                      <ArrowDown className="w-3 h-3 text-surface-600 rotate-[-90deg]" />
                      <StatusBadge status={ds.status.gold} />
                    </div>
                  </button>
                ))}
              </div>
            )}
          </Card>

          {/* Active dataset details */}
          {activeDataset && (
            <>
              {/* Crosswalk & Re-run */}
              <Card>
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-surface-200">Data Crosswalk</h3>
                    <p className="text-xs text-surface-400 mt-0.5">
                      Rename columns or change types before pipeline processing
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      icon={rerunning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Shuffle className="w-4 h-4" />}
                      onClick={() => setShowCrosswalk(true)}
                      disabled={rerunning || activeDataset.status.bronze !== 'done'}
                    >
                      {rerunning ? 'Processing...' : 'Edit Crosswalk'}
                    </Button>
                  </div>
                </div>
              </Card>

              {/* Layer preview buttons */}
              <Card>
                <h3 className="text-sm font-semibold text-surface-200 mb-3">Data Preview</h3>
                <div className="flex items-center gap-2 mb-4">
                  {(['bronze', 'silver', 'gold'] as const).map((layer) => {
                    const status = activeDataset.status[layer];
                    return (
                      <Button
                        key={layer}
                        variant={previewLayer === layer ? 'primary' : 'secondary'}
                        size="sm"
                        icon={<Eye className="w-3.5 h-3.5" />}
                        disabled={status !== 'done'}
                        onClick={() => handlePreview(layer)}
                      >
                        {layer.charAt(0).toUpperCase() + layer.slice(1)}
                      </Button>
                    );
                  })}
                </div>

                {loadingPreview && (
                  <p className="text-xs text-surface-400 animate-pulse-soft">Loading rows...</p>
                )}
                {previewLayer && !loadingPreview && (
                  <DataTable rows={previewRows} />
                )}
                {!previewLayer && !loadingPreview && (
                  <p className="text-xs text-surface-500 text-center py-4">
                    Select a layer to preview the data at that stage
                  </p>
                )}
              </Card>

              {/* Profile */}
              {profile && (
                <Card>
                  <h3 className="text-sm font-semibold text-surface-200 mb-4">Data Profile</h3>
                  <ProfileViewer profile={profile} />
                </Card>
              )}
            </>
          )}
        </div>
      </div>

      {/* Crosswalk Editor Modal */}
      {showCrosswalk && activeDataset && (
        <CrosswalkEditor
          columns={activeDataset.columns}
          profile={profile}
          onApply={handleCrosswalkApply}
          onCancel={() => setShowCrosswalk(false)}
        />
      )}
    </div>
  );
}
