import type { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
  hover?: boolean;
  padding?: boolean;
}

export function Card({ children, className = '', hover = false, padding = true }: CardProps) {
  return (
    <div
      className={`
        rounded-xl border border-surface-700/50 bg-surface-800/50 backdrop-blur-sm
        ${hover ? 'hover:shadow-card-hover hover:border-surface-600/60 transition-all duration-200' : ''}
        ${padding ? 'p-5' : ''}
        ${className}
      `}
    >
      {children}
    </div>
  );
}

export function CardHeader({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`flex items-center justify-between mb-4 ${className}`}>
      {children}
    </div>
  );
}

export function CardTitle({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <h3 className={`text-sm font-semibold text-surface-100 ${className}`}>{children}</h3>
  );
}
