const { defineConfig } = require('@vue/cli-service');
const path = require('path');

module.exports = defineConfig({
  transpileDependencies: true,
  chainWebpack: (config) => {
    // 添加 loader 用于处理 OBJ 和 MTL 文件
    config.module
      .rule('models')
      .test(/\.obj$|\.mtl$/)
      .use('file-loader')
      .loader('file-loader')
      .options({
        name: '[name].[hash:8].[ext]', // 输出文件名配置
        outputPath: 'assets/models/', // 输出路径
        publicPath: 'assets/models/', // 访问路径
      });
  },
});
