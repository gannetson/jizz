const path = require('path');

/** react-zoom-pan-pinch ships source maps pointing at non-existent paths under node_modules/src/ */
const BROKEN_SOURCE_MAP_PACKAGES = /node_modules[\\/](react-zoom-pan-pinch)/;

function excludeFromSourceMapLoader(webpackConfig, pattern) {
  webpackConfig.module.rules.forEach((rule) => {
    if (!rule.oneOf) return;
    rule.oneOf.forEach((oneOfRule) => {
      const uses = oneOfRule.use
        ? Array.isArray(oneOfRule.use)
          ? oneOfRule.use
          : [oneOfRule.use]
        : oneOfRule.loader
          ? [{ loader: oneOfRule.loader }]
          : [];
      const hasSourceMapLoader = uses.some((u) =>
        String(u.loader || u).includes('source-map-loader')
      );
      if (!hasSourceMapLoader) return;

      const prev = oneOfRule.exclude
        ? Array.isArray(oneOfRule.exclude)
          ? oneOfRule.exclude
          : [oneOfRule.exclude]
        : [];
      oneOfRule.exclude = [...prev, pattern];
    });
  });
}

module.exports = {
  webpack: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
    configure: (webpackConfig) => {
      excludeFromSourceMapLoader(webpackConfig, BROKEN_SOURCE_MAP_PACKAGES);

      webpackConfig.ignoreWarnings = [
        ...(webpackConfig.ignoreWarnings || []),
        /Failed to parse source map/,
        BROKEN_SOURCE_MAP_PACKAGES,
      ];

      return webpackConfig;
    },
  },
};

