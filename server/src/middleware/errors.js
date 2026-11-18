import multer from 'multer';
export const notFound = (_req, res) => res.status(404).json({ success: false, message: 'Route not found', errors: [] });
export const errorHandler = (err, _req, res, _next) => {
  if (err.status) return res.status(err.status).json({ success: false, message: err.message, errors: err.errors || [] });
  if (err.code === '23505') return res.status(409).json({ success: false, message: 'That value already exists', errors: [] });
  if (err instanceof multer.MulterError) return res.status(400).json({ success: false, message: `Attachment problem: ${err.message}`, errors: [] });
  if (err.type === 'entity.parse.failed') return res.status(400).json({ success: false, message: 'Invalid JSON body', errors: [] });
  console.error('Unexpected error:', err.message); // never log secrets or send stack traces to the client
  res.status(500).json({ success: false, message: 'Something went wrong. Please try again.', errors: [] });
};
