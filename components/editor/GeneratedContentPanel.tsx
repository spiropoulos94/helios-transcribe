'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import {
  FolderOpen,
  ChevronDown,
  ListChecks,
  Newspaper,
  Podcast,
  Scissors,
  type LucideIcon,
} from 'lucide-react';
import { useTranslations } from '@/contexts/TranslationsContext';
import { AiToolType } from '@/lib/ai/journalistPrompts';
import {
  listGeneratedContent,
  GeneratedContentItem,
} from '@/lib/generatedContent';

interface GeneratedContentPanelProps {
  transcriptionId: string;
  onOpen: (type: AiToolType) => void;
  disabled?: boolean;
}

interface ToolMeta {
  icon: LucideIcon;
  iconBg: string;
  iconColor: string;
  labelKey: string;
  labelFallback: string;
}

const TOOL_META: Record<AiToolType, ToolMeta> = {
  summary: {
    icon: ListChecks,
    iconBg: 'bg-emerald-100',
    iconColor: 'text-emerald-600',
    labelKey: 'aiSummaryTitle',
    labelFallback: 'Summary & Quotes',
  },
  article: {
    icon: Newspaper,
    iconBg: 'bg-blue-100',
    iconColor: 'text-blue-600',
    labelKey: 'aiArticleTitle',
    labelFallback: 'Article Draft',
  },
  'show-notes': {
    icon: Podcast,
    iconBg: 'bg-purple-100',
    iconColor: 'text-purple-600',
    labelKey: 'aiShowNotesTitle',
    labelFallback: 'Show Notes',
  },
  clips: {
    icon: Scissors,
    iconBg: 'bg-amber-100',
    iconColor: 'text-amber-600',
    labelKey: 'aiClipsTitle',
    labelFallback: 'Clip Suggestions',
  },
};

function formatShortDate(iso: string): string {
  try {
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleDateString(undefined, {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  } catch {
    return '';
  }
}

function buildPreview(content: string): string {
  const cleaned = content
    .replace(/[#>*_`~-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return cleaned.length > 80 ? `${cleaned.slice(0, 80)}…` : cleaned;
}

export default function GeneratedContentPanel({
  transcriptionId,
  onOpen,
  disabled = false,
}: GeneratedContentPanelProps) {
  const { t } = useTranslations();
  const [isOpen, setIsOpen] = useState(false);
  const [items, setItems] = useState<GeneratedContentItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Load saved outputs whenever the panel opens
  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    setIsLoading(true);
    listGeneratedContent(transcriptionId)
      .then((result) => {
        if (!cancelled) setItems(result);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isOpen, transcriptionId]);

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  // Close on escape
  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen]);

  const handleSelect = useCallback(
    (type: AiToolType) => {
      onOpen(type);
      setIsOpen(false);
    },
    [onOpen]
  );

  if (disabled) return null;

  return (
    <div className="relative" ref={menuRef}>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
        title={t.editor?.generatedContent || 'Generated'}
      >
        <FolderOpen className="w-4 h-4" />
        <span className="hidden sm:inline">{t.editor?.generatedContent || 'Generated'}</span>
        <ChevronDown className={`w-3 h-3 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-1 z-50 bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden min-w-[300px] max-w-[360px]">
          {isLoading ? (
            <div className="px-4 py-6 text-center text-sm text-slate-500">…</div>
          ) : items.length === 0 ? (
            <div className="px-4 py-6 text-center text-sm text-slate-500">
              {t.editor?.generatedEmpty || 'Nothing generated yet'}
            </div>
          ) : (
            <div className="py-1 max-h-[360px] overflow-y-auto">
              {items.map((item) => {
                const meta = TOOL_META[item.type];
                if (!meta) return null;
                const Icon = meta.icon;
                const date = formatShortDate(item.updatedAt);
                const preview = buildPreview(item.content);
                return (
                  <button
                    key={item.id}
                    onClick={() => handleSelect(item.type)}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-left text-sm hover:bg-slate-50 transition-colors"
                    title={t.editor?.generatedOpen || 'Open'}
                  >
                    <div className={`w-8 h-8 rounded-full ${meta.iconBg} flex items-center justify-center shrink-0`}>
                      <Icon className={`w-4 h-4 ${meta.iconColor}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium text-slate-900 truncate">
                          {t.editor?.[meta.labelKey] || meta.labelFallback}
                        </span>
                        {date && <span className="text-xs text-slate-400 shrink-0">{date}</span>}
                      </div>
                      {preview && <div className="text-xs text-slate-500 truncate">{preview}</div>}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
