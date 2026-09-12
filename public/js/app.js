/* KOTOR Forge dashboard. Static: works identically on Vercel and from a local
   file server. Data comes from data/*.json, refreshed by export_live.py. */

const $ = s => document.querySelector(s);
const el = (t, c, h) => { const n = document.createElement(t);
  if (c) n.className = c; if (h != null) n.innerHTML = h; return n; };
const esc = s => String(s == null ? '' : s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;')
  .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const num = n => (n == null ? '--' : Number(n).toLocaleString());
const bytes = n => {
  if (n == null) return '--';
  const u = ['B', 'KB', 'MB', 'GB']; let i = 0; n = Number(n);
  while (n >= 1024 && i < 3) { n /= 1024; i++; }
  return n.toFixed(i ? 1 : 0) + ' ' + u[i];
};

const D = {};
async function get(name) {
  if (name in D) return D[name];
  try {
    const r = await fetch('data/' + name + '.json', { cache: 'no-store' });
    D[name] = r.ok ? await r.json() : null;
  } catch (e) { D[name] = null; }
  return D[name];
}

const TABS = [
  ['overview',  'Overview'],
  ['toolchain', 'Toolchain'],
  ['tools',     'MCP Tools'],
  ['formats',   'Format Map'],
  ['install',   'Install State'],
  ['decisions', 'Decisions'],
];

const RENDER = {};

/* ---------------------------------------------------------------- OVERVIEW */
RENDER.overview = async root => {
  if (root.dataset.done) return; root.dataset.done = 1;
  const ins = await get('install');
  const tools = await get('tools') || [];

  root.appendChild(el('p', 'lede',
    'KOTOR Forge is an MCP server that gives Claude direct, guarded control of a ' +
    '<em>Star Wars: Knights of the Old Republic II &mdash; The Sith Lords</em> ' +
    'install: it reads every resource the engine ships, edits game tables, ' +
    'compiles scripts, and installs mods &mdash; but nothing reaches the game ' +
    'until a change set has been staged, re-parsed and explicitly confirmed.'));

  const g = el('div', 'grid');
  g.style.gridTemplateColumns = 'repeat(auto-fill,minmax(210px,1fr))';
  const stats = ins ? [
    [num(ins.chitin_resources), 'indexed resources'],
    [num(ins.modules_files),    'module files'],
    [num(ins.area_codes),       'distinct areas'],
    [num(tools.length),         'MCP tools'],
  ] : [['--', 'install data missing']];
  stats.forEach(([v, l]) => {
    const c = el('div', 'card');
    c.appendChild(el('div', 'stat', esc(v) + '<small>' + esc(l) + '</small>'));
    g.appendChild(c);
  });
  root.appendChild(g);

  root.appendChild(el('h2', 'sec', 'The discipline'));
  const sp = el('div', 'split');
  [
    ['Prove, then write &mdash; otherwise refuse',
     'Before a 2DA gains a row, the table is round-tripped byte-identically ' +
     'through PyKotor. If the bytes come back different, the tool refuses ' +
     'rather than silently rewriting rows you never asked to touch. The same ' +
     'gate <code>er-forge</code> uses before editing params.'],
    ['Nothing touches the game until you say so',
     'Every edit lands in <code>staging/</code>. <code>forge_build</code> ' +
     'describes the change set, <code>forge_verify</code> re-parses every file ' +
     'from disk, and only <code>forge_deploy(confirm=True)</code> writes to ' +
     '<code>override/</code> &mdash; after taking a backup, and never while the ' +
     'game is running.'],
    ['override/ shadows everything',
     'A file dropped in <code>override/</code> wins over modules, over ' +
     '<code>chitin.key</code>, over the texture packs. That makes it the ' +
     'easiest place to mod and the easiest place to break a whole build, so it ' +
     'has exactly one writer.'],
    ['A stock baseline, so drift is visible',
     'The clean install&rsquo;s <code>override/</code> is hashed once into a ' +
     'manifest. <code>forge_scan</code> then answers the question every modded ' +
     'KOTOR install eventually raises: <em>what is actually in here, and which ' +
     'of it did I put there?</em>'],
  ].forEach(([h, p]) => {
    const c = el('div', 'card');
    c.appendChild(el('h3', null, h));
    c.appendChild(el('p', 'muted', p));
    sp.appendChild(c);
  });
  root.appendChild(sp);

  root.appendChild(el('h2', 'sec', 'The loop'));
  root.appendChild(el('pre', null, '<code>' + esc(
`forge_status                     where everything stands
forge_snapshot                   hash the clean install  (once, up front)

twoda_edit  table=spells row=8 column=name value=... confirm=True
script_compile  source="void main(){...}" out_name=k_my_hook confirm=True
stage_add   path=D:\\...\\my_texture.tga

forge_build                      what a deploy would write, with shas
forge_verify expect_changed=spells.2da,k_my_hook.ncs
forge_deploy                     DRY RUN -- prints, writes nothing
forge_deploy confirm=True        backs up, then writes to override/

forge_scan                       what is live vs stock
forge_revert to=<backup>         whole-directory restore`) + '</code>'));

  root.appendChild(el('div', 'note',
    'Built on <a href="https://github.com/OpenKotOR/PyKotor">PyKotor</a> ' +
    '(LGPL-3.0) used in-process &mdash; the only library in the KOTOR ecosystem ' +
    'that can both read <em>and</em> write every format the game ships.'));
};

/* --------------------------------------------------------------- TOOLCHAIN */
RENDER.toolchain = async root => {
  if (root.dataset.done) return; root.dataset.done = 1;
  const tc = await get('toolchain') || [];
  const eco = await get('ecosystem') || {};

  root.appendChild(el('h2', 'sec', 'Installed'));
  const t = el('table');
  t.innerHTML = '<thead><tr><th>Package</th><th class="mono">Version</th>' +
    '<th>Why it is here</th></tr></thead>';
  const tb = el('tbody');
  tc.forEach(p => {
    const tr = el('tr');
    tr.innerHTML = '<td class="mono">' + esc(p.name) + '</td>' +
      '<td class="mono">' + (p.version
        ? esc(p.version)
        : '<span class="pill off">not installed</span>') + '</td>' +
      '<td class="muted">' + esc(p.why) + '</td>';
    tb.appendChild(tr);
  });
  t.appendChild(tb);
  const sc = el('div', 'scroll'); sc.appendChild(t); root.appendChild(sc);

  root.appendChild(el('h2', 'sec', 'Deliberately not used'));
  root.appendChild(el('p', 'lede',
    'Most KOTOR modding guides still point at these. Each was evaluated and ' +
    'rejected for a specific, checkable reason.'));
  (eco.rejected || []).forEach(r => {
    const d = el('details');
    d.appendChild(el('summary', null,
      esc(r.name) + ' &nbsp;<span class="faint">' + esc(r.verdict) + '</span>'));
    d.appendChild(el('p', 'muted', r.why));
    if (r.url) d.appendChild(el('p', 'faint',
      '<a href="' + esc(r.url) + '">' + esc(r.url) + '</a>'));
    root.appendChild(d);
  });

  root.appendChild(el('h2', 'sec', 'Watched, not depended on'));
  const g = el('div', 'grid');
  g.style.gridTemplateColumns = 'repeat(auto-fill,minmax(300px,1fr))';
  (eco.watched || []).forEach(w => {
    const c = el('div', 'card');
    c.appendChild(el('h3', null, esc(w.name)));
    c.appendChild(el('p', 'muted', w.why));
    if (w.url) c.appendChild(el('p', 'faint',
      '<a href="' + esc(w.url) + '">' + esc(w.url) + '</a>'));
    g.appendChild(c);
  });
  root.appendChild(g);
};

/* --------------------------------------------------------------- MCP TOOLS */
RENDER.tools = async root => {
  if (root.dataset.done) return; root.dataset.done = 1;
  const tools = await get('tools') || [];
  if (!tools.length) {
    root.appendChild(el('div', 'empty', 'tools data missing')); return;
  }
  const bar = el('div', 'toolbar');
  const q = el('input'); q.type = 'search'; q.placeholder = 'filter tools\u2026';
  const sel = el('select');
  sel.innerHTML = '<option value="">all groups</option>' +
    ['lifecycle', 'query', 'edit', 'saves', 'mods']
      .map(g => '<option value="' + g + '">' + g + '</option>').join('');
  const cnt = el('span', 'count');
  bar.append(q, sel, cnt);
  root.appendChild(bar);
  const host = el('div');
  root.appendChild(host);

  function draw() {
    const s = q.value.trim().toLowerCase(), gf = sel.value;
    host.innerHTML = '';
    const rows = tools.filter(t =>
      (!gf || t.group === gf) &&
      (!s || (t.name + ' ' + t.doc).toLowerCase().includes(s)));
    cnt.textContent = rows.length + ' / ' + tools.length;
    if (!rows.length) {
      host.appendChild(el('div', 'empty', 'nothing matches')); return;
    }
    rows.forEach(t => {
      const d = el('details');
      d.appendChild(el('summary', null,
        '<span class="pill ' + esc(t.group) + '">' + esc(t.group) + '</span> ' +
        '<strong style="color:var(--amber2)">' + esc(t.name) + '</strong>' +
        '<span class="faint">' + esc(t.sig.replace(' -> str', '')) + '</span>'));
      d.appendChild(el('pre', null, '<code>' + esc(t.doc) + '</code>'));
      host.appendChild(d);
    });
  }
  q.oninput = draw; sel.onchange = draw; draw();
};

/* -------------------------------------------------------------- FORMAT MAP */
RENDER.formats = async root => {
  if (root.dataset.done) return; root.dataset.done = 1;
  const f = await get('formats') || [];
  const ins = await get('install');
  const counts = (ins && ins.resources_by_type) || {};

  root.appendChild(el('p', 'lede',
    'Every container and resource format KOTOR II ships, what it holds, and ' +
    'whether this server can write it as well as read it. Counts are live from ' +
    'the install&rsquo;s <code>chitin.key</code> index.'));

  const bar = el('div', 'toolbar');
  const q = el('input'); q.type = 'search'; q.placeholder = 'filter formats\u2026';
  const sel = el('select');
  sel.innerHTML = '<option value="">all support levels</option>' +
    '<option value="rw">read + write</option>' +
    '<option value="ro">read only</option>' +
    '<option value="no">not supported</option>';
  const cnt = el('span', 'count');
  bar.append(q, sel, cnt); root.appendChild(bar);
  const sc = el('div', 'scroll'); root.appendChild(sc);

  function draw() {
    const s = q.value.trim().toLowerCase(), lv = sel.value;
    const rows = f.filter(r =>
      (!lv || r.support === lv) &&
      (!s || (r.ext + ' ' + r.name + ' ' + r.holds).toLowerCase().includes(s)));
    cnt.textContent = rows.length + ' / ' + f.length;
    const t = el('table');
    t.innerHTML = '<thead><tr><th>Ext</th><th>Format</th><th>What it holds</th>' +
      '<th>kotor-forge</th><th class="mono">In install</th></tr></thead>';
    const tb = el('tbody');
    const max = Math.max(1, ...Object.values(counts));
    rows.forEach(r => {
      const n = counts[r.ext] || 0;
      const lbl = { rw: 'read + write', ro: 'read only', no: 'not supported' }[r.support];
      const tr = el('tr');
      tr.innerHTML =
        '<td class="mono" style="color:var(--amber2)">.' + esc(r.ext) + '</td>' +
        '<td>' + esc(r.name) + '</td>' +
        '<td class="muted">' + esc(r.holds) + '</td>' +
        '<td><span class="pill ' + esc(r.support) + '">' + esc(lbl) + '</span></td>' +
        '<td class="mono">' + (n ? num(n) +
          '<div class="bar" style="margin-top:3px"><i style="width:' +
          Math.max(2, Math.round(n / max * 100)) + '%"></i></div>'
          : '<span class="faint">&mdash;</span>') + '</td>';
      tb.appendChild(tr);
    });
    t.appendChild(tb);
    sc.innerHTML = ''; sc.appendChild(t);
  }
  q.oninput = draw; sel.onchange = draw; draw();
};

/* ------------------------------------------------------------ INSTALL STATE */
RENDER.install = async root => {
  if (root.dataset.done) return; root.dataset.done = 1;
  const ins = await get('install');
  if (!ins) { root.appendChild(el('div', 'empty', 'install data missing')); return; }

  const clean = !(ins.mods_added || []).length && !(ins.mods_changed || []).length;
  const g = el('div', 'grid');
  g.style.gridTemplateColumns = 'repeat(auto-fill,minmax(320px,1fr))';

  const c1 = el('div', 'card');
  c1.appendChild(el('h3', null, 'Install'));
  const dl = el('dl', 'kv');
  [
    ['Path', ins.game_dir],
    ['Modules', num(ins.modules_files) + ' files / ' + num(ins.area_codes) + ' areas'],
    ['Indexed', num(ins.chitin_resources) + ' resources'],
    ['Texture packs', (ins.texturepacks || []).length],
    ['override/', num(ins.override_files) + ' files, ' + bytes(ins.override_bytes)],
  ].forEach(([k, v]) => {
    dl.appendChild(el('dt', null, esc(k)));
    dl.appendChild(el('dd', null, esc(v)));
  });
  c1.appendChild(dl);
  g.appendChild(c1);

  const c2 = el('div', 'card');
  c2.appendChild(el('h3', null, 'Drift vs stock baseline'));
  c2.appendChild(el('p', null,
    '<span class="pill ' + (clean ? 'on' : 'off') + '">' +
    (clean ? 'vanilla' : 'modded') + '</span>'));
  c2.appendChild(el('p', 'muted',
    'Baseline: ' + num(ins.stock_baseline) + ' files, captured ' +
    esc(ins.stock_captured || 'never') + '.'));
  if (clean) {
    c2.appendChild(el('p', 'muted',
      'override/ is byte-identical to the clean Aspyr install.'));
  } else {
    c2.appendChild(el('p', 'muted',
      num((ins.mods_added || []).length) + ' added, ' +
      num((ins.mods_changed || []).length) + ' changed.'));
    (ins.mods_added || []).slice(0, 40).forEach(m =>
      c2.appendChild(el('span', 'tag', esc(m))));
  }
  g.appendChild(c2);
  root.appendChild(g);

  root.appendChild(el('h2', 'sec', 'Resources by type'));
  const rb = Object.entries(ins.resources_by_type || {});
  const max = Math.max(1, ...rb.map(r => r[1]));
  const t = el('table');
  t.innerHTML = '<thead><tr><th>Type</th><th class="mono">Count</th>' +
    '<th style="width:55%"></th></tr></thead>';
  const tb = el('tbody');
  rb.forEach(([k, v]) => {
    const tr = el('tr');
    tr.innerHTML = '<td class="mono" style="color:var(--amber2)">.' + esc(k) + '</td>' +
      '<td class="mono">' + num(v) + '</td>' +
      '<td><div class="bar"><i style="width:' +
      Math.max(1, Math.round(v / max * 100)) + '%"></i></div></td>';
    tb.appendChild(tr);
  });
  t.appendChild(tb);
  const sc = el('div', 'scroll'); sc.appendChild(t); root.appendChild(sc);

  root.appendChild(el('h2', 'sec', 'Areas'));
  root.appendChild(el('p', 'lede',
    'Each area code maps to a static <code>.rim</code>, a dynamic ' +
    '<code>_s.rim</code> and a dialogue <code>_dlg.erf</code>.'));
  const host = el('div');
  Object.keys(ins.areas || {}).forEach(k =>
    host.appendChild(el('span', 'tag', esc(k))));
  root.appendChild(host);
};

/* ---------------------------------------------------------------- DECISIONS */
RENDER.decisions = async root => {
  if (root.dataset.done) return; root.dataset.done = 1;
  const d = await get('decisions') || [];
  root.appendChild(el('p', 'lede',
    'Findings from the build, kept because a future session would otherwise ' +
    'pay to re-derive them. Each separates what was measured from what was ' +
    'concluded.'));
  d.forEach(x => {
    const c = el('div', 'card');
    c.style.marginBottom = '12px';
    c.appendChild(el('h3', null, esc(x.title)));
    c.appendChild(el('p', null,
      '<span class="pill ' + (x.kind === 'fact' ? 'on' : 'query') + '">' +
      esc(x.kind === 'fact' ? 'measured' : 'inference') + '</span>'));
    c.appendChild(el('p', 'muted', x.body));
    if (x.evidence) c.appendChild(el('pre', null, '<code>' + esc(x.evidence) + '</code>'));
    root.appendChild(c);
  });
};

/* -------------------------------------------------------------------- BOOT */
function show(id) {
  TABS.forEach(([k]) => {
    const s = document.getElementById('t-' + k);
    if (s) s.hidden = (k !== id);
  });
  [...$('#tabs').children].forEach(b =>
    b.setAttribute('aria-selected', b.dataset.tab === id ? 'true' : 'false'));
  const root = document.getElementById('t-' + id);
  if (root && RENDER[id]) RENDER[id](root);
  if (location.hash.slice(1) !== id) location.hash = id;
}

window.addEventListener('load', async () => {
  const nav = $('#tabs');
  TABS.forEach(([k, label]) => {
    const b = el('button', null, esc(label));
    b.dataset.tab = k;
    b.onclick = () => show(k);
    nav.appendChild(b);
  });
  const meta = await get('meta');
  const ins = await get('install');
  const hdr = $('#hdr-meta');
  if (meta && meta.generated) {
    hdr.textContent = 'KOTOR II \u00b7 TSL \u2014 exported ' +
      meta.generated.replace('T', ' ');
  } else {
    hdr.textContent = 'KOTOR II \u00b7 The Sith Lords';
  }
  if (ins) {
    hdr.textContent += '  \u00b7  ' + num(ins.chitin_resources) + ' resources';
  }
  const start = TABS.some(([k]) => k === location.hash.slice(1))
    ? location.hash.slice(1) : 'overview';
  show(start);
  window.addEventListener('hashchange', () => {
    const h = location.hash.slice(1);
    if (TABS.some(([k]) => k === h)) show(h);
  });
});
