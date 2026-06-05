const { execSync } = require('child_process');

const PORTS = [3550, 9550, 3050, 9050, 3000, 9000];

function killPort(port) {
  try {
    if (process.platform === 'win32') {
      execSync(
        `for /f "tokens=5" %a in ('netstat -ano ^| findstr :${port}') do taskkill /F /PID %a`,
        { stdio: 'ignore' }
      );
    } else {
      execSync(`fuser -k ${port}/tcp 2>/dev/null`, { stdio: 'ignore' });
    }
  } catch {
    // port already free
  }
}

console.log('[STEALTH-AI] Freeing dev server ports...');
PORTS.forEach(killPort);

try {
  if (process.platform !== 'win32') {
    execSync('pkill -f "electron-forge start" 2>/dev/null', { stdio: 'ignore' });
  }
} catch {
  // ignore
}

console.log('[STEALTH-AI] Ports ready');
