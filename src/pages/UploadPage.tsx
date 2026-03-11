import { useCallback, useEffect, useState } from 'react';
import { Header } from '../components/layout';
import { Card, EmptyState } from '../components/common';
import { DropZone, DatasetCard } from '../components/upload';
import { useDataStore, useUIStore } from '../stores';
import { ingestBronze, loadAllDatasets, deleteDataset } from '../services/bronzeIngestion';
import { runPipeline } from '../services/pipelineOrchestrator';
import { Upload, FileUp, FileSpreadsheet, FileJson, ArrowRight, Loader2 } from 'lucide-react';

export function UploadPage() {
  const { datasets, setDatasets, addDataset, removeDataset, activeDatasetId, setActiveDataset } =
    useDataStore();
  const addToast = useUIStore((s) => s.addToast);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState('');

  // Load datasets from IndexedDB on mount
  useEffect(() => {
    loadAllDatasets().then(setDatasets);
  }, [setDatasets]);

  const { updateDatasetStatus, setProfile } = useDataStore();

  const handleFiles = useCallback(
    async (files: File[]) => {
      for (const file of files) {
        setUploading(true);
        setProgress('Starting...');
        try {
          const meta = await ingestBronze(file, setProgress);
          addDataset(meta);
          setActiveDataset(meta.id);
          addToast({
            type: 'success',
            title: 'Dataset uploaded',
            message: `${meta.name} — ${meta.rowCount.toLocaleString()} rows × ${meta.columnCount} columns`,
          });

          // Auto-trigger Silver + Gold pipeline
          setProgress('Running pipeline...');
          await runPipeline(meta, {
            onStatusChange: (stage, status) => {
              updateDatasetStatus(meta.id, {
                status: {
                  ...meta.status,
                  [stage]: status,
                },
              });
            },
            onProgress: setProgress,
            onComplete: (result) => {
              setProfile(meta.id, result.profile);
              // Reload dataset list to get final statuses
              loadAllDatasets().then(setDatasets);
              addToast({
                type: 'success',
                title: 'Pipeline complete',
                message: `${result.silverRowCount.toLocaleString()} clean rows, ${result.goldSummary.numericColumns.length} numeric columns ready`,
              });
            },
            onError: (err) => {
              addToast({
                type: 'error',
                title: 'Pipeline error',
                message: err.message,
              });
            },
          });
        } catch (err) {
          addToast({
            type: 'error',
            title: 'Upload failed',
            message: err instanceof Error ? err.message : 'Unknown error',
          });
        } finally {
          setUploading(false);
          setProgress('');
        }
      }
    },
    [addDataset, setActiveDataset, addToast, updateDatasetStatus, setProfile, setDatasets],
  );

  const handleDelete = useCallback(
    async (id: string) => {
      await deleteDataset(id);
      removeDataset(id);
      addToast({ type: 'info', title: 'Dataset deleted' });
    },
    [removeDataset, addToast],
  );

  return (
    <div className="flex flex-col h-screen">
      <Header title="Upload Data" subtitle="Import your datasets to begin analysis" />

      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Drop Zone */}
          <DropZone
            onFiles={handleFiles}
            accept={['.csv', '.json', '.tsv', '.txt', '.xlsx', '.xls']}
            disabled={uploading}
          >
            {({ isDragging }) => (
              <Card className="group relative overflow-hidden" hover>
                <div
                  className={`flex flex-col items-center justify-center py-12 px-6 border-2 border-dashed rounded-xl transition-colors ${
                    isDragging
                      ? 'border-primary-400 bg-primary-500/5'
                      : 'border-surface-600/50 hover:border-primary-500/50'
                  }`}
                >
                  {uploading ? (
                    <>
                      <Loader2 className="w-10 h-10 text-primary-400 animate-spin mb-4" />
                      <p className="text-sm font-medium text-surface-200">{progress}</p>
                    </>
                  ) : (
                    <>
                      <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-primary-600/10 border border-primary-500/20 mb-4 group-hover:scale-105 transition-transform">
                        <Upload className="w-8 h-8 text-primary-400" />
                      </div>
                      <h3 className="text-base font-semibold text-surface-100 mb-1">
                        {isDragging ? 'Drop to upload' : 'Drop files here or click to browse'}
                      </h3>
                      <p className="text-sm text-surface-400 mb-4">
                        Supports CSV, JSON, TSV, and Excel files
                      </p>
                      <div className="flex items-center gap-3">
                        {[
                          { icon: FileSpreadsheet, label: 'CSV', color: 'text-success-400' },
                          { icon: FileJson, label: 'JSON', color: 'text-primary-400' },
                          { icon: FileUp, label: 'TSV', color: 'text-accent-400' },
                          { icon: FileSpreadsheet, label: 'Excel', color: 'text-emerald-400' },
                        ].map(({ icon: Icon, label, color }) => (
                          <span key={label} className="flex items-center gap-1 text-xs text-surface-500">
                            <Icon className={`w-3.5 h-3.5 ${color}`} />
                            {label}
                          </span>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </Card>
            )}
          </DropZone>

          {/* How it works */}
          <Card>
            <h3 className="text-sm font-semibold text-surface-200 mb-4">How it works</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                {
                  step: '1',
                  title: 'Upload',
                  desc: 'Drop your data file — CSV, JSON, or TSV',
                  color: 'from-primary-500 to-primary-600',
                },
                {
                  step: '2',
                  title: 'Process',
                  desc: 'Auto-clean, profile & prepare for analysis',
                  color: 'from-accent-500 to-accent-600',
                },
                {
                  step: '3',
                  title: 'Analyze',
                  desc: 'Explore stats, correlations & dashboards',
                  color: 'from-success-500 to-success-600',
                },
              ].map(({ step, title, desc, color }) => (
                <div
                  key={step}
                  className="flex items-start gap-3 p-4 rounded-lg bg-surface-800/40 border border-surface-700/30"
                >
                  <div
                    className={`flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br ${color} text-white text-xs font-bold shrink-0`}
                  >
                    {step}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-surface-200">{title}</p>
                    <p className="text-xs text-surface-400 mt-0.5">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Dataset list */}
          <div>
            <h3 className="text-sm font-semibold text-surface-200 mb-3">
              Datasets{datasets.length > 0 && ` (${datasets.length})`}
            </h3>

            {datasets.length === 0 ? (
              <Card>
                <EmptyState
                  icon={<FileSpreadsheet className="w-7 h-7 text-surface-500" />}
                  title="No datasets yet"
                  description="Upload a file to get started with your first dataset."
                  action={
                    <button className="inline-flex items-center gap-2 text-sm font-medium text-primary-400 hover:text-primary-300 transition-colors">
                      Upload your first file <ArrowRight className="w-4 h-4" />
                    </button>
                  }
                />
              </Card>
            ) : (
              <div className="space-y-3">
                {datasets.map((ds) => (
                  <DatasetCard
                    key={ds.id}
                    dataset={ds}
                    isActive={ds.id === activeDatasetId}
                    onSelect={() => setActiveDataset(ds.id)}
                    onDelete={() => handleDelete(ds.id)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
