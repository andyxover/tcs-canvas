'use client'

import { useState } from 'react'
import { useEditor, EditorContent, type Editor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'

type Props = {
  /** Form field name — a hidden input carries the editor's HTML for the action. */
  name: string
  defaultHTML?: string
  placeholder?: string
  minHeight?: number
}

/**
 * A small rich-text editor (TipTap) that writes its HTML into a hidden input,
 * so it drops straight into any Server-Action <form>. immediatelyRender:false
 * keeps it SSR-safe under the App Router.
 */
export function RichTextEditor({ name, defaultHTML = '', placeholder, minHeight = 120 }: Props) {
  const [html, setHtml] = useState(defaultHTML)

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [StarterKit],
    content: defaultHTML,
    editorProps: {
      attributes: { class: 'lms-editor__content', style: `min-height:${minHeight}px` },
    },
    onUpdate: ({ editor }) => {
      setHtml(editor.isEmpty ? '' : editor.getHTML())
    },
  })

  return (
    <div className="lms-editor">
      <Toolbar editor={editor} />
      {editor && editor.isEmpty && placeholder && <div className="lms-editor__placeholder">{placeholder}</div>}
      <EditorContent editor={editor} />
      <input type="hidden" name={name} value={html} />
    </div>
  )
}

function Toolbar({ editor }: { editor: Editor | null }) {
  if (!editor) return <div className="lms-editor__toolbar" />
  const btn = (active: boolean, onClick: () => void, label: string, title: string) => (
    <button type="button" className="lms-editor__btn" data-active={active} onMouseDown={(e) => e.preventDefault()} onClick={onClick} title={title}>
      {label}
    </button>
  )
  return (
    <div className="lms-editor__toolbar">
      {btn(editor.isActive('bold'), () => editor.chain().focus().toggleBold().run(), 'B', 'Bold')}
      {btn(editor.isActive('italic'), () => editor.chain().focus().toggleItalic().run(), 'I', 'Italic')}
      {btn(editor.isActive('heading', { level: 2 }), () => editor.chain().focus().toggleHeading({ level: 2 }).run(), 'H2', 'Heading')}
      {btn(editor.isActive('heading', { level: 3 }), () => editor.chain().focus().toggleHeading({ level: 3 }).run(), 'H3', 'Subheading')}
      {btn(editor.isActive('bulletList'), () => editor.chain().focus().toggleBulletList().run(), '• List', 'Bullet list')}
      {btn(editor.isActive('orderedList'), () => editor.chain().focus().toggleOrderedList().run(), '1. List', 'Numbered list')}
    </div>
  )
}
