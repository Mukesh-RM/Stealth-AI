import React, { memo, useEffect, useState } from 'react';

function PlatformBanner() {
  const [info, setInfo] = useState(null);

  useEffect(() => {
    window.stealthAPI?.invoke?.('platform:info').then(setInfo).catch(() => {});
  }, []);

  if (!info?.isTestMode) return null;

  return (
    <div className="platform-banner">
      <strong>Test mode (Linux/macOS)</strong> — Use <strong>Test Lab</strong> to verify API keys and AI.
      Overlay works here for testing; invisible screen capture is <strong>Windows only</strong>.
    </div>
  );
}

export default memo(PlatformBanner);
