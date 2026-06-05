import React, { memo, useState, useCallback } from 'react';
import { useAppData } from '../context/AppDataContext';

function Documents() {
  const { documents, refreshDocuments } = useAppData();
  const [modalOpen, setModalOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [text, setText] = useState('');

  const handleSave = useCallback(async () => {
    if (!text.trim()) return;
    await window.stealthAPI.documents.save({ title: title || 'Document', text });
    setModalOpen(false);
    setTitle('');
    setText('');
    refreshDocuments();
  }, [title, text, refreshDocuments]);

  const handleDelete = useCallback(
    async (id) => {
      if (!confirm('Delete this document?')) return;
      await window.stealthAPI.documents.delete(id);
      refreshDocuments();
    },
    [refreshDocuments]
  );

  return (
    <div className="page-content">
      <div className="page-header">
        <h2>Documents</h2>
        <button type="button" className="btn btn-primary" onClick={() => setModalOpen(true)}>
          Add Document
        </button>
      </div>

      {documents.length === 0 ? (
        <div className="empty-state">
          <p>Add job descriptions, company notes, and other context.</p>
        </div>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>Title</th>
              <th>Tags</th>
              <th>Created At</th>
              <th>Delete</th>
            </tr>
          </thead>
          <tbody>
            {documents.map((d) => (
              <tr key={d.id}>
                <td>{d.title}</td>
                <td>
                  {(d.tags || ['Context']).map((t) => (
                    <span key={t} className="badge badge-tag">
                      {t}
                    </span>
                  ))}
                </td>
                <td>{new Date(d.createdAt).toLocaleString()}</td>
                <td>
                  <button type="button" className="icon-btn danger" onClick={() => handleDelete(d.id)}>
                    🗑
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {modalOpen && (
        <div className="modal-overlay" onClick={() => setModalOpen(false)}>
          <div className="modal modal--animate" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Add Document</h3>
              <button type="button" className="modal-close" onClick={() => setModalOpen(false)}>
                ✕
              </button>
            </div>
            <p className="text-muted">Extra context such as job descriptions or company research.</p>
            <div className="form-group">
              <label>Title</label>
              <input value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <div className="form-group">
              <label>Content</label>
              <textarea value={text} onChange={(e) => setText(e.target.value)} rows={10} />
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-outline" onClick={() => setModalOpen(false)}>
                Cancel
              </button>
              <button type="button" className="btn btn-primary" onClick={handleSave}>
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default memo(Documents);
