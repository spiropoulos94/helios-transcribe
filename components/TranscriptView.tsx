import React from 'react';
import { Copy, Download, CheckCircle2, FileText } from 'lucide-react';
import { TranscriptionResult } from '../types';

interface TranscriptViewProps {
  result: TranscriptionResult;
}

export const TranscriptView: React.FC<TranscriptViewProps> = ({ result }) => {
  const [copied, setCopied] = React.useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(result.text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([result.text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'greek_transcript.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Helper function to format speaker labels with bold text
  const renderFormattedText = (text: string) => {
    // Splits text by "Ομιλητής X:" or "Speaker X:" pattern to handle them separately
    const parts = text.split(/(Ομιλητής \d+:|Speaker \d+:)/g);
    
    return parts.map((part, index) => {
      // If the part matches the speaker label pattern
      if (part.match(/^(Ομιλητής \d+:|Speaker \d+:)$/)) {
        return (
          <span key={index} className="block font-bold text-slate-900 mt-6 mb-2">
            {part}
          </span>
        );
      }
      // Return regular text
      return <span key={index}>{part}</span>;
    });
  };

  return (
    <div className="w-full max-w-4xl mx-auto mt-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <h2 className="font-semibold text-slate-900">Transcription Complete</h2>
              {result.metadata?.wordCount && (
                <p className="text-xs text-slate-500">{result.metadata.wordCount} words generated</p>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleCopy}
              className="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors flex items-center gap-2 text-sm font-medium"
              title="Copy to clipboard"
            >
              {copied ? <CheckCircle2 className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              <span className="hidden sm:inline">{copied ? 'Copied' : 'Copy'}</span>
            </button>
            <button
              onClick={handleDownload}
              className="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors flex items-center gap-2 text-sm font-medium"
              title="Download Text"
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">Download</span>
            </button>
          </div>
        </div>
        
        <div className="p-8 max-h-[600px] overflow-y-auto custom-scrollbar">
            <div className="prose prose-slate max-w-none">
                <div className="whitespace-pre-wrap leading-relaxed text-slate-700 font-serif text-lg">
                    {renderFormattedText(result.text)}
                </div>
            </div>
        </div>
        
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-100 text-xs text-slate-400 flex items-center justify-between">
            <div className="flex items-center gap-2">
                <FileText className="w-3 h-3" />
            </div>
            <span>Grecho</span>
        </div>
      </div>
    </div>
  );
};