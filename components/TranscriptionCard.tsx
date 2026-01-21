import React, { useState } from 'react';
import Link from 'next/link';
import { FileText, Download, Trash2, ChevronDown, ChevronUp, Copy, CheckCircle2, ArrowRight } from 'lucide-react';
import { SavedTranscription } from '@/lib/storage';

interface TranscriptionCardProps {
  transcription: SavedTranscription;
  onDelete: (id: string) => void;
}

export const TranscriptionCard: React.FC<TranscriptionCardProps> = ({ transcription, onDelete }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopy = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    navigator.clipboard.writeText(transcription.text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const blob = new Blob([transcription.text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${transcription.fileName.replace(/\.[^/.]+$/, '')}_transcript.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (window.confirm('Are you sure you want to delete this transcription?')) {
      onDelete(transcription.id);
    }
  };

  const handleExpandToggle = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsExpanded(!isExpanded);
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    });
  };

  const getPreview = (text: string, maxLength = 150) => {
    if (text.length <= maxLength) return text;
    return text.slice(0, maxLength) + '...';
  };

  // Helper function to format speaker labels with bold text
  const renderFormattedText = (text: string) => {
    const parts = text.split(/(Ομιλητής \d+:|Speaker \d+:)/g);

    return parts.map((part, index) => {
      if (part.match(/^(Ομιλητής \d+:|Speaker \d+:)$/)) {
        return (
          <span key={index} className="block font-bold text-slate-900 mt-4 mb-1">
            {part}
          </span>
        );
      }
      return <span key={index}>{part}</span>;
    });
  };

  return (
    <Link
      href={`/library/${transcription.id}`}
      className="block group"
    >
      <div className="bg-white rounded-xl shadow-sm hover:shadow-md border border-slate-200 transition-all duration-200 group-hover:border-blue-300">
        {/* Card Header */}
      <div className="p-4 border-b border-slate-100">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0 group-hover:bg-blue-100 transition-colors">
              <FileText className="w-5 h-5 text-blue-600" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-slate-900 truncate group-hover:text-blue-600 transition-colors">{transcription.fileName}</h3>
              <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                <span>{formatDate(transcription.timestamp)}</span>
                {transcription.metadata?.wordCount && (
                  <>
                    <span>•</span>
                    <span>{transcription.metadata.wordCount} words</span>
                  </>
                )}
                {transcription.provider && (
                  <>
                    <span>•</span>
                    <span className="capitalize">{transcription.provider}</span>
                  </>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            <button
              onClick={handleCopy}
              className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              title="Copy to clipboard"
            >
              {copied ? <CheckCircle2 className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            </button>
            <button
              onClick={handleDownload}
              className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              title="Download"
            >
              <Download className="w-4 h-4" />
            </button>
            <button
              onClick={handleDeleteClick}
              className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              title="Delete"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Card Content */}
      <div className="p-4">
        <div className={`text-sm text-slate-600 leading-relaxed ${isExpanded ? '' : 'line-clamp-3'}`}>
          {isExpanded ? (
            <div className="whitespace-pre-wrap font-serif">
              {renderFormattedText(transcription.text)}
            </div>
          ) : (
            getPreview(transcription.text)
          )}
        </div>
        <div className="flex items-center justify-between mt-3">
          <button
            onClick={handleExpandToggle}
            className="text-xs font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1 transition-colors"
          >
            {isExpanded ? (
              <>
                Show less <ChevronUp className="w-3 h-3" />
              </>
            ) : (
              <>
                Show more <ChevronDown className="w-3 h-3" />
              </>
            )}
          </button>
          <div className="text-xs font-medium text-blue-600 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            View details <ArrowRight className="w-3 h-3" />
          </div>
        </div>
      </div>
    </div>
    </Link>
  );
};
