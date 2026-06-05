const { execSync } = require('child_process');
const path = require('path');

console.log('[STEALTH-AI] Running postinstall...');

try {
  execSync(`node "${path.join(__dirname, 'build-native.js')}"`, {
    stdio: 'inherit',
  });
} catch (e) {
  console.warn('[STEALTH-AI] postinstall native build skipped:', e.message);
}

try {
  console.log('[STEALTH-AI] Ensuring node-record-lpcm16 is installed...');
  execSync('npm install node-record-lpcm16@^1.0.1 --no-save', {
    stdio: 'inherit',
    cwd: path.join(__dirname, '..'),
  });
} catch (e) {
  console.warn('[STEALTH-AI] node-record install skipped:', e.message);
}

if (process.platform === 'win32') {
  try {
    console.log('[STEALTH-AI] Rebuilding native modules for Electron...');
    execSync('npx @electron/rebuild -f -w naudiodon,node-record-lpcm16', {
      stdio: 'inherit',
      cwd: path.join(__dirname, '..'),
    });
  } catch (e) {
    console.warn('[STEALTH-AI] electron-rebuild skipped:', e.message);
  }
} else {
  console.log('[STEALTH-AI] Linux/Mac: mic uses arecord + overlay browser capture if needed');
}

console.log('[STEALTH-AI] postinstall complete');
