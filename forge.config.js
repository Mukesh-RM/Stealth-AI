const path = require('path');

module.exports = {
  packagerConfig: {
    asar: true,
    icon: path.join(__dirname, 'assets', 'icon'),
    executableName: 'StealthAI',
    appBundleId: 'com.stealthai.desktop',
    win32metadata: {
      CompanyName: 'Stealth AI',
      FileDescription: 'Stealth AI — Interview Assistant',
      ProductName: 'Stealth AI',
    },
  },
  rebuildConfig: {},
  makers: [
    {
      name: '@electron-forge/maker-squirrel',
      config: {
        name: 'StealthAI',
        setupIcon: path.join(__dirname, 'assets', 'icon.ico'),
      },
    },
  ],
  plugins: [
    {
      name: '@electron-forge/plugin-webpack',
      config: {
        mainConfig: './webpack.main.config.js',
        port: 3550,
        loggerPort: 9550,
        renderer: {
          config: './webpack.renderer.config.js',
          entryPoints: [
            {
              name: 'dashboard',
              html: './src/renderer/dashboard/index.html',
              js: './src/renderer/dashboard/index.jsx',
              preload: {
                js: './src/main/preload.js',
              },
            },
            {
              name: 'overlay',
              html: './src/renderer/overlay/index.html',
              js: './src/renderer/overlay/index.jsx',
              preload: {
                js: './src/main/preload.js',
              },
            },
          ],
        },
      },
    },
  ],
};
