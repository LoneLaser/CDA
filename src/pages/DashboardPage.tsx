// Copyright (c) 2026 Justin Glaser. All rights reserved.
// Use of this source code is governed by a license that can be
// found in the LICENSE file in the root of this repository.

import { useState, useCallback, useEffect, useRef } from 'react';
import { Header } from '../components/layout';
import { Card, EmptyState, Button } from '../components/common';
import { DashboardGrid, ChartConfigPanel } from '../components/dashboard';
import { useDataStore } from '../stores/dataStore';
import { useDashboardStore } from '../stores/dashboardStore';
import { useUIStore } from '../stores/uiStore';
import { exportDashboardAsPDF, exportDashboardAsPPTX } from '../services/dashboardExport';
import { db } from '../db';
import type { ChartType, ChartConfig } from '../types';
import {
  LayoutDashboard,
  Plus,
  Trash2,
  Clock,
  Database,
  Grid3x3,
  ChevronDown,
  FileText,
  Presentation,
  Loader2,
} from 'lucide-react';

export function DashboardPage() {
  const { datasets, activeDatasetId } = useDataStore();
  const {
    dashboards,
    activeDashboardId,
    createDashboard,
    deleteDashboard,
    setActiveDashboard,
    addCard,
    removeCard,
    updateLayouts,
  } = useDashboardStore();
  const addToast = useUIStore((s) => s.addToast);

  const activeDataset = datasets.find((d) => d.id === activeDatasetId);
  const activeDashboard = dashboards.find((d) => d.id === activeDashboardId);
  const pipelineDone = activeDataset?.status.gold === 'done';

  const [showConfigPanel, setShowConfigPanel] = useState(false);
  const [showNewDialog, setShowNewDialog] = useState(false);
  const [newName, setNewName] = useState('');
  const [silverRows, setSilverRows] = useState<Record<string, unknown>[]>([]);
  const [showDashboardList, setShowDashboardList] = useState(false);
  const [exportingFormat, setExportingFormat] = useState<string | null>(null);
  const dashboardGridRef = useRef<HTMLDivElement>(null);

  // Load Silver data when active dataset changes
  useEffect(() => {
    if (!activeDataset || !pipelineDone) {
      setSilverRows([]);
      return;
    }

    (async () => {
      const rows = await db.silver
        .where('datasetId')
        .equals(activeDataset.id)
        .sortBy('rowIndex');
      setSilverRows(rows.map((r) => r.data as Record<string, unknown>));
    })();
  }, [activeDataset, pipelineDone]);

  const handleCreateDashboard = useCallback(() => {
    if (!activeDataset || !newName.trim()) return;

    createDashboard(newName.trim(), activeDataset.id);
    setNewName('');
    setShowNewDialog(false);
    addToast({
      type: 'success',
      title: 'Dashboard Created',
      message: `"${newName.trim()}" is ready for charts`,
    });
  }, [activeDataset, newName, createDashboard, addToast]);

  const handleDeleteDashboard = useCallback(
    (id: string, name: string) => {
      deleteDashboard(id);
      addToast({ type: 'info', title: 'Dashboard Deleted', message: `"${name}" removed` });
    },
    [deleteDashboard, addToast],
  );

  const handleAddCard = useCallback(
    (type: ChartType, title: string, config: ChartConfig) => {
      if (!activeDashboard) return;

      // Auto-position: find the next open spot
      const maxY = activeDashboard.cards.reduce(
        (max, c) => Math.max(max, c.layout.y + c.layout.h),
        0,
      );

      const defaultSize = getDefaultSize(type);
      const layout = { x: 0, y: maxY, ...defaultSize };

      addCard(activeDashboard.id, { type, title, config, layout });
      setShowConfigPanel(false);
      addToast({ type: 'success', title: 'Chart Added', message: title });
    },
    [activeDashboard, addCard, addToast],
  );

  const handleRemoveCard = useCallback(
    (cardId: string) => {
      if (!activeDashboard) return;
      removeCard(activeDashboard.id, cardId);
    },
    [activeDashboard, removeCard],
  );

  const handleLayoutChange = useCallback(
    (layouts: { id: string; x: number; y: number; w: number; h: number }[]) => {
      if (!activeDashboard) return;
      updateLayouts(activeDashboard.id, layouts);
    },
    [activeDashboard, updateLayouts],
  );

  const handleExportDashboard = useCallback(
    async (format: 'pdf' | 'pptx') => {
      if (!activeDashboard || !dashboardGridRef.current) return;
      setExportingFormat(format);
      try {
        if (format === 'pdf') {
          await exportDashboardAsPDF(activeDashboard.name, dashboardGridRef.current);
        } else {
          await exportDashboardAsPPTX(activeDashboard.name, dashboardGridRef.current);
        }
        addToast({ type: 'success', title: 'Exported', message: `Dashboard saved as ${format.toUpperCase()}` });
      } catch (err) {
        addToast({
          type: 'error',
          title: 'Export Failed',
          message: err instanceof Error ? err.message : 'Unknown error',
        });
      } finally {
        setExportingFormat(null);
      }
    },
    [activeDashboard, addToast],
  );

  // Dashboards for the current dataset
  const datasetDashboards = dashboards.filter(
    (d) => activeDataset && d.datasetId === activeDataset.id,
  );

  // ─── No dataset ───
  if (!activeDataset) {
    return (
      <div className="flex flex-col h-screen">
        <Header title="Dashboard" subtitle="Build interactive visualizations" />
        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-6xl mx-auto">
            <Card>
              <EmptyState
                icon={<LayoutDashboard className="w-7 h-7 text-surface-500" />}
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
        title="Dashboard"
        subtitle={
          activeDashboard
            ? `${activeDashboard.name} — ${activeDataset.name}`
            : `Build visualizations — ${activeDataset.name}`
        }
      />

      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-[1400px] mx-auto space-y-5">
          {/* ─── Toolbar ─── */}
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              {/* Dashboard Selector */}
              <div className="relative">
                <button
                  onClick={() => setShowDashboardList(!showDashboardList)}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg bg-surface-800 border border-surface-700/50 text-sm text-surface-200 hover:border-surface-600 transition-colors min-w-[180px]"
                >
                  <LayoutDashboard className="w-4 h-4 text-surface-400" />
                  <span className="truncate flex-1 text-left">
                    {activeDashboard?.name ?? 'Select dashboard...'}
                  </span>
                  <ChevronDown className="w-3.5 h-3.5 text-surface-400" />
                </button>

                {showDashboardList && (
                  <div className="absolute top-full left-0 mt-1 w-72 bg-surface-900 border border-surface-700/50 rounded-xl shadow-xl z-30 overflow-hidden">
                    {datasetDashboards.length === 0 ? (
                      <div className="p-3 text-xs text-surface-500 text-center">
                        No dashboards yet. Create one below.
                      </div>
                    ) : (
                      <div className="max-h-[240px] overflow-y-auto">
                        {datasetDashboards.map((dash) => (
                          <div
                            key={dash.id}
                            className={`flex items-center justify-between px-3 py-2.5 cursor-pointer transition-colors ${
                              dash.id === activeDashboardId
                                ? 'bg-primary-600/15 text-primary-300'
                                : 'text-surface-200 hover:bg-surface-800'
                            }`}
                          >
                            <button
                              onClick={() => {
                                setActiveDashboard(dash.id);
                                setShowDashboardList(false);
                              }}
                              className="flex-1 text-left min-w-0"
                            >
                              <div className="text-sm font-medium truncate">{dash.name}</div>
                              <div className="text-[10px] text-surface-500 flex items-center gap-2 mt-0.5">
                                <span className="flex items-center gap-1">
                                  <Grid3x3 className="w-3 h-3" />
                                  {dash.cards.length} cards
                                </span>
                                <span className="flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  {new Date(dash.updatedAt).toLocaleDateString()}
                                </span>
                              </div>
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteDashboard(dash.id, dash.name);
                              }}
                              className="p-1 rounded hover:bg-danger-600/20 text-surface-500 hover:text-danger-400 ml-2"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="border-t border-surface-700/50 p-2">
                      <button
                        onClick={() => {
                          setShowDashboardList(false);
                          setShowNewDialog(true);
                        }}
                        disabled={!pipelineDone}
                        className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-primary-400 hover:bg-primary-600/10 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        New Dashboard
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Add Chart button */}
              {activeDashboard && (
                <Button
                  variant="primary"
                  size="sm"
                  icon={<Plus className="w-4 h-4" />}
                  onClick={() => setShowConfigPanel(true)}
                >
                  Add Chart
                </Button>
              )}

              {/* Export buttons */}
              {activeDashboard && activeDashboard.cards.length > 0 && (
                <>
                  <Button
                    variant="secondary"
                    size="sm"
                    icon={exportingFormat === 'pdf' ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
                    onClick={() => handleExportDashboard('pdf')}
                    disabled={!!exportingFormat}
                  >
                    PDF
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    icon={exportingFormat === 'pptx' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Presentation className="w-4 h-4" />}
                    onClick={() => handleExportDashboard('pptx')}
                    disabled={!!exportingFormat}
                  >
                    PPTX
                  </Button>
                </>
              )}
            </div>

            {!pipelineDone && (
              <span className="text-xs text-surface-500 flex items-center gap-1.5">
                <Database className="w-3.5 h-3.5" />
                Pipeline must complete before creating dashboards
              </span>
            )}

            {activeDashboard && (
              <span className="text-[10px] text-surface-500">
                {activeDashboard.cards.length} cards · Updated{' '}
                {new Date(activeDashboard.updatedAt).toLocaleTimeString()}
              </span>
            )}
          </div>

          {/* ─── Dashboard Content ─── */}
          {activeDashboard ? (
            activeDashboard.cards.length > 0 ? (
              <div ref={dashboardGridRef}>
                <DashboardGrid
                  cards={activeDashboard.cards}
                  data={silverRows}
                  columns={activeDataset.columns}
                  onLayoutChange={handleLayoutChange}
                  onRemoveCard={handleRemoveCard}
                />
              </div>
            ) : (
              <Card>
                <EmptyState
                  icon={<Grid3x3 className="w-7 h-7 text-surface-500" />}
                  title="Empty dashboard"
                  description='Click "Add Chart" to create your first visualization.'
                />
              </Card>
            )
          ) : (
            <Card>
              <EmptyState
                icon={<LayoutDashboard className="w-7 h-7 text-surface-500" />}
                title={
                  datasetDashboards.length === 0
                    ? 'No dashboards yet'
                    : 'Select a dashboard'
                }
                description={
                  pipelineDone
                    ? datasetDashboards.length === 0
                      ? 'Create a new dashboard to start visualizing your data with interactive charts.'
                      : 'Choose a dashboard from the dropdown above to view and edit it.'
                    : 'Process the dataset through the pipeline first, then create a dashboard.'
                }
              />
              {pipelineDone && datasetDashboards.length === 0 && (
                <div className="mt-4 flex justify-center">
                  <Button
                    variant="primary"
                    size="md"
                    icon={<Plus className="w-4 h-4" />}
                    onClick={() => setShowNewDialog(true)}
                  >
                    Create Dashboard
                  </Button>
                </div>
              )}
            </Card>
          )}
        </div>
      </div>

      {/* ─── New Dashboard Dialog ─── */}
      {showNewDialog && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-surface-900 border border-surface-700/50 rounded-2xl shadow-2xl w-full max-w-sm">
            <div className="p-5 border-b border-surface-700/50">
              <h3 className="text-base font-semibold text-surface-100">New Dashboard</h3>
              <p className="text-xs text-surface-400 mt-0.5">
                For dataset: {activeDataset.name}
              </p>
            </div>
            <div className="p-5">
              <label className="block text-xs font-medium text-surface-300 mb-1.5">
                Dashboard Name
              </label>
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g. Sales Overview"
                autoFocus
                onKeyDown={(e) => e.key === 'Enter' && handleCreateDashboard()}
                className="w-full px-3 py-2 rounded-lg bg-surface-800 border border-surface-700/50 text-sm text-surface-100 placeholder:text-surface-500 focus:outline-none focus:border-primary-500/50 focus:ring-1 focus:ring-primary-500/25 transition-colors"
              />
            </div>
            <div className="flex items-center justify-end gap-3 p-5 border-t border-surface-700/50">
              <button
                onClick={() => {
                  setShowNewDialog(false);
                  setNewName('');
                }}
                className="px-4 py-2 rounded-lg text-sm font-medium text-surface-400 hover:text-surface-200 hover:bg-surface-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateDashboard}
                disabled={!newName.trim()}
                className="px-5 py-2 rounded-lg text-sm font-medium bg-primary-600 text-white hover:bg-primary-500 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Chart Config Panel ─── */}
      {showConfigPanel && activeDataset && (
        <ChartConfigPanel
          columns={activeDataset.columns}
          onAdd={handleAddCard}
          onClose={() => setShowConfigPanel(false)}
        />
      )}
    </div>
  );
}

function getDefaultSize(type: ChartType): { w: number; h: number } {
  switch (type) {
    case 'stat-card': return { w: 3, h: 2 };
    case 'pie': return { w: 4, h: 4 };
    case 'table': return { w: 6, h: 4 };
    case 'scatter': return { w: 6, h: 4 };
    default: return { w: 6, h: 3 };
  }
}
