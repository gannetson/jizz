const {createProxyMiddleware} = require('http-proxy-middleware');
module.exports = function (app) {
    const target = process.env.NODE_ENV === 'development'
        ? 'http://localhost:8050/'
        : 'https://birdr.pro/'

    app.use(
        ['/api', '/admin', '/auth', '/token', '/django'],
        createProxyMiddleware({
            target: target,
            changeOrigin: true,
            logLevel: 'debug',
        })
    );
};
