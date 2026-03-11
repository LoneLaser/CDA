import type { ProfileStats } from '../../types';
import { Card } from '../common';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import {
  Hash,
  Type,
  Calendar,
  ToggleLeft,
  HelpCircle,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import type { ColumnType } from '../../types';

const typeIcons: Record<ColumnType | 'unknown', typeof Hash> = {
  number: Hash,
  string: Type,
  date: Calendar,
  boolean: ToggleLeft,
  unknown: HelpCircle,
};

interface ProfileViewerProps {
  profile: ProfileStats;
}

export function ProfileViewer({ profile }: ProfileViewerProps) {
  return (
    <div className="space-y-4">
      {/* Summary bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Total Rows" value={profile.totalRows.toLocaleString()} />
        <StatCard label="Columns" value={String(profile.columns.length)} />
        <StatCard label="Duplicates" value={String(profile.duplicateRows)} warn={profile.duplicateRows > 0} />
        <StatCard label="Completeness" value={`${profile.completenessScore}%`} good={profile.completenessScore >= 90} />
      </div>

      {/* Per-column profiles */}
      <div className="space-y-3">
        {profile.columns.map((col) => {
          const Icon = typeIcons[col.type] ?? HelpCircle;
          return (
            <Card key={col.name} className="!p-4">
              <div className="flex items-start gap-3">
                <div className="flex items-center justify-center w-8 h-8 rounded-md bg-surface-700/50 shrink-0">
                  <Icon className="w-4 h-4 text-surface-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-sm font-semibold text-surface-100">{col.name}</span>
                    <span className="text-[10px] font-mono text-surface-500 uppercase">{col.type}</span>
                    {col.nullCount > 0 && (
                      <span className="text-[10px] text-warning-400">
                        {col.nullCount} nulls
                      </span>
                    )}
                  </div>

                  {/* Numeric stats */}
                  {col.type === 'number' && col.mean !== undefined && (
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-x-4 gap-y-1 text-xs mb-3">
                      <MiniStat label="Mean" value={col.mean} />
                      <MiniStat label="Median" value={col.median} />
                      <MiniStat label="Std Dev" value={col.stdDev} />
                      <MiniStat label="Min" value={col.min} />
                      <MiniStat label="Max" value={col.max} />
                    </div>
                  )}

                  {/* Histogram */}
                  {col.histogram && col.histogram.length > 1 && (
                    <div className="h-24 mt-2">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={col.histogram} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                          <XAxis dataKey="bin" tick={false} axisLine={false} />
                          <YAxis hide />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: '#1e293b',
                              border: '1px solid #334155',
                              borderRadius: '8px',
                              fontSize: '11px',
                            }}
                          />
                          <Bar dataKey="count" fill="#818cf8" radius={[2, 2, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}

                  {/* Top string values */}
                  {col.topValues && col.topValues.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {col.topValues.slice(0, 6).map((tv) => (
                        <span
                          key={tv.value}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-surface-700/40 text-[10px] text-surface-300"
                        >
                          {tv.value.length > 20 ? tv.value.slice(0, 20) + '…' : tv.value}
                          <span className="text-surface-500">({tv.count})</span>
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Unique count */}
                  <div className="flex items-center gap-3 mt-2 text-[10px] text-surface-500">
                    <span>{col.uniqueCount.toLocaleString()} unique</span>
                    <span>{col.count.toLocaleString()} total</span>
                  </div>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function StatCard({ label, value, good, warn }: { label: string; value: string; good?: boolean; warn?: boolean }) {
  const Icon = good ? CheckCircle2 : warn ? AlertTriangle : null;
  const iconColor = good ? 'text-success-400' : 'text-warning-400';
  return (
    <div className="p-3 rounded-lg bg-surface-800/50 border border-surface-700/30">
      <div className="flex items-center gap-1.5">
        <span className="text-[10px] text-surface-500 uppercase tracking-wider">{label}</span>
        {Icon && <Icon className={`w-3 h-3 ${iconColor}`} />}
      </div>
      <p className="text-lg font-semibold text-surface-100 mt-0.5">{value}</p>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value?: number | string }) {
  return (
    <div>
      <span className="text-surface-500">{label}: </span>
      <span className="text-surface-200 font-mono">
        {value !== undefined ? (typeof value === 'number' ? value.toLocaleString(undefined, { maximumFractionDigits: 2 }) : String(value)) : '—'}
      </span>
    </div>
  );
}
