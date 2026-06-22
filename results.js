let chart = null;
let visitorResults = loadVisitorResults();
const selectedDemographics = new Set();
let showPersonalOnly = false;
let massPreset = null;
let massPresetBars = null;
const barColorMap = new Map();
let visitorColor = null;
let visitorColorIndex = -1;

function hslToHex(h, s, l) {
  s /= 100;
  l /= 100;
  const a = s * Math.min(l, 1 - l);
  const f = (n) => {
    const k = (n + h / 30) % 12;
    return l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
  };
  const toHex = (x) => Math.round(x * 255).toString(16).padStart(2, '0');
  return `#${toHex(f(0))}${toHex(f(8))}${toHex(f(4))}`;
}

const COLOR_POOL = Array.from({ length: 160 }, (_, i) => {
  const hue = (i * 137.508 + 17) % 360;
  const sat = 48 + (i % 5) * 4;
  const light = 54 + (i % 4) * 5;
  return hslToHex(hue, sat, light);
});

function initBarColors() {
  barColorMap.clear();
  barColorMap.set(MY_RESULT.label, MY_RESULT.color);

  const labels = new Set([
    'Your Result',
    ...DEMOGRAPHICS.map((d) => d.label),
    ...Object.keys(DEMOGRAPHIC_COMBOS).map(labelForComboKey),
  ]);

  const shuffled = [...COLOR_POOL];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  const used = new Set([MY_RESULT.color]);
  let poolIndex = 0;

  labels.forEach((label) => {
    if (label === MY_RESULT.label) return;

    let color = shuffled[poolIndex++];
    while ((color === MY_RESULT.color || used.has(color)) && poolIndex < shuffled.length) {
      color = shuffled[poolIndex++];
    }
    if (color === MY_RESULT.color || used.has(color)) {
      let hue = (used.size * 47 + 17) % 360;
      while (used.has(hslToHex(hue, 55, 60))) {
        hue = (hue + 23) % 360;
      }
      color = hslToHex(hue, 55, 60);
    }

    barColorMap.set(label, color);
    used.add(color);
  });
}

function assignBarColors(groups) {
  return groups.map((g) => {
    if (g.label === MY_RESULT.label) {
      return { ...g, color: MY_RESULT.color };
    }
    if (g.label === 'Your Result' && visitorColor) {
      return { ...g, color: visitorColor };
    }
    return { ...g, color: barColorMap.get(g.label) || MY_RESULT.color };
  });
}

function cycleVisitorColor() {
  if (!visitorResults) return;
  do {
    visitorColorIndex = (visitorColorIndex + 1) % COLOR_POOL.length;
    visitorColor = COLOR_POOL[visitorColorIndex];
  } while (visitorColor === MY_RESULT.color);
  renderChart();
}

function resetVisitorColor() {
  visitorColor = null;
  visitorColorIndex = -1;
}

function clearMassPreset() {
  massPreset = null;
  massPresetBars = null;
  document.querySelectorAll('.mass-preset-btn').forEach((btn) => {
    btn.classList.remove('active');
  });
}

function labelForComboKey(key) {
  return key.split(',').map((id) => DEMOGRAPHICS.find((d) => d.id === id).label).join(' + ');
}

function getAllScoredGroups() {
  const groups = DEMOGRAPHICS.map((d) => ({
    label: d.label,
    systemizing: d.systemizing,
    empathy: d.empathy,
  }));

  Object.entries(DEMOGRAPHIC_COMBOS).forEach(([key, scores]) => {
    groups.push({
      label: labelForComboKey(key),
      systemizing: scores.systemizing,
      empathy: scores.empathy,
    });
  });

  return groups;
}

function applyMassPreset(preset) {
  const field = preset.includes('empathy') ? 'empathy' : 'systemizing';
  const ascending = preset.startsWith('low');
  const sorted = [...getAllScoredGroups()].sort((a, b) => (
    ascending ? a[field] - b[field] : b[field] - a[field]
  ));

  massPreset = preset;
  massPresetBars = sorted.slice(0, 10);
  showPersonalOnly = false;
  selectedDemographics.clear();

  document.querySelectorAll('.checkbox-list input[type="checkbox"]').forEach((input) => {
    input.checked = false;
  });
  document.querySelectorAll('.mass-preset-btn').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.preset === preset);
  });

  updateFilteredMessage();
  renderChart();
}

function getPersonalBars() {
  const bars = [];

  if (visitorResults) {
    bars.push({
      label: 'Your Result',
      systemizing: visitorResults.systemizing,
      empathy: visitorResults.empathy,
    });
  }

  bars.push({
    label: MY_RESULT.label,
    systemizing: MY_RESULT.systemizing,
    empathy: MY_RESULT.empathy,
  });

  return bars;
}

function getVisibleDemographics() {
  const personal = getPersonalBars();

  if (massPresetBars) {
    return [...personal, ...massPresetBars];
  }

  const checked = DEMOGRAPHICS.filter((d) => selectedDemographics.has(d.id));

  if (checked.length > 0) {
    return [...personal, ...checked];
  }

  if (showPersonalOnly) {
    return personal;
  }

  return [...personal, ...DEMOGRAPHICS];
}

function resetToDefaultChart() {
  selectedDemographics.clear();
  showPersonalOnly = false;
  clearMassPreset();
  document.querySelectorAll('.checkbox-list input[type="checkbox"]').forEach((input) => {
    input.checked = false;
  });
  updateFilteredMessage();
  renderChart();
}

function clearDemographics() {
  selectedDemographics.clear();
  showPersonalOnly = true;
  clearMassPreset();
  document.querySelectorAll('.checkbox-list input[type="checkbox"]').forEach((input) => {
    input.checked = false;
  });
  updateFilteredMessage();
  renderChart();
}

function buildChartData(groups) {
  const colored = assignBarColors(groups);
  return {
    labels: ['Systemizing Items', 'Empathy Items'],
    datasets: colored.map((g) => ({
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
  const changeColourBtn = document.getElementById('change-colour-btn');

  if (visitorResults) {
    visitorSys.textContent = visitorResults.systemizing.toFixed(2);
    visitorEmp.textContent = visitorResults.empathy.toFixed(2);
    visitorCard.classList.add('has-data');
    changeColourBtn.hidden = false;
    document.getElementById('input-systemizing').value = visitorResults.systemizing;
    document.getElementById('input-empathy').value = visitorResults.empathy;
  } else {
    visitorSys.textContent = '—';
    visitorEmp.textContent = '—';
    visitorCard.classList.remove('has-data');
    changeColourBtn.hidden = true;
    document.getElementById('input-systemizing').value = '';
    document.getElementById('input-empathy').value = '';
  }

  document.getElementById('score-my-systemizing').textContent = MY_RESULT.systemizing.toFixed(2);
  document.getElementById('score-my-empathy').textContent = MY_RESULT.empathy.toFixed(2);
}

function getComboStatus(key) {
  if (DEMOGRAPHIC_COMBOS[key]) return 'captured';
  if (DEMOGRAPHIC_NO_DATA.has(key)) return 'no_data';
  if (DEMOGRAPHIC_NOT_ENOUGH.has(key)) return 'not_enough';
  return 'missing';
}

function getCombosForCategory(categoryKey) {
  const inCategory = DEMOGRAPHICS.filter((d) => d.category === categoryKey);
  const otherCategories = [...new Set(
    DEMOGRAPHICS.filter((d) => d.category !== categoryKey).map((d) => d.category),
  )];

  const combos = [];
  inCategory.forEach((d1) => {
    otherCategories.forEach((otherKey) => {
      DEMOGRAPHICS.filter((d) => d.category === otherKey).forEach((d2) => {
        const ids = [d1.id, d2.id].sort();
        const key = ids.join(',');
        const api = DEMOGRAPHIC_COMBOS[key];
        const status = getComboStatus(key);
        combos.push({
          key,
          ids,
          label: `${d1.label} + ${d2.label}`,
          systemizing: api?.systemizing,
          empathy: api?.empathy,
          status,
        });
      });
    });
  });

  return combos.sort((a, b) => a.label.localeCompare(b.label));
}

function applyComboSelection(ids) {
  selectedDemographics.clear();
  showPersonalOnly = false;
  clearMassPreset();
  ids.forEach((id) => selectedDemographics.add(id));

  document.querySelectorAll('.checkbox-list input[type="checkbox"]').forEach((input) => {
    input.checked = selectedDemographics.has(input.value);
  });

  updateFilteredMessage();
  renderChart();
}

function renderComboPanel(section, categoryKey) {
  const combos = getCombosForCategory(categoryKey);
  const captured = combos.filter((c) => c.status === 'captured').length;

  const toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.className = 'combo-toggle';
  toggle.textContent = `Show all combos (${captured}/${combos.length})`;

  const panel = document.createElement('div');
  panel.className = 'combo-panel';
  panel.hidden = true;

  const list = document.createElement('ul');
  list.className = 'combo-list';

  const statusLabels = {
    no_data: 'no data available',
    not_enough: 'not enough data',
    missing: 'not captured',
  };

  combos.forEach((combo) => {
    const li = document.createElement('li');
    li.className = `combo-item ${combo.status}`;

    if (combo.status === 'captured') {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'combo-item-btn';
      btn.innerHTML = `
        <span class="combo-item-label">${combo.label}</span>
        <span class="combo-item-scores">Sys ${combo.systemizing.toFixed(2)} · Emp ${combo.empathy.toFixed(2)}</span>
      `;
      btn.addEventListener('click', () => applyComboSelection(combo.ids));
      li.appendChild(btn);
    } else {
      li.innerHTML = `
        <span class="combo-item-label">${combo.label}</span>
        <span class="combo-item-status">${statusLabels[combo.status]}</span>
      `;
    }

    list.appendChild(li);
  });

  panel.appendChild(list);

  toggle.addEventListener('click', () => {
    const open = panel.hidden;
    panel.hidden = !open;
    section.classList.toggle('combos-open', open);
    toggle.textContent = open
      ? `Hide combos (${captured}/${combos.length})`
      : `Show all combos (${captured}/${combos.length})`;
  });

  section.appendChild(toggle);
  section.appendChild(panel);
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
        showPersonalOnly = false;
        clearMassPreset();
        if (selectedDemographics.size >= 3) {
          e.target.checked = false;
          updateFilteredMessage('You can select up to three demographic groups at a time.');
          return;
        }
        selectedDemographics.add(d.id);
      } else {
        selectedDemographics.delete(d.id);
      }
      clearMassPreset();
      updateFilteredMessage();
      renderChart();
    });
  });

  section.appendChild(list);
  renderComboPanel(section, key);
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

  if (massPreset) {
    const list = massPresetBars.map((g) => `${g.label} (${g.systemizing.toFixed(2)} / ${g.empathy.toFixed(2)})`).join('<br>');
    el.innerHTML = `<strong>${MASS_PRESET_LABELS[massPreset]}</strong><br><small>${list}</small>`;
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

  const { systemizing: avgSys, empathy: avgEmp, fromApi, unavailable } = getSelectedAverage();

  let comparison = `My result: systemizing ${MY_RESULT.systemizing.toFixed(2)}, empathizing ${MY_RESULT.empathy.toFixed(2)}`;
  if (visitorResults) {
    comparison = `Your result: systemizing ${visitorResults.systemizing.toFixed(2)}, empathizing ${visitorResults.empathy.toFixed(2)} &nbsp;|&nbsp; ${comparison}`;
  }

  let sourceNote;
  if (unavailable === 'no_data') {
    sourceNote = 'YourMorals.org reports no data available for this filter combination.';
  } else if (unavailable === 'not_enough') {
    sourceNote = 'YourMorals.org reports not enough data for this filter combination (sample too small).';
  } else if (fromApi) {
    sourceNote = 'YourMorals.org API average for this filter combination.';
  } else {
    sourceNote = 'Estimated by averaging single-group values (exact combo not yet captured).';
  }

  const averagesBlock = unavailable
    ? ''
    : `Average systemizing: <strong>${avgSys.toFixed(2)}</strong> &nbsp;|&nbsp;
    Average empathizing: <strong>${avgEmp.toFixed(2)}</strong><br>`;

  el.innerHTML = `
    <strong>Filtered comparison:</strong> ${labels.join(' + ')}<br>
    ${averagesBlock}
    <small>${sourceNote}</small>
    <br><small>${comparison}</small>
  `;
  el.classList.add('visible');
}

function getSelectedAverage() {
  const ids = [...selectedDemographics].sort();
  const categories = ids.map((id) => DEMOGRAPHICS.find((d) => d.id === id).category);
  const uniqueCategories = new Set(categories);

  if (ids.length >= 2 && uniqueCategories.size === ids.length) {
    const key = ids.join(',');
    const status = getComboStatus(key);
    if (status === 'no_data' || status === 'not_enough') {
      return { systemizing: null, empathy: null, fromApi: false, unavailable: status };
    }
    const combo = DEMOGRAPHIC_COMBOS[key];
    if (combo) {
      return { systemizing: combo.systemizing, empathy: combo.empathy, fromApi: true, unavailable: null };
    }
  }

  const items = ids.map((id) => DEMOGRAPHICS.find((d) => d.id === id));
  return {
    systemizing: items.reduce((acc, d) => acc + d.systemizing, 0) / items.length,
    empathy: items.reduce((acc, d) => acc + d.empathy, 0) / items.length,
    fromApi: false,
    unavailable: null,
  };
}

function initResults() {
  visitorResults = loadVisitorResults();

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
    if (!visitorColor) {
      visitorColor = barColorMap.get('Your Result');
      visitorColorIndex = COLOR_POOL.indexOf(visitorColor);
    }
    updateScoreDisplay();
    renderChart();
    updateFilteredMessage();
  });

  document.getElementById('clear-results-btn').addEventListener('click', () => {
    visitorResults = null;
    resetVisitorColor();
    clearVisitorResults();
    updateScoreDisplay();
    renderChart();
    updateFilteredMessage();
  });

  document.getElementById('clear-demographics-btn').addEventListener('click', clearDemographics);
  document.getElementById('reset-chart-btn').addEventListener('click', resetToDefaultChart);
  document.getElementById('change-colour-btn').addEventListener('click', cycleVisitorColor);

  document.querySelectorAll('.mass-preset-btn').forEach((btn) => {
    btn.addEventListener('click', () => applyMassPreset(btn.dataset.preset));
  });

  renderDemographicFilters();
  initBarColors();
  if (visitorResults) {
    visitorColor = barColorMap.get('Your Result');
    visitorColorIndex = COLOR_POOL.indexOf(visitorColor);
  }
  updateScoreDisplay();
  renderChart();
}

document.addEventListener('DOMContentLoaded', initResults);
