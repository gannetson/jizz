/**
 * Makes the black background of birdr-new.png transparent (flood-fill from edges),
 * then places the logo centered on a larger canvas so the full image shows
 * in the app icon and splash (no cropping in adaptive icon or splash).
 * Run from mobile/: node scripts/make-icon-transparent.cjs
 */
const path = require('path');
const fs = require('fs');

async function main() {
  let sharp;
  try {
    sharp = require('sharp');
  } catch {
    console.error('Run: npm install sharp --save-dev');
    process.exit(1);
  }

  const src = path.join(__dirname, '../../app/public/images/birdr-new.png');
  const outDir = path.join(__dirname, '../assets');
  const outPath = path.join(outDir, 'icon.png');
  const splashPath = path.join(outDir, 'splash-icon.png');

  if (!fs.existsSync(src)) {
    console.error('Source not found:', src);
    process.exit(1);
  }
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  const { data, info } = await sharp(src)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { width, height, channels } = info;
  const isBlack = (i) => data[i] < 25 && data[i + 1] < 25 && data[i + 2] < 25;
  const idx = (x, y) => (y * width + x) * channels;
  const visited = new Uint8Array(width * height);
  const stack = [];

  for (let x = 0; x < width; x++) {
    stack.push([x, 0]);
    stack.push([x, height - 1]);
  }
  for (let y = 0; y < height; y++) {
    stack.push([0, y]);
    stack.push([width - 1, y]);
  }

  while (stack.length) {
    const [x, y] = stack.pop();
    if (x < 0 || x >= width || y < 0 || y >= height) continue;
    const i = idx(x, y);
    if (visited[y * width + x]) continue;
    if (!isBlack(i)) continue;
    visited[y * width + x] = 1;
    data[i + 3] = 0;
    stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
  }

  const logoWithTransparency = await sharp(Buffer.from(data), { raw: { width, height, channels } })
    .png()
    .toBuffer();

  // Scale logo so the entire image always shows (no cropping).
  // - Adaptive icon: only the center ~66% is safe; use 50% so any mask shows the full logo.
  // - Splash: with resizeMode "contain", the full canvas is shown; logo at 50% has padding.
  const canvasSize = 1024;
  const maxLogoRatio = 0.5;
  const maxLogoSize = Math.floor(canvasSize * maxLogoRatio);

  const logoMeta = await sharp(logoWithTransparency).metadata();
  const logoW = logoMeta.width || width;
  const logoH = logoMeta.height || height;
  const scale = Math.min(maxLogoSize / logoW, maxLogoSize / logoH, 1);
  const scaledW = Math.round(logoW * scale);
  const scaledH = Math.round(logoH * scale);
  const left = Math.round((canvasSize - scaledW) / 2);
  const top = Math.round((canvasSize - scaledH) / 2);

  const resizedLogo = await sharp(logoWithTransparency)
    .resize(scaledW, scaledH, { fit: 'contain' })
    .toBuffer();

  const composed = await sharp({
    create: {
      width: canvasSize,
      height: canvasSize,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([{ input: resizedLogo, left, top }])
    .png()
    .toBuffer();

  await sharp(composed).toFile(outPath);
  await sharp(composed).toFile(splashPath);

  console.log('Written', outPath, 'and', splashPath, '(logo at', Math.round(scale * 100) + '% scale, centered on', canvasSize + 'x' + canvasSize + ')');
  console.log('To apply: run "npx expo prebuild --clean" then rebuild the app.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
