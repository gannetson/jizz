#!/usr/bin/env node
/**
 * Sync ios/Birdr/Info.plist CFBundle* from app.json (expo.version, expo.buildNumber).
 * Run after changing release fields, or via npm run ios (see package.json).
 */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const appJsonPath = path.join(root, 'app.json');
const plistPath = path.join(root, 'ios/Birdr/Info.plist');

const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));
const { version, buildNumber } = appJson.expo;

if (version == null || buildNumber == null) {
  console.error('sync-release-info-plist: app.json expo.version and expo.buildNumber are required');
  process.exit(1);
}

let xml = fs.readFileSync(plistPath, 'utf8');
xml = xml.replace(
  /(<key>CFBundleShortVersionString<\/key>\s*<string>)[^<]*(<\/string>)/,
  `$1${String(version)}$2`
);
xml = xml.replace(
  /(<key>CFBundleVersion<\/key>\s*<string>)[^<]*(<\/string>)/,
  `$1${String(buildNumber)}$2`
);
fs.writeFileSync(plistPath, xml);
console.log(`sync-release-info-plist: Info.plist -> ${version} (${buildNumber})`);
