import React from 'react';
import ReactMarkdown from 'react-markdown';

// Renders blog content whether it's stored as Markdown (AI-generated)
// or HTML (manually authored via the rich-text editor), with consistent
// professional typography via the .blog-content styles in index.css.
const looksLikeHtml = (str) =>
  /<\/(p|h[1-6]|div|ul|ol|li|strong|em|a|img|br|blockquote)\s*>/i.test(str || '');

export default function BlogContent({ content, className = '' }) {
  if (!content) return null;
  const wrapperClass = `blog-content ${className}`.trim();
  if (looksLikeHtml(content)) {
    return <div className={wrapperClass} dangerouslySetInnerHTML={{ __html: content }} />;
  }
  return (
    <div className={wrapperClass}>
      <ReactMarkdown>{content}</ReactMarkdown>
    </div>
  );
}