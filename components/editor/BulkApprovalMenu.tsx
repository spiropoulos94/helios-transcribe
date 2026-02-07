'use client';

import { useState, useRef, useEffect } from 'react';
import { CheckCheck, XCircle, ChevronDown, AlertTriangle } from 'lucide-react';
import { useTranslations } from '@/contexts/TranslationsContext';

interface BulkApprovalMenuProps {
  totalSegments: number;
  approvedCount: number;
  onApproveAll: () => void;
  onUnapproveAll: () => void;
  disabled?: boolean;
}

type ConfirmationType = 'approve' | 'unapprove' | null;

export default function BulkApprovalMenu({
  totalSegments,
  approvedCount,
  onApproveAll,
  onUnapproveAll,
  disabled = false,
}: BulkApprovalMenuProps) {
  const { t } = useTranslations();
  const [isOpen, setIsOpen] = useState(false);
  const [confirmation, setConfirmation] = useState<ConfirmationType>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const unapprovedCount = totalSegments - approvedCount;
  const hasUnapproved = unapprovedCount > 0;
  const hasApproved = approvedCount > 0;

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setConfirmation(null);
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
        setConfirmation(null);
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen]);

  const handleApproveAllClick = () => {
    setConfirmation('approve');
  };

  const handleUnapproveAllClick = () => {
    setConfirmation('unapprove');
  };

  const handleConfirm = () => {
    if (confirmation === 'approve') {
      onApproveAll();
    } else if (confirmation === 'unapprove') {
      onUnapproveAll();
    }
    setConfirmation(null);
    setIsOpen(false);
  };

  const handleCancel = () => {
    setConfirmation(null);
  };

  if (disabled) return null;

  return (
    <div className="relative" ref={menuRef}>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 hover:border-slate-300 transition-colors"
        title={t.editor?.bulkActions || 'Bulk Actions'}
      >
        <CheckCheck className="w-4 h-4" />
        <span className="hidden sm:inline">{t.editor?.bulkActions || 'Bulk Actions'}</span>
        <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-1 z-50 bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden min-w-[240px]">
          {confirmation === null ? (
            // Menu Options
            <div className="py-1">
              <button
                onClick={handleApproveAllClick}
                disabled={!hasUnapproved}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-left text-sm hover:bg-green-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                  <CheckCheck className="w-4 h-4 text-green-600" />
                </div>
                <div className="flex-1">
                  <div className="font-medium text-slate-900">
                    {t.editor?.approveAll || 'Approve All'}
                  </div>
                  <div className="text-xs text-slate-500">
                    {hasUnapproved
                      ? `${unapprovedCount} ${t.editor?.segmentsRemaining || 'segments remaining'}`
                      : t.editor?.allApproved || 'All segments approved'}
                  </div>
                </div>
              </button>

              <div className="border-t border-slate-100 my-1" />

              <button
                onClick={handleUnapproveAllClick}
                disabled={!hasApproved}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-left text-sm hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center">
                  <XCircle className="w-4 h-4 text-red-600" />
                </div>
                <div className="flex-1">
                  <div className="font-medium text-slate-900">
                    {t.editor?.unapproveAll || 'Unapprove All'}
                  </div>
                  <div className="text-xs text-slate-500">
                    {hasApproved
                      ? `${approvedCount} ${t.editor?.segmentsApprovedCount || 'segments approved'}`
                      : t.editor?.noneApproved || 'No segments approved'}
                  </div>
                </div>
              </button>
            </div>
          ) : (
            // Confirmation Dialog
            <div className="p-4">
              <div className="flex items-start gap-3 mb-4">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                  confirmation === 'approve' ? 'bg-green-100' : 'bg-amber-100'
                }`}>
                  {confirmation === 'approve' ? (
                    <CheckCheck className="w-5 h-5 text-green-600" />
                  ) : (
                    <AlertTriangle className="w-5 h-5 text-amber-600" />
                  )}
                </div>
                <div>
                  <h4 className="font-semibold text-slate-900">
                    {confirmation === 'approve'
                      ? t.editor?.confirmApproveAll || 'Approve all segments?'
                      : t.editor?.confirmUnapproveAll || 'Unapprove all segments?'}
                  </h4>
                  <p className="text-sm text-slate-600 mt-1">
                    {confirmation === 'approve'
                      ? t.editor?.confirmApproveAllDesc || `This will approve all ${unapprovedCount} remaining segments.`
                      : t.editor?.confirmUnapproveAllDesc || `This will remove approval from all ${approvedCount} segments.`}
                  </p>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={handleCancel}
                  className="flex-1 px-3 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                >
                  {t.common?.cancel || 'Cancel'}
                </button>
                <button
                  onClick={handleConfirm}
                  className={`flex-1 px-3 py-2 text-sm font-medium text-white rounded-lg transition-colors ${
                    confirmation === 'approve'
                      ? 'bg-green-600 hover:bg-green-700'
                      : 'bg-red-600 hover:bg-red-700'
                  }`}
                >
                  {confirmation === 'approve'
                    ? t.editor?.confirmApprove || 'Approve All'
                    : t.editor?.confirmUnapprove || 'Unapprove All'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
