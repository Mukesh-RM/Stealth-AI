import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  useTransition,
} from 'react';

const AppDataContext = createContext(null);

function defaultSettings() {
  return {
    username: '',
    onboardingComplete: false,
    freeSessionsLeft: 5,
    totalSessions: 0,
    totalAiResponses: 0,
    apisConnected: 0,
    apiKeysStatus: {
      gemini: false,
      groq: false,
      openai: false,
      anthropic: false,
    },
  };
}

export function AppDataProvider({ children }) {
  const [settings, setSettings] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [resumes, setResumes] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [models, setModels] = useState([]);
  const [ready, setReady] = useState(false);
  const [, startTransition] = useTransition();

  const applyBootstrap = useCallback((data) => {
    setSettings(data.settings || defaultSettings());
    setSessions(data.sessions || []);
    setResumes(data.resumes || []);
    setDocuments(data.documents || []);
    setModels(data.models || data.settings?.availableModels || []);
    setReady(true);
  }, []);

  const bootstrap = useCallback(async () => {
    if (!window.stealthAPI) {
      console.error('[STEALTH-AI] stealthAPI not available — preload failed');
      applyBootstrap({ settings: defaultSettings() });
      return;
    }
    try {
      const data = await window.stealthAPI.bootstrap();
      applyBootstrap(data);
      return data;
    } catch (e) {
      console.error('[STEALTH-AI] bootstrap failed', e);
      try {
        const fallback = await window.stealthAPI.settings.load();
        applyBootstrap({
          settings: fallback,
          sessions: [],
          resumes: [],
          documents: [],
          models: fallback?.availableModels || [],
        });
      } catch (e2) {
        console.error('[STEALTH-AI] settings fallback failed', e2);
        applyBootstrap({ settings: defaultSettings() });
      }
    }
  }, [applyBootstrap]);

  const patchSettings = useCallback((partial) => {
    setSettings((prev) => (prev ? { ...prev, ...partial } : prev));
  }, []);

  const refreshSettings = useCallback(async () => {
    const data = await window.stealthAPI.settings.load();
    startTransition(() => {
      setSettings(data);
      if (data?.availableModels) setModels(data.availableModels);
    });
    return data;
  }, []);

  const saveSettings = useCallback(
    async (partial) => {
      const data = await window.stealthAPI.settings.save(partial);
      startTransition(() => setSettings(data));
      return data;
    },
    []
  );

  const refreshSessions = useCallback(async () => {
    const data = await window.stealthAPI.sessions.loadAll();
    startTransition(() => setSessions(data || []));
    return data;
  }, []);

  const refreshResumes = useCallback(async () => {
    const data = await window.stealthAPI.resumes.loadAll();
    startTransition(() => setResumes(data || []));
    return data;
  }, []);

  const refreshDocuments = useCallback(async () => {
    const data = await window.stealthAPI.documents.loadAll();
    startTransition(() => setDocuments(data || []));
    return data;
  }, []);

  const refreshModels = useCallback(async () => {
    const data = await window.stealthAPI.models.available();
    startTransition(() => setModels(data || []));
    return data;
  }, []);

  const value = useMemo(
    () => ({
      settings,
      sessions,
      resumes,
      documents,
      models,
      ready,
      bootstrap,
      patchSettings,
      refreshSettings,
      saveSettings,
      refreshSessions,
      refreshResumes,
      refreshDocuments,
      refreshModels,
    }),
    [
      settings,
      sessions,
      resumes,
      documents,
      models,
      ready,
      bootstrap,
      patchSettings,
      refreshSettings,
      saveSettings,
      refreshSessions,
      refreshResumes,
      refreshDocuments,
      refreshModels,
    ]
  );

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
}

export function useAppData() {
  const ctx = useContext(AppDataContext);
  if (!ctx) throw new Error('useAppData must be used within AppDataProvider');
  return ctx;
}
