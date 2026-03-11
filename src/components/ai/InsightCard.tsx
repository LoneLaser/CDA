// Copyright (c) 2026 Justin Glaser. All rights reserved.
// Use of this source code is governed by a license that can be
// found in the LICENSE file in the root of this repository.

import { useState } from 'react';
import type { AIInsight } from '../../types';
import {
  FileText,
  Search,
  AlertTriangle,
  Lightbulb,
  MessageSquare,
  ChevronDown,
  ChevronUp,
  Clock,
  Cpu,
  Copy,
  Check,
} from 'lucide-react';

const typeConfig: Record<string, { icon: typeof FileText; label: string; color: string }> = {
  summary: { icon: FileText, label: 'Summary', color: 'text-blue-400' },
  patterns: { icon: Search, label: 'Patterns', color: 'text-emerald-400' },
  anomalies: { icon: AlertTriangle, label: 'Anomalies', color: 'text-amber-400' },
  recommendations: { icon: Lightbulb, label: 'Recommendations', color: 'text-violet-400' },
  custom: { icon: MessageSquare, label: 'Custom', color: 'text-teal-400' },
};

interface InsightCardProps {
  insight: AIInsight;
}

export function InsightCard({ insight }: InsightCardProps) {
  const [expanded, setExpanded] = useState(true);
  const [showPrompt, setShowPrompt] = useState(false);
  const [copied, setCopied] = useState(false);

  const cfg = typeConfig[insight.type] ?? typeConfig.custom;
  const Icon = cfg.icon;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(insight.response);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="rounded-xl border border-surface-700/50 bg-surface-800/50 backdrop-blur-sm overflow-hidden animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-surface-700/30">
        <div className="flex items-center gap-3 min-w-0">
          <div className={`${cfg.color}`}>
            <Icon className="w-4.5 h-4.5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-surface-100">{cfg.label} Analysis</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-surface-700/60 text-surface-400 font-mono">
                {insight.model}
              </span>
            </div>
            <div className="flex items-center gap-3 text-[10px] text-surface-500 mt-0.5">
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {new Date(insight.createdAt).toLocaleString()}
              </span>
              {insight.tokenUsage && (
                <span className="flex items-center gap-1">
                  <Cpu className="w-3 h-3" />
                  {insight.tokenUsage.total.toLocaleString()} tokens
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={handleCopy}
            className="p-1.5 rounded-lg text-surface-500 hover:text-surface-300 hover:bg-surface-700/50 transition-colors"
            title="Copy response"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-success-400" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
          <button
            onClick={() => setExpanded(!expanded)}
            className="p-1.5 rounded-lg text-surface-500 hover:text-surface-300 hover:bg-surface-700/50 transition-colors"
          >
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Body */}
      {expanded && (
        <div className="p-4 space-y-3">
          {/* Markdown-rendered response */}
          <div className="prose-insight text-sm text-surface-200 leading-relaxed whitespace-pre-wrap break-words">
            <MarkdownRenderer content={insight.response} />
          </div>

          {/* Prompt toggle */}
          <div className="pt-2 border-t border-surface-700/30">
            <button
              onClick={() => setShowPrompt(!showPrompt)}
              className="flex items-center gap-1.5 text-[11px] text-surface-500 hover:text-surface-300 transition-colors"
            >
              <MessageSquare className="w-3 h-3" />
              {showPrompt ? 'Hide prompt' : 'View prompt'}
            </button>
            {showPrompt && (
              <pre className="mt-2 p-3 rounded-lg bg-surface-900/80 border border-surface-700/30 text-[11px] text-surface-400 font-mono whitespace-pre-wrap max-h-48 overflow-y-auto">
                {insight.prompt}
              </pre>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Simple Markdown Renderer ───

function MarkdownRenderer({ content }: { content: string }) {
  const lines = content.split('\n');
  const elements: React.ReactNode[] = [];
  let inCodeBlock = false;
  let codeLines: string[] = [];
  let codeKey = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Code block toggle
    if (line.startsWith('```')) {
      if (inCodeBlock) {
        elements.push(
          <pre
            key={`code-${codeKey++}`}
            className="my-2 p-3 rounded-lg bg-surface-900/80 border border-surface-700/30 text-[11px] font-mono text-surface-300 overflow-x-auto"
          >
            {codeLines.join('\n')}
          </pre>,
        );
        codeLines = [];
        inCodeBlock = false;
      } else {
        inCodeBlock = true;
      }
      continue;
    }

    if (inCodeBlock) {
      codeLines.push(line);
      continue;
    }

    // Headers
    if (line.startsWith('### ')) {
      elements.push(
        <h4 key={i} className="text-sm font-semibold text-surface-100 mt-4 mb-1">
          {inlineFormat(line.slice(4))}
        </h4>,
      );
    } else if (line.startsWith('## ')) {
      elements.push(
        <h3 key={i} className="text-base font-semibold text-surface-50 mt-4 mb-1.5">
          {inlineFormat(line.slice(3))}
        </h3>,
      );
    } else if (line.startsWith('# ')) {
      elements.push(
        <h2 key={i} className="text-lg font-bold text-surface-50 mt-4 mb-2">
          {inlineFormat(line.slice(2))}
        </h2>,
      );
    }
    // Bullet points
    else if (/^[-*]\s/.test(line)) {
      elements.push(
        <div key={i} className="flex gap-2 ml-2 my-0.5">
          <span className="text-primary-400 mt-0.5 shrink-0">•</span>
          <span>{inlineFormat(line.replace(/^[-*]\s/, ''))}</span>
        </div>,
      );
    }
    // Numbered list
    else if (/^\d+\.\s/.test(line)) {
      const match = line.match(/^(\d+)\.\s(.*)/)!;
      elements.push(
        <div key={i} className="flex gap-2 ml-2 my-0.5">
          <span className="text-primary-400 font-mono text-xs mt-0.5 shrink-0 w-5 text-right">
            {match[1]}.
          </span>
          <span>{inlineFormat(match[2])}</span>
        </div>,
      );
    }
    // Horizontal rule
    else if (/^---+$/.test(line.trim())) {
      elements.push(<hr key={i} className="border-surface-700/50 my-3" />);
    }
    // Empty line
    else if (!line.trim()) {
      elements.push(<div key={i} className="h-2" />);
    }
    // Regular text
    else {
      elements.push(<p key={i} className="my-0.5">{inlineFormat(line)}</p>);
    }
  }

  return <>{elements}</>;
}

/** Inline markdown formatting: **bold**, *italic*, `code`, ~~strike~~ */
function inlineFormat(text: string): React.ReactNode {
  // Split on bold, italic, code, strikethrough patterns
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`|~~[^~]+~~)/g);

  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**'))
      return <strong key={i} className="font-semibold text-surface-100">{part.slice(2, -2)}</strong>;
    if (part.startsWith('*') && part.endsWith('*'))
      return <em key={i} className="italic text-surface-300">{part.slice(1, -1)}</em>;
    if (part.startsWith('`') && part.endsWith('`'))
      return (
        <code key={i} className="px-1 py-0.5 rounded bg-surface-700/60 text-primary-300 text-[11px] font-mono">
          {part.slice(1, -1)}
        </code>
      );
    if (part.startsWith('~~') && part.endsWith('~~'))
      return <s key={i} className="text-surface-500">{part.slice(2, -2)}</s>;
    return part;
  });
}
