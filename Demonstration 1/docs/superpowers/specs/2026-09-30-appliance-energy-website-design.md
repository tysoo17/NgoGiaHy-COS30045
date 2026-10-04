# Appliance Energy Consumption Website — Design Spec

Date: 2026-09-30
Author: Ngo Gia Hy (Student ID 106217563)
Unit: COS30045 Data Visualisation — Demonstration 1

## 1. Goal

A small static website titled **Appliance Energy Consumption Website** that demonstrates core web development
concepts (HTML structure, external CSS, vanilla JavaScript) and good project organisation. It includes the optional
**Appliance Energy Calculator** extension, driven by a demo dataset of Australian TV models.

### Constraints

- Plain HTML, one external CSS file, vanilla JavaScript. No libraries, frameworks, build tools or web fonts.
- Must work when the HTML files are opened directly by double-click (`file://`), without a local server.
- No inline styles; no `alert()`.
- Colours derived from the provided logo.
- All work stays inside the project folder.

### Out of scope (this version)

- Choosing a data-analysis angle / storyboard (later, with the author's own dataset).
- Real (non-placeholder) editorial content on Home and Televisions.
- A GenAI acknowledgement in the README (footer line only, per author's choice).

## 2. File structure

```
/
  index.html                  Home
  televisions.html            Televisions + calculator
  about.html                  About Us
  assets/
    css/styles.css            the only stylesheet
    js/main.js                footer year + FAQ accordion (loaded on all pages)
    js/calculator.js          calculator (Televisions page only)
    data/tv-models.js         generated from the CSV; defines global TV_MODELS
    img/power-logo.png        logo (moved from project root)
  dataset/tv_2026_02_15.csv   source data (unchanged)
  tools/convert-tv-data.py    one-off CSV → assets/data/tv-models.js converter
  README.md
```

Justified deviation from the recommended structure: `assets/data/` holds generated data, `dataset/` holds the raw
source, `tools/` holds the converter. Tooling folders (`.claude/`, `.superpowers/`, `.impeccable/`) are not part of
the site and should be excluded from any submission zip.

Shared nav and footer markup is written directly into each HTML page (static; no JS injection).

## 3. Shared components

### Navigation (identical on all pages)

- Left: logo image linking to `index.html`, `alt="Appliance Energy – Home"`.
- Right: links Home, Televisions, About Us.
- Active page: `class="active"` and `aria-current="page"` set in each page's HTML; shown as bold `--ink` text with an
  amber underline (not colour alone).
- Hover: amber underline slides in on inactive links; logo lifts slightly.
- Keyboard focus: visible 2px `--brown` outline.
- Small screens: links wrap beneath the logo; no hamburger menu.

### Footer (all pages)

`© <span id="year">2026</span> Ngo Gia Hy – Student ID 106217563 · This website was developed with GenAI support.`

`main.js` replaces the year with `new Date().getFullYear()`; the static `2026` is the no-JS fallback.

## 4. Page content

### Home (`index.html`)

1. Hero: heading "How much power do your appliances really use?", placeholder intro about appliance energy use in
   Australian homes, one link-button "Try the TV energy calculator →" to `televisions.html`.
2. Key facts: three placeholder cards (Energy Rating Label / standby power / running costs). No invented statistics
   presented as real.
3. FAQ: 4–5 placeholder questions (e.g. "What is the Energy Rating Label?", "How is yearly energy use calculated?",
   "Does standby power matter?") with placeholder answers.

### Televisions (`televisions.html`)

1. Short placeholder intro about TV energy use.
2. The calculator (section 6).
3. Data note: "Model data: Australian Energy Rating register (demo extract, 15 Feb 2026)."

### About Us (`about.html`)

1. About this project: purpose; unit COS30045 Data Visualisation.
2. Data source: Energy Rating register TV data; stated as a demo dataset to be replaced by the author's own.
3. Author card: "Ngo Gia Hy – Student ID 106217563" (no photo).

## 5. Data preparation (`tools/convert-tv-data.py`)

Input: `dataset/tv_2026_02_15.csv` (4,724 rows, all Approved). Python 3 standard library only.

Output: `assets/data/tv-models.js` containing `const TV_MODELS = [ ... ];`, each entry:

| Field | Source column | Notes |
|---|---|---|
| `brand` | `Brand_Reg` | Case variants merged (e.g. "Kogan"/"KOGAN" → one spelling, the most frequent) |
| `model` | `Model_No` | |
| `tech` | `Screen_Tech` | `LCD`, `LCD (LED)`, `OLED` |
| `sizeIn` | `screensize` | cm ÷ 2.54, rounded to nearest inch |
| `watts` | `Avg_mode_power` | average on-mode power (W) |
| `labelKwh` | `Labelled energy consumption (kWh/year)` | |
| `stars` | `Star2` | |

Duplicates: for repeated (brand, model) pairs keep the row with the latest `ExpDate`.

Size bands (by `sizeIn`): `Under 43"`, `43–54"`, `55–64"`, `65"+`.

## 6. Appliance Energy Calculator

### Inputs

1. **TV selection** (default mode), four dependent `<select>`s:
   Technology → Size band → Brand → Model.
   Choosing one populates the next; changing an earlier choice resets and disables later ones. Model options read
   e.g. "UA55DU8000 – 98 W", sorted by model number. Only non-empty bands/brands are offered.
2. **"Enter wattage manually" checkbox**: hides the four selects, shows a watts `<input type="number">`.
3. **Hours of use per day**: number input, default 5.
4. **Electricity price (c/kWh)**: number input, default 33.
5. **Calculate** button (type `submit`; form submit is intercepted with `preventDefault`).

Every control has a visible `<label>` and short helper text where useful.

### Calculations (client-side)

- kWh/day = watts × hours ÷ 1000
- kWh/month = kWh/day × 365 ÷ 12
- kWh/year = kWh/day × 365
- cost = kWh × price ÷ 100 (AUD), for day, month, year

Worked check: 100 W × 5 h at 33 c → 0.5 kWh/day, 15.21 kWh/month, 182.5 kWh/year, $60.23/year.

### Results panel

- One fixed panel updated in place (never appended/duplicated), `aria-live="polite"`.
- Shows energy (day/month/year, kWh, 2 d.p.) and cost (day/month/year, formatted with
  `Intl.NumberFormat('en-AU', {style:'currency', currency:'AUD'})`).
- When a dataset model is selected, also: "Energy label figure (assumes 10 h/day): N kWh/year".
- Updates live on any `input`/`change` event and on submit.
- Initial state (before a model is chosen): a short instruction, not zeros.

### Validation

| Field | Rule | Message |
|---|---|---|
| Model (dataset mode) | must be selected | "Choose a TV model, or tick “Enter wattage manually”." |
| Watts (manual mode) | number, 1–1000 | "Power must be a number between 1 and 1000 watts." |
| Hours | number, 0–24 | "Hours per day must be between 0 and 24." |
| Price | number, 1–200 | "Price must be between 1 and 200 cents per kWh." |

- Message shown in an element under the field, linked via `aria-describedby`; field gets `aria-invalid="true"` and
  an error style. Cleared when fixed.
- While any field is invalid, the results panel shows "Fix the highlighted fields to see results." instead of stale
  numbers.
- The model-not-selected message appears only after submit (not while the user is still stepping through selects).

### Refresh behaviour

On `DOMContentLoaded` the script calls `form.reset()`, rebuilds the Technology options from `TV_MODELS`, and renders
the initial results state, so browser-restored form values can never desync the dependent selects.

## 7. FAQ accordion (`main.js`)

- Each question is a `<button aria-expanded="false" aria-controls="faq-n">`; each answer has `hidden` by default.
- Click toggles `aria-expanded` and `hidden` for that item only; items are independent (several may be open).
- Smooth open/close via CSS; disabled under `prefers-reduced-motion: reduce`.
- Without JS, answers stay hidden (acceptable: JS is a stated requirement).

## 8. Visual design (direction C — clean & minimal)

### Colour tokens (`:root` in `styles.css`)

| Token | Value | Use | Contrast |
|---|---|---|---|
| `--bg` | `#FFFFFF` | page background | — |
| `--surface` | `#FFFBEA` | cards, results panel, FAQ items | — |
| `--cream` | `#F8E8A5` | highlights, stat chips | `--ink` on it 10.0:1 |
| `--ink` | `#3F331F` | headings, body text | 12.3:1 on white |
| `--brown` | `#7D6744` | secondary text, borders, links, focus ring | 5.4:1 on white |
| `--amber` | `#EBA746` | active/hover underline, button background | `--ink` on it 6.0:1 |
| `--error` | `#B42318` | validation messages | 6.6:1 on white |

Rules: amber is never used for text (2.1:1 on white); `--brown` text is never placed on `--cream` (4.4:1) — use
`--ink` there.

### Typography and layout

- System font stack; 16px base; line-height 1.6; headings 2rem / 1.5rem / 1.25rem; hierarchy via weight.
- Content max-width 1100px; 16px side gutter on phones; no horizontal scroll.
- 4/8px spacing scale.
- Key-fact cards: 1 column on phones, 3 on desktop. Calculator: inputs above results on phones; side by side from
  900px.
- Mobile-first media queries; `<meta name="viewport" content="width=device-width, initial-scale=1">` on every page.

### Motion

Hover underlines, FAQ open/close and the logo lift only, 150–250ms, all disabled under reduced motion.

## 9. Testing (manual; no test framework)

1. Run the converter; spot-check several entries against the CSV (watts, labelKwh, merged brands, deduped models).
2. Open each page by double-click: nav links, active state, logo → Home, hover effects, footer year, FAQ open/close
   (mouse and keyboard).
3. Calculator: each select path; manual mode; each invalid value and its message; refresh mid-way; verify the worked
   check above.
4. Layout at 375px, 768px and 1280px widths.
5. Quality passes: impeccable design hook on each file, `ponytail-review` for over-engineering, ui-ux-pro-max
   pre-delivery checklist.

## 10. README contents

Project title and purpose, how to open the site (double-click `index.html`), folder structure with the justification
from section 2, how to regenerate `tv-models.js` (`python tools/convert-tv-data.py`), data source note, author.
