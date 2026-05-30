#!/usr/bin/env node
/**
 * Fixes project.pbxproj for CocoaPods compatibility:
 * 1. Xcode 16+ writes shellScript as a string array; xcodeproj expects one string.
 * 2. Xcode 26+ may set objectVersion 90; current xcodeproj (1.27) supports up to 77.
 *
 * Run after expo prebuild or when `pod install` fails on shellScript / objectVersion errors.
 */
const fs = require('fs');
const path = require('path');

const pbxPath = path.join(__dirname, '..', 'ios', 'Birdr.xcodeproj', 'project.pbxproj');
let src = fs.readFileSync(pbxPath, 'utf8');
let shellConverted = 0;
let objectVersionDowngraded = false;

// --- shellScript arrays -> single string ---
const lines = src.split('\n');
const out = [];

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  if (!/^\t+shellScript = \($/.test(line)) {
    out.push(line);
    continue;
  }

  const indent = line.match(/^(\t+)/)[1];
  const scriptLines = [];
  i++;
  while (i < lines.length && !/^\t+\);$/.test(lines[i])) {
    const m = lines[i].match(/^\t+"((?:\\.|[^"\\])*)",?\s*$/);
    if (m) {
      scriptLines.push(
        m[1]
          .replace(/\\"/g, '"')
          .replace(/\\n/g, '\n')
          .replace(/\\t/g, '\t')
          .replace(/\\\\/g, '\\')
      );
    }
    i++;
  }

  const escaped = scriptLines
    .join('\n')
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n')
    .replace(/\t/g, '\\t');

  out.push(`${indent}shellScript = "${escaped}";`);
  shellConverted++;
}

src = out.join('\n');

// --- objectVersion: CocoaPods xcodeproj 1.27 supports up to 77 ---
src = src.replace(/^(\tobjectVersion = )(\d+);$/m, (_, prefix, ver) => {
  const n = parseInt(ver, 10);
  if (n > 77) {
    objectVersionDowngraded = true;
    return `${prefix}77;`;
  }
  return `${prefix}${ver};`;
});

fs.writeFileSync(pbxPath, src);

if (shellConverted === 0 && !objectVersionDowngraded) {
  console.log('fix-pbxproj-shellscript: nothing to change');
} else {
  if (shellConverted > 0) {
    console.log(`fix-pbxproj-shellscript: converted ${shellConverted} shellScript block(s)`);
  }
  if (objectVersionDowngraded) {
    console.log('fix-pbxproj-shellscript: set objectVersion = 77 (CocoaPods compatibility)');
  }
}
