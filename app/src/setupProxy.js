const {createProxyMiddleware} = require('http-proxy-middleware');
module.exports = function (app) {
  const target = process.env.NODE_ENV === 'development'
    ? 'http://localhost:8050/'
    : 'https://jizz.be/'

  app.use(
    '/api',
    createProxyMiddleware({
      target: target,
      changeOrigin: true,
    })
  );
};
