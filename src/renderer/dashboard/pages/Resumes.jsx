import React, { memo, useCallback, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useAppData } from '../context/AppDataContext';
import UploadResumeModal from '../components/UploadResumeModal';

function Resumes() {
  const { resumes, refreshResumes } = useAppData();
  const { openResume } = useOutletContext();
  const [modalOpen, setModalOpen] = useState(false);

  const handleDelete = useCallback(
    async (id) => {
      if (!confirm('Delete this resume?')) return;
      await window.stealthAPI.resumes.delete(id);
      refreshResumes();
    },
    [refreshResumes]
  );

  const onSaved = useCallback(() => {
    refreshResumes();
    setModalOpen(false);
  }, [refreshResumes]);

  return (
    <div className="page-content">
      <div className="page-header">
        <h2>CVs / Resumes</h2>
        <button type="button" className="btn btn-primary" onClick={() => setModalOpen(true)}>
          Upload Resume
        </button>
      </div>

      {resumes.length === 0 ? (
        <div className="empty-state">
          <p>Upload a resume to personalize AI answers.</p>
          <button type="button" className="btn btn-outline" style={{ marginTop: 12 }} onClick={openResume}>
            Upload Resume
          </button>
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
            {resumes.map((r) => (
              <tr key={r.id}>
                <td>{r.title}</td>
                <td>
                  {(r.tags || []).map((t) => (
                    <span key={t} className="badge badge-tag">
                      {t}
                    </span>
                  ))}
                </td>
                <td>{new Date(r.createdAt).toLocaleString()}</td>
                <td>
                  <button type="button" className="icon-btn danger" onClick={() => handleDelete(r.id)}>
                    🗑
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {modalOpen && <UploadResumeModal onClose={() => setModalOpen(false)} onSaved={onSaved} />}
    </div>
  );
}

export default memo(Resumes);
