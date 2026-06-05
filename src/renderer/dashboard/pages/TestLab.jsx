import React, { memo, useState, useCallback, useEffect } from 'react';
import { useAppData } from '../context/AppDataContext';

function TestLab() {
  const { settings, models, refreshSettings, refreshModels } = useAppData();
  const [platform, setPlatform] = useState(null);
  const [model, setModel] = useState('');
  const [prompt, setPrompt] = useState('Tell me about yourself in 2 sentences.');
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    window.stealthAPI.invoke('platform:info').then(setPlatform);
    refreshModels();
  }, [refreshModels]);

  useEffect(() => {
    if (models?.length && !model) setModel(models[0]);
  }, [models, model]);

  const runAiTest = useCallback(async () => {
    setBusy(true);
    setResult(null);
    try {
      const res = await window.stealthAPI.invoke('ai:quick-test', { modelLabel: model, prompt });
      setResult(res);
      if (res.ok) refreshSettings();
    } catch (e) {
      setResult({ ok: false, message: e.message });
    } finally {
      setBusy(false);
    }
  }, [model, prompt, refreshSettings]);

  const openOverlay = useCallback(() => {
    window.stealthAPI.window.showOverlay();
  }, []);

  const apis = settings?.apisConnected ?? 0;

  return (
    <div className="page-content">
      <div className="page-header">
        <h2>Test Lab</h2>
      </div>
      <p className="text-muted section-lead">
        Test AI and overlay directly from the dashboard — no Windows required.
        {platform?.isTestMode && ' Screen-capture invisibility is Windows-only.'}
      </p>

      <div className="test-lab-grid">
        <div className="api-card">
          <h3>1. API keys</h3>
          <p className="api-meta">
            {apis > 0
              ? `${apis} provider(s) with saved keys. ${settings?.apisVerified ?? 0} verified by test.`
              : 'No keys yet — go to API Keys and Save.'}
          </p>
          <a href="#/settings/api-keys" className="btn btn-outline">
            Open API Keys
          </a>
        </div>

        <div className="api-card">
          <h3>2. Quick AI test</h3>
          <div className="form-group">
            <label>AI Provider</label>
            <select
              value={model}
              onChange={(e) => setModel(e.target.value)}
              disabled={!models?.length}
              aria-label="AI provider"
            >
              {!models?.length ? (
                <option>Add API keys first</option>
              ) : (
                models.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))
              )}
            </select>
          </div>
          <div className="form-group">
            <label>Prompt</label>
            <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} rows={3} />
          </div>
          <button
            type="button"
            className="btn btn-primary"
            onClick={runAiTest}
            disabled={busy || !models?.length}
          >
            {busy ? 'Running…' : 'Run AI Test'}
          </button>
          {result && (
            <div className={`test-result ${result.ok ? 'ok' : 'fail'}`}>
              {result.ok ? (
                <>
                  <p className="status-ok">✅ OK — {result.elapsed}s — {result.model}</p>
                  <pre>{result.text}</pre>
                </>
              ) : (
                <p className="status-fail">❌ {result.message}</p>
              )}
            </div>
          )}
        </div>

        <div className="api-card">
          <h3>3. Overlay (test mode)</h3>
          <p className="api-meta">
            Opens the floating assistant window. On Linux it is visible (not hidden from screenshots).
          </p>
          <button type="button" className="btn btn-primary" onClick={openOverlay}>
            Open Test Overlay
          </button>
          <button
            type="button"
            className="btn btn-outline"
            style={{ marginLeft: 8 }}
            onClick={() => window.stealthAPI.window.showDashboard()}
          >
            Focus Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}

export default memo(TestLab);
