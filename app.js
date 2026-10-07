'use strict';
/* ── PredictaScore Frontend ───────────────────────────────────────────────── */

let allPredictions = [];
let activeLeague = 'all';

document.addEventListener('DOMContentLoaded', init);

async function init() {
  // Tab switching
  document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      activeLeague = tab.dataset.league;
      renderPredictions();
    });
  });

  // Load data
  try {
    const res = await fetch('predictions.json?v=' + Date.now());
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    allPredictions = data.predictions || [];

    const updated = new Date(data.generated);
    document.getElementById('lastUpdated').textContent =
      `Updated: ${updated.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })} at ${updated.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`;

    renderPredictions();
  } catch (e) {
    document.getElementById('predictions').innerHTML =
      `<div class="no-matches"><p>⚠️ Could not load predictions.</p><p style="margin-top:0.5rem;font-size:0.85rem">Data may not have been generated yet. Check back soon.</p></div>`;
  }
}

function renderPredictions() {
  const container = document.getElementById('predictions');
  const filtered = activeLeague === 'all'
    ? allPredictions
    : allPredictions.filter(p => p.league.shortName === activeLeague);

  if (filtered.length === 0) {
    container.innerHTML = '<div class="no-matches"><p>No upcoming matches found for this league.</p></div>';
    return;
  }

  // Group by date
  const grouped = {};
  for (const p of filtered) {
    const date = new Date(p.fixture.date).toLocaleDateString('en-GB', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
    });
    if (!grouped[date]) grouped[date] = [];
    grouped[date].push(p);
  }

  let html = '';
  for (const [date, matches] of Object.entries(grouped)) {
    html += `<div class="date-separator">${date}</div>`;
    for (const match of matches) {
      html += renderMatchCard(match);
    }
  }

  container.innerHTML = html;

  // Attach factor toggle events
  container.querySelectorAll('.factors-toggle').forEach(btn => {
    btn.addEventListener('click', () => {
      const content = btn.nextElementSibling;
      content.classList.toggle('open');
      btn.textContent = content.classList.contains('open') ? '▲ Hide factors' : '▼ Show prediction factors';
    });
  });
}

function renderMatchCard(match) {
  const p = match.prediction;
  const time = new Date(match.fixture.date).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  const scores = p.predictedScore.split('-');

  return `
    <div class="match-card">
      <div class="card-header">
        <span class="league-badge">${match.league.shortName}</span>
        <span>${time} · ${match.fixture.venue}</span>
      </div>

      <div class="card-teams">
        <div class="team">
          <img src="${match.homeTeam.crest || ''}" alt="" onerror="this.style.display='none'">
          <span class="team-name">${match.homeTeam.name}</span>
          <span class="team-meta">${match.homeTeam.rank ? ordinal(match.homeTeam.rank) + ' · ' + match.homeTeam.points + 'pts' : ''}</span>
          ${renderForm(match.homeTeam.form)}
        </div>

        <div style="text-align:center">
          <div class="predicted-score">
            <span>${scores[0]}</span>
            <span class="score-dash">-</span>
            <span>${scores[1]}</span>
          </div>
          <span class="score-prob">${p.predictedScoreProb}% likely</span>
        </div>

        <div class="team">
          <img src="${match.awayTeam.crest || ''}" alt="" onerror="this.style.display='none'">
          <span class="team-name">${match.awayTeam.name}</span>
          <span class="team-meta">${match.awayTeam.rank ? ordinal(match.awayTeam.rank) + ' · ' + match.awayTeam.points + 'pts' : ''}</span>
          ${renderForm(match.awayTeam.form)}
        </div>
      </div>

      <div class="outcome-bar-container">
        <div class="outcome-labels">
          <span>Home ${p.outcomes.homeWin}%</span>
          <span>Draw ${p.outcomes.draw}%</span>
          <span>Away ${p.outcomes.awayWin}%</span>
        </div>
        <div class="outcome-bar">
          <div class="home" style="width:${p.outcomes.homeWin}%"></div>
          <div class="draw" style="width:${p.outcomes.draw}%"></div>
          <div class="away" style="width:${p.outcomes.awayWin}%"></div>
        </div>
      </div>

      <div class="xg-row">
        <span>xG: <span class="xg-val">${p.homeXG}</span></span>
        <span>xG: <span class="xg-val">${p.awayXG}</span></span>
      </div>

      <div class="top-scores">
        ${p.topScores.map(s => `<span class="top-score-chip"><span class="score">${s.score}</span><span class="pct">${s.probability}%</span></span>`).join('')}
      </div>

      ${match.weather ? `<div class="weather-badge">🌤 ${match.weather.temp}°C · Wind ${match.weather.wind}km/h${match.weather.rain > 0 ? ' · Rain ' + match.weather.rain + 'mm' : ''} · ${match.weather.description}</div>` : ''}
      ${match.daysRest ? renderDaysRest(match.daysRest) : ''}

      <button class="factors-toggle">▼ Show prediction factors</button>
      <div class="factors-content">
        ${renderFactors(p.factors, match.injuries)}
      </div>
    </div>
  `;
}

function renderForm(formStr) {
  if (!formStr) return '';
  const dots = formStr.split('').slice(-6).map(c =>
    `<span class="form-dot ${c}">${c}</span>`
  ).join('');
  return `<div class="form-dots">${dots}</div>`;
}

function renderFactors(factors, injuries) {
  const categorised = {};
  for (const f of factors) {
    const colonIdx = f.indexOf(':');
    if (colonIdx > 0) {
      const cat = f.substring(0, colonIdx).trim();
      const detail = f.substring(colonIdx + 1).trim();
      if (!categorised[cat]) categorised[cat] = [];
      categorised[cat].push(detail);
    } else {
      if (!categorised['Other']) categorised['Other'] = [];
      categorised['Other'].push(f);
    }
  }

  let html = '';
  for (const [cat, items] of Object.entries(categorised)) {
    html += `<span class="factor-category">${cat}</span>`;
    for (const item of items) {
      html += `<div class="factor-item">• ${item}</div>`;
    }
  }

  // Injury details
  if (injuries) {
    if (injuries.home.length > 0) {
      html += `<span class="factor-category">🏥 Home Injuries</span>`;
      for (const inj of injuries.home.slice(0, 5)) {
        html += `<div class="factor-item">• ${inj.player || 'Unknown'} — ${inj.reason || inj.type || 'undisclosed'}</div>`;
      }
      if (injuries.home.length > 5) html += `<div class="factor-item">• +${injuries.home.length - 5} more</div>`;
    }
    if (injuries.away.length > 0) {
      html += `<span class="factor-category">🏥 Away Injuries</span>`;
      for (const inj of injuries.away.slice(0, 5)) {
        html += `<div class="factor-item">• ${inj.player || 'Unknown'} — ${inj.reason || inj.type || 'undisclosed'}</div>`;
      }
      if (injuries.away.length > 5) html += `<div class="factor-item">• +${injuries.away.length - 5} more</div>`;
    }
  }

  return html || '<div class="factor-item">No significant factors detected</div>';
}

function renderDaysRest(daysRest) {
  if (!daysRest || (daysRest.home == null && daysRest.away == null)) return '';
  const parts = [];
  if (daysRest.home != null) {
    const icon = daysRest.home <= 3 ? '⚡' : daysRest.home >= 7 ? '✅' : '';
    parts.push(`Home: ${daysRest.home}d rest ${icon}`);
  }
  if (daysRest.away != null) {
    const icon = daysRest.away <= 3 ? '⚡' : daysRest.away >= 7 ? '✅' : '';
    parts.push(`Away: ${daysRest.away}d rest ${icon}`);
  }
  return `<div class="weather-badge">⏱ ${parts.join(' · ')}</div>`;
}

function ordinal(n) {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}
