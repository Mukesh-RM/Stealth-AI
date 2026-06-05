import React, { memo, useState, useCallback } from 'react';
import { useAppData } from '../context/AppDataContext';

const PROVIDERS = [
  {
    id: 'gemini',
    name: 'Google Gemini',
    tier: 'Free tier: 15 req/min, 1M tokens/day',
    link: 'https://aistudio.google.com/apikey',
    hint: 'Copy from aistudio.google.com → API Keys → Copy key (AIza… or AQ.… both work)',
  },
  {
    id: 'groq',
    name: 'Groq',
    tier: 'Free tier: 14,400 req/day, ultra-fast',
    link: 'https://console.groq.com/keys',
    hint: 'Key starts with gsk_',
  },
  {
    id: 'openai',
    name: 'OpenAI',
    tier: 'Used for: GPT-4o answers + Whisper transcription',
    link: 'https://platform.openai.com/api-keys',
    hint: 'Key starts with sk-',
  },
  {
    id: 'anthropic',
    name: 'Anthropic Claude',
    tier: 'Claude 3.5 Sonnet and Haiku models',
    link: 'https://console.anthropic.com/settings/keys',
    hint: 'Key starts with sk-ant-',
  },
];

function StatusLine({ entry, lastResult }) {
  if (lastResult?.pending) {
    return <span className="status-pending">⏳ Testing connection…</span>;
  }
  if (lastResult && !lastResult.ok) {
    return <span className="status-fail">❌ {lastResult.message}</span>;
  }
  if (lastResult?.ok) {
    return <span className="status-ok">✅ {lastResult.message}</span>;
  }
  if (entry?.verified) {
    return <span className="status-ok">✅ Connected</span>;
  }
  if (entry?.saved) {
    return <span className="status-warn">🟡 Saved — click Test</span>;
  }
  return <span className="status-fail">❌ Not configured</span>;
}

const ProviderCard = memo(function ProviderCard({ provider, keyStatus, onSuccess }) {
  const [key, setKey] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [lastResult, setLastResult] = useState(null);

  const runTest = useCallback(
    async (keyOverride) => {
      const testKey = (keyOverride ?? key).trim();
      if (!testKey && !keyStatus?.saved && !keyStatus?.verified) {
        setLastResult({ ok: false, message: 'Paste your API key first' });
        return;
      }
      setBusy(true);
      setLastResult({ pending: true, message: 'Contacting API…' });
      try {
        const result = await window.stealthAPI.settings.testApiKey(provider.id, testKey);
        setLastResult({
          ok: result.ok,
          message: result.ok ? result.message : result.message,
        });
        if (result.ok) {
          setKey('');
          await onSuccess();
        }
      } catch (e) {
        setLastResult({ ok: false, message: e.message || 'Test failed' });
      } finally {
        setBusy(false);
      }
    },
    [key, keyStatus, provider.id, onSuccess]
  );

  const handleSave = useCallback(async () => {
    const hasSaved = keyStatus?.saved || keyStatus?.verified;
    if (!key.trim() && !hasSaved) {
      setLastResult({ ok: false, message: 'Paste your API key in the box first' });
      return;
    }
    setBusy(true);
    setLastResult({
      pending: true,
      message: key.trim() ? 'Saving and testing…' : 'Re-testing saved key…',
    });
    try {
      const result = await window.stealthAPI.settings.saveApiKey(provider.id, key.trim());
      setLastResult({
        ok: result.verified,
        message: result.message || (result.verified ? 'Connected' : 'Save failed'),
      });
      if (result.ok) {
        setKey('');
        await onSuccess();
      }
    } catch (e) {
      setLastResult({ ok: false, message: e.message || 'Save failed' });
    } finally {
      setBusy(false);
    }
  }, [key, provider.id, onSuccess]);

  return (
    <div className={`api-card${busy ? ' api-card-busy' : ''}`}>
      <h3>{provider.name}</h3>
      {provider.hint && <p className="api-hint">{provider.hint}</p>}
      <div className="api-key-row">
        <input
          type={show ? 'text' : 'password'}
          placeholder={
            keyStatus?.saved || keyStatus?.verified
              ? 'Key saved — paste only to replace, or Save to re-test'
              : 'Paste API key here'
          }
          value={key}
          onChange={(e) => setKey(e.target.value)}
          disabled={busy}
        />
        <button type="button" className="btn btn-outline" onClick={() => setShow(!show)} disabled={busy}>
          {show ? 'Hide' : 'Show'}
        </button>
        <button type="button" className="btn btn-outline" onClick={() => runTest()} disabled={busy}>
          {busy ? '…' : 'Test'}
        </button>
        <button type="button" className="btn btn-primary" onClick={handleSave} disabled={busy}>
          {busy ? 'Working…' : 'Save'}
        </button>
      </div>
      <div className="api-meta">
        <p>{provider.tier}</p>
        <p>
          Get key:{' '}
          <a href={provider.link} target="_blank" rel="noreferrer">
            {provider.link.replace('https://', '')}
          </a>
        </p>
        <p>
          Status: <StatusLine entry={keyStatus} lastResult={lastResult} />
        </p>
      </div>
      {lastResult && (
        <div
          className={`api-result-box ${lastResult.pending ? 'pending' : lastResult.ok ? 'ok' : 'fail'}`}
        >
          {lastResult.pending ? '⏳ ' : lastResult.ok ? '✅ Success: ' : '❌ '}
          {lastResult.message}
        </div>
      )}
    </div>
  );
});

function ApiKeys() {
  const { settings, refreshSettings, refreshModels } = useAppData();
  const [transcriptionProvider, setTranscriptionProvider] = useState(
    settings?.transcriptionProvider || 'groq'
  );

  const onProviderSuccess = useCallback(async () => {
    await Promise.all([refreshSettings(), refreshModels()]);
  }, [refreshSettings, refreshModels]);

  const saveTranscription = useCallback(
    async (value) => {
      setTranscriptionProvider(value);
      await window.stealthAPI.settings.save({ transcriptionProvider: value });
      refreshSettings();
    },
    [refreshSettings]
  );

  const status = settings?.apiKeysStatus || {};
  const [showMoreProviders, setShowMoreProviders] = useState(false);

  const isConfigured = (id) => !!(status[id]?.saved || status[id]?.verified);
  const connectedProviders = PROVIDERS.filter((p) => isConfigured(p.id));
  const otherProviders = PROVIDERS.filter((p) => !isConfigured(p.id));
  const visibleProviders =
    connectedProviders.length > 0 ? connectedProviders : PROVIDERS;

  return (
    <div className="page-content">
      <div className="page-header">
        <h2>API Keys</h2>
      </div>
      <p className="text-muted section-lead">
        Paste key → <strong>Save</strong> (or <strong>Test</strong> — both store the key). After success you can leave
        the box empty and click Save again to re-test. Use <strong>Test Lab</strong> for a full AI reply.
      </p>

      <h3 className="section-title">AI Providers</h3>
      {visibleProviders.map((p) => (
        <ProviderCard
          key={p.id}
          provider={p}
          keyStatus={status[p.id]}
          onSuccess={onProviderSuccess}
        />
      ))}
      {connectedProviders.length > 0 && otherProviders.length > 0 && (
        <div className="api-more-providers">
          <button
            type="button"
            className="btn btn-outline btn-sm"
            onClick={() => setShowMoreProviders((v) => !v)}
          >
            {showMoreProviders ? 'Hide other providers' : 'Add another provider (OpenAI, Claude…)'}
          </button>
          {showMoreProviders &&
            otherProviders.map((p) => (
              <ProviderCard
                key={p.id}
                provider={p}
                keyStatus={status[p.id]}
                onSuccess={onProviderSuccess}
              />
            ))}
        </div>
      )}

      <h3 className="section-title">Speech-to-Text</h3>
      <div className="api-card">
        <div className="form-group">
          <label>Provider</label>
          <select
            value={transcriptionProvider}
            onChange={(e) => saveTranscription(e.target.value)}
          >
            <option value="groq">Groq Whisper (free)</option>
            <option value="openai">OpenAI Whisper</option>
          </select>
        </div>
        <p className="api-meta">
          Transcription uses your <strong>Groq</strong> (or OpenAI) key — same key as above. Speak clearly for a few
          seconds; the overlay will ask for microphone permission on Linux.
        </p>
      </div>
    </div>
  );
}

export default memo(ApiKeys);
