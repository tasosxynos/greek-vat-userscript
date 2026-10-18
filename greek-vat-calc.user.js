// ==UserScript==
// @name         QuickVAT
// @name:en      QuickVAT
// @namespace    axynos.local.fpa
// @version      2.0.0
// @description  Αριθμομηχανή ΦΠΑ (Ελλάδα + όλη η ΕΕ): γράψε ένα ποσό και βλέπεις αμέσως Καθαρό / ΦΠΑ / Σύνολο. Εμφανίζεται μόνο στα sites που διαλέγεις (ή παντού)· Alt+Q την ανοίγει σε κάθε σελίδα, κλικ σε μια τιμή την αντιγράφει.
// @author       Anastasios Xynos (tasosxynos)
// @license      MIT
// @homepageURL  https://github.com/tasosxynos/greek-vat-userscript
// @supportURL   https://github.com/tasosxynos/greek-vat-userscript/issues
// @downloadURL  https://raw.githubusercontent.com/tasosxynos/greek-vat-userscript/main/greek-vat-calc.user.js
// @updateURL    https://raw.githubusercontent.com/tasosxynos/greek-vat-userscript/main/greek-vat-calc.user.js
// @match        *://*/*
// @run-at       document-idle
// @noframes
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_registerMenuCommand
// @grant        GM_unregisterMenuCommand
// ==/UserScript==

(function () {
  'use strict';

  // ─── ρυθμίσεις ────────────────────────────────────────────────────────────
  // Τα sites, «μόνο στη λίστα ή παντού» και η γρήγορη πληκτρολόγηση αλλάζουν από το ⚙
  // του πλαισίου ή από το μενού του Tampermonkey (αρχική λίστα: DEFAULT_SITES, πιο κάτω).
  const HOTKEY = { alt: true, code: 'KeyQ' }; // Alt+Q → άνοιγμα + εστίαση στο ποσό, σε κάθε σελίδα

  if (document.querySelector('quickvat-root')) return; // no double injection

  // #region pure
  // ─── ΦΠΑ στην ΕΕ: [κωδικός, χώρα, βασικός συντελεστής, [μειωμένοι]] ───────
  // Κατάσταση: Ιαν 2026. Ο βασικός είναι αυτός που ζητάς συνήθως· οι μειωμένοι
  // ισχύουν μόνο για συγκεκριμένα αγαθά/υπηρεσίες (και τα πολύ χαμηλά, π.χ. 2,1%
  // Γαλλία / 3% Λουξεμβούργο / 4% Ισπανία-Ιταλία, είναι «υπέρ-μειωμένοι»).
  // Πηγή: πίνακες ΕΕ (TEDB / taxation-customs.ec.europa.eu).
  const EU = [
    ['AT', 'Αυστρία', 20, [13, 10]],
    ['BE', 'Βέλγιο', 21, [12, 6]],
    ['BG', 'Βουλγαρία', 20, [9]],
    ['FR', 'Γαλλία', 20, [10, 5.5, 2.1]],
    ['DE', 'Γερμανία', 19, [7]],
    ['DK', 'Δανία', 25, []],
    ['GR', 'Ελλάδα', 24, [13, 6, 4]],
    ['EE', 'Εσθονία', 24, [13, 9]],
    ['IE', 'Ιρλανδία', 23, [13.5, 9, 4.8]],
    ['ES', 'Ισπανία', 21, [10, 4]],
    ['IT', 'Ιταλία', 22, [10, 5, 4]],
    ['HR', 'Κροατία', 25, [13, 5]],
    ['CY', 'Κύπρος', 19, [9, 5]],
    ['LV', 'Λετονία', 21, [12, 5]],
    ['LT', 'Λιθουανία', 21, [12, 5]],
    ['LU', 'Λουξεμβούργο', 17, [14, 8, 3]],
    ['MT', 'Μάλτα', 18, [7, 5]],
    ['NL', 'Ολλανδία', 21, [9]],
    ['HU', 'Ουγγαρία', 27, [18, 5]],
    ['PL', 'Πολωνία', 23, [8, 5]],
    ['PT', 'Πορτογαλία', 23, [13, 6]],
    ['RO', 'Ρουμανία', 21, [11]],
    ['SK', 'Σλοβακία', 23, [19, 5]],
    ['SI', 'Σλοβενία', 22, [9.5, 5]],
    ['SE', 'Σουηδία', 25, [12, 6]],
    ['CZ', 'Τσεχία', 21, [12]],
    ['FI', 'Φινλανδία', 25.5, [14, 10]],
  ];
  // σειρά των «συχνών αγορών» στην κορυφή της λίστας (Ελλάδα + μεγάλες αγορές)
  const TOP = ['GR', 'DE', 'IT', 'ES', 'FR', 'NL', 'PL'];

  // ─── sites: η αρχική λίστα (μετά την αλλάζεις από το ⚙) ──────────────────
  // 'skroutz.gr' πιάνει και κάθε subdomain· ό,τι τελειώνει σε '.' σημαίνει «κάθε κατάληξη»:
  // 'amazon.' → amazon.de, amazon.co.uk …
  const DEFAULT_SITES = [
    // Ελληνικά
    'skroutz.gr', 'bestprice.gr', 'e-shop.gr', 'plaisio.gr', 'kotsovolos.gr',
    'public.gr', 'mediamarkt.gr', 'germanos.gr', 'you.gr', 'shopflix.gr',
    // Διεθνή
    'amazon.', 'ebay.', 'aliexpress.', 'temu.', 'shein.', 'zalando.', 'ikea.',
    'mediamarkt.', 'saturn.de', 'decathlon.', 'alibaba.com', 'banggood.com',
    'walmart.com', 'etsy.com', 'zara.com',
  ];
  // ό,τι κι αν επικολλήσεις (https://www.Skroutz.gr/c/12 …) → 'skroutz.gr'
  function normSite(s) {
    return String(s == null ? '' : s).trim().toLowerCase()
      .replace(/^[a-z][a-z0-9+.-]*:\/\//, '').replace(/[/?#:].*$/, '')
      .replace(/^\*\./, '').replace(/^www\./, '');
  }
  // κείμενο του ⚙ (γραμμές / κόμματα, '#' = σχόλιο) → καθαρή λίστα χωρίς διπλά
  function parseSites(text) {
    const items = String(text || '').split('\n').map((l) => l.replace(/#.*/, '')).join(' ').split(/[\s,;]+/);
    return [...new Set(items.map(normSite).filter(Boolean))];
  }
  const siteRe = (s) => new RegExp('(^|\\.)' + s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + (s.endsWith('.') ? '' : '$'), 'i');
  function siteMatches(host, sites) {
    const h = String(host || '').toLowerCase();
    return !!h && sites.some((s) => { s = normSite(s); return !!s && siteRe(s).test(h); });
  }

  // ─── αριθμοί: ελληνική σύμβαση — ',' δεκαδικό, '.' χιλιάδες ──────────────
  function parseAmount(raw) {
    if (raw == null) return NaN;
    let s = String(raw).trim().replace(/[€\s ]/g, '').replace(/[^0-9.,-]/g, '');
    if (!s) return NaN;
    const lc = s.lastIndexOf(','), ld = s.lastIndexOf('.');
    if (lc > -1 && ld > -1) {              // και τα δύο → δεκαδικό είναι το δεξιότερο
      const decIsComma = lc > ld;
      s = s.split(decIsComma ? '.' : ',').join('');
      if (decIsComma) s = s.replace(',', '.');
    } else if (lc > -1) {                  // μόνο κόμματα
      const p = s.split(',');
      s = p.length > 2 ? p.join('') : p[0] + '.' + p[1];
    } else if (ld > -1) {                  // μόνο τελείες: 1.234 / 1.234.567 = ομάδες χιλιάδων
      if (/^-?\d{1,3}(\.\d{3})+$/.test(s)) s = s.split('.').join('');
    }
    const v = parseFloat(s);
    return Number.isFinite(v) ? v : NaN;
  }

  // τιμή μέσα σε επιλεγμένο κείμενο («Τιμή: 1.299,00 €», «2 x 19,99€») →
  // η πρώτη με νόμισμα δίπλα της, αλλιώς ο πρώτος αριθμός
  function amountFromText(text) {
    const t = String(text || '').slice(0, 500);
    const re = /\d{1,3}(?:[.,   ]\d{3})+(?:[.,]\d{1,2})?(?!\d)|\d+(?:[.,]\d{1,2})?/g;
    let first = null, m;
    while ((m = re.exec(t))) {
      const end = m.index + m[0].length;
      if (/[€$£]|eur/i.test(t.slice(Math.max(0, m.index - 4), m.index) + '|' + t.slice(end, end + 5))) return parseAmount(m[0]);
      if (first == null) first = m[0];
    }
    return first == null ? NaN : parseAmount(first);
  }

  const r2 = (x) => Math.round((x + Number.EPSILON) * 100) / 100;
  const NF = new Intl.NumberFormat('el-GR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const fmtEUR = (x) => NF.format(x) + ' €';
  const fmtPlain = (x) => x.toFixed(2).replace('.', ',');   // για επικόλληση: 1000,00

  function blocks(amount, ratePct) {
    const a = r2(amount), r = ratePct / 100;
    const vatOf = r2(a - a / (1 + r));       // το ποσό είναι ΜΕ ΦΠΑ
    const netOf = r2(a - vatOf);
    const vatAdd = r2(a * r);                // το ποσό είναι ΧΩΡΙΣ ΦΠΑ
    const grossOf = r2(a + vatAdd);
    return {
      withVat: { net: netOf, vat: vatOf, total: a },
      noVat:   { net: a,     vat: vatAdd, total: grossOf },
    };
  }
  // #endregion pure

  // ─── αποθήκευση ρυθμίσεων ─────────────────────────────────────────────────
  function sget(k, d) {
    try {
      if (typeof GM_getValue === 'function') return GM_getValue(k, d);
      const v = localStorage.getItem('fpa.' + k);
      return v == null ? d : JSON.parse(v);
    } catch (e) { return d; }
  }
  function sset(k, v) {
    try {
      if (typeof GM_setValue === 'function') GM_setValue(k, v);
      else localStorage.setItem('fpa.' + k, JSON.stringify(v));
    } catch (e) { /* ignore */ }
  }

  // mode 'sites' = μόνο στα sites της λίστας · 'all' = παντού (ανοιχτό μόνο του στη λίστα)
  const cfg = {};
  function loadCfg() {
    const sites = sget('sites', null);
    cfg.mode = sget('mode', 'sites') === 'all' ? 'all' : 'sites';
    cfg.sites = Array.isArray(sites) ? sites : DEFAULT_SITES.slice();
    cfg.quickType = sget('quickType', true) !== false;
  }
  loadCfg();
  const HOST = location.hostname;
  const HERE = normSite(HOST);
  const listed = () => siteMatches(HOST, cfg.sites);
  const enabledHere = () => cfg.mode === 'all' || listed();

  let ui = null;                             // το πλαίσιο φτιάχνεται μόνο όταν χρειαστεί

  // φέρνει τη σελίδα στην τρέχουσα ρύθμιση· openNew = ανοιχτό ή όχι, αν φτιαχτεί τώρα
  function sync(openNew) {
    registerMenu();
    if (!ui) { if (enabledHere()) ui = mount(openNew); }
    else if (!enabledHere() && !ui.isOpen()) ui.destroy();
    else ui.refresh();
  }

  function changed() {
    sset('mode', cfg.mode);
    sset('sites', cfg.sites);
    sset('quickType', cfg.quickType);
    sync(true);
  }

  function toggleHere(fromMenu) {
    if (listed()) cfg.sites = cfg.sites.filter((s) => !siteMatches(HOST, [s]));
    else cfg.sites = [...cfg.sites, HERE];
    changed();
    if (fromMenu && ui && !enabledHere()) ui.destroy();   // «απενεργοποίηση εδώ» → φεύγει αμέσως
  }

  function summon() {
    if (!ui) ui = mount(true);
    else ui.open();
    ui.focus();
  }

  // το κείμενο που έχεις επιλέξει στη σελίδα (και μέσα σε πεδίο της σελίδας)
  function pageSelection() {
    const a = document.activeElement;
    if (a && a.tagName === 'QUICKVAT-ROOT') return '';      // είσαι ήδη στο πλαίσιο
    if (a && (a.tagName === 'INPUT' || a.tagName === 'TEXTAREA')) {
      try { return a.value.slice(a.selectionStart, a.selectionEnd); } catch (e) { return ''; }
    }
    return String(window.getSelection() || '');
  }

  // ─── μενού Tampermonkey ───────────────────────────────────────────────────
  let menuId = null;
  function registerMenu() {
    if (typeof GM_registerMenuCommand !== 'function' || !HERE) return;
    if (menuId != null) {
      if (typeof GM_unregisterMenuCommand !== 'function') return;
      GM_unregisterMenuCommand(menuId);
    }
    const on = listed();
    const label = cfg.mode === 'all'
      ? (on ? '✓ Ανοίγει μόνο του στο ' : '＋ Να ανοίγει μόνο του στο ')
      : (on ? '✓ Ενεργό στο ' : '＋ Ενεργοποίηση στο ');
    menuId = GM_registerMenuCommand(label + HERE + (on ? '  (κλικ = όχι)' : ''), () => toggleHere(true));
  }

  // ─── UI ───────────────────────────────────────────────────────────────────
  const CSS = `
    :host { all: initial; }
    :where(.wrap, .wrap *) { box-sizing: border-box; margin: 0; padding: 0; font: inherit; color: inherit; }   /* χωρίς βάρος: νικάει κάθε κανόνας από κάτω */
    .wrap {
      --bg: #fff; --bg2: #f2f4f7; --fg: #1a1d22; --mute: #69717d; --line: rgba(0,0,0,.1);
      --acc: #2563eb; --on-acc: #fff; --acc-bg: rgba(37,99,235,.1); --ok: #15803d; --bad: #dc2626;
      --shadow: 0 12px 32px rgba(0,0,0,.16), 0 2px 6px rgba(0,0,0,.08);
      color-scheme: light;
      position: fixed; right: 16px; bottom: 16px; z-index: 2147483646;   /* κάτω από το QuickLimits */
      font: 13px/1.35 ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif;
      color: var(--fg); text-align: left; direction: ltr;
    }
    @media (prefers-color-scheme: dark) {
      .wrap {
        --bg: #17191e; --bg2: #22252c; --fg: #e8eaee; --mute: #959ca8; --line: rgba(255,255,255,.12);
        --acc: #60a5fa; --on-acc: #0b1626; --acc-bg: rgba(96,165,250,.15); --ok: #4ade80; --bad: #f87171;
        --shadow: 0 12px 32px rgba(0,0,0,.55); color-scheme: dark;
      }
    }
    button, select { cursor: pointer; background: none; border: 0; }
    .num { font-variant-numeric: tabular-nums; white-space: nowrap; }

    .pill {
      display: none; align-items: center; gap: 6px; padding: 7px 12px; border-radius: 999px;
      background: var(--bg); border: 1px solid var(--line); box-shadow: var(--shadow);
      font-weight: 700; touch-action: none; user-select: none;
    }
    .pill .r { color: var(--acc); }
    .pill:hover { border-color: var(--acc); }
    .wrap:not(.open) .pill { display: inline-flex; }
    .wrap:not(.open) .panel { display: none; }

    .panel { width: 304px; background: var(--bg); border: 1px solid var(--line); border-radius: 14px;
             box-shadow: var(--shadow); overflow: hidden; }
    header { display: flex; align-items: center; gap: 6px; padding: 7px 7px 7px 12px;
             border-bottom: 1px solid var(--line); cursor: grab; user-select: none; touch-action: none; }
    .title { font-weight: 700; }
    .grow { flex: 1 1 auto; }
    select { max-width: 140px; padding: 3px 6px; border: 1px solid var(--line); border-radius: 7px;
             background: var(--bg2); font-size: 12px; }
    .ib { width: 26px; height: 26px; border-radius: 7px; color: var(--mute); font-size: 15px; line-height: 26px; text-align: center; }
    .ib:hover, .ib.on { background: var(--bg2); color: var(--fg); }
    :focus-visible { outline: 2px solid var(--acc); outline-offset: 1px; }

    .view { padding: 10px 12px 12px; }
    .set, .wrap.settings .calc { display: none; }
    .wrap.settings .set { display: block; }

    .rates { display: flex; gap: 4px; margin-bottom: 8px; }
    .chip { flex: 1 1 0; padding: 4px 0; border: 1px solid var(--line); border-radius: 7px;
            color: var(--mute); font-size: 12px; font-weight: 600; }
    .chip:hover { color: var(--fg); }
    .chip.on { background: var(--acc); border-color: var(--acc); color: var(--on-acc); }

    .inrow { position: relative; }
    #amt { width: 100%; padding: 7px 10px 7px 32px; border: 1px solid transparent; border-radius: 9px;
           background: var(--bg2); font-size: 20px; font-weight: 600; text-align: right; outline: none; }
    #amt:focus { border-color: var(--acc); box-shadow: 0 0 0 3px var(--acc-bg); }
    #amt::placeholder { color: var(--mute); font-size: 14px; font-weight: 400; }
    #clr { position: absolute; left: 4px; top: 50%; transform: translateY(-50%); display: none; }
    .wrap.has #clr { display: block; }
    .hint { min-height: 16px; margin: 4px 2px 8px; color: var(--mute); font-size: 11.5px; }
    .hint.bad { color: var(--bad); }

    .cards { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
    .card { padding: 7px 8px 6px; border-radius: 10px; background: var(--bg2); min-width: 0; }
    .cap { margin: 0 0 3px 2px; color: var(--mute); font-size: 10.5px; font-weight: 600; text-transform: uppercase; letter-spacing: .4px; }
    .v { position: relative; display: flex; align-items: baseline; justify-content: space-between; gap: 4px;
         width: 100%; padding: 2px 3px; border-radius: 6px; text-align: left; }
    .v:hover { background: var(--acc-bg); }
    .v .lab { color: var(--mute); font-size: 11.5px; }
    .v.big { display: block; margin-bottom: 2px; }
    .v.big .lab { display: block; }
    .v.big .num { display: block; color: var(--acc); font-size: 16px; font-weight: 700; }
    .v.big.long .num { font-size: 13px; }
    .v.copied .lab { visibility: hidden; }
    .v.copied .num { color: var(--ok); }
    .v.copied::after { content: '✓ αντιγράφηκε'; position: absolute; top: 2px; left: 3px;
                       color: var(--ok); font-size: 11px; font-weight: 600; }
    .v.copied:not(.big)::after { content: '✓'; }

    .h { margin: 2px 0 5px; color: var(--mute); font-size: 10.5px; font-weight: 600; text-transform: uppercase; letter-spacing: .4px; }
    * + .h { margin-top: 10px; }
    .opt { display: flex; gap: 8px; align-items: flex-start; padding: 3px 0; cursor: pointer; }
    .opt input { margin-top: 2px; accent-color: var(--acc); }
    .opt small { display: block; color: var(--mute); font-size: 11px; }
    textarea { width: 100%; min-height: 104px; padding: 6px 8px; border: 1px solid var(--line); border-radius: 8px;
               background: var(--bg2); font: 12px/1.45 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; resize: vertical; }
    textarea:focus { outline: none; border-color: var(--acc); }
    .btn { padding: 6px 10px; border: 1px solid var(--line); border-radius: 8px; background: var(--bg2); font-weight: 600; }
    .btn:hover { border-color: var(--acc); }
    .btn.pri { background: var(--acc); border-color: var(--acc); color: var(--on-acc); }
    .btn.wide { width: 100%; margin-top: 8px; }
    .foot { display: flex; align-items: center; gap: 8px; margin-top: 10px; }
    .status { color: var(--ok); font-size: 11.5px; opacity: 0; transition: opacity .2s; }
    .status.show { opacity: 1; }
  `;

  const HTML = `
  <div class="wrap" lang="el">
    <button class="pill" id="pill" title="QuickVAT · Alt+Q"><span>ΦΠΑ</span><span class="r num" id="pillRate"></span></button>
    <div class="panel" role="dialog" aria-label="QuickVAT">
      <header id="hdr" title="Σύρε για μετακίνηση · διπλό κλικ = πίσω κάτω δεξιά">
        <span class="title">ΦΠΑ</span>
        <select id="cc" title="Χώρα" aria-label="Χώρα"></select>
        <span class="grow"></span>
        <button class="ib" id="gear" title="Ρυθμίσεις" aria-label="Ρυθμίσεις">⚙</button>
        <button class="ib" id="fold" title="Ελαχιστοποίηση (Esc / Alt+Q)" aria-label="Ελαχιστοποίηση">–</button>
      </header>
      <div class="view calc">
        <div class="rates" id="rates" role="radiogroup" aria-label="Συντελεστής ΦΠΑ"></div>
        <div class="inrow">
          <input id="amt" type="text" inputmode="decimal" autocomplete="off" spellcheck="false" placeholder="ποσό…" aria-label="Ποσό">
          <button class="ib" id="clr" title="Καθαρισμός" aria-label="Καθαρισμός">×</button>
        </div>
        <div class="hint num" id="hint"></div>
        <div class="cards">
          <div class="card">
            <div class="cap">Ποσό με ΦΠΑ</div>
            <button class="v big" data-k="net"><span class="lab">Καθαρό</span><span class="num">—</span></button>
            <button class="v" data-k="vin"><span class="lab">ΦΠΑ</span><span class="num">—</span></button>
          </div>
          <div class="card">
            <div class="cap">Ποσό χωρίς ΦΠΑ</div>
            <button class="v big" data-k="tot"><span class="lab">Σύνολο</span><span class="num">—</span></button>
            <button class="v" data-k="vout"><span class="lab">ΦΠΑ</span><span class="num">—</span></button>
          </div>
        </div>
      </div>
      <div class="view set">
        <div class="h">Πού εμφανίζεται</div>
        <label class="opt"><input type="radio" name="mode" value="sites">
          <span>Μόνο στα sites της λίστας<small>Αλλού δεν φορτώνει τίποτα· Alt+Q το ανοίγει όπου θες.</small></span></label>
        <label class="opt"><input type="radio" name="mode" value="all">
          <span>Σε όλα τα sites<small>Ως μικρό κουμπί· ανοίγει μόνο του στα sites της λίστας.</small></span></label>
        <button class="btn wide" id="here"></button>
        <div class="h">Sites</div>
        <textarea id="sites" spellcheck="false" aria-label="Sites, ένα ανά γραμμή"
          placeholder="ένα ανά γραμμή, π.χ.&#10;skroutz.gr&#10;amazon.   (= κάθε κατάληξη)"></textarea>
        <label class="opt"><input type="checkbox" id="qt">
          <span>Γρήγορη πληκτρολόγηση<small>Στα sites της λίστας, ένα ψηφίο στη σελίδα πάει κατευθείαν στο ποσό.</small></span></label>
        <div class="foot">
          <button class="btn" id="reset">Αρχική λίστα</button>
          <span class="status" id="status">✓ Αποθηκεύτηκε</span>
          <span class="grow"></span>
          <button class="btn pri" id="done">Τέλος</button>
        </div>
      </div>
    </div>
  </div>`;

  const country = (cc) => EU.find((c) => c[0] === cc) || EU.find((c) => c[0] === 'GR');
  const ratesOf = (cc) => { const c = country(cc); return [c[2], ...c[3]]; };
  const rateLabel = (r) => String(r).replace('.', ',') + '%';

  function el(tag, props) { return Object.assign(document.createElement(tag), props); }

  function mount(startOpen) {
    const ac = new AbortController();          // καθαρίζει τους listeners σελίδας στο destroy
    const host = document.createElement('quickvat-root');
    host.style.visibility = 'hidden';          // εμφανίζεται αφού μπει στη σωστή θέση
    const sh = host.attachShadow({ mode: 'open' });
    sh.innerHTML = '<style>' + CSS + '</style>' + HTML;

    const $ = (id) => sh.getElementById(id);
    const wrap = sh.querySelector('.wrap');
    const amt = $('amt'), ccSel = $('cc'), ratesEl = $('rates'), hint = $('hint'), sitesTa = $('sites');
    const valEls = [...sh.querySelectorAll('.v')];
    let cc = 'GR', rate = 24, vals = {};
    let customPos = false;                     // το έχεις μετακινήσει εσύ

    // ── χώρα / συντελεστής ──
    const gTop = el('optgroup', { label: 'Συχνές αγορές' });
    const gRest = el('optgroup', { label: 'Λοιπές χώρες ΕΕ' });
    TOP.forEach((code) => gTop.appendChild(el('option', { value: code, textContent: country(code)[1] })));
    EU.forEach((c) => { if (!TOP.includes(c[0])) gRest.appendChild(el('option', { value: c[0], textContent: c[1] })); });
    ccSel.append(gTop, gRest);

    function setCountry(code, wantRate) {
      cc = country(code)[0];
      ccSel.value = cc;
      const rates = ratesOf(cc);
      rate = rates.includes(wantRate) ? wantRate : rates[0];
      ratesEl.textContent = '';
      rates.forEach((r) => ratesEl.appendChild(el('button', {
        className: 'chip num' + (r === rate ? ' on' : ''), textContent: rateLabel(r), title: r === rates[0] ? 'βασικός' : 'μειωμένος',
        onclick: () => { setCountry(cc, r); sset('rate', r); render(); },
      })));
      $('pillRate').textContent = (cc === 'GR' ? '' : cc + ' ') + rateLabel(rate);
    }

    function render() {
      const raw = amt.value, v = parseAmount(raw), ok = Number.isFinite(v), has = raw.trim() !== '';
      wrap.classList.toggle('has', has);
      hint.textContent = ok ? '= ' + fmtEUR(v) : has ? 'Δεν αναγνωρίζεται ως ποσό' : 'Επίλεξε μια τιμή + Alt+Q · κλικ = αντιγραφή';
      hint.classList.toggle('bad', has && !ok);
      const b = ok ? blocks(v, rate) : null;
      vals = b ? { net: b.withVat.net, vin: b.withVat.vat, tot: b.noVat.total, vout: b.noVat.vat } : {};
      for (const e of valEls) {
        const x = vals[e.dataset.k], t = x == null ? '—' : fmtEUR(x);
        e.lastElementChild.textContent = t;
        e.classList.toggle('long', t.length > 13);
      }
    }

    async function copy(e) {
      const x = vals[e.dataset.k];
      if (x == null) return;
      const txt = fmtPlain(x);
      try {
        await navigator.clipboard.writeText(txt);
      } catch (_) {
        const ta = el('textarea', { value: txt });
        ta.style.cssText = 'position:fixed;top:-1000px;opacity:0;';
        document.body.appendChild(ta);
        ta.select();
        try { document.execCommand('copy'); } catch (__) { /* ignore */ }
        ta.remove();
      }
      valEls.forEach((o) => o.classList.remove('copied'));
      e.classList.add('copied');
      clearTimeout(copy.t);
      copy.t = setTimeout(() => e.classList.remove('copied'), 1200);
    }

    // ── θέση / σύμπτυξη ──
    function place(x, y) {
      x = Math.min(Math.max(0, x), Math.max(0, window.innerWidth - 40));
      y = Math.min(Math.max(0, y), Math.max(0, window.innerHeight - 24));
      Object.assign(wrap.style, { left: x + 'px', top: y + 'px', right: 'auto', bottom: 'auto' });
      customPos = true;                        // θέση διαλεγμένη με το χέρι → μένει εκεί
    }
    function dock() {
      customPos = false;
      Object.assign(wrap.style, { left: '', top: '', right: '', bottom: '' });
      sset('x', null);
      sset('y', null);
    }
    const isOpen = () => wrap.classList.contains('open');
    // Στην προεπιλεγμένη θέση (κάτω δεξιά) ανοίγει προς τα πάνω· σε θέση που διάλεξες,
    // η πάνω-αριστερή γωνία μένει σταθερή — μόνο αν βγει έξω από την οθόνη μαζεύεται.
    function setOpen(open, save) {
      if (!open && !enabledHere()) { destroy(); return; }   // ανοίχτηκε με Alt+Q εκτός λίστας → φεύγει
      if (open !== isOpen()) {
        if (!open && sh.activeElement) sh.activeElement.blur();
        wrap.classList.toggle('open', open);
        if (!open) showSettings(false);
        if (customPos) {
          const n = wrap.getBoundingClientRect();
          if (n.bottom > window.innerHeight - 4) wrap.style.top = Math.max(0, window.innerHeight - n.height - 12) + 'px';
          if (n.right > window.innerWidth - 4) wrap.style.left = Math.max(0, window.innerWidth - n.width - 12) + 'px';
        }
        if (save && listed()) sset('open', open);
      }
    }

    // ── μεταφορά (από την μπάρα ή το κουμπί) ──
    // Κανένας listener κίνησης ποντικιού: μπαίνουν μόνο όσο κρατάς πατημένο, και φεύγουν μετά.
    let drag = null, dragged = false;
    function dragStart(e) {
      if (e.button !== 0 || e.target.closest('select, .ib')) return;
      const r = wrap.getBoundingClientRect(), h = e.currentTarget;
      drag = { x: e.clientX, y: e.clientY, l: r.left, t: r.top, moved: false, h };
      h.setPointerCapture(e.pointerId);
      h.addEventListener('pointermove', dragMove);
      h.addEventListener('pointerup', dragEnd);
      h.addEventListener('pointercancel', dragEnd);
      e.preventDefault();
    }
    function dragMove(e) {
      if (!drag) return;
      const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
      if (!drag.moved && Math.hypot(dx, dy) < 4) return;
      drag.moved = true;
      place(drag.l + dx, drag.t + dy);
    }
    function dragEnd() {
      if (!drag) return;
      drag.h.removeEventListener('pointermove', dragMove);
      drag.h.removeEventListener('pointerup', dragEnd);
      drag.h.removeEventListener('pointercancel', dragEnd);
      if (drag.moved) {
        sset('x', parseFloat(wrap.style.left) || 0);
        sset('y', parseFloat(wrap.style.top) || 0);
        dragged = true;                        // να μην μετρήσει ως κλικ στο κουμπί
        setTimeout(() => { dragged = false; });
      }
      drag = null;
    }
    $('hdr').addEventListener('pointerdown', dragStart);
    $('pill').addEventListener('pointerdown', dragStart);
    $('hdr').addEventListener('dblclick', (e) => { if (!e.target.closest('select, .ib')) dock(); });
    window.addEventListener('resize', () => {
      if (customPos) place(parseFloat(wrap.style.left), parseFloat(wrap.style.top));
    }, { signal: ac.signal });
    document.addEventListener('fullscreenchange', () => {
      host.style.display = document.fullscreenElement ? 'none' : '';
    }, { signal: ac.signal });

    // ── ρυθμίσεις ──
    const modeEls = [...sh.querySelectorAll('input[name=mode]')];
    let statusT, resetArmed = false;
    function saved() {
      changed();
      const s = $('status');
      s.classList.add('show');
      clearTimeout(statusT);
      statusT = setTimeout(() => s.classList.remove('show'), 1400);
    }
    function refresh() {
      if (!wrap.classList.contains('settings')) return;
      modeEls.forEach((r) => { r.checked = r.value === cfg.mode; });
      if (sh.activeElement !== sitesTa) sitesTa.value = cfg.sites.join('\n');
      $('qt').checked = cfg.quickType;
      const here = $('here'), on = listed();
      here.hidden = !HERE;
      here.textContent = (on ? '−  Αφαίρεση του ' : '＋  Προσθήκη του ') + HERE;
      here.classList.toggle('pri', !on);
    }
    function commitSites() {
      const next = parseSites(sitesTa.value);
      if (next.join('\n') !== cfg.sites.join('\n')) { cfg.sites = next; saved(); }
    }
    function showSettings(show) {
      if (!show && wrap.classList.contains('settings')) commitSites();
      wrap.classList.toggle('settings', show);
      $('gear').classList.toggle('on', show);
      resetArmed = false;
      $('reset').textContent = 'Αρχική λίστα';
      refresh();
    }
    modeEls.forEach((r) => r.addEventListener('change', () => { cfg.mode = r.value; saved(); }));
    $('qt').addEventListener('change', (e) => { cfg.quickType = e.target.checked; saved(); });
    sitesTa.addEventListener('change', commitSites);
    $('here').addEventListener('click', () => { commitSites(); toggleHere(false); });
    $('reset').addEventListener('click', (e) => {
      if (!resetArmed) { resetArmed = true; e.target.textContent = 'Σίγουρα;'; return; }  // δεύτερο κλικ = επαναφορά
      cfg.sites = DEFAULT_SITES.slice();
      sitesTa.value = cfg.sites.join('\n');
      resetArmed = false;
      e.target.textContent = 'Αρχική λίστα';
      saved();
    });
    $('done').addEventListener('click', () => { showSettings(false); amt.focus(); });
    $('gear').addEventListener('click', () => showSettings(!wrap.classList.contains('settings')));

    // ── πλήκτρα / πεδίο ──
    // Ό,τι πληκτρολογείς στο πλαίσιο δεν φτάνει στη σελίδα (shortcuts π.χ. YouTube, Gmail).
    ['keydown', 'keyup', 'keypress', 'input'].forEach((ev) => wrap.addEventListener(ev, (e) => {
      e.stopPropagation();
      if (ev === 'keydown' && e.key === 'Escape') {
        if (wrap.classList.contains('settings')) { showSettings(false); amt.focus(); } else setOpen(false, true);
      }
    }));
    amt.addEventListener('input', render);
    amt.addEventListener('focus', () => amt.select());
    $('clr').addEventListener('click', () => { amt.value = ''; render(); amt.focus(); });
    ccSel.addEventListener('change', () => {
      setCountry(ccSel.value);                 // νέα χώρα → ο βασικός της συντελεστής
      sset('cc', cc);
      sset('rate', rate);
      render();
    });
    $('fold').addEventListener('click', () => setOpen(false, true));
    $('pill').addEventListener('click', () => { if (!dragged) { setOpen(true, true); amt.focus(); } });
    valEls.forEach((e) => e.addEventListener('click', () => copy(e)));

    function destroy() {
      ac.abort();
      host.remove();
      if (ui === api) ui = null;
    }

    // ── τοποθέτηση ──
    document.documentElement.appendChild(host);
    setCountry(String(sget('cc', 'GR')), Number(sget('rate', NaN)));
    render();
    wrap.classList.toggle('open', !!startOpen);
    const sx = sget('x', null), sy = sget('y', null);
    if (sx != null && sy != null) place(sx, sy);
    host.style.visibility = '';

    const api = {
      isOpen, refresh, destroy,
      open: () => setOpen(true, false),
      focus: () => amt.focus(),
      close: () => setOpen(false, true),
      focused: () => document.activeElement === host,
      fill: (v) => {
        setOpen(true, false);
        showSettings(false);
        amt.value = NF.format(v);
        render();
        hint.textContent += ' · από την επιλογή';
        amt.focus();
        amt.select();                          // γράψε από πάνω για άλλο ποσό
      },
      settings: () => { setOpen(true, false); showSettings(true); },
      type: (k) => { setOpen(true, false); amt.focus(); amt.value = k; render(); },
    };
    return api;
  }

  // ─── εκκίνηση ─────────────────────────────────────────────────────────────
  // Εκτός λίστας (σε «μόνο στη λίστα») δεν φτιάχνεται τίποτα: μόνο το Alt+Q και το μενού.
  // Όλα γίνονται όταν η καρτέλα φαίνεται: μια καρτέλα που άνοιξε στο παρασκήνιο δεν φτιάχνει
  // τίποτα μέχρι να πας σε αυτήν, και κάθε φορά που επιστρέφεις ξαναδιαβάζει τις ρυθμίσεις
  // (αν άλλαξες τη λίστα σε άλλη καρτέλα, ισχύει κι εδώ).
  const startOpen = () => listed() && sget('open', true) !== false;
  if (!document.hidden) sync(startOpen());
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) return;
    loadCfg();
    sync(startOpen());
  });

  document.addEventListener('keydown', (e) => {
    if (e.altKey === HOTKEY.alt && !e.ctrlKey && !e.metaKey && e.code === HOTKEY.code) {
      e.preventDefault();
      e.stopPropagation();
      const v = amountFromText(pageSelection());
      if (Number.isFinite(v)) { summon(); ui.fill(v); }           // επιλεγμένη τιμή → μπαίνει στο πεδίο
      else if (ui && ui.isOpen() && ui.focused()) ui.close();     // ξανά Alt+Q μέσα στο πλαίσιο → ελαχιστοποίηση
      else summon();
      return;
    }
    // γρήγορη πληκτρολόγηση: ψηφίο πάνω στη σελίδα (χωρίς focus κάπου) → πάει στο πεδίο
    if (!ui || !cfg.quickType || !listed() || e.ctrlKey || e.altKey || e.metaKey || e.defaultPrevented) return;
    if (e.target !== document.body && e.target !== document.documentElement) return;
    if (!/^[0-9]$/.test(e.key) && e.key !== ',' && e.key !== '.') return;
    e.preventDefault();
    ui.type(e.key);
  }, true);

  if (typeof GM_registerMenuCommand === 'function') {
    GM_registerMenuCommand('⚙  Ρυθμίσεις QuickVAT', () => { summon(); ui.settings(); });
  }
})();
