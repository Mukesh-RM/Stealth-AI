const path = require('path');
const rules = require('./webpack.rules');

module.exports = {
  module: {
    rules,
  },
  resolve: {
    extensions: ['.js', '.jsx', '.json'],
  },
  plugins: [],
  devtool: process.env.NODE_ENV === 'production' ? false : 'eval-cheap-module-source-map',
  devServer: {
    hot: true,
    host: '127.0.0.1',
    client: {
      overlay: false,
      webSocketURL: 'auto://127.0.0.1:0/ws',
    },
  },
  optimization: {
    moduleIds: 'deterministic',
  },
};
