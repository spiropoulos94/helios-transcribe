import React from 'react';
import { Sparkles, Languages } from 'lucide-react';

export const Header: React.FC = () => {
  return (
    <header className="w-full py-6 px-4 sm:px-8 border-b border-slate-200 bg-white/50 backdrop-blur-sm sticky top-0 z-10">
      <div className="max-w-5xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-blue-600 p-2 rounded-lg shadow-lg shadow-blue-600/20">
            <Languages className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Helios Transcribe</h1>
            <p className="text-xs text-slate-500 font-medium">AI-Powered Greek Transcription</p>
          </div>
        </div>
        <div className="hidden sm:flex items-center gap-2 text-sm text-slate-600 bg-slate-100 px-3 py-1.5 rounded-full border border-slate-200">
          <Sparkles className="w-4 h-4 text-amber-500" />
          <span>Powered by Gemini 2.5 Flash</span>
        </div>
      </div>
    </header>
  );
};