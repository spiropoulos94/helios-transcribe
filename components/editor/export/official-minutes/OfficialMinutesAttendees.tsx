'use client';

import { X } from 'lucide-react';
import { OfficialMinutesFormState, Absentee } from '@/lib/export/types';
import { ExportTranslations } from '../types';

interface OfficialMinutesAttendeesProps {
  formState: OfficialMinutesFormState;
  updateField: <K extends keyof OfficialMinutesFormState>(field: K, value: OfficialMinutesFormState[K]) => void;
  t: ExportTranslations;
}

export default function OfficialMinutesAttendees({ formState, updateField, t }: OfficialMinutesAttendeesProps) {
  const addAbsentee = () => {
    updateField('absentees', [...formState.absentees, { name: '', justified: true }]);
  };

  const updateAbsentee = (index: number, field: keyof Absentee, value: string | boolean) => {
    const newAbsentees = [...formState.absentees];
    newAbsentees[index] = { ...newAbsentees[index], [field]: value };
    updateField('absentees', newAbsentees);
  };

  const removeAbsentee = (index: number) => {
    updateField('absentees', formState.absentees.filter((_, i) => i !== index));
  };

  const addInvitee = () => {
    updateField('invitees', [...formState.invitees, '']);
  };

  const updateInvitee = (index: number, value: string) => {
    const newInvitees = [...formState.invitees];
    newInvitees[index] = value;
    updateField('invitees', newInvitees);
  };

  const removeInvitee = (index: number) => {
    updateField('invitees', formState.invitees.filter((_, i) => i !== index));
  };

  const addCouncilor = () => {
    updateField('councilors', [...formState.councilors, '']);
  };

  const updateCouncilor = (index: number, value: string) => {
    const newCouncilors = [...formState.councilors];
    newCouncilors[index] = value;
    updateField('councilors', newCouncilors);
  };

  const removeCouncilor = (index: number) => {
    updateField('councilors', formState.councilors.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-5">
      {/* Officials */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wide">
          {t.editor?.officials || 'Officials'}
        </h3>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            {t.editor?.mayor || 'Mayor'}
          </label>
          <input
            type="text"
            value={formState.mayor}
            onChange={(e) => updateField('mayor', e.target.value)}
            placeholder="Ονοματεπώνυμο Δημάρχου"
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            {t.editor?.councilPresident || 'Council President'} <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={formState.president}
            onChange={(e) => updateField('president', e.target.value)}
            placeholder="Ονοματεπώνυμο Προέδρου"
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            {t.editor?.secretary || 'Secretary'} <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={formState.secretary}
            onChange={(e) => updateField('secretary', e.target.value)}
            placeholder="Ονοματεπώνυμο Γραμματέα"
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Councilors (Present) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wide">
            {t.editor?.councilors || 'Council Members (Present)'}
          </h3>
          <button
            onClick={addCouncilor}
            className="text-sm text-purple-600 hover:text-purple-700 font-medium"
          >
            + {t.editor?.addCouncilor || 'Add'}
          </button>
        </div>
        {formState.councilors.length === 0 ? (
          <p className="text-sm text-slate-500 italic">
            {t.editor?.noCouncilors || 'No council members added. Speaker labels will be used if available.'}
          </p>
        ) : (
          <div className="space-y-2">
            {formState.councilors.map((councilor, index) => (
              <div key={index} className="flex items-center gap-2">
                <input
                  type="text"
                  value={councilor}
                  onChange={(e) => updateCouncilor(index, e.target.value)}
                  placeholder={`Σύμβουλος ${index + 1}`}
                  className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
                <button
                  onClick={() => removeCouncilor(index)}
                  className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Absentees */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wide">
            {t.editor?.absentees || 'Absent Members'}
          </h3>
          <button
            onClick={addAbsentee}
            className="text-sm text-purple-600 hover:text-purple-700 font-medium"
          >
            + {t.editor?.addAbsentee || 'Add'}
          </button>
        </div>
        {formState.absentees.length === 0 ? (
          <p className="text-sm text-slate-500 italic">
            {t.editor?.noAbsentees || 'No absent members'}
          </p>
        ) : (
          <div className="space-y-2">
            {formState.absentees.map((absentee, index) => (
              <div key={index} className="flex items-center gap-2">
                <input
                  type="text"
                  value={absentee.name}
                  onChange={(e) => updateAbsentee(index, 'name', e.target.value)}
                  placeholder="Ονοματεπώνυμο"
                  className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
                <select
                  value={absentee.justified ? 'justified' : 'unjustified'}
                  onChange={(e) => updateAbsentee(index, 'justified', e.target.value === 'justified')}
                  className="px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                >
                  <option value="justified">{t.editor?.justified || 'Justified'}</option>
                  <option value="unjustified">{t.editor?.unjustified || 'Unjustified'}</option>
                </select>
                <button
                  onClick={() => removeAbsentee(index)}
                  className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Invitees */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wide">
            {t.editor?.invitees || 'Invitees (optional)'}
          </h3>
          <button
            onClick={addInvitee}
            className="text-sm text-purple-600 hover:text-purple-700 font-medium"
          >
            + {t.editor?.addInvitee || 'Add'}
          </button>
        </div>
        {formState.invitees.length === 0 ? (
          <p className="text-sm text-slate-500 italic">
            {t.editor?.noInvitees || 'No invitees'}
          </p>
        ) : (
          <div className="space-y-2">
            {formState.invitees.map((invitee, index) => (
              <div key={index} className="flex items-center gap-2">
                <input
                  type="text"
                  value={invitee}
                  onChange={(e) => updateInvitee(index, e.target.value)}
                  placeholder="Ονοματεπώνυμο / Ιδιότητα"
                  className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
                <button
                  onClick={() => removeInvitee(index)}
                  className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
