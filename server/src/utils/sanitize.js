import sanitizeHtml from 'sanitize-html';
// Email-safe subset: no scripts, event handlers or javascript: URLs.
export const cleanHtml = (html) => sanitizeHtml(html || '', {
  allowedTags: [...sanitizeHtml.defaults.allowedTags, 'u', 'span', 'h1', 'h2', 'h3'],
  allowedAttributes: { a: ['href', 'target', 'rel'], '*': ['style'] },
  allowedStyles: { '*': { 'text-align': [/^(left|right|center|justify)$/] } },
  allowedSchemes: ['http', 'https', 'mailto'],
  transformTags: { a: sanitizeHtml.simpleTransform('a', { rel: 'noopener noreferrer', target: '_blank' }, true) },
});
