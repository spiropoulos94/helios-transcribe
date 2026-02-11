'use client';

import { AlertTriangle } from 'lucide-react';

interface WarningAlertProps {
  title: string;
  message: string;
}

export default function WarningAlert({ title, message }: WarningAlertProps) {
  return (
    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
      <div className="flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <div>
          <h4 className="font-medium text-amber-900">{title}</h4>
          <p className="text-sm text-amber-700 mt-1">{message}</p>
        </div>
      </div>
    </div>
  );
}
