const LIKERT_LABELS = [
  { value: 1, label: 'Strongly disagree' },
  { value: 2, label: 'Disagree' },
  { value: 3, label: 'Agree' },
  { value: 4, label: 'Strongly agree' },
];

const SYSTEMIZING_ITEMS = [
  'I am fascinated by how machines work.',
  'I enjoy learning about how things are made.',
  'If I were buying a car, I would want to obtain exact details about the engine capacity.',
  'When I listen to a piece of music, I always notice the way it is structured.',
  'I like to carefully plan any activities I participate in.',
  'I am interested in knowing the path a river takes before it reaches the sea.',
  'When I look at a piece of furniture, I do not notice the details of how it was constructed.',
  'I find it difficult to read and understand maps.',
  'If there was a problem with the electrical wiring in my home, I would be able to fix it myself.',
  'When I travel, I like to learn specific details about the culture of the place I am visiting.',
];

const EMPATHY_ITEMS = [
  'I can easily tell if someone else wants to enter a conversation.',
  'I find it hard to know what to do in a social situation.',
  'I really enjoy caring for other people.',
  'I find it difficult to work out people\'s intentions.',
  'I am good at predicting how someone will feel.',
  'I find it easy to put myself in somebody else\'s shoes.',
  'I am good at predicting what someone will do.',
  'I tend to have emotional reactions to what others are feeling.',
  'I can tune into how someone else feels rapidly and intuitively.',
  'I can easily work out what another person might want to talk about.',
];

// Reverse-scored items (1-indexed within each subscale)
const SYSTEMIZING_REVERSE = [7, 8];
const EMPATHY_REVERSE = [2, 4];

// Demographic averages (approximated from YourMorals.org population data)
const DEMOGRAPHICS = [
  { id: 'my-result', label: 'My Result', category: 'personal', color: '#8b9a6b', systemizing: null, empathy: null, alwaysShow: true },
  { id: 'male', label: 'Male', category: 'gender', color: '#7cb87c', systemizing: 2.8, empathy: 2.8 },
  { id: 'female', label: 'Female', category: 'gender', color: '#e8a0b0', systemizing: 2.5, empathy: 3.05 },
  { id: 'liberal', label: 'Liberal', category: 'political', color: '#8ecae6', systemizing: 2.6, empathy: 3.0 },
  { id: 'conservative', label: 'Conservative', category: 'political', color: '#f4c4c4', systemizing: 2.7, empathy: 2.8 },
  { id: 'moderate', label: 'Moderate', category: 'political', color: '#c4b0d8', systemizing: 2.65, empathy: 2.9 },
  { id: 'hs', label: 'High school or less', category: 'education', color: '#5bc0be', systemizing: 2.55, empathy: 2.75 },
  { id: 'bachelor', label: 'Bachelor or some college', category: 'education', color: '#90be6d', systemizing: 2.65, empathy: 2.9 },
  { id: 'graduate', label: 'Graduate degree', category: 'education', color: '#577590', systemizing: 2.7, empathy: 3.0 },
  { id: 'white', label: 'White or European American', category: 'race', color: '#d4c4e8', systemizing: 2.65, empathy: 2.85 },
  { id: 'black', label: 'Black or African American', category: 'race', color: '#e8a090', systemizing: 2.6, empathy: 2.85 },
  { id: 'hispanic', label: 'Hispanic or Latino/Latinx', category: 'race', color: '#d4b896', systemizing: 2.65, empathy: 2.9 },
  { id: 'asian', label: 'Asian or Asian American', category: 'race', color: '#e8e4dc', systemizing: 2.7, empathy: 2.88 },
  { id: 'age-18-29', label: '18–29', category: 'age', color: '#e8dcc8', systemizing: 2.6, empathy: 2.8 },
  { id: 'age-30-44', label: '30–44', category: 'age', color: '#a8d0e8', systemizing: 2.65, empathy: 2.85 },
  { id: 'age-45-64', label: '45–64', category: 'age', color: '#b8d8b0', systemizing: 2.75, empathy: 2.95 },
  { id: 'age-65', label: '≥65', category: 'age', color: '#90b8d8', systemizing: 2.7, empathy: 3.05 },
  { id: 'not-religious', label: 'Not religious', category: 'religiosity', color: '#b0b8c0', systemizing: 2.65, empathy: 2.85 },
  { id: 'somewhat', label: 'Somewhat religious', category: 'religiosity', color: '#c8b8a8', systemizing: 2.68, empathy: 2.92 },
  { id: 'very-religious', label: 'Very religious', category: 'religiosity', color: '#a89888', systemizing: 2.62, empathy: 2.98 },
];

const DEMOGRAPHIC_CATEGORIES = [
  { key: 'age', title: 'Age' },
  { key: 'education', title: 'Education' },
  { key: 'gender', title: 'Gender' },
  { key: 'race', title: 'Race' },
  { key: 'religiosity', title: 'Religiosity' },
  { key: 'political', title: 'Political Ideology' },
];

const DEFAULT_RESULTS = { systemizing: 3.3, empathy: 2.95 };

function reverseScore(value) {
  return 5 - value;
}

function computeSubscaleScore(answers, reverseItems) {
  const scored = answers.map((val, i) => {
    const oneBased = i + 1;
    return reverseItems.includes(oneBased) ? reverseScore(val) : val;
  });
  const sum = scored.reduce((a, b) => a + b, 0);
  return Math.round((sum / scored.length) * 100) / 100;
}

function saveResults(systemizing, empathy) {
  localStorage.setItem('sf-results', JSON.stringify({ systemizing, empathy }));
}

function loadResults() {
  try {
    const raw = localStorage.getItem('sf-results');
    if (raw) return JSON.parse(raw);
  } catch (_) { /* ignore */ }
  return { ...DEFAULT_RESULTS };
}
