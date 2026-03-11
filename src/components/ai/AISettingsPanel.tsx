import { useState } from 'react';
import { useAIStore } from '../../stores/aiStore';
import { PROVIDER_MODELS } from '../../services/llmService';
import type { LLMProvider } from '../../types';
import { X, Key, Eye, EyeOff, CheckCircle2, AlertCircle } from 'lucide-react';

interface AISettingsPanelProps {
  onClose: () => void;
}

export function AISettingsPanel({ onClose }: AISettingsPanelProps) {
  const {
    provider, model,
    openaiKey, anthropicKey, geminiKey,
    setProvider, setModel,
    setOpenAIKey, setAnthropicKey, setGeminiKey,
  } = useAIStore();

  const [showOpenAI, setShowOpenAI] = useState(false);
  const [showAnthropic, setShowAnthropic] = useState(false);
  const [showGemini, setShowGemini] = useState(false);

  const providers: { id: LLMProvider; label: string; description: string }[] = [
    { id: 'openai', label: 'OpenAI', description: 'GPT-4o, GPT-4 Turbo, GPT-3.5' },
    { id: 'anthropic', label: 'Anthropic', description: 'Claude Sonnet 4, Claude 3.5' },
    { id: 'gemini', label: 'Google Gemini', description: 'Gemini 2.0 Flash, 1.5 Pro' },
  ];

  const activeKey = provider === 'openai' ? openaiKey : provider === 'anthropic' ? anthropicKey : geminiKey;
  const isConfigured = activeKey.length > 0;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-surface-900 border border-surface-700/50 rounded-2xl shadow-2xl w-full max-w-lg animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-surface-700/50">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600">
              <Key className="w-4.5 h-4.5 text-white" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-surface-100">AI Settings</h2>
              <p className="text-xs text-surface-400">Configure your LLM provider and API keys</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-surface-400 hover:text-surface-200 hover:bg-surface-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Provider Selection */}
          <div>
            <label className="block text-xs font-medium text-surface-300 mb-2">Provider</label>
            <div className="grid grid-cols-3 gap-3">
              {providers.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setProvider(p.id)}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    provider === p.id
                      ? 'border-primary-500/50 bg-primary-600/10 ring-1 ring-primary-500/25'
                      : 'border-surface-700/50 bg-surface-800/30 hover:border-surface-600/60'
                  }`}
                >
                  <div className="text-sm font-medium text-surface-100">{p.label}</div>
                  <div className="text-[10px] text-surface-400 mt-0.5">{p.description}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Model Selection */}
          <div>
            <label className="block text-xs font-medium text-surface-300 mb-1.5">Model</label>
            <select
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-surface-800 border border-surface-700/50 text-sm text-surface-100 focus:outline-none focus:border-primary-500/50 focus:ring-1 focus:ring-primary-500/25 transition-colors"
            >
              {PROVIDER_MODELS[provider].map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>

          {/* API Keys */}
          <div className="space-y-3">
            <label className="block text-xs font-medium text-surface-300">API Keys</label>

            {/* OpenAI Key */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-surface-400">OpenAI API Key</span>
                {openaiKey ? (
                  <span className="flex items-center gap-1 text-[10px] text-success-400">
                    <CheckCircle2 className="w-3 h-3" /> Configured
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-[10px] text-surface-500">
                    <AlertCircle className="w-3 h-3" /> Not set
                  </span>
                )}
              </div>
              <div className="relative">
                <input
                  type={showOpenAI ? 'text' : 'password'}
                  value={openaiKey}
                  onChange={(e) => setOpenAIKey(e.target.value)}
                  placeholder="sk-..."
                  className="w-full px-3 py-2 pr-10 rounded-lg bg-surface-800 border border-surface-700/50 text-sm text-surface-100 placeholder:text-surface-600 font-mono focus:outline-none focus:border-primary-500/50 focus:ring-1 focus:ring-primary-500/25 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowOpenAI(!showOpenAI)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-surface-500 hover:text-surface-300"
                >
                  {showOpenAI ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Anthropic Key */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-surface-400">Anthropic API Key</span>
                {anthropicKey ? (
                  <span className="flex items-center gap-1 text-[10px] text-success-400">
                    <CheckCircle2 className="w-3 h-3" /> Configured
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-[10px] text-surface-500">
                    <AlertCircle className="w-3 h-3" /> Not set
                  </span>
                )}
              </div>
              <div className="relative">
                <input
                  type={showAnthropic ? 'text' : 'password'}
                  value={anthropicKey}
                  onChange={(e) => setAnthropicKey(e.target.value)}
                  placeholder="sk-ant-..."
                  className="w-full px-3 py-2 pr-10 rounded-lg bg-surface-800 border border-surface-700/50 text-sm text-surface-100 placeholder:text-surface-600 font-mono focus:outline-none focus:border-primary-500/50 focus:ring-1 focus:ring-primary-500/25 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowAnthropic(!showAnthropic)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-surface-500 hover:text-surface-300"
                >
                  {showAnthropic ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Gemini Key */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-surface-400">Google Gemini API Key</span>
                {geminiKey ? (
                  <span className="flex items-center gap-1 text-[10px] text-success-400">
                    <CheckCircle2 className="w-3 h-3" /> Configured
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-[10px] text-surface-500">
                    <AlertCircle className="w-3 h-3" /> Not set
                  </span>
                )}
              </div>
              <div className="relative">
                <input
                  type={showGemini ? 'text' : 'password'}
                  value={geminiKey}
                  onChange={(e) => setGeminiKey(e.target.value)}
                  placeholder="AIza..."
                  className="w-full px-3 py-2 pr-10 rounded-lg bg-surface-800 border border-surface-700/50 text-sm text-surface-100 placeholder:text-surface-600 font-mono focus:outline-none focus:border-primary-500/50 focus:ring-1 focus:ring-primary-500/25 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowGemini(!showGemini)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-surface-500 hover:text-surface-300"
                >
                  {showGemini ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>

          {/* Security note */}
          <div className="flex items-start gap-2 p-3 rounded-lg bg-surface-800/50 border border-surface-700/30">
            <AlertCircle className="w-4 h-4 text-warning-400 mt-0.5 shrink-0" />
            <p className="text-[11px] text-surface-400 leading-relaxed">
              Keys are stored locally in your browser&apos;s localStorage. They are never sent to any
              server except the respective API provider. All processing runs client-side.
            </p>
          </div>

          {/* Status */}
          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${isConfigured ? 'bg-success-400' : 'bg-surface-600'}`} />
              <span className="text-xs text-surface-400">
                {isConfigured
                  ? `Ready — ${provider === 'openai' ? 'OpenAI' : provider === 'anthropic' ? 'Anthropic' : 'Gemini'} (${model})`
                  : 'Enter an API key to enable AI insights'
                }
              </span>
            </div>
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-sm font-medium bg-primary-600 text-white hover:bg-primary-500 transition-all"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
