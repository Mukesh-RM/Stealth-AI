import React, { useState, memo } from 'react';

function UploadResumeModal({ onClose, onSaved }) {
  const [manualOpen, setManualOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);

  const handlePdf = async () => {
    setLoading(true);
    try {
      const result = await window.stealthAPI.resumes.uploadPdf();
      if (result.canceled) return;
      if (result.ok) {
        onSaved?.();
        onClose();
      } else {
        alert(result.error || 'Upload failed');
      }
    } catch (e) {
      alert(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleManualSave = async () => {
    if (!text.trim()) return;
    setLoading(true);
    try {
      const result = await window.stealthAPI.resumes.saveManual({
        title: title || 'Manual Resume',
        text,
      });
      if (result.ok) {
        onSaved?.();
        onClose();
        setManualOpen(false);
        setText('');
        setTitle('');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal--animate" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Upload Resume</h3>
          <button type="button" className="modal-close" onClick={onClose}>
            ✕
          </button>
        </div>
        {!manualOpen ? (
          <>
            <p style={{ color: 'var(--dash-text-muted)', marginBottom: 20, fontSize: 14 }}>
              The contents of the resume will be used to generate interview answers.
            </p>
            <button
              type="button"
              className="btn btn-outline"
              style={{ width: '100%', marginBottom: 12 }}
              onClick={handlePdf}
              disabled={loading}
            >
              Upload PDF Resume ⬆
            </button>
            <button
              type="button"
              className="btn btn-outline"
              style={{ width: '100%' }}
              onClick={() => setManualOpen(true)}
            >
              Input Manually
            </button>
          </>
        ) : (
          <>
            <div className="form-group">
              <label>Title</label>
              <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="My Resume" />
            </div>
            <div className="form-group">
              <label>Resume text</label>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Paste your resume content..."
                rows={12}
              />
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-outline" onClick={() => setManualOpen(false)}>
                Back
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleManualSave}
                disabled={loading || !text.trim()}
              >
                Save
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default memo(UploadResumeModal);
