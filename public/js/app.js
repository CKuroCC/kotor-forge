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
  ['library',   'Mod Library'],
  ['build',     'Build'],
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

/* ------------------------------------------------------------- MOD LIBRARY */
RENDER.library = async root => {
  if (root.dataset.done) return; root.dataset.done = 1;
  const lib = await get('library');
  if (!lib) { root.appendChild(el('div', 'empty', 'library data missing')); return; }

  root.appendChild(el('p', 'lede',
    'Every mod archive staged on disk, grouped in install order. Nothing here ' +
    'is listed on the strength of its filename: each archive is CRC-tested with ' +
    '7-Zip before it counts as present, because a truncated CDN transfer looks ' +
    'exactly like a complete one until the day you try to extract it.'));

  const g = el('div', 'grid');
  g.style.gridTemplateColumns = 'repeat(auto-fill,minmax(210px,1fr))';
  [
    [num(lib.total_files),            'files staged'],
    [bytes(lib.total_bytes),          'on disk'],
    [num(lib.verified_ok),            'archives CRC verified'],
    [num(lib.verified_fail),          'failed'],
  ].forEach(([v, l]) => {
    const c = el('div', 'card');
    c.appendChild(el('div', 'stat', esc(v) + '<small>' + esc(l) + '</small>'));
    g.appendChild(c);
  });
  root.appendChild(g);

  if (lib.verified_fail) {
    root.appendChild(el('div', 'warn',
      num(lib.verified_fail) + ' archive(s) failed their CRC test. Re-download ' +
      'before installing anything &mdash; a bad archive fails halfway through a ' +
      'patcher run, which is the worst possible place for it.'));
  }

  const blocked = (lib.blockers || []).filter(b => b.state === 'blocked');
  if (blocked.length) {
    root.appendChild(el('h2', 'sec', 'Blocked on a human'));
    blocked.forEach(b => {
      const c = el('div', 'card');
      c.style.marginBottom = '10px';
      c.style.borderColor = '#512f2f';
      c.appendChild(el('h3', null, esc(b.title)));
      c.appendChild(el('p', 'muted', esc(b.body)));
      root.appendChild(c);
    });
  }

  root.appendChild(el('h2', 'sec', 'Staged, in install order'));
  (lib.groups || []).forEach(grp => {
    const d = el('details');
    const n = (grp.files || []).length;
    const failed = (grp.files || []).filter(f => f.verify === 'fail').length;
    d.appendChild(el('summary', null,
      '<span class="pill ' + (grp.tier === 'install-first' ? 'lifecycle' : 'mods') +
      '">' + esc(grp.key) + '</span> ' +
      '<strong style="color:var(--amber2)">' + esc(grp.label) + '</strong>' +
      '<span class="faint"> &nbsp;' + n + ' file' + (n === 1 ? '' : 's') +
      ' &middot; ' + bytes(grp.bytes) +
      (failed ? ' &middot; ' + failed + ' FAILED' : '') + '</span>'));
    d.appendChild(el('p', 'muted', esc(grp.note)));
    if (!n) {
      d.appendChild(el('div', 'empty', 'nothing staged here yet'));
    } else {
      const t = el('table');
      t.innerHTML = '<thead><tr><th>Archive</th><th class="mono">Size</th>' +
        '<th>CRC</th></tr></thead>';
      const tb = el('tbody');
      grp.files.forEach(f => {
        const pill = { ok: 'on', fail: 'off', skipped: 'no' }[f.verify] || 'no';
        const lbl = { ok: 'verified', fail: 'FAILED', skipped: 'not an archive' }[f.verify]
          || f.verify;
        const tr = el('tr');
        tr.innerHTML = '<td class="mono">' + esc(f.name) + '</td>' +
          '<td class="mono">' + esc(bytes(f.bytes)) + '</td>' +
          '<td><span class="pill ' + pill + '">' + esc(lbl) + '</span></td>';
        tb.appendChild(tr);
      });
      t.appendChild(tb);
      const sc = el('div', 'scroll'); sc.appendChild(t); d.appendChild(sc);
    }
    root.appendChild(d);
  });

  const clear = (lib.blockers || []).filter(b => b.state === 'clear');
  if (clear.length) {
    root.appendChild(el('h2', 'sec', 'Checked, and clear'));
    clear.forEach(b => {
      const c = el('div', 'card');
      c.style.marginBottom = '10px';
      c.appendChild(el('h3', null, esc(b.title)));
      c.appendChild(el('p', 'muted', esc(b.body)));
      root.appendChild(c);
    });
  }

  root.appendChild(el('div', 'note',
    'Library root <code>' + esc(lib.root) + '</code> &middot; extractor ' +
    esc(lib.extractor) + ' &middot; scanned ' +
    esc(String(lib.generated || '').replace('T', ' ')) + '. Regenerate with ' +
    '<code>py export_library.py</code>.'));
};

/* -------------------------------------------------------------------- BUILD */
RENDER.build = async root => {
  if (root.dataset.done) return; root.dataset.done = 1;
  const b = await get('build');
  if (!b) { root.appendChild(el('div', 'empty', 'build data missing')); return; }

  root.appendChild(el('p', 'lede',
    'The mod build, step by step, in the order the archives themselves ' +
    'dictate rather than the order a mod page suggests. Each step says what ' +
    'kind of install it is, because that decides everything: a TSLPatcher mod ' +
    'edits shared tables in place, a loose-file mod just lands in ' +
    '<code>override/</code> and last writer wins.'));

  const steps = b.steps || [];
  const count = k => steps.filter(s => s.state === k).length;
  const g = el('div', 'grid');
  g.style.gridTemplateColumns = 'repeat(auto-fill,minmax(210px,1fr))';
  [
    [num(count('done')),    'steps done'],
    [num(count('blocked')), 'blocked'],
    [num(count('ready')),   'ready to run'],
    [num(steps.length),     'steps total'],
  ].forEach(([v, l]) => {
    const c = el('div', 'card');
    c.appendChild(el('div', 'stat', esc(v) + '<small>' + esc(l) + '</small>'));
    g.appendChild(c);
  });
  root.appendChild(g);

  /* --- the executable ------------------------------------------------- */
  const e = b.exe || {};
  root.appendChild(el('h2', 'sec', 'The executable'));
  root.appendChild(el('p', 'lede',
    '3C-FD is a search-and-replace byte patcher: it rewrites shader strings ' +
    'and one header flag <em>in place</em> and leaves the file exactly the ' +
    'same length. Which is why this is tracked by hash and never by size ' +
    '&mdash; a size check called a fully patched executable &ldquo;stock&rdquo;.'));
  const ec = el('div', 'card');
  const dl = el('dl', 'kv');
  [
    ['stock', e.stock_sha],
    ['live', e.live_sha],
    ['size', num(e.size) + ' bytes, unchanged'],
    ['changed', num(e.bytes_changed) + ' bytes, ' + e.first_diff + ' to ' + e.last_diff],
    ['PE flags', e.characteristics_before + ' → ' + e.characteristics_after +
      (e.laa ? '  (LARGE_ADDRESS_AWARE set)' : '')],
  ].forEach(([k, v]) => {
    dl.appendChild(el('dt', null, esc(k)));
    dl.appendChild(el('dd', null, esc(v)));
  });
  ec.appendChild(dl);
  ec.appendChild(el('p', 'muted',
    'Pristine copies kept: ' +
    (e.pristine_copies || []).map(x => '<code>' + esc(x) + '</code>').join(', ')));
  root.appendChild(ec);

  /* --- step 1 detail --------------------------------------------------- */
  const s1 = b.step1;
  if (s1) {
    root.appendChild(el('h2', 'sec', 'Step 1 — ' + esc(s1.name)));
    const c = el('div', 'card');
    c.appendChild(el('p', 'muted', esc(s1.finding)));
    c.appendChild(el('p', 'faint', 'Build fingerprint: <code>' +
      esc(s1.signature_match) + '</code>'));
    root.appendChild(c);

    const t = el('table');
    t.innerHTML = '<thead><tr><th>Patch file</th><th class="mono">Blocks</th>' +
      '<th>Applied</th><th>What it does</th></tr></thead>';
    const tb = el('tbody');
    (s1.patches || []).forEach(p => {
      const tr = el('tr');
      tr.innerHTML = '<td class="mono">' + esc(p.file) + '</td>' +
        '<td class="mono">' + esc(p.blocks) + '</td>' +
        '<td><span class="pill ' + (p.applied ? 'on' : 'no') + '">' +
        (p.applied ? 'applied' : 'skipped') + '</span></td>' +
        '<td class="muted">' + esc(p.what) + '</td>';
      tb.appendChild(tr);
    });
    t.appendChild(tb);
    const sc = el('div', 'scroll'); sc.appendChild(t); root.appendChild(sc);

    root.appendChild(el('h3', null, 'Verified afterwards, not assumed'));
    const ul = el('ul', 'muted');
    (s1.verification || []).forEach(v =>
      ul.appendChild(el('li', null, esc(v))));
    root.appendChild(ul);
  }

  /* --- TSLRCM detail ---------------------------------------------------- */
  const tslr = b.tslrcm;
  if (tslr) {
    root.appendChild(el('h2', 'sec', 'Step 2 — ' + esc(tslr.name)));
    const c = el('div', 'card');
    c.appendChild(el('p', 'muted', esc(tslr.finding)));
    const d2 = el('dl', 'kv');
    [
      ['English', tslr.english_sha],
      ['Russian', tslr.russian_sha],
      ['landed', tslr.landed_sha],
    ].forEach(([k, v]) => {
      d2.appendChild(el('dt', null, esc(k)));
      d2.appendChild(el('dd', null, esc(v)));
    });
    c.appendChild(d2);
    root.appendChild(c);
    const ul2 = el('ul', 'muted');
    (tslr.verification || []).forEach(v =>
      ul2.appendChild(el('li', null, esc(v))));
    root.appendChild(ul2);
  }

  /* --- the order ------------------------------------------------------- */
  root.appendChild(el('h2', 'sec', 'The order'));
  const t2 = el('table');
  t2.innerHTML = '<thead><tr><th class="mono">#</th><th>Step</th><th>Kind</th>' +
    '<th>State</th><th>Notes</th></tr></thead>';
  const tb2 = el('tbody');
  const pill = { done: 'on', blocked: 'off', ready: 'query' };
  steps.forEach(s => {
    const tr = el('tr');
    tr.innerHTML = '<td class="mono">' + esc(s.n) + '</td>' +
      '<td>' + esc(s.name) + '</td>' +
      '<td class="mono faint">' + esc(s.kind) + '</td>' +
      '<td><span class="pill ' + (pill[s.state] || 'no') + '">' +
      esc(s.state) + '</span></td>' +
      '<td class="muted">' + esc(s.note || '') + '</td>';
    tb2.appendChild(tr);
  });
  t2.appendChild(tb2);
  const sc2 = el('div', 'scroll'); sc2.appendChild(t2); root.appendChild(sc2);

  root.appendChild(el('div', 'note',
    'Updated ' + esc(String(b.updated || '').replace('T', ' ')) + '.'));
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
