'use client';

import { AlertTriangle } from 'lucide-react';

interface ErrorAlertProps {
  title: string;
  message: string;
}

export default function ErrorAlert({ title, message }: ErrorAlertProps) {
  return (
    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
      <div className="flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
        <div>
          <h4 className="font-medium text-red-900">{title}</h4>
          <p className="text-sm text-red-700 mt-1">{message}</p>
        </div>
      </div>
    </div>
  );
}
