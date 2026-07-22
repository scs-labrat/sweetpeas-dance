const ALIGN_STYLE = { left: 'text-align:left;', center: 'text-align:center;', right: 'text-align:right;' };

export const escapeHtml = (str = '') =>
  String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export const renderBlocksToHtml = (blocks = []) =>
  blocks
    .map((b) => {
      const align = ALIGN_STYLE[b.alignment] || ALIGN_STYLE.left;
      switch (b.type) {
        case 'heading':
          return `<h2 style="${align}font-family:sans-serif;color:#9f1239;">${escapeHtml(b.text)}</h2>`;
        case 'paragraph':
          return `<p style="${align}font-family:sans-serif;color:#374151;line-height:1.6;">${escapeHtml(b.text).replace(/\n/g, '<br/>')}</p>`;
        case 'image':
          return b.url
            ? `<div style="${align}"><img src="${escapeHtml(b.url)}" alt="${escapeHtml(b.text || '')}" style="max-width:100%;border-radius:8px;" /></div>`
            : '';
        case 'button':
          return `<div style="${align}margin:16px 0;"><a href="${escapeHtml(b.url || '#')}" style="background:#e11d48;color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none;font-family:sans-serif;display:inline-block;">${escapeHtml(b.text)}</a></div>`;
        case 'divider':
          return '<hr style="border:none;border-top:1px solid #fecdd3;margin:20px 0;" />';
        default:
          return '';
      }
    })
    .join('\n');

export const newBlockId = () => `block-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

export const stripBlockIds = (blocks = []) =>
  blocks.map((block) => {
    const copy = { ...block };
    delete copy.id;
    return copy;
  });
