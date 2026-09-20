'use client';

import { useEffect } from 'react';
import { useEditor, EditorContent, type Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Markdown } from 'tiptap-markdown';
import {
  Bold,
  Italic,
  Heading2,
  List,
  ListOrdered,
  Quote,
  Undo,
  Redo,
} from 'lucide-react';

interface RichMarkdownEditorProps {
  /** Current content as Markdown (source of truth). */
  value: string;
  /** Called with the updated Markdown on every edit. */
  onChange: (markdown: string) => void;
}

function ToolbarButton({
  onClick,
  active,
  disabled,
  title,
  children,
}: {
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      // Keep the editor selection while clicking a toolbar button.
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`p-1.5 rounded transition-colors disabled:opacity-40 ${
        active ? 'bg-emerald-100 text-emerald-700' : 'text-slate-600 hover:bg-slate-200'
      }`}
    >
      {children}
    </button>
  );
}

/**
 * A small WYSIWYG editor whose value is Markdown. It renders formatting
 * visually (headings, bold, lists, quotes) while keeping Markdown as the
 * stored format, so downloads and persistence are unchanged.
 */
export default function RichMarkdownEditor({ value, onChange }: RichMarkdownEditorProps) {
  const editor = useEditor({
    // Required for Next.js SSR to avoid a hydration mismatch.
    immediatelyRender: false,
    extensions: [
      StarterKit,
      Markdown.configure({ html: false, linkify: true, breaks: true, transformPastedText: true }),
    ],
    content: value,
    onUpdate: ({ editor }: { editor: Editor }) => {
      onChange(editor.storage.markdown.getMarkdown());
    },
  });

  // Reflect external value changes (e.g. Regenerate) without emitting an update
  // (which would loop back through onChange).
  useEffect(() => {
    if (!editor) return;
    const current = editor.storage.markdown.getMarkdown();
    if (value !== current) {
      editor.commands.setContent(value || '', false);
    }
  }, [value, editor]);

  if (!editor) {
    return <div className="min-h-[420px] rounded-lg border border-slate-200 bg-slate-50" />;
  }

  return (
    <div className="rich-md rounded-lg border border-slate-200 bg-white overflow-hidden">
      <div className="flex items-center gap-0.5 border-b border-slate-200 bg-slate-50 px-2 py-1.5">
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBold().run()}
          active={editor.isActive('bold')}
          title="Bold"
        >
          <Bold className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleItalic().run()}
          active={editor.isActive('italic')}
          title="Italic"
        >
          <Italic className="w-4 h-4" />
        </ToolbarButton>
        <span className="mx-1 h-5 w-px bg-slate-300" />
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          active={editor.isActive('heading', { level: 2 })}
          title="Heading"
        >
          <Heading2 className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          active={editor.isActive('bulletList')}
          title="Bullet list"
        >
          <List className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          active={editor.isActive('orderedList')}
          title="Numbered list"
        >
          <ListOrdered className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          active={editor.isActive('blockquote')}
          title="Quote"
        >
          <Quote className="w-4 h-4" />
        </ToolbarButton>
        <span className="mx-1 h-5 w-px bg-slate-300" />
        <ToolbarButton
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
          title="Undo"
        >
          <Undo className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
          title="Redo"
        >
          <Redo className="w-4 h-4" />
        </ToolbarButton>
      </div>

      <div className="max-h-[420px] overflow-y-auto px-4 py-3">
        <EditorContent editor={editor} />
      </div>

      <style>{`
        .rich-md .ProseMirror { min-height: 360px; font-size: 0.875rem; color: #1e293b; line-height: 1.6; }
        .rich-md .ProseMirror:focus { outline: none; }
        .rich-md .ProseMirror h1 { font-size: 1.4rem; font-weight: 700; margin: 0.8em 0 0.4em; }
        .rich-md .ProseMirror h2 { font-size: 1.2rem; font-weight: 700; margin: 0.8em 0 0.4em; }
        .rich-md .ProseMirror h3 { font-size: 1.05rem; font-weight: 600; margin: 0.7em 0 0.3em; }
        .rich-md .ProseMirror p { margin: 0.5em 0; }
        .rich-md .ProseMirror ul { list-style: disc; padding-left: 1.5em; margin: 0.5em 0; }
        .rich-md .ProseMirror ol { list-style: decimal; padding-left: 1.5em; margin: 0.5em 0; }
        .rich-md .ProseMirror li { margin: 0.2em 0; }
        .rich-md .ProseMirror li > p { margin: 0; }
        .rich-md .ProseMirror strong { font-weight: 700; }
        .rich-md .ProseMirror em { font-style: italic; }
        .rich-md .ProseMirror blockquote { border-left: 3px solid #cbd5e1; padding-left: 1em; color: #475569; margin: 0.6em 0; }
        .rich-md .ProseMirror code { background: #f1f5f9; padding: 0.1em 0.3em; border-radius: 4px; font-size: 0.85em; }
        .rich-md .ProseMirror > *:first-child { margin-top: 0; }
      `}</style>
    </div>
  );
}
