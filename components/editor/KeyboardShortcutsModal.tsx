import { useTranslations } from '@/contexts/TranslationsContext';

interface KeyboardShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function KeyboardShortcutsModal({ isOpen, onClose }: KeyboardShortcutsModalProps) {
  const { t } = useTranslations();

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div className="absolute right-0 top-full mt-2 z-50 bg-white rounded-xl shadow-xl border border-slate-200 p-4 min-w-[240px]">
        <h3 className="text-sm font-semibold text-slate-900 mb-3">
          {t.editor?.keyboardShortcuts || 'Keyboard Shortcuts'}
        </h3>
        <div className="space-y-2 text-sm">
          <ShortcutRow label={t.editor?.shortcutApprove || 'Toggle approve'} keys={['A']} />
          <ShortcutRow label={t.editor?.shortcutEdit || 'Edit segment'} keys={['E']} />
          <ShortcutRow label={t.editor?.shortcutNext || 'Next segment'} keys={['J', '↓']} />
          <ShortcutRow label={t.editor?.shortcutPrev || 'Previous segment'} keys={['K', '↑']} />
          <ShortcutRow label={t.editor?.shortcutPlayPause || 'Play/Pause'} keys={['Space']} />
          <ShortcutRow label={t.editor?.shortcutEscape || 'Clear selection'} keys={['Esc']} />
        </div>
      </div>
    </>
  );
}

function ShortcutRow({ label, keys }: { label: string; keys: string[] }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-slate-600">{label}</span>
      <div className="flex gap-1">
        {keys.map((key) => (
          <kbd key={key} className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded text-xs font-mono">
            {key}
          </kbd>
        ))}
      </div>
    </div>
  );
}
