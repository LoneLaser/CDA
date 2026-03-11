import { useState } from 'react';
import type { DescriptiveStats } from '../../types';
import {
  TrendingUp,
  TrendingDown,
  Minus,
  BarChart3,
  Hash,
  ArrowDown,
  ArrowUp,
  Info,
} from 'lucide-react';

// ─── Stat Explanations ───

const STAT_INFO: Record<string, string> = {
  Count: 'The total number of non-null observations in this column.',
  Mean: 'The arithmetic average — the sum of all values divided by the count. Sensitive to outliers.',
  Median: 'The middle value when data is sorted. More robust to outliers than the mean.',
  Mode: 'The most frequently occurring value(s) in the dataset.',
  Min: 'The smallest observed value in this column.',
  Max: 'The largest observed value in this column.',
  'Std Dev': 'Standard deviation — measures how spread out values are from the mean. A larger value means more variability.',
  Variance: 'The square of the standard deviation. Measures the average squared distance from the mean.',
  'Q1 (25%)': 'The first quartile — 25% of values fall below this point.',
  'Q3 (75%)': 'The third quartile — 75% of values fall below this point.',
  IQR: 'Interquartile Range (Q3 − Q1) — the range of the middle 50% of values. Used to detect outliers.',
  Skewness: 'Measures asymmetry of the distribution. Positive = right-skewed (long right tail), Negative = left-skewed (long left tail), Zero = symmetric.',
  Kurtosis: 'Measures the "tailedness" of the distribution. High kurtosis = heavy tails & sharp peak (leptokurtic). Low kurtosis = light tails & flat peak (platykurtic). ~3 = normal distribution.',
};

function InfoTooltip({ statName }: { statName: string }) {
  const [show, setShow] = useState(false);
  const info = STAT_INFO[statName];
  if (!info) return null;

  return (
    <span className="relative inline-flex">
      <button
        type="button"
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        onClick={() => setShow((v) => !v)}
        className="text-surface-500 hover:text-primary-400 transition-colors p-0.5"
        aria-label={`Info about ${statName}`}
      >
        <Info className="w-3 h-3" />
      </button>
      {show && (
        <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 px-3 py-2 rounded-lg bg-surface-900 border border-surface-700/50 text-[11px] text-surface-300 leading-relaxed shadow-lg z-50 animate-fade-in pointer-events-none">
          <span className="font-semibold text-surface-100">{statName}:</span> {info}
        </span>
      )}
    </span>
  );
}

interface StatsSummaryProps {
  stats: DescriptiveStats;
  compact?: boolean;
}

/**
 * Display descriptive statistics for a column in a visually rich layout.
 */
export function StatsSummary({ stats, compact = false }: StatsSummaryProps) {
  const skewIcon =
    stats.skewness > 0.5 ? TrendingUp :
    stats.skewness < -0.5 ? TrendingDown : Minus;

  const skewLabel =
    stats.skewness > 1 ? 'Highly right-skewed' :
    stats.skewness > 0.5 ? 'Moderately right-skewed' :
    stats.skewness < -1 ? 'Highly left-skewed' :
    stats.skewness < -0.5 ? 'Moderately left-skewed' :
    'Approximately symmetric';

  const kurtosisLabel =
    stats.kurtosis > 3 ? 'Leptokurtic (heavy tails)' :
    stats.kurtosis < -1 ? 'Platykurtic (light tails)' :
    'Mesokurtic (normal-like)';

  if (compact) {
    return (
      <div className="grid grid-cols-4 gap-2 text-xs">
        <MiniStat label="Mean" value={stats.mean} />
        <MiniStat label="Median" value={stats.median} />
        <MiniStat label="Std Dev" value={stats.stdDev} />
        <MiniStat label="IQR" value={stats.iqr} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Row 1: Central tendency */}
      <div>
        <h5 className="text-[10px] uppercase tracking-wider text-surface-500 font-semibold mb-2">
          Central Tendency
        </h5>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard icon={Hash} label="Count" value={stats.count} />
          <StatCard icon={BarChart3} label="Mean" value={stats.mean} accent />
          <StatCard icon={Minus} label="Median" value={stats.median} accent />
          <StatCard icon={Hash} label="Mode" value={stats.mode.length > 0 ? stats.mode[0] : '—'} />
        </div>
      </div>

      {/* Row 2: Spread */}
      <div>
        <h5 className="text-[10px] uppercase tracking-wider text-surface-500 font-semibold mb-2">
          Spread & Range
        </h5>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard icon={ArrowDown} label="Min" value={stats.min} />
          <StatCard icon={ArrowUp} label="Max" value={stats.max} />
          <StatCard label="Std Dev" value={stats.stdDev} accent />
          <StatCard label="Variance" value={stats.variance} />
        </div>
      </div>

      {/* Row 3: Quartiles */}
      <div>
        <h5 className="text-[10px] uppercase tracking-wider text-surface-500 font-semibold mb-2">
          Quartiles
        </h5>
        <div className="grid grid-cols-3 gap-3">
          <StatCard label="Q1 (25%)" value={stats.q1} />
          <StatCard label="Q3 (75%)" value={stats.q3} />
          <StatCard label="IQR" value={stats.iqr} accent />
        </div>
      </div>

      {/* Row 4: Shape */}
      <div>
        <h5 className="text-[10px] uppercase tracking-wider text-surface-500 font-semibold mb-2">
          Distribution Shape
        </h5>
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-lg border border-surface-700/50 bg-surface-800/60 p-3">
            <div className="flex items-center gap-2 mb-1">
              {(() => {
                const Icon = skewIcon;
                return <Icon className="w-3.5 h-3.5 text-primary-400" />;
              })()}
              <span className="text-[10px] uppercase tracking-wider text-surface-500 font-medium">
                Skewness
              </span>
              <InfoTooltip statName="Skewness" />
            </div>
            <div className="text-lg font-semibold text-surface-100 font-mono">{stats.skewness}</div>
            <div className="text-[10px] text-surface-400 mt-0.5">{skewLabel}</div>
          </div>
          <div className="rounded-lg border border-surface-700/50 bg-surface-800/60 p-3">
            <div className="flex items-center gap-2 mb-1">
              <BarChart3 className="w-3.5 h-3.5 text-accent-400" />
              <span className="text-[10px] uppercase tracking-wider text-surface-500 font-medium">
                Kurtosis
              </span>
              <InfoTooltip statName="Kurtosis" />
            </div>
            <div className="text-lg font-semibold text-surface-100 font-mono">{stats.kurtosis}</div>
            <div className="text-[10px] text-surface-400 mt-0.5">{kurtosisLabel}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  accent = false,
}: {
  icon?: React.ComponentType<{ className?: string }>;
  label: string;
  value: number | string;
  accent?: boolean;
}) {
  const formatted = typeof value === 'number'
    ? formatNumber(value)
    : value;

  return (
    <div className="rounded-lg border border-surface-700/50 bg-surface-800/60 p-3">
      <div className="flex items-center gap-1.5 mb-1">
        {Icon && <Icon className="w-3 h-3 text-surface-500" />}
        <span className="text-[10px] uppercase tracking-wider text-surface-500 font-medium">
          {label}
        </span>
        <InfoTooltip statName={label} />
      </div>
      <div
        className={`text-sm font-semibold font-mono ${accent ? 'text-primary-300' : 'text-surface-100'}`}
      >
        {formatted}
      </div>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="text-center">
      <div className="text-[10px] text-surface-500">{label}</div>
      <div className="text-xs font-mono text-surface-200">{formatNumber(value)}</div>
    </div>
  );
}

function formatNumber(n: number): string {
  if (n === 0) return '0';
  if (Math.abs(n) >= 1e9) return (n / 1e9).toFixed(2) + 'B';
  if (Math.abs(n) >= 1e6) return (n / 1e6).toFixed(2) + 'M';
  if (Math.abs(n) >= 1e4) return (n / 1e3).toFixed(1) + 'K';
  if (Number.isInteger(n)) return n.toLocaleString();
  if (Math.abs(n) < 0.001) return n.toExponential(2);
  return n.toFixed(4);
}
