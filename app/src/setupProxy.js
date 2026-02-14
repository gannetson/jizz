const {createProxyMiddleware} = require('http-proxy-middleware');
module.exports = function (app) {
    const target = process.env.REACT_APP_API_URL || (process.env.NODE_ENV === 'development'
        ? 'http://127.0.0.1:8050'
        : 'https://birdr.pro')

    app.use(
        ['/api', '/admin', '/auth', '/token', '/django'],
        createProxyMiddleware({
            target: target,
            changeOrigin: true,
            logLevel: 'debug',
            secure: false,
            onError: (err, req, res) => {
                console.error('Proxy error:', err.message);
                console.error('Target:', target);
                console.error('Request URL:', req.url);
                res.status(500).json({
                    error: 'Proxy error',
                    message: err.message,
                    target: target,
                    url: req.url
                });
            },
            onProxyReq: (proxyReq, req, res) => {
                console.log('Proxying request:', req.method, req.url, '->', target + req.url);
            }
        })
    );
};
