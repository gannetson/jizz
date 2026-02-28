/**
 * Convert Quill delta (django-quill-editor format) to HTML for WebView.
 * Supports: plain insert, bold, italic, underline, link, color, background; images; paragraphs.
 */
type DeltaOp = {
  insert?: string | { image?: string };
  attributes?: {
    bold?: boolean;
    italic?: boolean;
    underline?: boolean;
    link?: string;
    color?: string;
    background?: string;
  };
};

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function getOps(content: string): DeltaOp[] {
  if (!content || typeof content !== 'string') return [];
  const t = content.trim();
  if (!t.startsWith('{')) return [];
  try {
    const parsed = JSON.parse(content) as { ops?: DeltaOp[]; delta?: DeltaOp[] | { ops?: DeltaOp[] } };
    if (Array.isArray(parsed?.ops)) return parsed.ops;
    if (parsed?.delta) {
      const d = parsed.delta as { ops?: DeltaOp[] };
      if (Array.isArray(d?.ops)) return d.ops;
      if (Array.isArray(parsed.delta)) return parsed.delta;
    }
    return [];
  } catch {
    return [];
  }
}

function wrapWithAttributes(html: string, attrs?: DeltaOp['attributes']): string {
  if (!attrs) return html;
  let out = html;
  if (attrs.bold) out = `<strong>${out}</strong>`;
  if (attrs.italic) out = `<em>${out}</em>`;
  if (attrs.underline) out = `<u>${out}</u>`;
  if (attrs.color) out = `<span style="color:${attrs.color}">${out}</span>`;
  if (attrs.background) out = `<span style="background-color:${attrs.background}">${out}</span>`;
  if (attrs.link) out = `<a href="${escapeHtml(attrs.link)}">${out}</a>`;
  return out;
}

export function quillDeltaToHtml(content: string): string {
  const ops = getOps(content);
  if (ops.length === 0) return '';

  const parts: string[] = [];
  let paragraph: string[] = [];

  const flushParagraph = () => {
    if (paragraph.length > 0) {
      parts.push('<p>' + paragraph.join('') + '</p>');
      paragraph = [];
    }
  };

  for (const op of ops) {
    const insert = op.insert;
    if (insert == null) continue;

    if (typeof insert === 'string') {
      const attrs = op.attributes;
      let text = escapeHtml(insert);
      const lines = text.split('\n');
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (i > 0) {
          flushParagraph();
        }
        if (line) {
          paragraph.push(wrapWithAttributes(line, attrs));
        }
      }
      continue;
    }

    if (typeof insert === 'object' && insert !== null && 'image' in insert) {
      flushParagraph();
      const src = (insert as { image?: string }).image;
      if (src) {
        parts.push(`<p><img src="${escapeHtml(src)}" style="max-width:100%;height:auto;border:1px dashed #cbd5e0;border-radius:8px;padding:8px;margin:12px 0;" /></p>`);
      }
    }
  }

  flushParagraph();
  return parts.join('');
}

export function isQuillContent(content: string): boolean {
  if (!content || typeof content !== 'string') return false;
  const t = content.trim();
  return t.startsWith('{') && (t.includes('"ops"') || t.includes('"delta"'));
}
