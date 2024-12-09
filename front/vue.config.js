const { defineConfig } = require('@vue/cli-service');
const path = require('path');

module.exports = defineConfig({
  transpileDependencies: true,
  devServer: {
    proxy: {
      '/geoserver': {
        target: 'http://localhost:8989',
        changeOrigin: true,
        pathRewrite: {
          '^/geoserver': '/geoserver'
        },
        headers: {
          'Access-Control-Allow-Origin': '*'
        }
      }
    }
  }
});

