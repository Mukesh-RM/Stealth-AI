import { useState, useEffect, useCallback } from 'react';

export function useSettings() {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const data = await window.stealthAPI.settings.load();
      setSettings(data);
    } catch (e) {
      console.error('[STEALTH-AI] settings load', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const save = async (partial) => {
    const data = await window.stealthAPI.settings.save(partial);
    setSettings(data);
    return data;
  };

  return { settings, loading, refresh, save };
}
