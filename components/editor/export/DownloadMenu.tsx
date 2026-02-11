'use client';

import { useState, useRef, useEffect } from 'react';
import { Download, ChevronDown, FileType, Loader2 } from 'lucide-react';
import { DownloadFormat } from '@/lib/export/downloadFormats';
import { ExportTranslations } from './types';

interface DownloadMenuProps {
  onDownload: (format: DownloadFormat) => Promise<void>;
  t: ExportTranslations;
  colorScheme?: 'purple' | 'emerald';
  size?: 'sm' | 'md';
}

export default function DownloadMenu({
  onDownload,
  t,
  colorScheme = 'purple',
  size = 'sm',
}: DownloadMenuProps) {
  const [showMenu, setShowMenu] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleDownloadFormat = async (format: DownloadFormat) => {
    setIsDownloading(true);
    setShowMenu(false);
    try {
      await onDownload(format);
    } finally {
      setIsDownloading(false);
    }
  };

  const formatLabels: Record<DownloadFormat, string> = {
    txt: t.editor?.formatTxt || 'Plain Text (.txt)',
    pdf: t.editor?.formatPdf || 'PDF Document (.pdf)',
    docx: t.editor?.formatDocx || 'Word Document (.docx)',
  };

  const bgColor = colorScheme === 'purple' ? 'bg-purple-600 hover:bg-purple-700' : 'bg-emerald-600 hover:bg-emerald-700';
  const padding = size === 'sm' ? 'px-3 py-1.5' : 'px-4 py-2';

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setShowMenu(!showMenu)}
        disabled={isDownloading}
        className={`flex items-center gap-1.5 ${padding} text-sm font-medium text-white ${bgColor} rounded-lg transition-colors disabled:opacity-50`}
      >
        {isDownloading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Download className="w-4 h-4" />
        )}
        {t.editor?.downloadAs || 'Download'}
        <ChevronDown className="w-3 h-3 ml-0.5" />
      </button>

      {showMenu && (
        <div className="absolute right-0 mt-1 w-48 bg-white rounded-lg shadow-lg border border-slate-200 py-1 z-10 animate-in fade-in slide-in-from-top-1 duration-150">
          {(['txt', 'pdf', 'docx'] as DownloadFormat[]).map((format) => (
            <button
              key={format}
              onClick={() => handleDownloadFormat(format)}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-100 transition-colors text-left"
            >
              <FileType className="w-4 h-4 text-slate-400" />
              {formatLabels[format]}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
