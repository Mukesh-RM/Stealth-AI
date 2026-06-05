import React, { memo, useCallback, useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
import NewSessionModal from './NewSessionModal';
import UploadResumeModal from './UploadResumeModal';
import { useAppData } from '../context/AppDataContext';
import PlatformBanner from './PlatformBanner';

function AppLayout({ loading }) {
  const {
    settings,
    resumes,
    models,
    refreshSessions,
    refreshSettings,
    refreshResumes,
    refreshModels,
  } = useAppData();
  const [sessionModal, setSessionModal] = useState(false);
  const [resumeModal, setResumeModal] = useState(false);

  const openSession = useCallback(() => setSessionModal(true), []);
  const closeSession = useCallback(() => setSessionModal(false), []);
  const openResume = useCallback(() => setResumeModal(true), []);
  const closeResume = useCallback(() => setResumeModal(false), []);

  const handleSessionCreated = useCallback(async () => {
    await Promise.all([refreshSessions(), refreshSettings()]);
    closeSession();
  }, [refreshSessions, refreshSettings, closeSession]);

  const handleResumeSaved = useCallback(async () => {
    await refreshResumes();
    closeResume();
  }, [refreshResumes, closeResume]);

  return (
    <>
      <div className="app-layout">
        <Sidebar />
        <div className="main-content">
          <TopBar
            settings={settings || { freeSessionsLeft: 5 }}
            onStartSession={openSession}
          />
          <PlatformBanner />
          <div className="page-area">
            <div className="page-frame">
              {loading ? (
                <div className="page-loading">Loading…</div>
              ) : (
                <Outlet context={{ openSession, openResume }} />
              )}
            </div>
          </div>
        </div>
      </div>
      {sessionModal && (
        <NewSessionModal
          onClose={closeSession}
          settings={settings}
          resumes={resumes}
          models={models}
          onCreated={handleSessionCreated}
        />
      )}
      {resumeModal && (
        <UploadResumeModal onClose={closeResume} onSaved={handleResumeSaved} />
      )}
    </>
  );
}

export default memo(AppLayout);
