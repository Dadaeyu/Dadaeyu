"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import {
  Bold,
  Italic,
  Heading2,
  List,
  ListOrdered,
  Link as LinkIcon,
  ImagePlus,
  Undo,
  Redo
} from "lucide-react";
import { Button } from "@/components/ui/Button";

type RichTextEditorProps = {
  value: string;
  onChange: (html: string) => void;
  uploadKind?: "notice" | "event";
  placeholder?: string;
  disabled?: boolean;
};

const IMAGE_SIZE_PRESETS = [
  { label: "25%", value: "25%" },
  { label: "50%", value: "50%" },
  { label: "75%", value: "75%" },
  { label: "100%", value: "100%" }
] as const;

/** width 퍼센트를 style로 저장해 상세/에디터에서 동일하게 보이도록 */
const SizedImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      width: {
        default: "100%",
        parseHTML: (element) =>
          element.getAttribute("data-width") ||
          element.style.width ||
          element.getAttribute("width") ||
          "100%",
        renderHTML: (attributes) => {
          const width = (attributes.width as string) || "100%";
          return {
            "data-width": width,
            style: `width: ${width}; height: auto; max-width: 100%;`
          };
        }
      }
    };
  }
});

export function RichTextEditor({
  value,
  onChange,
  uploadKind = "notice",
  disabled = false
}: RichTextEditorProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const uploadingRef = useRef(false);
  const [, setSelectionTick] = useState(0);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] }
      }),
      SizedImage.configure({
        HTMLAttributes: { class: "rich-editor-image rounded-lg my-3 h-auto" }
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: { class: "text-brand-600 underline" }
      })
    ],
    content: value || "",
    editable: !disabled,
    immediatelyRender: false,
    onUpdate: ({ editor: ed }) => {
      onChange(ed.getHTML());
    },
    onSelectionUpdate: () => setSelectionTick((n) => n + 1),
    editorProps: {
      attributes: {
        class:
          "prose prose-sm max-w-none min-h-[200px] px-3 py-2 focus:outline-none text-ink [&_p]:my-2 [&_ul]:my-2 [&_ol]:my-2 [&_h2]:text-lg [&_h2]:font-bold [&_h3]:text-base [&_h3]:font-semibold [&_img.ProseMirror-selectednode]:outline [&_img.ProseMirror-selectednode]:outline-2 [&_img.ProseMirror-selectednode]:outline-navy-400 [&_img.ProseMirror-selectednode]:outline-offset-2"
      }
    }
  });

  useEffect(() => {
    if (!editor) return;
    const current = editor.getHTML();
    if (value === current) return;
    if (!value && (current === "" || current === "<p></p>")) return;
    editor.commands.setContent(value || "", { emitUpdate: false });
  }, [editor, value]);

  useEffect(() => {
    if (!editor) return;
    editor.setEditable(!disabled);
  }, [editor, disabled]);

  const setLink = useCallback(() => {
    if (!editor) return;
    const prev = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt("링크 URL", prev ?? "https://");
    if (url === null) return;
    if (url.trim() === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: url.trim() }).run();
  }, [editor]);

  const setImageWidth = useCallback(
    (width: string) => {
      if (!editor || !editor.isActive("image")) return;
      editor.chain().focus().updateAttributes("image", { width }).run();
    },
    [editor]
  );

  const uploadImage = useCallback(
    async (file: File) => {
      if (!editor || uploadingRef.current) return;
      uploadingRef.current = true;
      try {
        const body = new FormData();
        body.set("file", file);
        body.set("kind", uploadKind);
        const res = await fetch("/api/admin/community-media", { method: "POST", body });
        const json = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
        if (!res.ok || !json.url) throw new Error(json.error ?? "업로드 실패");
        editor
          .chain()
          .focus()
          .setImage({ src: json.url })
          .updateAttributes("image", { width: "100%" })
          .run();
      } catch (e) {
        window.alert(e instanceof Error ? e.message : "이미지 업로드에 실패했습니다.");
      } finally {
        uploadingRef.current = false;
        if (fileRef.current) fileRef.current.value = "";
      }
    },
    [editor, uploadKind]
  );

  if (!editor) return null;

  const imageSelected = editor.isActive("image");
  const currentWidth = (editor.getAttributes("image").width as string | undefined) ?? "100%";

  const toolBtn =
    "border-hairline text-steel hover:bg-surface-soft inline-flex h-8 w-8 items-center justify-center rounded-md border disabled:opacity-40";
  const activeBtn = "bg-navy-50 text-navy-700 border-navy-200";
  const sizeBtn =
    "border-hairline text-steel hover:bg-surface-soft inline-flex h-8 min-w-10 items-center justify-center rounded-md border px-2 text-xs font-medium disabled:opacity-40";

  return (
    <div
      className={`border-hairline overflow-hidden rounded-lg border bg-white ${disabled ? "opacity-60" : ""}`}
    >
      <div className="border-hairline-soft bg-surface-soft/50 flex flex-wrap gap-1 border-b p-2">
        <button
          type="button"
          className={`${toolBtn} ${editor.isActive("bold") ? activeBtn : ""}`}
          disabled={disabled}
          onClick={() => editor.chain().focus().toggleBold().run()}
          aria-label="굵게"
        >
          <Bold className="h-4 w-4" />
        </button>
        <button
          type="button"
          className={`${toolBtn} ${editor.isActive("italic") ? activeBtn : ""}`}
          disabled={disabled}
          onClick={() => editor.chain().focus().toggleItalic().run()}
          aria-label="기울임"
        >
          <Italic className="h-4 w-4" />
        </button>
        <button
          type="button"
          className={`${toolBtn} ${editor.isActive("heading", { level: 2 }) ? activeBtn : ""}`}
          disabled={disabled}
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          aria-label="제목"
        >
          <Heading2 className="h-4 w-4" />
        </button>
        <button
          type="button"
          className={`${toolBtn} ${editor.isActive("bulletList") ? activeBtn : ""}`}
          disabled={disabled}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          aria-label="글머리 목록"
        >
          <List className="h-4 w-4" />
        </button>
        <button
          type="button"
          className={`${toolBtn} ${editor.isActive("orderedList") ? activeBtn : ""}`}
          disabled={disabled}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          aria-label="번호 목록"
        >
          <ListOrdered className="h-4 w-4" />
        </button>
        <button
          type="button"
          className={`${toolBtn} ${editor.isActive("link") ? activeBtn : ""}`}
          disabled={disabled}
          onClick={setLink}
          aria-label="링크"
        >
          <LinkIcon className="h-4 w-4" />
        </button>
        <button
          type="button"
          className={toolBtn}
          disabled={disabled}
          onClick={() => fileRef.current?.click()}
          aria-label="이미지"
        >
          <ImagePlus className="h-4 w-4" />
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void uploadImage(f);
          }}
        />
        <span className="bg-hairline mx-1 w-px self-stretch" />
        <button
          type="button"
          className={toolBtn}
          disabled={disabled || !editor.can().undo()}
          onClick={() => editor.chain().focus().undo().run()}
          aria-label="실행 취소"
        >
          <Undo className="h-4 w-4" />
        </button>
        <button
          type="button"
          className={toolBtn}
          disabled={disabled || !editor.can().redo()}
          onClick={() => editor.chain().focus().redo().run()}
          aria-label="다시 실행"
        >
          <Redo className="h-4 w-4" />
        </button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="ml-auto text-xs"
          disabled={disabled}
          onClick={() => fileRef.current?.click()}
        >
          이미지 첨부
        </Button>
      </div>

      {imageSelected && (
        <div className="border-hairline-soft bg-navy-50/40 flex flex-wrap items-center gap-1.5 border-b px-2 py-1.5">
          <span className="text-steel mr-1 text-xs font-medium">이미지 크기</span>
          {IMAGE_SIZE_PRESETS.map((preset) => (
            <button
              key={preset.value}
              type="button"
              className={`${sizeBtn} ${currentWidth === preset.value ? activeBtn : ""}`}
              disabled={disabled}
              onClick={() => setImageWidth(preset.value)}
            >
              {preset.label}
            </button>
          ))}
        </div>
      )}

      <EditorContent editor={editor} />
      <p className="text-stone border-hairline-soft border-t px-3 py-1.5 text-[11px]">
        이미지를 클릭한 뒤 위쪽에서 크기(25%·50%·75%·100%)를 선택할 수 있습니다.
      </p>
    </div>
  );
}
