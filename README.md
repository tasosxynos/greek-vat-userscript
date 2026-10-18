# QuickVAT — ΦΠΑ / EU VAT userscript

A small VAT (ΦΠΑ) calculator for the bottom-right corner of the sites you choose: type an
amount and instantly see **Καθαρό / ΦΠΑ / Σύνολο** — for **all 27 EU countries**
(Greek 24 / 13 / 6 / 4 % by default). Light and dark theme follow your system.

![screenshot](assets/screenshot.png)

No network calls, no analytics, no page modification — one shadow-DOM panel, and only
on the sites in your list.

## Install

1. Install [Tampermonkey](https://www.tampermonkey.net/) (Firefox, Chrome, Edge, …).
2. Click **[Install greek-vat-calc.user.js](https://raw.githubusercontent.com/tasosxynos/greek-vat-userscript/main/greek-vat-calc.user.js)**
   — Tampermonkey shows its install page, press *Install*.

Future versions install themselves: `@updateURL` / `@downloadURL` point at this repo.

> **Upgrading from 1.x:** the panel now shows up only on the sites in your list (the e-shops
> it used to open on). To get the old always-there pill back, pick **Σε όλα τα sites** in ⚙.

## What it does

| | |
|---|---|
| Rate | one-click chips under the header — the country's standard rate first, then its reduced rates (Ελλάδα: 24 / 13 / 6 / 4 %) |
| Country | selector in the header: all **27 EU member states**, the markets you order from on top (Ελλάδα, Γερμανία, Ιταλία, Ισπανία, Γαλλία, Ολλανδία, Πολωνία) |
| Input | type any amount; both readings are shown at once, no mode switching |
| **Ποσό με ΦΠΑ** | the amount includes VAT → **Καθαρό** (big, blue) and the ΦΠΑ inside it |
| **Ποσό χωρίς ΦΠΑ** | the amount is net → **Σύνολο** (big, blue) and the ΦΠΑ added |
| Copy | click any value to copy it as `1234,56` (comma decimal, no symbol); a ✓ confirms |
| Minimized | a small `ΦΠΑ 24%` pill (shows the country too when it is not Greece); click to open |
| Position | docked bottom-right; drag the header or the pill anywhere — that spot is kept. Double-click the header to re-dock |
| Memory | position, country, rate and your site list are remembered |

### Keyboard

| Key | Action |
|---|---|
| select a price + `Alt+Q` | fills the amount from the selection — `Τιμή: 1.299,00 €`, `2 x 19,99€`, `€1,299.00` all work (a number next to a currency sign wins; works inside page input fields too) |
| `Alt+Q` | open the panel and focus the amount — **on any page**, even sites not in your list |
| `Alt+Q` again (while in the panel) | minimize — so one key opens and closes it |
| any digit (nothing focused, listed sites only) | jumps straight into the amount field and starts a new amount |
| `Esc` | minimize (in settings: back to the calculator) |

While you type in the panel, keystrokes are stopped from propagating, so page shortcuts
(YouTube, Gmail, …) never fire.

## Choosing the sites

Open the settings with the **⚙** in the panel header, or from the Tampermonkey menu
(**⚙ Ρυθμίσεις QuickVAT**).

| Setting | |
|---|---|
| **Μόνο στα sites της λίστας** *(default)* | the panel exists only on listed sites. Everywhere else the script builds nothing at all — it only listens for `Alt+Q`, and a panel opened that way disappears again when you close it |
| **Σε όλα τα sites** | a small pill on every page; the panel opens by itself on listed sites |
| **＋ Προσθήκη / − Αφαίρεση του *site*** | one click adds or removes the site you are on |
| **Sites** | the list, one per line (commas work too, `#` starts a comment) — saved when you leave the box |
| **Γρήγορη πληκτρολόγηση** | on/off for the type-a-digit shortcut |
| **Αρχική λίστα** | restores the built-in list (click twice to confirm) |

The Tampermonkey menu also has a one-click **＋ Ενεργοποίηση στο *site*** / **✓ Ενεργό στο *site***
toggle for the current page.

List entries:

| Entry | Matches |
|---|---|
| `skroutz.gr` | skroutz.gr and every subdomain (`www.`, `m.` …) |
| `amazon.` | every TLD: amazon.de, amazon.co.uk, smile.amazon.fr … |
| `https://www.shop.gr/cart` | pasted URLs are trimmed to `shop.gr` |

The built-in list is the usual e-shops: Skroutz, BestPrice, e-shop.gr, Plaisio, Kotsovolos,
Public, MediaMarkt, Germanos, You, Shopflix, Amazon, eBay, AliExpress, Temu, Shein, Zalando,
IKEA, Saturn, Decathlon, Alibaba, Banggood, Walmart, Etsy, Zara (`DEFAULT_SITES` in the script).

### Number formats

Greek conventions are assumed: `,` is the decimal mark, `.` groups thousands.

| You type | Parsed as |
|---|---|
| `1.234,56` | 1234.56 |
| `1234,56` / `1234.56` | 1234.56 |
| `1.234` | 1234 |
| `€ 1.234,56` | 1234.56 |
| `124` | 124 |

The parsed value is echoed under the field (`= 1.234,56 €`), so a mis-parse is visible
immediately.

## Configuration in the script

Everything day-to-day lives in the ⚙ settings. For deeper changes, edit the constants at
the top of the script:

```js
const HOTKEY = { alt: true, code: 'KeyQ' };              // Alt+Q
const EU = [ ['AT', 'Αυστρία', 20, [13, 10]], /* … 27 entries … */ ];
const TOP = ['GR', 'DE', 'IT', 'ES', 'FR', 'NL', 'PL'];  // first in the country list
const DEFAULT_SITES = ['skroutz.gr', 'amazon.', /* … */ ];  // the list you start with
```

## Countries & rates

Standard rates, as of **January 2026** (source: EU tables — TEDB / European Commission):

| | | | | | |
|---|---|---|---|---|---|
| AT 20 | BE 21 | BG 20 | HR 25 | CY 19 | CZ 21 |
| DK 25 | EE 24 | FI 25.5 | FR 20 | DE 19 | GR 24 |
| HU 27 | IE 23 | IT 22 | LV 21 | LT 21 | LU 17 |
| MT 18 | NL 21 | PL 23 | PT 23 | RO 21 | SK 23 |
| SI 22 | ES 21 | SE 25 | | | |

Reduced rates (also as chips, including the very low ones such as 2.1 % FR / 3 % LU / 4 % ES-IT)
apply only to specific goods and services — check locally when it matters. Selecting a
country resets the rate to that country's standard rate.

## Development

The script is a single file, no build step. The maths/parsing core is marked
`// #region pure` … `// #endregion pure` so it can be tested standalone:

```bash
node tests/vat_test.mjs      # 182 assertions, no dependencies
```

## Notes / limits

- Userscripts do not run on `about:`, `file://`, or the built-in PDF viewer; the panel
  is hidden in fullscreen video.
- Tampermonkey still loads the script on every page (`@match *://*/*`, so any site can be
  added from the settings), but on a site that is not enabled it only reads its settings and
  adds one key listener — no DOM is created.
- It wakes up only when the tab is shown: a tab opened in the background builds nothing until
  you switch to it, and every switch back re-reads the settings (so a site you added in another
  tab applies here too). There are no mouse-move listeners, except while you are dragging the panel.
- HTML/CSS/DOM only — nothing is sent anywhere.

## License

MIT — see [LICENSE](LICENSE).
