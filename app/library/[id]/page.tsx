'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import {
  FileText,
  Download,
  Trash2,
  Copy,
  CheckCircle2,
  ArrowLeft,
  Calendar,
  FileAudio,
  Hash,
  AlertTriangle,
  Clock
} from 'lucide-react';
import { SavedTranscription, getTranscriptionById, deleteTranscription } from '@/lib/storage';
import { calculateTranscriptionCost } from '@/lib/pricing/calculator';

export default function TranscriptionDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [transcription, setTranscription] = useState<SavedTranscription | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  console.log(transcription);

  useEffect(() => {
    if (id) {
      const data = getTranscriptionById(id);
      setTranscription(data);
      setIsLoading(false);
    }
  }, [id]);

  const handleCopy = () => {
    if (transcription) {
      navigator.clipboard.writeText(transcription.text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDownload = () => {
    if (transcription) {
      const blob = new Blob([transcription.text], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${transcription.fileName.replace(/\.[^/.]+$/, '')}_transcript.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  const handleDelete = () => {
    if (transcription && window.confirm('Are you sure you want to delete this transcription? This action cannot be undone.')) {
      setIsDeleting(true);
      deleteTranscription(transcription.id);
      router.push('/library');
    }
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatProcessingTime = (ms?: number) => {
    if (!ms) return null;
    const seconds = Math.floor(ms / 1000);
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  const formatAudioDuration = (seconds?: number) => {
    if (!seconds) return null;
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const renderFormattedText = (text: string) => {
    const parts = text.split(/(Ομιλητής \d+:|Speaker \d+:)/g);

    return parts.map((part, index) => {
      if (part.match(/^(Ομιλητής \d+:|Speaker \d+:)$/)) {
        return (
          <span key={index} className="block font-bold text-slate-900 mt-6 mb-2 text-xl">
            {part}
          </span>
        );
      }
      return <span key={index}>{part}</span>;
    });
  };

  if (isLoading) {
    return (
      <div className="flex-1 bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-100 flex items-center justify-center">
        <div className="text-slate-600">Loading transcription...</div>
      </div>
    );
  }

  if (!transcription) {
    return (
      <div className="flex-1 bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-100 flex flex-col">
        <main className="flex-1 w-full max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 flex flex-col items-center justify-center">
          <div className="text-center animate-in fade-in slide-in-from-bottom-4">
            <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertTriangle className="w-10 h-10 text-red-600" />
            </div>
            <h1 className="text-3xl font-bold text-slate-900 mb-3">Transcription Not Found</h1>
            <p className="text-slate-600 mb-8 max-w-md mx-auto">
              The transcription you're looking for doesn't exist or may have been deleted.
            </p>
            <Link
              href="/library"
              className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 shadow-lg shadow-blue-600/20 transition-all"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Library
            </Link>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex-1 bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-100 flex flex-col">
      <main className="flex-1 w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">

        {/* Back Button */}
        <Link
          href="/library"
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900 mb-6 transition-colors animate-in fade-in slide-in-from-bottom-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Library
        </Link>

        {/* Main Content Card */}
        <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-100 overflow-visible animate-in fade-in slide-in-from-bottom-4">

          {/* Header */}
          <div className="sticky top-0 z-10 px-6 py-5 border-b border-slate-100 bg-white/95 backdrop-blur-sm rounded-t-2xl">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-4 flex-1 min-w-0">
                <div className="w-12 h-12 rounded-xl bg-blue-600 flex items-center justify-center flex-shrink-0 shadow-lg shadow-blue-600/20">
                  <FileText className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <h1 className="text-2xl font-bold text-slate-900 break-words">
                    {transcription.fileName}
                  </h1>
                  <div className="flex flex-wrap items-center gap-4 mt-2 text-sm text-slate-500">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      <span>{formatDate(transcription.timestamp)}</span>
                    </div>
                    {transcription.metadata?.audioDurationSeconds && (
                      <div className="flex items-center gap-2">
                        <FileAudio className="w-4 h-4 text-blue-600" />
                        <span className="text-blue-600 font-medium">{formatAudioDuration(transcription.metadata.audioDurationSeconds)}</span>
                      </div>
                    )}
                    {transcription.metadata?.wordCount && (
                      <div className="flex items-center gap-2">
                        <Hash className="w-4 h-4" />
                        <span>{transcription.metadata.wordCount} words</span>
                      </div>
                    )}
                    {transcription.metadata?.processingTimeMs && (
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-green-600" />
                        <span className="text-green-600 font-medium">⚡ {formatProcessingTime(transcription.metadata.processingTimeMs)}</span>
                      </div>
                    )}
                    {transcription.metadata?.audioDurationSeconds && transcription.metadata?.pricing && (
                      <div className="flex items-center gap-2">
                        <span className="text-emerald-600 font-semibold">💰 ${calculateTranscriptionCost(transcription.metadata.audioDurationSeconds, transcription.metadata.pricing)}</span>
                      </div>
                    )}
                    {transcription.metadata?.model && (
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 text-xs font-medium">{transcription.metadata.model}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={handleCopy}
                  className="p-3 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors flex items-center gap-2 text-sm font-medium"
                  title="Copy to clipboard"
                  disabled={isDeleting}
                >
                  {copied ? <CheckCircle2 className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                  <span className="hidden lg:inline">{copied ? 'Copied' : 'Copy'}</span>
                </button>
                <button
                  onClick={handleDownload}
                  className="p-3 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors flex items-center gap-2 text-sm font-medium"
                  title="Download"
                  disabled={isDeleting}
                >
                  <Download className="w-5 h-5" />
                  <span className="hidden lg:inline">Download</span>
                </button>
                <button
                  onClick={handleDelete}
                  className="p-3 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors flex items-center gap-2 text-sm font-medium"
                  title="Delete"
                  disabled={isDeleting}
                >
                  <Trash2 className="w-5 h-5" />
                  <span className="hidden lg:inline">{isDeleting ? 'Deleting...' : 'Delete'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Transcription Content */}
          <div className="p-8">
            <div className="prose prose-slate prose-lg max-w-none">
              <div className="whitespace-pre-wrap leading-relaxed text-slate-700 font-serif">
                {renderFormattedText(transcription.text)}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 text-xs text-slate-400 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="w-3 h-3" />
            </div>
            <span>GrechoAI</span>
          </div>
        </div>

      </main>
    </div>
  );
}
