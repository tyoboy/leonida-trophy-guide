// Leonida Trophy Guide & Tracker.
//
// Loads the official 55-trophy list (data/trophies.json: names, descriptions
// and grades as published, cross-checked against the Exophase and
// PSNProfiles listings), and layers this app's own work over it: a guide for
// every trophy written from its official description, a kind for filtering,
// a five-stage roadmap, and watch flags on the three trophies whose
// descriptions describe a one-time chance. Progress is a checklist kept in
// localStorage, exportable and importable as a small JSON file.
//
// Spoiler guard: with it on, an unearned story trophy shows neither its name
// nor its description — the list itself marks 28 trophies hidden on
// PlayStation until earned, and the story ones stay hidden here too until
// you tick them off.

const STAGES = {
  1: { name: 'Stage 1 · Story first', note: 'Chapters and story missions in order. Keep a manual save before the final mission, and do the VCIA feat (trophy 37) while its mission puts you at the airport.' },
  2: { name: 'Stage 2 · People of Leonida', note: 'Contacts and strangers: finish each strand\'s final mission, and clear eight full Strangers & Freaks strands.' },
  3: { name: 'Stage 3 · Medals & mayhem', note: 'Activities, medals and scores: ranges, races, stunts, partner feats and the robberies. The watch-flagged choices (48, 49) belong to the story — decide them with a save in hand.' },
  4: { name: 'Stage 4 · Collections & cash', note: 'Cards, spots, vehicles and the map itself, then the money trophies and the garage properties they pay for.' },
  5: { name: 'Stage 5 · 100% & platinum', note: 'The completion counter to 100%, and the platinum lands with the last of the 54.' },
};

const STORE_KEY = 'leonida-trophies-v1';
const $ = (id) => document.getElementById(id);

let data = null;
let earned = new Set(JSON.parse(localStorage.getItem(STORE_KEY) || '[]'));
const filters = { kind: 'all', grade: 'all', view: 'list', spoilers: true, remaining: false, search: '' };

function save() {
  localStorage.setItem(STORE_KEY, JSON.stringify([...earned]));
}

function gradeMedal(grade) {
  return { platinum: '◆', gold: '●', silver: '●', bronze: '●' }[grade] || '●';
}

function isSpoilerHidden(t) {
  return filters.spoilers && t.kind === 'story' && !earned.has(t.id);
}

function matches(t) {
  if (filters.kind === 'watch' ? !t.watch : filters.kind !== 'all' && t.kind !== filters.kind) return false;
  if (filters.grade !== 'all' && t.grade !== filters.grade) return false;
  if (filters.remaining && earned.has(t.id)) return false;
  if (filters.search) {
    const hay = `${t.name} ${t.description} ${t.guide}`.toLowerCase();
    if (!hay.includes(filters.search.toLowerCase())) return false;
  }
  return true;
}

function trophyCard(t) {
  const hidden = isSpoilerHidden(t);
  const card = document.createElement('article');
  card.className = 'card' + (earned.has(t.id) ? ' earned' : '');
  const check = document.createElement('input');
  check.type = 'checkbox';
  check.checked = earned.has(t.id);
  check.setAttribute('aria-label', `Mark ${hidden ? 'this story trophy' : t.name} as earned`);
  check.addEventListener('change', () => {
    if (check.checked) earned.add(t.id); else earned.delete(t.id);
    save();
    render();
  });
  const body = document.createElement('div');
  body.className = 'card-body';
  const title = document.createElement('h3');
  title.innerHTML = `<span class="medal ${t.grade}">${gradeMedal(t.grade)}</span> `;
  title.append(document.createTextNode(hidden ? 'Hidden story trophy' : t.name));
  const meta = document.createElement('div');
  meta.className = 'meta';
  meta.textContent = `${t.grade} · ${t.kind}${t.secret ? ' · hidden on PSN until earned' : ''} · stage ${t.stage}`;
  if (t.watch) {
    const badge = document.createElement('span');
    badge.className = 'watch-badge';
    badge.textContent = 'ONE TO WATCH';
    meta.append(' · ', badge);
  }
  const desc = document.createElement('p');
  desc.className = 'desc';
  desc.textContent = hidden ? 'Earn it in the story to reveal its name and description here.' : t.description;
  const guide = document.createElement('p');
  guide.className = 'guide';
  guide.textContent = hidden ? 'Guide hidden with the trophy — the roadmap stage still applies.' : t.guide;
  const cite = document.createElement('p');
  cite.className = 'cite';
  cite.textContent = 'Source: official PlayStation trophy description, as listed by Exophase and PSNProfiles.';
  body.append(title, meta, desc, guide, cite);
  card.append(check, body);
  return card;
}

function renderProgress() {
  const total = data.trophies.length;
  const done = earned.size;
  $('done-count').textContent = String(done);
  $('progress-fill').style.width = `${(done / total) * 100}%`;
  const byGrade = {};
  for (const t of data.trophies) {
    byGrade[t.grade] = byGrade[t.grade] || [0, 0];
    byGrade[t.grade][1] += 1;
    if (earned.has(t.id)) byGrade[t.grade][0] += 1;
  }
  const parts = ['platinum', 'gold', 'silver', 'bronze']
    .filter((g) => byGrade[g])
    .map((g) => `${byGrade[g][0]}/${byGrade[g][1]} ${g}`);
  $('progress-detail').textContent = `${Math.round((done / total) * 100)}% · ${parts.join(' · ')}`;
}

function render() {
  renderProgress();
  const roadmap = $('roadmap');
  const list = $('list');
  if (filters.view === 'roadmap') {
    list.hidden = true;
    roadmap.hidden = false;
    roadmap.innerHTML = '';
    for (const stage of [1, 2, 3, 4, 5]) {
      const inStage = data.trophies.filter((t) => t.stage === stage && matches(t));
      const box = document.createElement('div');
      box.className = 'stage';
      const head = document.createElement('h2');
      const all = data.trophies.filter((t) => t.stage === stage);
      const doneN = all.filter((t) => earned.has(t.id)).length;
      head.textContent = `${STAGES[stage].name} — ${doneN}/${all.length}`;
      const note = document.createElement('p');
      note.className = 'stage-note';
      note.textContent = STAGES[stage].note;
      box.append(head, note);
      for (const t of inStage) box.append(trophyCard(t));
      if (!inStage.length) {
        const none = document.createElement('p');
        none.className = 'stage-note';
        none.textContent = 'No trophies in this stage match the current filters.';
        box.append(none);
      }
      roadmap.append(box);
    }
  } else {
    roadmap.hidden = true;
    list.hidden = false;
    list.innerHTML = '';
    const shown = data.trophies.filter(matches);
    for (const t of shown) list.append(trophyCard(t));
    if (!shown.length) {
      const none = document.createElement('p');
      none.className = 'empty';
      none.textContent = 'No trophies match the current filters.';
      list.append(none);
    }
  }
}

function wire() {
  $('kind-filters').addEventListener('click', (e) => {
    const b = e.target.closest('button[data-kind]');
    if (!b) return;
    filters.kind = b.dataset.kind;
    document.querySelectorAll('#kind-filters .chip').forEach((c) => c.classList.toggle('on', c === b));
    render();
  });
  $('grade-filter').addEventListener('change', (e) => { filters.grade = e.target.value; render(); });
  $('view-mode').addEventListener('change', (e) => { filters.view = e.target.value; render(); });
  $('spoilers').addEventListener('change', (e) => { filters.spoilers = e.target.checked; render(); });
  $('remaining-only').addEventListener('change', (e) => { filters.remaining = e.target.checked; render(); });
  $('search').addEventListener('input', (e) => { filters.search = e.target.value; render(); });
  $('export-progress').addEventListener('click', () => {
    const blob = new Blob([JSON.stringify({ game: data.game, earned: [...earned] }, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'leonida-trophy-progress.json';
    a.click();
    URL.revokeObjectURL(a.href);
  });
  $('import-progress').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const parsed = JSON.parse(await file.text());
    earned = new Set((parsed.earned || []).filter((id) => data.trophies.some((t) => t.id === id)));
    save();
    render();
  });
  $('reset-progress').addEventListener('click', () => {
    earned = new Set();
    save();
    render();
  });
}

async function boot() {
  const res = await fetch('data/trophies.json');
  data = await res.json();
  $('source-note').textContent = data.source_note;
  // Screenshot hooks: ?grade=silver, ?view=roadmap, ?spoilers=off, ?kind=watch
  const q = new URLSearchParams(location.search);
  if (q.get('grade')) { filters.grade = q.get('grade'); $('grade-filter').value = filters.grade; }
  if (q.get('view')) { filters.view = q.get('view'); $('view-mode').value = filters.view; }
  if (q.get('spoilers') === 'off') { filters.spoilers = false; $('spoilers').checked = false; }
  if (q.get('kind')) {
    filters.kind = q.get('kind');
    document.querySelectorAll('#kind-filters .chip').forEach((c) => c.classList.toggle('on', c.dataset.kind === filters.kind));
  }
  wire();
  render();
}

boot();
