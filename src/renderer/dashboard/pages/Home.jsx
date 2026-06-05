import React, { memo, useCallback } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { useAppData } from '../context/AppDataContext';

const OnboardingCard = memo(function OnboardingCard({ title, desc, btnLabel, filled, onClick }) {
  return (
    <div className="onboarding-card">
      <h3>{title}</h3>
      <p>{desc}</p>
      <button
        type="button"
        className={`btn ${filled ? 'btn-primary' : 'btn-outline'}`}
        onClick={onClick}
      >
        {btnLabel}
      </button>
    </div>
  );
});

function Home() {
  const { settings } = useAppData();
  const { openSession, openResume } = useOutletContext();
  const navigate = useNavigate();
  const name = settings?.username || 'there';

  const goApiKeys = useCallback(() => navigate('/settings/api-keys'), [navigate]);

  return (
    <div className="page-content">
      <h2 className="page-title">Hi, {name} 👋</h2>
      <p className="text-muted">Get interview-ready in four simple steps.</p>

      <div className="onboarding-row">
        <OnboardingCard
          title="Optional: Resume 📝"
          desc="Upload your CV for personalized answers."
          btnLabel="Upload Resume"
          onClick={openResume}
        />
        <span className="card-connector">→</span>
        <OnboardingCard
          title="Step 1: Free Session ⏰"
          desc="Start a free assisted interview session."
          btnLabel="Create Session"
          onClick={openSession}
        />
        <span className="card-connector">→</span>
        <OnboardingCard
          title="Step 2: Add API Keys 🔑"
          desc="Connect Gemini, Groq, OpenAI, or Claude."
          btnLabel="Add API Keys"
          onClick={goApiKeys}
        />
        <span className="card-connector">→</span>
        <OnboardingCard
          title="Step 3: Real Interview 🚀"
          desc="Launch the stealth overlay during your call."
          btnLabel="Start"
          filled
          onClick={openSession}
        />
      </div>

      <div className="stats-row">
        <div className="stat-card">
          <div className="label">Total Sessions</div>
          <div className="value">{settings?.totalSessions ?? 0}</div>
        </div>
        <div className="stat-card">
          <div className="label">Total AI Responses</div>
          <div className="value">{settings?.totalAiResponses ?? 0}</div>
        </div>
        <div className="stat-card">
          <div className="label">Free Sessions Left</div>
          <div className="value">{settings?.freeSessionsLeft ?? 5}</div>
        </div>
        <div className="stat-card">
          <div className="label">APIs Connected</div>
          <div className="value">{settings?.apisConnected ?? 0}</div>
        </div>
      </div>
    </div>
  );
}

export default memo(Home);
