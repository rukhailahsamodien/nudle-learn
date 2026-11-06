// Basic security headers (a lightweight subset of what helmet provides).
// Scripts are restricted to our own files; inline *styles* are allowed because the UI sets
// widths/colours via style attributes (low risk: all user text is HTML-escaped).
module.exports = function securityHeaders(req, res, next) {
  res.set({
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'no-referrer',
    'Cross-Origin-Opener-Policy': 'same-origin',
    'Content-Security-Policy': "default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; frame-ancestors 'none'",
  });
  if (req.path.startsWith('/api/')) res.set('Cache-Control', 'no-store');
  next();
};
