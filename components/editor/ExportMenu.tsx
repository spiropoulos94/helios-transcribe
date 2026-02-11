'use client';

import { useState, useRef, useEffect } from 'react';
import { Download, FileText, ScrollText, Newspaper, ChevronDown } from 'lucide-react';
import { useTranslations } from '@/contexts/TranslationsContext';

interface ExportMenuProps {
  onExportPlainText: () => void;
  onExportOfficialMinutes: () => void;
  onExportPressRelease: () => void;
  disabled?: boolean;
}

export default function ExportMenu({
  onExportPlainText,
  onExportOfficialMinutes,
  onExportPressRelease,
  disabled = false,
}: ExportMenuProps) {
  const { t } = useTranslations();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
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

  const handleExportPlainText = () => {
    onExportPlainText();
    setIsOpen(false);
  };

  const handleExportOfficialMinutes = () => {
    onExportOfficialMinutes();
    setIsOpen(false);
  };

  const handleExportPressRelease = () => {
    onExportPressRelease();
    setIsOpen(false);
  };

  if (disabled) return null;

  return (
    <div className="relative" ref={menuRef}>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors flex items-center gap-0.5"
        title={t.editor?.exportMenu || 'Export Options'}
      >
        <Download className="w-4 h-4" />
        <ChevronDown className={`w-3 h-3 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-1 z-50 bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden min-w-[260px]">
          <div className="py-1">
            {/* Plain Text Export */}
            <button
              onClick={handleExportPlainText}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-left text-sm hover:bg-blue-50 transition-colors"
            >
              <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                <FileText className="w-4 h-4 text-blue-600" />
              </div>
              <div className="flex-1">
                <div className="font-medium text-slate-900">
                  {t.editor?.exportPlainText || 'Plain Text (.txt)'}
                </div>
                <div className="text-xs text-slate-500">
                  {t.editor?.exportPlainTextDesc || 'Simple text with timestamps'}
                </div>
              </div>
            </button>

            <div className="border-t border-slate-100 my-1" />

            {/* Official Minutes Export */}
            <button
              onClick={handleExportOfficialMinutes}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-left text-sm hover:bg-purple-50 transition-colors"
            >
              <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center">
                <ScrollText className="w-4 h-4 text-purple-600" />
              </div>
              <div className="flex-1">
                <div className="font-medium text-slate-900">
                  {t.editor?.exportOfficialMinutes || 'Official Minutes'}
                </div>
                <div className="text-xs text-slate-500">
                  {t.editor?.exportOfficialMinutesDesc || 'Formal municipal council minutes'}
                </div>
              </div>
            </button>

            <div className="border-t border-slate-100 my-1" />

            {/* Press Release Export */}
            <button
              onClick={handleExportPressRelease}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-left text-sm hover:bg-emerald-50 transition-colors"
            >
              <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center">
                <Newspaper className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="flex-1">
                <div className="font-medium text-slate-900">
                  {t.editor?.exportPressRelease || 'Press Release'}
                </div>
                <div className="text-xs text-slate-500">
                  {t.editor?.exportPressReleaseDesc || 'Generate a press release'}
                </div>
              </div>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
