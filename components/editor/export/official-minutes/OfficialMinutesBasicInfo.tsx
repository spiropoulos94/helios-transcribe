'use client';

import { OfficialMinutesFormState } from '@/lib/export/types';
import { ExportTranslations } from '../types';

interface OfficialMinutesBasicInfoProps {
  formState: OfficialMinutesFormState;
  updateField: <K extends keyof OfficialMinutesFormState>(field: K, value: OfficialMinutesFormState[K]) => void;
  t: ExportTranslations;
}

export default function OfficialMinutesBasicInfo({ formState, updateField, t }: OfficialMinutesBasicInfoProps) {
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">
          {t.editor?.municipality || 'Municipality'} <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={formState.municipality}
          onChange={(e) => updateField('municipality', e.target.value)}
          placeholder="π.χ. ΔΗΜΟΣ ΑΘΗΝΑΙΩΝ"
          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            {t.editor?.sessionNumber || 'Session Number'}
          </label>
          <input
            type="text"
            value={formState.sessionNumber}
            onChange={(e) => updateField('sessionNumber', e.target.value)}
            placeholder="π.χ. 15/2024"
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            {t.editor?.sessionDate || 'Date'} <span className="text-red-500">*</span>
          </label>
          <input
            type="date"
            value={formState.date}
            onChange={(e) => updateField('date', e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            {t.editor?.startTime || 'Start Time'}
          </label>
          <input
            type="time"
            value={formState.startTime}
            onChange={(e) => updateField('startTime', e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            {t.editor?.endTime || 'End Time'}
          </label>
          <input
            type="time"
            value={formState.endTime}
            onChange={(e) => updateField('endTime', e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">
          {t.editor?.meetingLocation || 'Meeting Location'}
        </label>
        <input
          type="text"
          value={formState.location}
          onChange={(e) => updateField('location', e.target.value)}
          placeholder="π.χ. Αίθουσα Δημοτικού Συμβουλίου"
          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
        />
      </div>
    </div>
  );
}
