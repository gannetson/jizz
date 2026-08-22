/**
 * Point the adaptive-icon foreground at a fill-gravity bitmap so the mascot
 * uses the 108dp layer instead of sitting as a small badge on the background.
 */
const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

const ADAPTIVE = `<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@color/iconBackground"/>
    <foreground android:drawable="@drawable/ic_launcher_foreground_fill"/>
</adaptive-icon>
`;

const FILL = `<?xml version="1.0" encoding="utf-8"?>
<bitmap xmlns:android="http://schemas.android.com/apk/res/android"
    android:antialias="true"
    android:gravity="fill"
    android:src="@mipmap/ic_launcher_foreground" />
`;

function withFullBleedAdaptiveIcon(config) {
  return withDangerousMod(config, [
    'android',
    async (c) => {
      const res = path.join(c.modRequest.platformProjectRoot, 'app/src/main/res');
      fs.mkdirSync(path.join(res, 'drawable'), { recursive: true });
      fs.mkdirSync(path.join(res, 'mipmap-anydpi-v26'), { recursive: true });
      fs.writeFileSync(path.join(res, 'drawable/ic_launcher_foreground_fill.xml'), FILL);
      fs.writeFileSync(path.join(res, 'mipmap-anydpi-v26/ic_launcher.xml'), ADAPTIVE);
      fs.writeFileSync(path.join(res, 'mipmap-anydpi-v26/ic_launcher_round.xml'), ADAPTIVE);
      return c;
    },
  ]);
}

module.exports = withFullBleedAdaptiveIcon;
