let chart = null;
let userResults = loadResults();
const selectedDemographics = new Set();

function getVisibleDemographics() {
  const myResult = {
    ...DEMOGRAPHICS.find((d) => d.id === 'my-result'),
    systemizing: userResults.systemizing,
    empathy: userResults.empathy,
  };

  const checked = DEMOGRAPHICS.filter((d) => !d.alwaysShow && selectedDemographics.has(d.id));

  if (checked.length === 0) {
    return [myResult, ...DEMOGRAPHICS.filter((d) => !d.alwaysShow)];
  }

  return [myResult, ...checked];
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

function renderDemographicFilters() {
  const container = document.getElementById('demographic-groups');

  DEMOGRAPHIC_CATEGORIES.forEach(({ key, title }) => {
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

  const avgSys = averageSelected('systemizing');
  const avgEmp = averageSelected('empathy');

  el.innerHTML = `
    <strong>Filtered comparison:</strong> ${labels.join(' + ')}<br>
    Average systemizing: <strong>${avgSys.toFixed(2)}</strong> &nbsp;|&nbsp;
    Average empathizing: <strong>${avgEmp.toFixed(2)}</strong>
    <br><small>Your scores: systemizing ${userResults.systemizing.toFixed(2)}, empathizing ${userResults.empathy.toFixed(2)}</small>
  `;
  el.classList.add('visible');
}

function averageSelected(field) {
  const items = [...selectedDemographics].map((id) => DEMOGRAPHICS.find((d) => d.id === id));
  const sum = items.reduce((acc, d) => acc + d[field], 0);
  return sum / items.length;
}

function initResults() {
  userResults = loadResults();

  document.getElementById('score-systemizing').textContent = userResults.systemizing.toFixed(2);
  document.getElementById('score-empathy').textContent = userResults.empathy.toFixed(2);

  renderDemographicFilters();
  renderChart();
}

document.addEventListener('DOMContentLoaded', initResults);
