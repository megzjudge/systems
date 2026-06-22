function renderQuestion(container, name, text, index) {
  const card = document.createElement('div');
  card.className = 'question-card';
  card.innerHTML = `
    <p class="question-text"><span class="q-num">${index}.</span> ${text}</p>
    <div class="likert-group" role="radiogroup" aria-label="Question ${index}">
      ${LIKERT_LABELS.map(({ value, label }) => `
        <div class="likert-option">
          <input type="radio" name="${name}" id="${name}-${value}" value="${value}" required>
          <label for="${name}-${value}">${label}</label>
        </div>
      `).join('')}
    </div>
  `;
  container.appendChild(card);
}

function initSurvey() {
  const sysContainer = document.getElementById('systemizing-questions');
  const empContainer = document.getElementById('empathy-questions');
  const form = document.getElementById('survey-form');
  const progressBar = document.getElementById('progress-bar');
  const progressLabel = document.getElementById('progress-label');
  const submitBtn = document.getElementById('submit-btn');

  const total = SYSTEMIZING_ITEMS.length + EMPATHY_ITEMS.length;

  SYSTEMIZING_ITEMS.forEach((text, i) => {
    renderQuestion(sysContainer, `sys-${i}`, text, i + 1);
  });

  EMPATHY_ITEMS.forEach((text, i) => {
    renderQuestion(empContainer, `emp-${i}`, text, SYSTEMIZING_ITEMS.length + i + 1);
  });

  function updateProgress() {
    const answered = form.querySelectorAll('input[type="radio"]:checked').length;
    const pct = (answered / total) * 100;
    progressBar.style.width = `${pct}%`;
    progressLabel.textContent = `${answered} of ${total} answered`;
    submitBtn.disabled = answered < total;
  }

  form.addEventListener('change', updateProgress);

  form.addEventListener('submit', (e) => {
    e.preventDefault();

    const sysAnswers = SYSTEMIZING_ITEMS.map((_, i) => {
      const checked = form.querySelector(`input[name="sys-${i}"]:checked`);
      return parseInt(checked.value, 10);
    });

    const empAnswers = EMPATHY_ITEMS.map((_, i) => {
      const checked = form.querySelector(`input[name="emp-${i}"]:checked`);
      return parseInt(checked.value, 10);
    });

    const systemizing = computeSubscaleScore(sysAnswers, SYSTEMIZING_REVERSE);
    const empathy = computeSubscaleScore(empAnswers, EMPATHY_REVERSE);

    saveResults(systemizing, empathy);
    window.location.href = 'results.html';
  });

  updateProgress();
}

document.addEventListener('DOMContentLoaded', initSurvey);
