/**
 * Copy badge.svg to mobile/public/images and build notification-icon.png for Expo.
 * Android tray icons should be ~96x96 PNG; we resize from the web badge asset.
 */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const srcSvg = path.join(root, '..', 'app', 'public', 'images', 'badge.svg');
const publicDir = path.join(root, 'public', 'images');
const assetsDir = path.join(root, 'assets');

async function main() {
  if (!fs.existsSync(srcSvg)) {
    console.error('Missing source:', srcSvg);
    process.exit(1);
  }
  fs.mkdirSync(publicDir, { recursive: true });
  fs.mkdirSync(assetsDir, { recursive: true });

  const publicSvg = path.join(publicDir, 'badge.svg');
  const publicPng = path.join(publicDir, 'badge.png');
  const assetPng = path.join(assetsDir, 'notification-icon.png');

  fs.copyFileSync(srcSvg, publicSvg);

  let sharp;
  try {
    sharp = require('sharp');
  } catch {
    console.warn('sharp not installed; copy SVG only. Run: npm install sharp');
    process.exit(0);
  }

  const size = 96;
  await sharp(srcSvg).resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toFile(publicPng);
  await sharp(publicPng).toFile(assetPng);
  console.log('Wrote', publicPng, 'and', assetPng);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
