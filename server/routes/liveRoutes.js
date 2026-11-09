// Real-time updates via Server-Sent Events. The client opens a streaming fetch with its bearer
// token (so the token never appears in a URL), and receives a small event whenever data changes.
const express = require('express');

module.exports = ({ auth, requireRole, events, heartbeatMs = 25000 }) => {
  const r = express.Router();
  r.get('/admin/events', auth, requireRole('admin'), (req, res) => {
    res.set({ 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-store', Connection: 'keep-alive', 'X-Accel-Buffering': 'no' });
    res.flushHeaders();
    res.write(`retry: 3000\nevent: hello\ndata: ${JSON.stringify({ connected: true, at: new Date().toISOString() })}\n\n`);
    const unsubscribe = events.subscribe((e) => res.write(`event: change\ndata: ${JSON.stringify(e)}\n\n`));
    const ping = setInterval(() => res.write(`: ping ${Date.now()}\n\n`), heartbeatMs);
    req.on('close', () => { clearInterval(ping); unsubscribe(); });
  });
  return r;
};
