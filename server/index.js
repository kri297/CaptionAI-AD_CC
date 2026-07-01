require('dotenv').config();
const express = require('express');
const cors = require('cors');
const dns = require('dns');

// Force IPv4 to fix "fetch failed" errors in Node 17+ if ISP has broken IPv6
dns.setDefaultResultOrder('ipv4first');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());

app.use(express.json({ limit: '10mb' }));

// Routes
const processRoute = require('./routes/process.js');
const exportRoute = require('./routes/export.js');
const ttsRoute = require('./routes/tts.js');

app.use('/api', processRoute);
app.use('/api/export', exportRoute);
app.use('/api/tts', ttsRoute);

// Expose the uploads directory to the frontend for audio preview
const path = require('path');
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    gemini: !!process.env.GEMINI_API_KEY,
    timestamp: new Date().toISOString()
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err.message);
  res.status(500).json({ error: err.message || 'Internal server error' });
});

const server = app.listen(PORT, () => {
  console.log(`\n🎬  Caption Studio Server`);
  console.log(`    → http://localhost:${PORT}\n`);
  if (!process.env.GEMINI_API_KEY) {
    console.warn('⚠️   GEMINI_API_KEY not set! Create a .env file from .env.example\n');
  } else {
    console.log('✅  Gemini API key loaded\n');
  }
});

// Override Node.js global default timeouts (120s) to 10 minutes to support heavy FFmpeg operations
server.timeout = 600000;
server.keepAliveTimeout = 600000;
server.headersTimeout = 601000;
