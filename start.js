const { spawn } = require('child_process');
const path = require('path');

const SERVICE = process.env.RAILWAY_SERVICE_NAME || process.env.SERVICE || 'frontend';

if (SERVICE.toLowerCase().includes('backend') || SERVICE.toLowerCase().includes('api')) {
  console.log('Starting backend service...');
  const backend = spawn('node', ['dist/index.js'], {
    cwd: path.join(__dirname, 'backend'),
    stdio: 'inherit',
    env: { ...process.env },
  });
  backend.on('exit', (code) => process.exit(code || 0));
} else {
  console.log('Starting frontend service...');
  const port = process.env.PORT || 3000;
  const frontend = spawn('npx', ['serve', 'dist', '-s', '-l', String(port)], {
    cwd: path.join(__dirname, 'frontend'),
    stdio: 'inherit',
    env: { ...process.env },
  });
  frontend.on('exit', (code) => process.exit(code || 0));
}
