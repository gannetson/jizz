import React, { useMemo, useRef, useEffect } from "react";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";

type QuillContent = { delta?: string | { ops?: unknown[] }; html?: string };

interface QuillContentViewerProps {
  /** JSON string from API: { delta, html } (django-quill-editor format) */
  content: string;
  /** Optional className for the wrapper */
  className?: string;
}

/**
 * Renders Quill rich text content (including images) from API.
 * Accepts the JSON string stored by django-quill-editor.
 * Links are forced to open in the same window (no target="_blank").
 */
export const QuillContentViewer: React.FC<QuillContentViewerProps> = ({ content, className }) => {
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = wrapperRef.current;
    if (!root) return;
    root.querySelectorAll<HTMLAnchorElement>('a[target="_blank"]').forEach((a) => {
      a.removeAttribute("target");
    });
  }, [content]);

  const deltaValue = useMemo((): { ops: unknown[] } => {
    if (!content || typeof content !== "string") return { ops: [] };
    try {
      const parsed: QuillContent = JSON.parse(content);
      const delta = parsed?.delta;
      if (delta == null) return { ops: [] };
      // Delta can be object { ops: [] } or stringified JSON
      if (typeof delta === "object") {
        if (Array.isArray((delta as { ops?: unknown[] }).ops)) return delta as { ops: unknown[] };
        if (Array.isArray(delta)) return { ops: delta };
      }
      if (typeof delta === "string") {
        const inner = JSON.parse(delta) as { ops?: unknown[] } | unknown[];
        if (inner && typeof inner === "object" && Array.isArray((inner as { ops?: unknown[] }).ops)) return inner as { ops: unknown[] };
        if (Array.isArray(inner)) return { ops: inner };
      }
      return { ops: [] };
    } catch {
      return { ops: [] };
    }
  }, [content]);

  return (
    <div ref={wrapperRef} className={className} style={{ minHeight: "auto" }}>
      <style>{`
        .quill-viewer-root .ql-editor { min-height: auto; padding: 0; font-size: 16px; line-height: 1.6; }
        .quill-viewer-root .ql-container { border: none; }
        .quill-viewer-root .ql-toolbar { display: none; }
        /* Style content images so they read as examples, not UI */
        .quill-viewer-root .ql-editor img {
          max-width: 100%;
          height: auto;
          border: 1px dashed #cbd5e0;
          border-radius: 8px;
          padding: 8px;
          background: #f7fafc;
          box-shadow: 0 1px 3px rgba(0,0,0,0.08);
          margin: 12px 0;
          display: block;
        }
      `}</style>
      <div className="quill-viewer-root">
        <ReactQuill value={deltaValue as never} readOnly theme="snow" />
      </div>
    </div>
  );
};
