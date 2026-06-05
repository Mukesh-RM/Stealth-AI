const { store } = require('../storage/store');

const LENGTH_GUIDE = {
  Brief: 'Keep answers under 3 sentences.',
  Medium: 'Keep answers to 4-6 sentences.',
  Detailed: 'Provide thorough answers in 8-10 sentences when appropriate.',
};

function buildSystemPrompt({ resumeText, jobDescription, company, extraContext }) {
  const length = store.get('answerLength') || 'Medium';
  const parts = [
    'You are a real-time interview assistant. Answer concisely as if the candidate is speaking naturally. Be direct and confident.',
    LENGTH_GUIDE[length] || LENGTH_GUIDE.Medium,
  ];

  if (company) {
    parts.push(`Interview company: ${company}`);
  }
  if (jobDescription) {
    parts.push(`Job description:\n${jobDescription}`);
  }
  if (resumeText) {
    parts.push(`Candidate resume:\n${resumeText}`);
  }
  if (extraContext) {
    parts.push(`Additional context:\n${extraContext}`);
  }

  return parts.join('\n\n');
}

function buildUserPrompt(question, transcriptContext) {
  const ctx = transcriptContext
    ? `Recent conversation:\n${transcriptContext}\n\n`
    : '';
  return `${ctx}Answer this interview question as the candidate:\n${question}`;
}

module.exports = { buildSystemPrompt, buildUserPrompt, LENGTH_GUIDE };
