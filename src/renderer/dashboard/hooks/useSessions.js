import { useState, useEffect, useCallback } from 'react';

export function useSessions() {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const data = await window.stealthAPI.sessions.loadAll();
      setSessions(data || []);
    } catch (e) {
      console.error('[STEALTH-AI] sessions load', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const remove = async (id) => {
    await window.stealthAPI.sessions.delete(id);
    await refresh();
  };

  return { sessions, loading, refresh, remove };
}
