import { useEffect } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import TextAlign from "@tiptap/extension-text-align";
import { Table } from "@tiptap/extension-table";
import TableRow from "@tiptap/extension-table-row";
import TableCell from "@tiptap/extension-table-cell";
import TableHeader from "@tiptap/extension-table-header";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  Heading2,
  Italic,
  Link as LinkIcon,
  List,
  ListOrdered,
  Redo2,
  Table as TableIcon,
  Underline as UnderlineIcon,
  Undo2,
} from "lucide-react";

const extensions = [
  StarterKit,
  Underline,
  Link.configure({ openOnClick: false, autolink: true, HTMLAttributes: { rel: "noopener noreferrer" } }),
  TextAlign.configure({ types: ["heading", "paragraph"] }),
  Table.configure({ resizable: false }),
  TableRow,
  TableHeader,
  TableCell,
];

const toolGroups = [
  [
    { label: "Bold", icon: Bold, run: (editor) => editor.chain().focus().toggleBold().run(), active: "bold" },
    { label: "Italic", icon: Italic, run: (editor) => editor.chain().focus().toggleItalic().run(), active: "italic" },
    { label: "Underline", icon: UnderlineIcon, run: (editor) => editor.chain().focus().toggleUnderline().run(), active: "underline" },
    { label: "Heading", icon: Heading2, run: (editor) => editor.chain().focus().toggleHeading({ level: 2 }).run(), active: "heading" },
  ],
  [
    { label: "Bulleted list", icon: List, run: (editor) => editor.chain().focus().toggleBulletList().run(), active: "bulletList" },
    { label: "Numbered list", icon: ListOrdered, run: (editor) => editor.chain().focus().toggleOrderedList().run(), active: "orderedList" },
  ],
  [
    { label: "Align left", icon: AlignLeft, run: (editor) => editor.chain().focus().setTextAlign("left").run() },
    { label: "Align center", icon: AlignCenter, run: (editor) => editor.chain().focus().setTextAlign("center").run() },
    { label: "Align right", icon: AlignRight, run: (editor) => editor.chain().focus().setTextAlign("right").run() },
  ],
];

export default function PaperRichEditor({ content, onChange, readOnly = false, className = "" }) {
  const editor = useEditor({
    extensions,
    content,
    editable: !readOnly,
    onUpdate: ({ editor: currentEditor }) => onChange?.(currentEditor.getJSON()),
    editorProps: {
      attributes: {
        class: `paper-editor-content ${readOnly ? "paper-editor-readonly" : ""}`,
        spellcheck: "true",
      },
    },
  });

  useEffect(() => {
    if (!editor) return;
    editor.setEditable(!readOnly);
  }, [editor, readOnly]);

  useEffect(() => {
    if (!editor || !content) return;
    if (JSON.stringify(editor.getJSON()) !== JSON.stringify(content)) {
      editor.commands.setContent(content, { emitUpdate: false });
    }
  }, [content, editor]);

  if (!editor) return <div className="min-h-40 animate-pulse rounded-lg bg-slate-50" />;

  const controls = [
    ...toolGroups.flat(),
    {
      label: "Insert link",
      icon: LinkIcon,
      run: (currentEditor) => {
        const previousUrl = currentEditor.getAttributes("link").href || "";
        const url = window.prompt("Enter a web address", previousUrl);
        if (url === null) return;
        if (!url.trim()) {
          currentEditor.chain().focus().extendMarkRange("link").unsetLink().run();
          return;
        }
        currentEditor.chain().focus().extendMarkRange("link").setLink({ href: url.trim() }).run();
      },
    },
    {
      label: "Insert table",
      icon: TableIcon,
      run: (currentEditor) => currentEditor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run(),
    },
  ];

  return (
    <div className={`overflow-hidden rounded-xl border border-slate-200 bg-white ${className}`}>
      {!readOnly && (
        <div className="flex flex-wrap items-center gap-1 border-b border-slate-200 bg-slate-50/80 p-2">
          {controls.map(({ label, icon: Icon, run, active }) => (
            <button
              key={label}
              type="button"
              title={label}
              aria-label={label}
              onClick={() => run(editor)}
              className={`rounded-md p-2 transition ${
                active && editor.isActive(active)
                  ? "bg-blue-100 text-blue-800"
                  : "text-slate-600 hover:bg-white hover:text-blue-700"
              }`}
            >
              <Icon size={16} />
            </button>
          ))}
          <span className="mx-1 h-5 border-l border-slate-200" />
          <button
            type="button"
            title="Undo"
            aria-label="Undo"
            onClick={() => editor.chain().focus().undo().run()}
            disabled={!editor.can().undo()}
            className="rounded-md p-2 text-slate-600 transition hover:bg-white hover:text-blue-700 disabled:opacity-35"
          >
            <Undo2 size={16} />
          </button>
          <button
            type="button"
            title="Redo"
            aria-label="Redo"
            onClick={() => editor.chain().focus().redo().run()}
            disabled={!editor.can().redo()}
            className="rounded-md p-2 text-slate-600 transition hover:bg-white hover:text-blue-700 disabled:opacity-35"
          >
            <Redo2 size={16} />
          </button>
        </div>
      )}
      <EditorContent editor={editor} />
    </div>
  );
}
