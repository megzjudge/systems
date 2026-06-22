let chart = null;
let visitorResults = loadVisitorResults();
const selectedDemographics = new Set();

function getPersonalBars() {
  const bars = [];

  if (visitorResults) {
    bars.push({
      label: 'Your Result',
      systemizing: visitorResults.systemizing,
      empathy: visitorResults.empathy,
      color: YOUR_RESULT_COLOR,
    });
  }

  bars.push({
    label: MY_RESULT.label,
    systemizing: MY_RESULT.systemizing,
    empathy: MY_RESULT.empathy,
    color: MY_RESULT.color,
  });

  return bars;
}

function getVisibleDemographics() {
  const personal = getPersonalBars();
  const checked = DEMOGRAPHICS.filter((d) => selectedDemographics.has(d.id));

  if (checked.length === 0) {
    return [...personal, ...DEMOGRAPHICS];
  }

  return [...personal, ...checked];
}

function buildChartData(groups) {
  return {
    labels: ['Systemizing Items', 'Empathy Items'],
    datasets: groups.map((g) => ({
      label: g.label,
      data: [g.systemizing, g.empathy],
      backgroundColor: g.color + '99',
      borderColor: g.color,
      borderWidth: 1.5,
      borderRadius: 2,
    })),
  };
}

function renderChart() {
  const canvas = document.getElementById('results-chart');
  const groups = getVisibleDemographics();
  const data = buildChartData(groups);

  if (chart) {
    chart.data = data;
    chart.update();
    return;
  }

  chart = new Chart(canvas, {
    type: 'bar',
    data,
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'top',
          labels: {
            boxWidth: 12,
            boxHeight: 12,
            padding: 10,
            font: { family: "'Source Sans 3', sans-serif", size: 11 },
          },
        },
        tooltip: {
          callbacks: {
            label(ctx) {
              return `${ctx.dataset.label}: ${ctx.parsed.y.toFixed(2)}`;
            },
          },
        },
      },
      scales: {
        y: {
          min: 1,
          max: 4,
          ticks: { stepSize: 0.5 },
          grid: { color: '#e8e4dc' },
          title: {
            display: true,
            text: 'Score',
            font: { family: "'Source Sans 3', sans-serif" },
          },
        },
        x: {
          grid: { display: false },
          ticks: {
            font: { family: "'Source Sans 3', sans-serif", size: 12 },
          },
        },
      },
    },
  });
}

function updateScoreDisplay() {
  const visitorSys = document.getElementById('score-visitor-systemizing');
  const visitorEmp = document.getElementById('score-visitor-empathy');
  const visitorCard = document.getElementById('visitor-score-card');

  if (visitorResults) {
    visitorSys.textContent = visitorResults.systemizing.toFixed(2);
    visitorEmp.textContent = visitorResults.empathy.toFixed(2);
    visitorCard.classList.add('has-data');
    document.getElementById('input-systemizing').value = visitorResults.systemizing;
    document.getElementById('input-empathy').value = visitorResults.empathy;
  } else {
    visitorSys.textContent = '—';
    visitorEmp.textContent = '—';
    visitorCard.classList.remove('has-data');
    document.getElementById('input-systemizing').value = '';
    document.getElementById('input-empathy').value = '';
  }

  document.getElementById('score-my-systemizing').textContent = MY_RESULT.systemizing.toFixed(2);
  document.getElementById('score-my-empathy').textContent = MY_RESULT.empathy.toFixed(2);
}

function renderCategorySection(container, { key, title }) {
  const section = document.createElement('div');
  section.className = 'demographic-category';

  const heading = document.createElement('h3');
  heading.textContent = title;
  section.appendChild(heading);

  const list = document.createElement('ul');
  list.className = 'checkbox-list';

  DEMOGRAPHICS.filter((d) => d.category === key).forEach((d) => {
    const li = document.createElement('li');
    const id = `demo-${d.id}`;
    li.innerHTML = `
      <label for="${id}">
        <input type="checkbox" id="${id}" value="${d.id}">
        ${d.label}
      </label>
    `;
    list.appendChild(li);

    li.querySelector('input').addEventListener('change', (e) => {
      if (e.target.checked) {
        if (selectedDemographics.size >= 3) {
          e.target.checked = false;
          updateFilteredMessage('You can select up to three demographic groups at a time.');
          return;
        }
        selectedDemographics.add(d.id);
      } else {
        selectedDemographics.delete(d.id);
      }
      updateFilteredMessage();
      renderChart();
    });
  });

  section.appendChild(list);
  container.appendChild(section);
}

function renderDemographicFilters() {
  const container = document.getElementById('demographic-groups');
  container.innerHTML = '';

  DEMOGRAPHIC_COLUMNS.forEach((column) => {
    const colEl = document.createElement('div');
    colEl.className = 'demographic-column';
    column.categories.forEach((category) => {
      renderCategorySection(colEl, category);
    });
    container.appendChild(colEl);
  });
}

function updateFilteredMessage(override) {
  const el = document.getElementById('filtered-result');
  if (override) {
    el.textContent = override;
    el.classList.add('visible');
    return;
  }

  if (selectedDemographics.size === 0) {
    el.classList.remove('visible');
    return;
  }

  const labels = [...selectedDemographics].map((id) => {
    return DEMOGRAPHICS.find((d) => d.id === id).label;
  });

  const { systemizing: avgSys, empathy: avgEmp, fromApi } = getSelectedAverage();

  let comparison = `My result: systemizing ${MY_RESULT.systemizing.toFixed(2)}, empathizing ${MY_RESULT.empathy.toFixed(2)}`;
  if (visitorResults) {
    comparison = `Your result: systemizing ${visitorResults.systemizing.toFixed(2)}, empathizing ${visitorResults.empathy.toFixed(2)} &nbsp;|&nbsp; ${comparison}`;
  }

  const sourceNote = fromApi
    ? 'YourMorals.org API average for this filter combination.'
    : 'Estimated by averaging single-group values (exact combo not yet captured).';

  el.innerHTML = `
    <strong>Filtered comparison:</strong> ${labels.join(' + ')}<br>
    Average systemizing: <strong>${avgSys.toFixed(2)}</strong> &nbsp;|&nbsp;
    Average empathizing: <strong>${avgEmp.toFixed(2)}</strong>
    <br><small>${sourceNote}</small>
    <br><small>${comparison}</small>
  `;
  el.classList.add('visible');
}

function getSelectedAverage() {
  const ids = [...selectedDemographics].sort();
  const categories = ids.map((id) => DEMOGRAPHICS.find((d) => d.id === id).category);
  const uniqueCategories = new Set(categories);

  if (ids.length >= 2 && uniqueCategories.size === ids.length) {
    const combo = DEMOGRAPHIC_COMBOS[ids.join(',')];
    if (combo) {
      return { systemizing: combo.systemizing, empathy: combo.empathy, fromApi: true };
    }
  }

  const items = ids.map((id) => DEMOGRAPHICS.find((d) => d.id === id));
  return {
    systemizing: items.reduce((acc, d) => acc + d.systemizing, 0) / items.length,
    empathy: items.reduce((acc, d) => acc + d.empathy, 0) / items.length,
    fromApi: false,
  };
}

function initResults() {
  visitorResults = loadVisitorResults();
  updateScoreDisplay();

  document.getElementById('score-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const systemizing = parseFloat(document.getElementById('input-systemizing').value);
    const empathy = parseFloat(document.getElementById('input-empathy').value);

    if (systemizing < 1 || systemizing > 4 || empathy < 1 || empathy > 4) {
      alert('Scores must be between 1.0 and 4.0.');
      return;
    }

    visitorResults = { systemizing, empathy };
    saveVisitorResults(systemizing, empathy);
    updateScoreDisplay();
    renderChart();
    updateFilteredMessage();
  });

  document.getElementById('clear-results-btn').addEventListener('click', () => {
    visitorResults = null;
    clearVisitorResults();
    updateScoreDisplay();
    renderChart();
    updateFilteredMessage();
  });

  renderDemographicFilters();
  renderChart();
}

document.addEventListener('DOMContentLoaded', initResults);
