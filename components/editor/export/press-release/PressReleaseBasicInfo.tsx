'use client';

import { PressReleaseFormState } from '@/lib/export/pressReleaseTypes';
import { ExportTranslations } from '../types';

interface PressReleaseBasicInfoProps {
  formState: PressReleaseFormState;
  updateField: <K extends keyof PressReleaseFormState>(field: K, value: PressReleaseFormState[K]) => void;
  t: ExportTranslations;
}

export default function PressReleaseBasicInfo({ formState, updateField, t }: PressReleaseBasicInfoProps) {
  return (
    <div className="space-y-4">
      {/* Required fields */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">
          {t.editor?.pressReleaseOrganization || 'Organization'} <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={formState.organization}
          onChange={(e) => updateField('organization', e.target.value)}
          placeholder="π.χ. ΔΗΜΟΣ ΑΘΗΝΑΙΩΝ"
          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">
          {t.editor?.pressReleaseSubject || 'Title/Subject'} <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={formState.title}
          onChange={(e) => updateField('title', e.target.value)}
          placeholder="π.χ. Ανακοίνωση για το νέο πρόγραμμα ανακύκλωσης"
          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            {t.editor?.sessionDate || 'Date'}
          </label>
          <input
            type="date"
            value={formState.date}
            onChange={(e) => updateField('date', e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            {t.editor?.pressReleaseLocation || 'Location'}
          </label>
          <input
            type="text"
            value={formState.location}
            onChange={(e) => updateField('location', e.target.value)}
            placeholder="π.χ. Αθήνα"
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Tone selector */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">
          {t.editor?.pressReleaseTone || 'Tone'}
        </label>
        <div className="flex gap-2">
          {(['formal', 'neutral', 'friendly'] as const).map((tone) => (
            <button
              key={tone}
              type="button"
              onClick={() => updateField('tone', tone)}
              className={`flex-1 px-3 py-2 text-sm font-medium rounded-lg border transition-colors ${
                formState.tone === tone
                  ? 'bg-emerald-100 border-emerald-500 text-emerald-700'
                  : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
              }`}
            >
              {tone === 'formal' && (t.editor?.toneFormal || 'Formal')}
              {tone === 'neutral' && (t.editor?.toneNeutral || 'Neutral')}
              {tone === 'friendly' && (t.editor?.toneFriendly || 'Friendly')}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">
          {t.editor?.pressReleaseTargetAudience || 'Target Audience'}
        </label>
        <input
          type="text"
          value={formState.targetAudience}
          onChange={(e) => updateField('targetAudience', e.target.value)}
          placeholder="π.χ. Δημότες, ΜΜΕ, επιχειρήσεις"
          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">
          {t.editor?.pressReleaseKeyPoints || 'Key Points to Emphasize'}
        </label>
        <textarea
          value={formState.keyPoints}
          onChange={(e) => updateField('keyPoints', e.target.value)}
          placeholder="π.χ. Νέες υπηρεσίες, οφέλη για τους πολίτες, ημερομηνίες έναρξης"
          rows={2}
          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent resize-none"
        />
      </div>

      {/* Contact info */}
      <div className="pt-2">
        <h4 className="text-sm font-medium text-slate-700 mb-2">
          {t.editor?.pressReleaseContactInfo || 'Contact Information (optional)'}
        </h4>
        <div className="grid grid-cols-1 gap-3">
          <input
            type="text"
            value={formState.contactName}
            onChange={(e) => updateField('contactName', e.target.value)}
            placeholder={t.editor?.pressReleaseContactName || 'Contact Name'}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm"
          />
          <div className="grid grid-cols-2 gap-3">
            <input
              type="email"
              value={formState.contactEmail}
              onChange={(e) => updateField('contactEmail', e.target.value)}
              placeholder={t.editor?.pressReleaseContactEmail || 'Email'}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm"
            />
            <input
              type="tel"
              value={formState.contactPhone}
              onChange={(e) => updateField('contactPhone', e.target.value)}
              placeholder={t.editor?.pressReleaseContactPhone || 'Phone'}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
