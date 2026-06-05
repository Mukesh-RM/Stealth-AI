import React, { memo, useState, useEffect, useCallback } from 'react';

const LANGUAGES = ['English', 'Spanish', 'French', 'German', 'Hindi', 'Mandarin'];

function NewSessionModal({ onClose, settings, resumes, models, onCreated }) {
  const [sessionType, setSessionType] = useState('Interview');
  const [company, setCompany] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [aiModel, setAiModel] = useState(models[0] || '');
  const [language, setLanguage] = useState('English');
  const [resumeId, setResumeId] = useState('');
  const [extraContext, setExtraContext] = useState('');
  const [autoGenerate, setAutoGenerate] = useState(true);
  const [saveTranscript, setSaveTranscript] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (models.length && !aiModel) setAiModel(models[0]);
  }, [models, aiModel]);

  const freeLeft = settings?.freeSessionsLeft ?? 0;
  const hasKeys = (settings?.apisConnected ?? 0) > 0;
  const canStart = models.length > 0 && (freeLeft > 0 || hasKeys);

  const handleNext = useCallback(async () => {
    if (!canStart) {
      setError('Add API Keys first or use a free session.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const result = await window.stealthAPI.sessions.create({
        sessionType,
        company,
        jobDescription,
        aiModel,
        language,
        resumeId: resumeId || null,
        extraContext,
        autoGenerate,
        saveTranscript,
      });
      if (result.error) {
        setError(result.error);
        return;
      }
      window.stealthAPI.send('session:launch', result.session);
      onCreated?.(result);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [
    canStart,
    sessionType,
    company,
    jobDescription,
    aiModel,
    language,
    resumeId,
    extraContext,
    autoGenerate,
    saveTranscript,
    onCreated,
  ]);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-wide modal--animate" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>New Session (Free)</h3>
          <button type="button" className="modal-close" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="form-group">
          <label>Session Type</label>
          <div className="session-type-btns">
            <button
              type="button"
              className={`session-type-btn${sessionType === 'Interview' ? ' active' : ''}`}
              onClick={() => setSessionType('Interview')}
            >
              🏢 Interview
            </button>
            <button
              type="button"
              className={`session-type-btn${sessionType === 'Regular Call' ? ' active' : ''}`}
              onClick={() => setSessionType('Regular Call')}
            >
              📞 Regular Call
            </button>
          </div>
        </div>

        <div className="form-group">
          <label>Company</label>
          <input
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            placeholder="Microsoft..."
          />
        </div>

        <div className="form-group">
          <label>Job Description</label>
          <textarea
            value={jobDescription}
            onChange={(e) => setJobDescription(e.target.value)}
            placeholder="Software Engineer versed in Python, SQL..."
            rows={4}
          />
        </div>

        <div className="form-group">
          <label>AI Provider</label>
          <div className="form-row">
            <select
              value={models.length ? aiModel : ''}
              onChange={(e) => setAiModel(e.target.value)}
              disabled={!models.length}
            >
              {models.length === 0 ? (
                <option>Add API Keys first</option>
              ) : (
                models.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))
              )}
            </select>
            <select value={language} onChange={(e) => setLanguage(e.target.value)}>
              {LANGUAGES.map((l) => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="form-group">
          <label>Context</label>
          <select value={resumeId} onChange={(e) => setResumeId(e.target.value)}>
            <option value="">No resume selected</option>
            {resumes.map((r) => (
              <option key={r.id} value={r.id}>
                Resume: {r.title}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label>Extra Context (optional)</label>
          <textarea
            value={extraContext}
            onChange={(e) => setExtraContext(e.target.value)}
            placeholder="Additional notes..."
            rows={2}
          />
        </div>

        <div className="checkbox-row">
          <label>
            <input
              type="checkbox"
              checked={autoGenerate}
              onChange={(e) => setAutoGenerate(e.target.checked)}
            />
            Auto Generate (Beta)
          </label>
          <label>
            <input
              type="checkbox"
              checked={saveTranscript}
              onChange={(e) => setSaveTranscript(e.target.checked)}
            />
            Save Transcript
          </label>
        </div>

        {error && <p className="form-error">{error}</p>}
        {!canStart && freeLeft <= 0 && !hasKeys && (
          <p className="form-error">Add API Keys to continue. No free sessions remaining.</p>
        )}

        <div className="modal-footer">
          <button type="button" className="btn btn-outline" onClick={onClose}>
            Close
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleNext}
            disabled={loading || !canStart}
          >
            {loading ? 'Starting…' : 'Next →'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default memo(NewSessionModal);
