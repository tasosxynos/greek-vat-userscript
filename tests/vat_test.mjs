// Tests for the pure (DOM-free) core of greek-vat-calc.user.js.
// Usage: node tests/vat_test.mjs     — no dependencies.
import fs from 'node:fs';

const SRC = new URL('../greek-vat-calc.user.js', import.meta.url);
const src = fs.readFileSync(SRC, 'utf8');
const m = src.match(/\/\/ #region pure([\s\S]*?)\/\/ #endregion pure/);
if (!m) { console.error('pure region not found in', SRC.pathname); process.exit(2); }

const { parseAmount, r2, fmtEUR, fmtPlain, blocks, EU, TOP, DEFAULT_SITES, normSite, parseSites, siteMatches, amountFromText } = new Function(
  m[1] + '\nreturn { parseAmount, r2, fmtEUR, fmtPlain, blocks, EU, TOP, DEFAULT_SITES, normSite, parseSites, siteMatches, amountFromText };'
)();
const isShopHost = (h) => siteMatches(h, DEFAULT_SITES);

let pass = 0, fail = 0;
const num = (x) => (Number.isNaN(x) ? 'NaN' : x);
function eq(label, got, want, tol = 1e-9) {
  const ok = (typeof want === 'number' && Number.isNaN(want))
    ? Number.isNaN(got)
    : (Math.abs(got - want) <= tol);
  if (ok) { pass++; } else { fail++; console.log(`FAIL ${label}: got ${num(got)} want ${num(want)}`); }
}
function eqs(label, got, want) {
  if (got === want) { pass++; } else { fail++; console.log(`FAIL ${label}: got ${JSON.stringify(got)} want ${JSON.stringify(want)}`); }
}

// ── parsing (Greek conventions) ─────────────────────────────────────────────
eq('1.234,56',        parseAmount('1.234,56'), 1234.56);
eq('1234,56',         parseAmount('1234,56'), 1234.56);
eq('1234.56',         parseAmount('1234.56'), 1234.56);
eq('1.234 (groups)',  parseAmount('1.234'), 1234);
eq('1.234.567',       parseAmount('1.234.567'), 1234567);
eq('1,5',             parseAmount('1,5'), 1.5);
eq('0,5',             parseAmount('0,5'), 0.5);
eq(',5',              parseAmount(',5'), 0.5);
eq('1234,',           parseAmount('1234,'), 1234);
eq('€ 1.234,56',      parseAmount('€ 1.234,56'), 1234.56);
eq('12 345',          parseAmount('12 345'), 12345);
eq('-1.500,00',       parseAmount('-1.500,00'), -1500);
eq('1,234.56 (US)',   parseAmount('1,234.56'), 1234.56);
eq('1,234,567',       parseAmount('1,234,567'), 1234567);
eq('abc -> NaN',      parseAmount('abc'), NaN);
eq('empty -> NaN',    parseAmount(''), NaN);
eq('24% text',        parseAmount('24%'), 24);

// ── VAT maths ───────────────────────────────────────────────────────────────
const b1000 = blocks(1000, 24);
eq('1000 gross -> net',   b1000.withVat.net, 806.45);
eq('1000 gross -> vat',   b1000.withVat.vat, 193.55);
eq('1000 gross -> total', b1000.withVat.total, 1000);
eq('1000 net -> vat',     b1000.noVat.vat, 240);
eq('1000 net -> total',   b1000.noVat.total, 1240);
eq('124 gross -> net 100', blocks(124, 24).withVat.net, 100);
const b13 = blocks(13, 13);
eq('13 gross @13 -> vat', b13.withVat.vat, 1.5);
eq('13 gross @13 -> net', b13.withVat.net, 11.5);
eq('13 gross sum',        b13.withVat.net + b13.withVat.vat, 13);
eq('100 net @6',          blocks(100, 6).noVat.vat, 6);
eq('rounding 0.01',       blocks(0.01, 24).withVat.vat, 0);
eq('sum consistency 33,33', r2(blocks(33.33, 24).withVat.net + blocks(33.33, 24).withVat.vat), 33.33);
// per-country: gross prices whose net is a round 100
eq('119 gross @19 (DE) -> net', blocks(119, 19).withVat.net, 100);
eq('121 gross @21 (ES) -> net', blocks(121, 21).withVat.net, 100);
eq('122 gross @22 (IT) -> net', blocks(122, 22).withVat.net, 100);
eq('127 gross @27 (HU) -> net', blocks(127, 27).withVat.net, 100);
eq('117 gross @17 (LU) -> net', blocks(117, 17).withVat.net, 100);

// ── formatting ──────────────────────────────────────────────────────────────
eqs('fmtEUR 1234.56',  fmtEUR(1234.56), '1.234,56 €');
eqs('fmtEUR 1000',     fmtEUR(1000), '1.000,00 €');
eqs('fmtPlain 1234.5', fmtPlain(1234.5), '1234,50');
eqs('fmtPlain 1000',   fmtPlain(1000), '1000,00');

// ── EU country/rate table ───────────────────────────────────────────────────
const EU27 = ['AT','BE','BG','HR','CY','CZ','DK','EE','FI','FR','DE','GR','HU','IE','IT','LV','LT','LU','MT','NL','PL','PT','RO','SK','SI','ES','SE'];
eqs('EU has 27 entries', EU.length, 27);
eqs('EU codes unique', new Set(EU.map((c) => c[0])).size, 27);
eqs('EU codes = EU27 set', EU.map((c) => c[0]).slice().sort().join(','), EU27.slice().sort().join(','));
eqs('TOP[0] is Greece', TOP[0], 'GR');
eqs('TOP size 7', TOP.length, 7);
eqs('TOP all exist in EU', TOP.every((cc) => EU.some((c) => c[0] === cc)), true);
for (const [cc, name, std, reduced] of EU) {
  eqs(`${cc} name is Greek`, /^[\u0370-\u03ff\u1f00-\u1fff ]+$/.test(name), true);
  eqs(`${cc} standard 15..30`, std >= 15 && std <= 30, true);
  eqs(`${cc} reduced rates sane`, reduced.every((r) => r > 0 && r < std), true);
}
const byCc = Object.fromEntries(EU.map((c) => [c[0], c]));
eqs('GR 24 / 13,6,4', [byCc.GR[2], byCc.GR[3].join(',')].join('|'), '24|13,6,4');
eqs('DE 19 / 7',      [byCc.DE[2], byCc.DE[3].join(',')].join('|'), '19|7');
eqs('IT 22 / 10,5,4', [byCc.IT[2], byCc.IT[3].join(',')].join('|'), '22|10,5,4');
eqs('ES 21 / 10,4',   [byCc.ES[2], byCc.ES[3].join(',')].join('|'), '21|10,4');
eqs('FR 20 / 10,5.5,2.1', [byCc.FR[2], byCc.FR[3].join(',')].join('|'), '20|10,5.5,2.1');
eqs('NL 21 / 9',      [byCc.NL[2], byCc.NL[3].join(',')].join('|'), '21|9');
eqs('PL 23 / 8,5',    [byCc.PL[2], byCc.PL[3].join(',')].join('|'), '23|8,5');
eqs('FI 25.5 / 14,10', [byCc.FI[2], byCc.FI[3].join(',')].join('|'), '25.5|14,10');
eqs('EE 24',          byCc.EE[2], 24);
eqs('RO 21',          byCc.RO[2], 21);
eqs('SK 23',          byCc.SK[2], 23);
eqs('HU highest (27)', Math.max(...EU.map((c) => c[2])), 27);
eqs('LU lowest (17)',  Math.min(...EU.map((c) => c[2])), 17);

// ── site list (default = e-shops) ────────────────────────────────────────────────────────
eqs('shop www.skroutz.gr',    isShopHost('www.skroutz.gr'), true);
eqs('shop bestprice.gr',      isShopHost('bestprice.gr'), true);
eqs('shop www.e-shop.gr',     isShopHost('www.e-shop.gr'), true);
eqs('shop skroutz.gr apex',   isShopHost('skroutz.gr'), true);
eqs('shop www.amazon.de',     isShopHost('www.amazon.de'), true);
eqs('shop smile.amazon.co.uk', isShopHost('smile.amazon.co.uk'), true);
eqs('shop de.aliexpress.com', isShopHost('de.aliexpress.com'), true);
eqs('shop www.temu.com',      isShopHost('www.temu.com'), true);
eqs('shop www.ikea.gr',       isShopHost('www.ikea.gr'), true);
eqs('shop www.mediamarkt.de', isShopHost('www.mediamarkt.de'), true);
eqs('not shop example.com',   isShopHost('example.com'), false);
eqs('not shop 127.0.0.1',     isShopHost('127.0.0.1'), false);
eqs('not shop medium.com',    isShopHost('medium.com'), false);
eqs('not shop google.gr',     isShopHost('www.google.gr'), false);
eqs('not shop notaskroutz.gr', isShopHost('notaskroutz.gr'), false);
eqs('not shop amazonia.com',  isShopHost('amazonia.com'), false);
eqs('not shop my-amazon.de',  isShopHost('my-amazon.de'), false);
eqs('not shop empty',         isShopHost(''), false);
eqs('not shop undefined',     isShopHost(undefined), false);

// ── user site list: normalisation / parsing ─────────────────────────────────
eqs('norm full URL',        normSite('https://www.Skroutz.gr/c/12?x=1#a'), 'skroutz.gr');
eqs('norm port',            normSite('localhost:8080'), 'localhost');
eqs('norm wildcard',        normSite('*.example.com'), 'example.com');
eqs('norm brand. kept',     normSite('amazon.'), 'amazon.');
eqs('norm blank',           normSite('   '), '');
eqs('parse lines/commas',   parseSites('skroutz.gr\n https://www.amazon.de/x , ebay.\n\n').join('|'), 'skroutz.gr|amazon.de|ebay.');
eqs('parse comments',       parseSites('# my shops\nshop.gr  # the good one').join('|'), 'shop.gr');
eqs('parse dedupe',         parseSites('a.gr\nwww.a.gr\nA.GR').join('|'), 'a.gr');
eqs('match subdomain',      siteMatches('m.shop.gr', ['shop.gr']), true);
eqs('match pasted URL',     siteMatches('www.shop.gr', ['https://shop.gr/']), true);
eqs('no match lookalike',   siteMatches('myshop.gr', ['shop.gr']), false);
eqs('no match empty list',  siteMatches('shop.gr', []), false);
eqs('regex chars escaped',  siteMatches('axb.com', ['a+b.com']), false);

// ── price from selected page text (Alt+Q with a selection) ──────────────────
eq('sel plain price',        amountFromText('1.299,00 €'), 1299);
eq('sel with label',         amountFromText('Τιμή: 1.299,00 €'), 1299);
eq('sel currency wins',      amountFromText('2 x 19,99€'), 19.99);
eq('sel installments',       amountFromText('3 άτοκες δόσεις των 433,00 €'), 433);
eq('sel US format',          amountFromText('€1,299.00'), 1299);
eq('sel first of two',       amountFromText('Αρχική 1.499,00 € Τελική 1.299,00 €'), 1499);
eq('sel space thousands',    amountFromText('12 345 EUR'), 12345);
eq('sel no currency',        amountFromText('24,90'), 24.9);
eq('sel long digits',        amountFromText('12345,67'), 12345.67);
eq('sel nbsp before €',      amountFromText('89,90\u00A0€'), 89.9);
eq('sel no number',          amountFromText('Προσθήκη στο καλάθι'), NaN);
eq('sel empty',              amountFromText(''), NaN);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
