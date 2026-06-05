import React, { useEffect, useState, useCallback, memo } from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import './styles/dashboard.css';
import { AppDataProvider, useAppData } from './context/AppDataContext';
import AppLayout from './components/AppLayout';
import Home from './pages/Home';
import CallSessions from './pages/CallSessions';
import Resumes from './pages/Resumes';
import Documents from './pages/Documents';
import ApiKeys from './pages/ApiKeys';
import TestLab from './pages/TestLab';

const WelcomeModal = memo(function WelcomeModal({ onDone }) {
  const [name, setName] = useState('');
  return (
    <div className="modal-overlay modal-overlay--instant">
      <div className="modal welcome-modal">
        <h3>Welcome to Stealth AI</h3>
        <p className="text-muted">What should we call you?</p>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Your name"
          onKeyDown={(e) => e.key === 'Enter' && name.trim() && onDone(name.trim())}
        />
        <button
          type="button"
          className="btn btn-primary btn-block"
          disabled={!name.trim()}
          onClick={() => onDone(name.trim())}
        >
          Continue
        </button>
      </div>
    </div>
  );
});

function AppRoutes() {
  const { settings, saveSettings, bootstrap, ready } = useAppData();

  useEffect(() => {
    bootstrap();
  }, [bootstrap]);

  const handleWelcome = useCallback(
    async (username) => {
      await saveSettings({ username, onboardingComplete: true });
    },
    [saveSettings]
  );

  const needsWelcome = settings && !settings.onboardingComplete && !settings.username;

  return (
    <>
      {needsWelcome && ready && <WelcomeModal onDone={handleWelcome} />}
      <Routes>
        <Route element={<AppLayout loading={!ready} />}>
          <Route path="/" element={<Home />} />
          <Route path="/sessions" element={<CallSessions />} />
          <Route path="/resumes" element={<Resumes />} />
          <Route path="/documents" element={<Documents />} />
          <Route path="/settings/api-keys" element={<ApiKeys />} />
          <Route path="/test" element={<TestLab />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </>
  );
}

function App() {
  return (
    <HashRouter>
      <AppDataProvider>
        <AppRoutes />
      </AppDataProvider>
    </HashRouter>
  );
}

const root = createRoot(document.getElementById('root'));
root.render(<App />);
