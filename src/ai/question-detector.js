const QUESTION_STARTERS = [
  /^what\b/i,
  /^how\b/i,
  /^why\b/i,
  /^tell\b/i,
  /^describe\b/i,
  /^explain\b/i,
  /^can you\b/i,
  /^could you\b/i,
  /^walk me through\b/i,
  /^give me\b/i,
  /^talk me through\b/i,
  /^share\b/i,
];

function isQuestion(text) {
  if (!text || typeof text !== 'string') return false;
  const trimmed = text.trim();
  if (!trimmed) return false;
  if (trimmed.endsWith('?')) return true;
  return QUESTION_STARTERS.some((re) => re.test(trimmed));
}

module.exports = { isQuestion, QUESTION_STARTERS };
