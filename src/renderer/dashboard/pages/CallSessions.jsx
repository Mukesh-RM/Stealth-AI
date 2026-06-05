import React, { memo, useState, useCallback } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useAppData } from '../context/AppDataContext';

const PAGE_SIZE = 8;

function statusBadge(session) {
  if (session.status === 'Active') return <span className="badge badge-active">Active</span>;
  if (session.status === 'Free' || session.config?.isFree) {
    return <span className="badge badge-free">Free</span>;
  }
  return <span className="badge badge-ended">Ended</span>;
}

function CallSessions() {
  const { sessions, refreshSessions } = useAppData();
  const { openSession } = useOutletContext();
  const [page, setPage] = useState(1);
  const [viewSession, setViewSession] = useState(null);
  const [loadingId, setLoadingId] = useState(null);

  const total = sessions.length;
  const start = (page - 1) * PAGE_SIZE;
  const end = Math.min(start + PAGE_SIZE, total);
  const pageItems = sessions.slice(start, end);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const openTranscript = useCallback(async (id) => {
    setLoadingId(id);
    try {
      const s = await window.stealthAPI.sessions.load(id);
      setViewSession(s);
    } finally {
      setLoadingId(null);
    }
  }, []);

  const handleDelete = useCallback(
    async (id) => {
      await window.stealthAPI.sessions.delete(id);
      refreshSessions();
    },
    [refreshSessions]
  );

  return (
    <div className="page-content">
      <div className="page-header">
        <h2>Call Sessions</h2>
        <button type="button" className="btn btn-primary" onClick={openSession}>
          Start Session
        </button>
      </div>

      {total === 0 ? (
        <div className="empty-state">
          <p>A list of your Interview Sessions.</p>
          <button type="button" className="btn btn-primary" style={{ marginTop: 16 }} onClick={openSession}>
            Start Session
          </button>
        </div>
      ) : (
        <>
          <table className="data-table">
            <thead>
              <tr>
                <th>Title</th>
                <th>Description</th>
                <th>Mode</th>
                <th>Status</th>
                <th>AI Usage</th>
                <th>Created At</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {pageItems.map((s) => (
                <tr key={s.id}>
                  <td>{s.title}</td>
                  <td>{s.description || '—'}</td>
                  <td>{s.mode}</td>
                  <td>{statusBadge(s)}</td>
                  <td>{s.aiUsage ?? 0}</td>
                  <td>{new Date(s.createdAt).toLocaleString()}</td>
                  <td className="actions-cell">
                    <button
                      type="button"
                      className="icon-btn"
                      title="View transcript"
                      disabled={loadingId === s.id}
                      onClick={() => openTranscript(s.id)}
                    >
                      📋
                    </button>
                    <button type="button" className="icon-btn" title="Edit">
                      ✏️
                    </button>
                    <button
                      type="button"
                      className="icon-btn danger"
                      title="Delete"
                      onClick={() => handleDelete(s.id)}
                    >
                      🗑
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="pagination">
            <span>
              Page {page} • Showing {total ? start + 1 : 0}-{end} of {total}
            </span>
            <div className="pagination-btns">
              <button
                type="button"
                className="btn btn-outline"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                Previous
              </button>
              <button
                type="button"
                className="btn btn-outline"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </button>
            </div>
          </div>
        </>
      )}

      {viewSession && (
        <div className="modal-overlay" onClick={() => setViewSession(null)}>
          <div className="modal modal-wide modal--animate transcript-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Transcript — {viewSession.title}</h3>
              <button type="button" className="modal-close" onClick={() => setViewSession(null)}>
                ✕
              </button>
            </div>
            <pre>
              {(viewSession.transcript || [])
                .map((t) => `[${t.role}] ${t.text}`)
                .join('\n\n') || 'No transcript entries yet.'}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}

export default memo(CallSessions);
