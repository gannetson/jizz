/**
 * Expo config plugin: ensure Android build uses NDK 28 and useLegacyPackaging false
 * so the app satisfies Google Play's 16 KB page size requirement.
 */
const { withProjectBuildGradle, withAppBuildGradle } = require('@expo/config-plugins');

const NDK_VERSION = '28.0.13004108';
const PACKAGING_BLOCK = `
    packagingOptions {
        jniLibs {
            useLegacyPackaging false
        }
    }
`;

function withAndroid16Kb(config) {
  config = withProjectBuildGradle(config, (c) => {
    let contents = c.modResults.contents;
    // Ensure ndkVersion is set to 28 in buildscript.ext
    if (contents.includes('ndkVersion')) {
      contents = contents.replace(/ndkVersion\s*=\s*["'][^"']+["']/, `ndkVersion = "${NDK_VERSION}"`);
    } else {
      contents = contents.replace(
        /(agpVersion\s*=\s*[^\n]+)/,
        `$1\n        ndkVersion = "${NDK_VERSION}"`
      );
    }
    c.modResults.contents = contents;
    return c;
  });

  config = withAppBuildGradle(config, (c) => {
    let contents = c.modResults.contents;
    if (contents.includes('useLegacyPackaging')) {
      return c;
    }
    // Insert packagingOptions before androidResources so 16 KB alignment is preserved in AAB
    contents = contents.replace(
      /(\s+)(androidResources\s*\{)/,
      `${PACKAGING_BLOCK}\n    $1$2`
    );
    c.modResults.contents = contents;
    return c;
  });

  return config;
}

module.exports = withAndroid16Kb;
