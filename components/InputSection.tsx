import React, { useState, useRef } from 'react';
import { UploadCloud, Youtube, FileAudio, AlertCircle } from 'lucide-react';
import { UploadConfig } from '../types';

interface InputSectionProps {
  onStartProcessing: (config: UploadConfig) => void;
  isProcessing: boolean;
}

export const InputSection: React.FC<InputSectionProps> = ({ onStartProcessing, isProcessing }) => {
  const [activeTab, setActiveTab] = useState<'file' | 'url'>('file');
  const [url, setUrl] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleFile = (file: File) => {
    onStartProcessing({ file, youtubeUrl: '', mode: 'file' });
  };

  const handleUrlSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!url) return;
    onStartProcessing({ file: null, youtubeUrl: url, mode: 'url' });
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/50 overflow-hidden border border-slate-100">
        
        {/* Tabs */}
        <div className="flex border-b border-slate-100">
          <button
            onClick={() => setActiveTab('file')}
            className={`flex-1 py-4 text-sm font-semibold flex items-center justify-center gap-2 transition-colors ${
              activeTab === 'file' 
                ? 'bg-white text-blue-600 border-b-2 border-blue-600' 
                : 'bg-slate-50 text-slate-500 hover:text-slate-700'
            }`}
          >
            <UploadCloud className="w-4 h-4" />
            Upload File
          </button>
          <button
            onClick={() => setActiveTab('url')}
            className={`flex-1 py-4 text-sm font-semibold flex items-center justify-center gap-2 transition-colors ${
              activeTab === 'url' 
                ? 'bg-white text-red-600 border-b-2 border-red-600' 
                : 'bg-slate-50 text-slate-500 hover:text-slate-700'
            }`}
          >
            <Youtube className="w-4 h-4" />
            YouTube URL
          </button>
        </div>

        {/* Content */}
        <div className="p-8">
          {activeTab === 'file' ? (
            <div
              className={`relative border-2 border-dashed rounded-xl p-10 flex flex-col items-center justify-center text-center transition-all ${
                dragActive 
                  ? 'border-blue-500 bg-blue-50/50' 
                  : 'border-slate-200 hover:border-blue-400 hover:bg-slate-50/50'
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept="audio/*,video/*"
                onChange={handleFileChange}
                disabled={isProcessing}
              />
              
              <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mb-4">
                <FileAudio className="w-8 h-8" />
              </div>
              
              <h3 className="text-lg font-semibold text-slate-900 mb-2">
                Drag & Drop Media File
              </h3>
              <p className="text-sm text-slate-500 mb-6 max-w-xs">
                Supports MP3, WAV, MP4, MOV. <br/> Maximum file size depends on your quota.
              </p>

              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isProcessing}
                className="px-6 py-2.5 bg-slate-900 text-white text-sm font-medium rounded-lg hover:bg-slate-800 focus:ring-4 focus:ring-slate-100 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isProcessing ? 'Processing...' : 'Browse Files'}
              </button>
            </div>
          ) : (
            <form onSubmit={handleUrlSubmit} className="flex flex-col gap-4">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Youtube className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  type="url"
                  placeholder="https://www.youtube.com/watch?v=..."
                  className="block w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  disabled={isProcessing}
                />
              </div>
              
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-green-800 leading-relaxed">
                  Enter a YouTube URL to transcribe the video's audio directly into Greek text.
                </p>
              </div>

              <button
                type="submit"
                disabled={isProcessing || !url}
                className="w-full py-3 bg-red-600 text-white font-medium rounded-xl hover:bg-red-700 focus:ring-4 focus:ring-red-100 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-red-600/20"
              >
                {isProcessing ? 'Analyzing...' : 'Generate Greek Transcript'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};