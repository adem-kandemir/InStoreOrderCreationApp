const express = require('express');
const app = express();
const PORT = 3000;

console.log('Starting simple test server...');

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`Test server is running on http://localhost:${PORT}`);
  console.log(`Try: http://localhost:${PORT}/api/health`);
}); 