# Appliance Energy Consumption Website Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a 3-page static website (Home, Televisions, About Us) with a shared nav/footer, a JS FAQ accordion, and a vanilla-JS TV energy calculator fed by a pre-converted extract of the Australian Energy Rating TV register.

**Architecture:** Plain static HTML pages, each containing its own nav and footer markup. One external stylesheet. `main.js` (all pages) handles the footer year and FAQ; `calculator.js` (Televisions only) handles the calculator and reads a global `TV_MODELS` array from `assets/data/tv-models.js`, which a Python stdlib script generates from the CSV. No modules, no fetch — everything works from `file://`.

**Tech Stack:** HTML5, CSS3 (custom properties, grid, media queries), vanilla ES2017+ JavaScript, Python 3 standard library (converter only), Node (verification one-liners only — not a site dependency).

**Spec:** `docs/superpowers/specs/2026-09-30-appliance-energy-website-design.md`

## Global Constraints

- Site title: "Appliance Energy Consumption Website".
- No external JS libraries/frameworks, no web fonts, no CDN requests.
- No inline `style` attributes and no `alert()` anywhere.
- All styling in `assets/css/styles.css` only.
- Must work opened by double-click (`file://`): no ES modules, no `fetch`.
- Colours only from tokens: `--bg #FFFFFF`, `--surface #FFFBEA`, `--cream #F8E8A5`, `--ink #3F331F`, `--brown #7D6744`, `--amber #EBA746`, `--error #B42318` (plus `--line #EFE6C8` for decorative dividers).
- Amber is never a text colour; `--brown` text never sits on `--cream`.
- Footer text exactly: `© <year> Ngo Gia Hy – Student ID 106217563 · This website was developed with GenAI support.`
- Work only inside the project folder `E:\Swinburne University - Bachelor\COS30045\Demonstration 1`.
- The folder is not a git repository; there are no commit steps.

## Review Focus

1. **Refresh / Back after partial input** — browser restores old select values; expected: form comes back in a consistent default state, no orphaned enabled selects. (Task 3, Step 6 check 7)
2. **Non-numeric or blank text in number fields** ("abc", "-", "1e9", empty) — expected: a clear message under the field, results show "Fix the highlighted fields…", never `NaN`. (Task 3, Step 6 check 4)
3. **Hours = 0** — expected: valid, results show 0.00 kWh and $0.00, no error. (Task 3, Step 6 check 5)
4. **Toggling manual mode after picking a model (and back)** — expected: results switch to the other wattage source, no stale error from the hidden mode. (Task 3, Step 6 check 3)
5. **Changing technology after a full selection** — expected: size/brand/model reset and disable, results return to the instruction message, not the old model's figures. (Task 3, Step 6 check 2)

---

### Task 1: Data converter and generated data file

**Files:**
- Create: `tools/convert-tv-data.py`
- Create (generated): `assets/data/tv-models.js`
- Read: `dataset/tv_2026_02_15.csv`

**Interfaces:**
- Consumes: CSV columns `Brand_Reg`, `Model_No`, `Screen_Tech`, `screensize` (cm), `Avg_mode_power` (W), `Labelled energy consumption (kWh/year)`, `Star2`, `ExpDate` (ISO date).
- Produces: `assets/data/tv-models.js` declaring `const TV_MODELS = [ {brand, model, tech, sizeIn, watts, labelKwh, stars}, ... ];` — `brand`/`model`/`tech` strings; `sizeIn` integer inches; `watts`, `labelKwh`, `stars` numbers. Sorted by brand, then model.

- [ ] **Step 1: Write the failing check**

Run from the project root:

```bash
node -e "require('vm').runInThisContext(require('fs').readFileSync('assets/data/tv-models.js','utf8')+';globalThis.T=TV_MODELS');const T=globalThis.T;const up=new Set(T.map(m=>m.brand.toUpperCase())).size,raw=new Set(T.map(m=>m.brand)).size;const keys=new Set(T.map(m=>m.brand.toUpperCase()+'|'+m.model.toUpperCase())).size;console.log('count',T.length,'brandsMerged',up===raw,'noDupes',keys===T.length,'sample',JSON.stringify(T.find(m=>m.model==='58BFL2114/12')))"
```

- [ ] **Step 2: Run it to verify it fails**

Expected: `Error: ENOENT: no such file or directory, open 'assets/data/tv-models.js'`

- [ ] **Step 3: Write the converter**

`tools/convert-tv-data.py`:

```python
"""Convert the Energy Rating TV register CSV into assets/data/tv-models.js.

Run from anywhere:  python tools/convert-tv-data.py
To use another dataset, change SOURCE below and re-run.
"""
import csv
import json
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / "dataset" / "tv_2026_02_15.csv"
OUTPUT = ROOT / "assets" / "data" / "tv-models.js"


def main():
    with open(SOURCE, encoding="utf-8-sig", newline="") as f:
        rows = list(csv.DictReader(f))

    # Brands that differ only by capitalisation ("Kogan"/"KOGAN") share the most common spelling.
    brand_name = {}
    for name, _ in Counter(r["Brand_Reg"].strip() for r in rows).most_common():
        brand_name.setdefault(name.upper(), name)

    # A (brand, model) pair can be registered more than once: keep the latest expiry date.
    latest = {}
    for r in rows:
        key = (r["Brand_Reg"].strip().upper(), r["Model_No"].strip().upper())
        if key not in latest or r["ExpDate"] > latest[key]["ExpDate"]:
            latest[key] = r

    models = sorted(
        (
            {
                "brand": brand_name[r["Brand_Reg"].strip().upper()],
                "model": r["Model_No"].strip(),
                "tech": r["Screen_Tech"].strip(),
                "sizeIn": round(float(r["screensize"]) / 2.54),
                "watts": float(r["Avg_mode_power"]),
                "labelKwh": float(r["Labelled energy consumption (kWh/year)"]),
                "stars": float(r["Star2"]),
            }
            for r in latest.values()
        ),
        key=lambda m: (m["brand"].upper(), m["model"].upper()),
    )

    lines = ",\n".join("  " + json.dumps(m, ensure_ascii=False) for m in models)
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text(
        f"// Generated by tools/convert-tv-data.py from {SOURCE.name}. Do not edit by hand.\n"
        f"const TV_MODELS = [\n{lines}\n];\n",
        encoding="utf-8",
    )
    print(f"Wrote {len(models)} models to {OUTPUT.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
```

- [ ] **Step 4: Generate the data file**

Run: `python tools/convert-tv-data.py`
Expected: `Wrote N models to assets\data\tv-models.js` where N is a little under 4,724.

- [ ] **Step 5: Run the check from Step 1 again**

Expected: `count N brandsMerged true noDupes true sample {"brand":"PHILIPS","model":"58BFL2114/12","tech":"LCD (LED)","sizeIn":58,"watts":79.65,"labelKwh":322,"stars":5.5}` with the same N as Step 4.

- [ ] **Step 6: Cross-check N independently**

```bash
python -c "import csv;r=list(csv.DictReader(open('dataset/tv_2026_02_15.csv',encoding='utf-8-sig')));print(len({(x['Brand_Reg'].strip().upper(),x['Model_No'].strip().upper()) for x in r}))"
```

Expected: the same N.

---

### Task 2: Site shell — stylesheet, shared behaviour, Home and About pages

**Files:**
- Move: `power-logo.png` → `assets/img/power-logo.png`
- Create: `assets/css/styles.css`
- Create: `assets/js/main.js`
- Create: `index.html`
- Create: `about.html`

**Interfaces:**
- Produces (used by Task 3's `televisions.html`): the header/nav markup and footer markup exactly as in `index.html` below (only the `active`/`aria-current` link changes); CSS classes `.container`, `.section`, `.eyebrow`, `.lead`, `.prose`, `.button`, `.data-note`, and all calculator classes (`.calc-layout`, `.calc-form`, `.field`, `.field-check`, `.help`, `.error`, `.results`, `.results-message`, `.results-basis`, `.results-table`, `.label-note`); `main.js` loaded with `defer` on every page.
- FAQ markup contract (for `main.js`): `button.faq-question[aria-expanded][aria-controls=ID]` controls `#ID.faq-answer[hidden]`.

- [ ] **Step 1: Write the failing structure check**

Run from the project root:

```bash
python -c "
import pathlib,re
for p in ['index.html','about.html']:
    t=pathlib.Path(p).read_text(encoding='utf-8')
    checks={'css':'assets/css/styles.css' in t,'mainjs':'assets/js/main.js' in t,'logo->home':'class=\"logo\" href=\"index.html\"' in t,
      'links':all(h in t for h in ['href=\"index.html\"','href=\"televisions.html\"','href=\"about.html\"']),
      'one active':t.count('aria-current=\"page\"')==1,'year':'id=\"year\"' in t,'name':'Ngo Gia Hy – Student ID 106217563' in t,
      'genai':'developed with GenAI support' in t,'no inline style':not re.search(r'\sstyle=',t),'viewport':'name=\"viewport\"' in t}
    print(p,[k for k,v in checks.items() if not v] or 'OK')
"
```

- [ ] **Step 2: Run it to verify it fails**

Expected: `FileNotFoundError: ... 'index.html'`

- [ ] **Step 3: Move the logo**

```powershell
New-Item -ItemType Directory -Force assets/img | Out-Null; Move-Item power-logo.png assets/img/power-logo.png
```

- [ ] **Step 4: Write `assets/css/styles.css`**

```css
/* Appliance Energy Consumption Website — shared styles.
   Colours are taken from the logo (assets/img/power-logo.png). */

:root {
  --bg: #FFFFFF;
  --surface: #FFFBEA;
  --cream: #F8E8A5;
  --ink: #3F331F;
  --brown: #7D6744;
  --amber: #EBA746;
  --error: #B42318;
  --line: #EFE6C8;
  --radius: 8px;
  --max-width: 1100px;
  --ease: cubic-bezier(0.2, 0, 0, 1);
}

/* ---------- Base ---------- */

*, *::before, *::after { box-sizing: border-box; }

[hidden] { display: none !important; }

body {
  margin: 0;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  font-family: system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  font-size: 1rem;
  line-height: 1.6;
  color: var(--ink);
  background: var(--bg);
}

main { flex: 1; }

img { display: block; max-width: 100%; height: auto; }

h1, h2, h3 { margin: 0 0 0.5em; line-height: 1.25; text-wrap: balance; }
h1 { font-size: 2rem; }
h2 { font-size: 1.5rem; }
h3 { font-size: 1.25rem; }

p { margin: 0 0 1em; }

a { color: var(--brown); }
a:hover { color: var(--ink); }

:focus-visible { outline: 2px solid var(--brown); outline-offset: 3px; }

.container { width: 100%; max-width: var(--max-width); margin: 0 auto; padding: 0 16px; }

.skip-link {
  position: absolute;
  left: 16px;
  top: -64px;
  z-index: 10;
  padding: 8px 12px;
  background: var(--ink);
  color: var(--bg);
  border-radius: var(--radius);
}
.skip-link:focus { top: 8px; color: var(--bg); }

/* ---------- Header & navigation ---------- */

.site-header { background: var(--bg); border-bottom: 1px solid var(--line); }

.site-nav {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 8px 24px;
  padding-top: 12px;
  padding-bottom: 12px;
}

.logo { display: inline-block; border-radius: 50%; }
.logo img { width: 48px; height: 48px; transition: transform 200ms var(--ease); }
.logo:hover img { transform: translateY(-2px); }

.nav-links { display: flex; flex-wrap: wrap; gap: 0 24px; margin: 0; padding: 0; list-style: none; }

.nav-links a {
  position: relative;
  display: inline-block;
  padding: 12px 0;
  color: var(--brown);
  font-weight: 500;
  text-decoration: none;
}

.nav-links a::after {
  content: "";
  position: absolute;
  left: 0;
  right: 0;
  bottom: 6px;
  height: 3px;
  border-radius: 2px;
  background: var(--amber);
  transform: scaleX(0);
  transform-origin: left;
  transition: transform 200ms var(--ease);
}

.nav-links a:hover { color: var(--ink); }
.nav-links a:hover::after,
.nav-links a.active::after { transform: scaleX(1); }
.nav-links a.active { color: var(--ink); font-weight: 700; }

/* ---------- Page sections ---------- */

.section { padding: 48px 0; }
.section + .section { border-top: 1px solid var(--line); }
.hero { padding: 64px 0 48px; }

.eyebrow {
  margin-bottom: 8px;
  color: var(--brown);
  font-size: 0.875rem;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.lead { max-width: 65ch; font-size: 1.125rem; }
.prose { max-width: 70ch; }

.button {
  display: inline-block;
  padding: 12px 20px;
  border: 0;
  border-radius: var(--radius);
  background: var(--amber);
  color: var(--ink);
  font: inherit;
  font-weight: 700;
  text-decoration: none;
  cursor: pointer;
  transition: background-color 150ms var(--ease), transform 150ms var(--ease);
}
.button:hover { background: color-mix(in srgb, var(--amber) 80%, white); color: var(--ink); }
.button:active { transform: scale(0.98); }

.card-grid { display: grid; grid-template-columns: 1fr; gap: 16px; margin: 0; padding: 0; list-style: none; }

.card { padding: 24px; background: var(--surface); border: 1px solid var(--line); border-radius: var(--radius); }
.card p:last-child { margin-bottom: 0; }

.chip {
  display: inline-block;
  margin-bottom: 12px;
  padding: 2px 8px;
  border-radius: 4px;
  background: var(--cream);
  color: var(--ink);
  font-size: 0.875rem;
  font-weight: 600;
}

.data-note { color: var(--brown); font-size: 0.875rem; }

.author-card { display: inline-block; padding: 16px 24px; background: var(--cream); color: var(--ink); border-radius: var(--radius); }
.author-card p { margin: 0; }

/* ---------- FAQ accordion ---------- */

.faq-list { max-width: 70ch; border-top: 1px solid var(--line); }
.faq-item { border-bottom: 1px solid var(--line); }
.faq-item h3 { margin: 0; font-size: 1rem; }

.faq-question {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  width: 100%;
  padding: 16px 0;
  border: 0;
  background: none;
  color: var(--ink);
  font: inherit;
  font-weight: 600;
  text-align: left;
  cursor: pointer;
}
.faq-question:hover { color: var(--brown); }

.faq-icon {
  flex: none;
  width: 10px;
  height: 10px;
  margin-right: 4px;
  border-right: 2px solid currentColor;
  border-bottom: 2px solid currentColor;
  transform: rotate(45deg);
  transition: transform 200ms var(--ease);
}
.faq-question[aria-expanded="true"] .faq-icon { transform: rotate(-135deg); }

.faq-answer { padding-bottom: 16px; }
.faq-answer:not([hidden]) { animation: faq-open 250ms var(--ease); }

@keyframes faq-open {
  from { opacity: 0; transform: translateY(-4px); }
  to { opacity: 1; transform: none; }
}

/* ---------- Calculator ---------- */

.calc-layout { display: grid; gap: 24px; }

.calc-form fieldset { margin: 0 0 16px; padding: 16px 16px 0; border: 1px solid var(--line); border-radius: var(--radius); }
.calc-form legend { padding: 0 4px; font-weight: 700; }

.field { margin-bottom: 16px; }
.field label { display: block; margin-bottom: 4px; font-weight: 600; }

.field select,
.field input[type="number"] {
  width: 100%;
  min-height: 44px;
  padding: 8px 12px;
  border: 1px solid var(--brown);
  border-radius: var(--radius);
  background: var(--bg);
  color: var(--ink);
  font: inherit;
}
.field select:disabled { background: var(--surface); cursor: not-allowed; opacity: 0.7; }
.field [aria-invalid="true"] { border: 2px solid var(--error); }

.field-check { display: flex; align-items: center; gap: 8px; }
.field-check label { margin: 0; }
.field-check input { width: 20px; height: 20px; margin: 0; accent-color: var(--brown); }

.help { margin: 4px 0 0; color: var(--brown); font-size: 0.875rem; }
.error { margin: 4px 0 0; color: var(--error); font-size: 0.875rem; font-weight: 600; }
.error:empty { display: none; }

.results { padding: 24px; background: var(--surface); border: 1px solid var(--line); border-radius: var(--radius); }
.results-message { margin: 0; }
.results-basis { font-weight: 600; }

.results-table { width: 100%; border-collapse: collapse; font-variant-numeric: tabular-nums; }
.results-table th,
.results-table td { padding: 8px 0; border-bottom: 1px solid var(--line); text-align: left; }
.results-table td,
.results-table thead th:not(:first-child) { text-align: right; }
.results-table thead th { color: var(--brown); font-size: 0.875rem; }

.label-note { margin: 16px 0 0; font-size: 0.875rem; }

/* ---------- Footer ---------- */

.site-footer { margin-top: 48px; padding: 24px 0; background: var(--surface); border-top: 1px solid var(--line); font-size: 0.875rem; }
.site-footer p { margin: 0; }

/* ---------- Larger screens ---------- */

@media (min-width: 768px) {
  h1 { font-size: 2.5rem; }
  .card-grid { grid-template-columns: repeat(3, 1fr); }
}

@media (min-width: 900px) {
  .calc-layout { grid-template-columns: 3fr 2fr; align-items: start; }
}

/* ---------- Reduced motion ---------- */

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

- [ ] **Step 5: Write `assets/js/main.js`**

```js
// Shared behaviour for every page: footer year and FAQ accordion.

document.addEventListener('DOMContentLoaded', function () {
  const year = document.getElementById('year');
  if (year) {
    year.textContent = new Date().getFullYear();
  }

  // Each FAQ question toggles its own answer; several can be open at once.
  document.querySelectorAll('.faq-question').forEach(function (button) {
    const answer = document.getElementById(button.getAttribute('aria-controls'));
    button.addEventListener('click', function () {
      const isOpen = button.getAttribute('aria-expanded') === 'true';
      button.setAttribute('aria-expanded', String(!isOpen));
      answer.hidden = isOpen;
    });
  });
});
```

- [ ] **Step 6: Write `index.html`**

```html
<!DOCTYPE html>
<html lang="en-AU">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Home | Appliance Energy Consumption Website</title>
  <meta name="description" content="Placeholder information about appliance energy consumption in Australian homes.">
  <link rel="icon" href="assets/img/power-logo.png">
  <link rel="stylesheet" href="assets/css/styles.css">
  <script src="assets/js/main.js" defer></script>
</head>
<body>
  <a class="skip-link" href="#main">Skip to main content</a>

  <header class="site-header">
    <nav class="site-nav container" aria-label="Main">
      <a class="logo" href="index.html"><img src="assets/img/power-logo.png" alt="Appliance Energy – Home" width="48" height="48"></a>
      <ul class="nav-links">
        <li><a href="index.html" class="active" aria-current="page">Home</a></li>
        <li><a href="televisions.html">Televisions</a></li>
        <li><a href="about.html">About Us</a></li>
      </ul>
    </nav>
  </header>

  <main id="main">
    <section class="hero">
      <div class="container">
        <p class="eyebrow">Appliance Energy Consumption Website</p>
        <h1>How much power do your appliances really use?</h1>
        <p class="lead">Placeholder introduction. Everyday appliances such as televisions, fridges and washing machines make up a large part of household electricity use in Australia. This site will explore how much energy they use and what that costs.</p>
        <a class="button" href="televisions.html">Try the TV energy calculator →</a>
      </div>
    </section>

    <section class="section" aria-labelledby="facts-title">
      <div class="container">
        <h2 id="facts-title">Energy at home: the basics</h2>
        <ul class="card-grid">
          <li class="card">
            <span class="chip">Energy Rating Label</span>
            <h3>Stars show efficiency</h3>
            <p>Placeholder text. Many appliances sold in Australia carry a star rating label. More stars means the appliance uses less energy than others of the same type and size.</p>
          </li>
          <li class="card">
            <span class="chip">Standby power</span>
            <h3>Off is not always off</h3>
            <p>Placeholder text. Some appliances keep drawing a small amount of power while on standby. Across many devices and many hours, this can add up.</p>
          </li>
          <li class="card">
            <span class="chip">Running costs</span>
            <h3>Watts × hours × price</h3>
            <p>Placeholder text. The cost of running an appliance depends on its power, how many hours a day it is used and the price you pay per kilowatt-hour.</p>
          </li>
        </ul>
      </div>
    </section>

    <section class="section" aria-labelledby="faq-title">
      <div class="container">
        <h2 id="faq-title">Frequently asked questions</h2>
        <div class="faq-list">
          <div class="faq-item">
            <h3><button class="faq-question" type="button" aria-expanded="false" aria-controls="faq-1">What is the Energy Rating Label?<span class="faq-icon" aria-hidden="true"></span></button></h3>
            <div class="faq-answer" id="faq-1" hidden><p>Placeholder answer. The Energy Rating Label is a star rating shown on appliances in Australia and New Zealand to help buyers compare energy efficiency.</p></div>
          </div>
          <div class="faq-item">
            <h3><button class="faq-question" type="button" aria-expanded="false" aria-controls="faq-2">How is yearly energy use calculated?<span class="faq-icon" aria-hidden="true"></span></button></h3>
            <div class="faq-answer" id="faq-2" hidden><p>Placeholder answer. Multiply the appliance's power in watts by the hours it is used each day, divide by 1,000 to get kilowatt-hours, then multiply by 365.</p></div>
          </div>
          <div class="faq-item">
            <h3><button class="faq-question" type="button" aria-expanded="false" aria-controls="faq-3">Does standby power matter?<span class="faq-icon" aria-hidden="true"></span></button></h3>
            <div class="faq-answer" id="faq-3" hidden><p>Placeholder answer. Standby power is usually small for a single device, but it runs around the clock and across many devices in a home.</p></div>
          </div>
          <div class="faq-item">
            <h3><button class="faq-question" type="button" aria-expanded="false" aria-controls="faq-4">Do bigger TVs always use more energy?<span class="faq-icon" aria-hidden="true"></span></button></h3>
            <div class="faq-answer" id="faq-4" hidden><p>Placeholder answer. Larger screens generally need more power, but screen technology and efficiency also make a difference. Try the calculator to compare models.</p></div>
          </div>
          <div class="faq-item">
            <h3><button class="faq-question" type="button" aria-expanded="false" aria-controls="faq-5">Where does the data on this site come from?<span class="faq-icon" aria-hidden="true"></span></button></h3>
            <div class="faq-answer" id="faq-5" hidden><p>Placeholder answer. TV model data comes from the Australian Energy Rating product register. See the About Us page for details.</p></div>
          </div>
        </div>
      </div>
    </section>
  </main>

  <footer class="site-footer">
    <div class="container">
      <p>&copy; <span id="year">2026</span> Ngo Gia Hy – Student ID 106217563 · This website was developed with GenAI support.</p>
    </div>
  </footer>
</body>
</html>
```

- [ ] **Step 7: Write `about.html`**

```html
<!DOCTYPE html>
<html lang="en-AU">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>About Us | Appliance Energy Consumption Website</title>
  <meta name="description" content="About the Appliance Energy Consumption Website project, its data source and its author.">
  <link rel="icon" href="assets/img/power-logo.png">
  <link rel="stylesheet" href="assets/css/styles.css">
  <script src="assets/js/main.js" defer></script>
</head>
<body>
  <a class="skip-link" href="#main">Skip to main content</a>

  <header class="site-header">
    <nav class="site-nav container" aria-label="Main">
      <a class="logo" href="index.html"><img src="assets/img/power-logo.png" alt="Appliance Energy – Home" width="48" height="48"></a>
      <ul class="nav-links">
        <li><a href="index.html">Home</a></li>
        <li><a href="televisions.html">Televisions</a></li>
        <li><a href="about.html" class="active" aria-current="page">About Us</a></li>
      </ul>
    </nav>
  </header>

  <main id="main">
    <section class="hero">
      <div class="container prose">
        <p class="eyebrow">About Us</p>
        <h1>About this project</h1>
        <p class="lead">The Appliance Energy Consumption Website is a small project for COS30045 Data Visualisation at Swinburne University of Technology. It explores how much electricity household appliances use in Australia, starting with televisions.</p>
      </div>
    </section>

    <section class="section" aria-labelledby="data-title">
      <div class="container prose">
        <h2 id="data-title">Data source</h2>
        <p>The TV models in the calculator come from the Australian Energy Rating product register for televisions (extract dated 15 February 2026). Each model's average on-mode power and labelled yearly energy use are taken from that register.</p>
        <p>This is a demo dataset for the first version of the site. It will be replaced with the author's own dataset in a later version.</p>
      </div>
    </section>

    <section class="section" aria-labelledby="author-title">
      <div class="container">
        <h2 id="author-title">Author</h2>
        <div class="author-card">
          <p><strong>Ngo Gia Hy</strong></p>
          <p>Student ID 106217563</p>
        </div>
      </div>
    </section>
  </main>

  <footer class="site-footer">
    <div class="container">
      <p>&copy; <span id="year">2026</span> Ngo Gia Hy – Student ID 106217563 · This website was developed with GenAI support.</p>
    </div>
  </footer>
</body>
</html>
```

- [ ] **Step 8: Run the structure check from Step 1**

Expected:
```
index.html OK
about.html OK
```

- [ ] **Step 9: Browser check (double-click `index.html`, then `about.html`)**

Expected on both pages:
1. Logo top-left; clicking it opens Home.
2. Nav links move between pages (Televisions will 404 until Task 3 — that is expected here).
3. Current page link is bold with an amber underline; hovering another link slides its underline in; hovering the logo lifts it.
4. Tab key: skip link appears first, then logo and links show a brown focus outline.
5. Footer shows the current year and the exact footer text.
6. Home FAQ: all answers hidden on load; each question opens/closes its own answer by click and by Enter/Space; several can be open at once; chevron rotates.
7. At 375px width (DevTools device mode): no horizontal scroll, links wrap under the logo, cards stack in one column.

---

### Task 3: Televisions page and energy calculator

**Files:**
- Create: `televisions.html`
- Create: `assets/js/calculator.js`

**Interfaces:**
- Consumes: global `TV_MODELS` from Task 1 (`{brand, model, tech, sizeIn, watts, labelKwh, stars}`); CSS classes and nav/footer markup from Task 2.
- Produces (pure functions, global function declarations so they can be checked from Node):
  - `sizeBand(sizeIn: number) → string` — one of `'Under 43"'`, `'43–54"'`, `'55–64"'`, `'65"+'`
  - `calculateEnergy(watts: number, hours: number, priceCents: number) → {kwhDay, kwhMonth, kwhYear, costDay, costMonth, costYear}` (costs in AUD dollars)
  - `readNumber(input: {value: string}, min: number, max: number) → number | null`
- DOM ids used by `calculator.js`: `calc-form`, `model-picker`, `tech`, `size`, `brand`, `model`, `model-error`, `manual`, `watts-field`, `watts`, `watts-error`, `hours`, `hours-error`, `price`, `price-error`, `results-message`, `results-basis`, `results-table`, `kwh-day`, `kwh-month`, `kwh-year`, `cost-day`, `cost-month`, `cost-year`, `label-note`.

- [ ] **Step 1: Write the failing logic check**

```bash
node -e "const vm=require('vm'),fs=require('fs');const c={document:{addEventListener(){}}};vm.createContext(c);vm.runInContext(fs.readFileSync('assets/js/calculator.js','utf8'),c);const r=c.calculateEnergy(100,5,33);console.log(r.kwhDay,r.kwhMonth.toFixed(2),r.kwhYear,r.costYear.toFixed(2),c.sizeBand(42),c.sizeBand(43),c.sizeBand(64),c.sizeBand(65),c.readNumber({value:' 5 '},0,24),c.readNumber({value:''},0,24),c.readNumber({value:'25'},0,24),c.readNumber({value:'abc'},0,24),c.readNumber({value:'0'},0,24))"
```

- [ ] **Step 2: Run it to verify it fails**

Expected: `Error: ENOENT: no such file or directory, open 'assets/js/calculator.js'`

- [ ] **Step 3: Write `assets/js/calculator.js`**

```js
// Appliance Energy Calculator (Televisions page).
// Needs TV_MODELS from assets/data/tv-models.js, loaded before this file.

const SIZE_BANDS = ['Under 43"', '43–54"', '55–64"', '65"+'];

function sizeBand(sizeIn) {
  if (sizeIn < 43) return SIZE_BANDS[0];
  if (sizeIn < 55) return SIZE_BANDS[1];
  if (sizeIn < 65) return SIZE_BANDS[2];
  return SIZE_BANDS[3];
}

function calculateEnergy(watts, hours, priceCents) {
  const kwhDay = (watts * hours) / 1000;
  const kwhMonth = (kwhDay * 365) / 12;
  const kwhYear = kwhDay * 365;
  const pricePerKwh = priceCents / 100;
  return {
    kwhDay: kwhDay,
    kwhMonth: kwhMonth,
    kwhYear: kwhYear,
    costDay: kwhDay * pricePerKwh,
    costMonth: kwhMonth * pricePerKwh,
    costYear: kwhYear * pricePerKwh
  };
}

// Returns the input's number if it is present and within [min, max], otherwise null.
function readNumber(input, min, max) {
  const text = input.value.trim();
  const value = Number(text);
  return text !== '' && Number.isFinite(value) && value >= min && value <= max ? value : null;
}

function initCalculator() {
  const $ = function (id) { return document.getElementById(id); };
  const form = $('calc-form');
  const tech = $('tech');
  const size = $('size');
  const brand = $('brand');
  const model = $('model');
  const manual = $('manual');
  const watts = $('watts');
  const hours = $('hours');
  const price = $('price');

  const models = TV_MODELS.map(function (m, i) { return Object.assign({ id: String(i) }, m); });
  const kwhFormat = new Intl.NumberFormat('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const audFormat = new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' });
  let submitted = false;

  function fillSelect(select, placeholder, options) {
    select.replaceChildren(new Option(placeholder, ''));
    options.forEach(function (o) { select.add(new Option(o.text, o.value)); });
    select.disabled = options.length === 0;
  }

  function matches() {
    return models.filter(function (m) {
      return m.tech === tech.value &&
        (!size.value || sizeBand(m.sizeIn) === size.value) &&
        (!brand.value || m.brand === brand.value);
    });
  }

  function setError(input, message) {
    $(input.id + '-error').textContent = message;
    if (message) {
      input.setAttribute('aria-invalid', 'true');
    } else {
      input.removeAttribute('aria-invalid');
    }
  }

  // Missing values are only reported after submit; wrong values are reported as soon as they are typed.
  function checkNumber(input, min, max, message) {
    const value = readNumber(input, min, max);
    const typed = input.value.trim() !== '' || input.validity.badInput;
    setError(input, value === null && (submitted || typed) ? message : '');
    return value;
  }

  function showMessage(text) {
    $('results-message').textContent = text;
    $('results-message').hidden = false;
    $('results-basis').hidden = true;
    $('results-table').hidden = true;
    $('label-note').hidden = true;
  }

  function update() {
    let wattage = null;
    let selected = null;

    if (manual.checked) {
      setError(model, '');
      wattage = checkNumber(watts, 1, 1000, 'Power must be a number between 1 and 1000 watts.');
    } else {
      setError(watts, '');
      selected = models.find(function (m) { return m.id === model.value; }) || null;
      wattage = selected ? selected.watts : null;
      setError(model, !selected && submitted ? 'Choose a TV model, or tick “Enter wattage manually”.' : '');
    }
    const h = checkNumber(hours, 0, 24, 'Hours per day must be between 0 and 24.');
    const p = checkNumber(price, 1, 200, 'Price must be between 1 and 200 cents per kWh.');

    if (form.querySelector('[aria-invalid="true"]')) {
      showMessage('Fix the highlighted fields to see results.');
      return;
    }
    if (wattage === null || h === null || p === null) {
      showMessage(manual.checked
        ? 'Enter the power usage in watts to see your estimate.'
        : 'Choose a TV model, or tick “Enter wattage manually”, to see your estimate.');
      return;
    }

    const r = calculateEnergy(wattage, h, p);
    $('results-basis').textContent = selected
      ? selected.brand + ' ' + selected.model + ' (' + selected.watts + ' W), ' + h + ' h/day at ' + p + ' c/kWh'
      : wattage + ' W, ' + h + ' h/day at ' + p + ' c/kWh';
    $('kwh-day').textContent = kwhFormat.format(r.kwhDay) + ' kWh';
    $('kwh-month').textContent = kwhFormat.format(r.kwhMonth) + ' kWh';
    $('kwh-year').textContent = kwhFormat.format(r.kwhYear) + ' kWh';
    $('cost-day').textContent = audFormat.format(r.costDay);
    $('cost-month').textContent = audFormat.format(r.costMonth);
    $('cost-year').textContent = audFormat.format(r.costYear);
    $('label-note').textContent = selected
      ? 'Energy label figure (assumes 10 h/day): ' + kwhFormat.format(selected.labelKwh) + ' kWh/year'
      : '';

    $('results-message').hidden = true;
    $('results-basis').hidden = false;
    $('results-table').hidden = false;
    $('label-note').hidden = !selected;
  }

  // Each choice fills the next select and resets the ones after it.
  tech.addEventListener('change', function () {
    const bands = tech.value
      ? SIZE_BANDS.filter(function (b) { return models.some(function (m) { return m.tech === tech.value && sizeBand(m.sizeIn) === b; }); })
      : [];
    fillSelect(size, 'Select a size', bands.map(function (b) { return { text: b, value: b }; }));
    fillSelect(brand, 'Select a brand', []);
    fillSelect(model, 'Select a model', []);
  });

  size.addEventListener('change', function () {
    const brands = size.value
      ? Array.from(new Set(matches().map(function (m) { return m.brand; }))).sort(function (a, b) { return a.localeCompare(b); })
      : [];
    fillSelect(brand, 'Select a brand', brands.map(function (b) { return { text: b, value: b }; }));
    fillSelect(model, 'Select a model', []);
  });

  brand.addEventListener('change', function () {
    const list = brand.value
      ? matches().sort(function (a, b) { return a.model.localeCompare(b.model); })
      : [];
    fillSelect(model, 'Select a model', list.map(function (m) { return { text: m.model + ' – ' + m.watts + ' W', value: m.id }; }));
  });

  manual.addEventListener('change', function () {
    $('model-picker').hidden = manual.checked;
    $('watts-field').hidden = !manual.checked;
  });

  form.addEventListener('input', update);
  form.addEventListener('change', update);
  form.addEventListener('submit', function (event) {
    event.preventDefault();
    submitted = true;
    update();
    const firstInvalid = form.querySelector('[aria-invalid="true"]');
    if (firstInvalid) firstInvalid.focus();
  });

  // Start from a known state even if the browser restored old form values.
  form.reset();
  const techs = Array.from(new Set(models.map(function (m) { return m.tech; }))).sort();
  fillSelect(tech, 'Select a technology', techs.map(function (t) { return { text: t, value: t }; }));
  fillSelect(size, 'Select a size', []);
  fillSelect(brand, 'Select a brand', []);
  fillSelect(model, 'Select a model', []);
  $('model-picker').hidden = false;
  $('watts-field').hidden = true;
  update();
}

document.addEventListener('DOMContentLoaded', initCalculator);
```

- [ ] **Step 4: Run the logic check from Step 1**

Expected: `0.5 15.21 182.5 60.23 Under 43" 43–54" 55–64" 65"+ 5 null null null 0`

- [ ] **Step 5: Write `televisions.html`**

```html
<!DOCTYPE html>
<html lang="en-AU">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Televisions | Appliance Energy Consumption Website</title>
  <meta name="description" content="Estimate how much energy and money a television uses with the TV energy calculator.">
  <link rel="icon" href="assets/img/power-logo.png">
  <link rel="stylesheet" href="assets/css/styles.css">
  <script src="assets/js/main.js" defer></script>
  <script src="assets/data/tv-models.js" defer></script>
  <script src="assets/js/calculator.js" defer></script>
</head>
<body>
  <a class="skip-link" href="#main">Skip to main content</a>

  <header class="site-header">
    <nav class="site-nav container" aria-label="Main">
      <a class="logo" href="index.html"><img src="assets/img/power-logo.png" alt="Appliance Energy – Home" width="48" height="48"></a>
      <ul class="nav-links">
        <li><a href="index.html">Home</a></li>
        <li><a href="televisions.html" class="active" aria-current="page">Televisions</a></li>
        <li><a href="about.html">About Us</a></li>
      </ul>
    </nav>
  </header>

  <main id="main">
    <section class="hero">
      <div class="container">
        <p class="eyebrow">Televisions</p>
        <h1>How much does your TV cost to run?</h1>
        <p class="lead">Placeholder introduction. Televisions are one of the most-used appliances in Australian homes. Their energy use depends on screen size, screen technology and how many hours they are switched on each day.</p>
      </div>
    </section>

    <section class="section" aria-labelledby="calc-title">
      <div class="container">
        <h2 id="calc-title">TV energy calculator</h2>
        <p class="prose">Pick a TV from the Australian register, or enter its power in watts. Then tell us how long it is on each day and what you pay for electricity. Results update as you type.</p>

        <div class="calc-layout">
          <form id="calc-form" class="calc-form" novalidate autocomplete="off">
            <fieldset id="model-picker">
              <legend>1. Choose your TV</legend>
              <div class="field">
                <label for="tech">Screen technology</label>
                <select id="tech" name="tech"></select>
              </div>
              <div class="field">
                <label for="size">Screen size</label>
                <select id="size" name="size" disabled></select>
              </div>
              <div class="field">
                <label for="brand">Brand</label>
                <select id="brand" name="brand" disabled></select>
              </div>
              <div class="field">
                <label for="model">Model</label>
                <select id="model" name="model" disabled aria-describedby="model-error"></select>
                <p class="error" id="model-error"></p>
              </div>
            </fieldset>

            <div class="field field-check">
              <input type="checkbox" id="manual" name="manual">
              <label for="manual">Enter wattage manually</label>
            </div>

            <div class="field" id="watts-field" hidden>
              <label for="watts">Power usage (watts)</label>
              <input type="number" id="watts" name="watts" min="1" max="1000" step="any" inputmode="decimal" aria-describedby="watts-help watts-error">
              <p class="help" id="watts-help">Between 1 and 1000 W. Check the label or the manual.</p>
              <p class="error" id="watts-error"></p>
            </div>

            <fieldset>
              <legend>2. Your usage</legend>
              <div class="field">
                <label for="hours">Hours of use per day</label>
                <input type="number" id="hours" name="hours" value="5" min="0" max="24" step="any" inputmode="decimal" aria-describedby="hours-help hours-error">
                <p class="help" id="hours-help">Between 0 and 24.</p>
                <p class="error" id="hours-error"></p>
              </div>
              <div class="field">
                <label for="price">Electricity price (cents per kWh)</label>
                <input type="number" id="price" name="price" value="33" min="1" max="200" step="any" inputmode="decimal" aria-describedby="price-help price-error">
                <p class="help" id="price-help">Find this on your power bill. 33 c/kWh is a typical Australian rate.</p>
                <p class="error" id="price-error"></p>
              </div>
            </fieldset>

            <button type="submit" class="button">Calculate</button>
          </form>

          <section class="results" aria-labelledby="results-title">
            <h3 id="results-title">Your estimate</h3>
            <div aria-live="polite">
              <p class="results-message" id="results-message">Choose a TV model, or tick “Enter wattage manually”, to see your estimate.</p>
              <p class="results-basis" id="results-basis" hidden></p>
              <table class="results-table" id="results-table" hidden>
                <thead>
                  <tr><th scope="col">Period</th><th scope="col">Energy</th><th scope="col">Cost</th></tr>
                </thead>
                <tbody>
                  <tr><th scope="row">Per day</th><td id="kwh-day"></td><td id="cost-day"></td></tr>
                  <tr><th scope="row">Per month</th><td id="kwh-month"></td><td id="cost-month"></td></tr>
                  <tr><th scope="row">Per year</th><td id="kwh-year"></td><td id="cost-year"></td></tr>
                </tbody>
              </table>
              <p class="label-note" id="label-note" hidden></p>
            </div>
          </section>
        </div>

        <p class="data-note">Model data: Australian Energy Rating register (demo extract, 15 Feb 2026).</p>
      </div>
    </section>
  </main>

  <footer class="site-footer">
    <div class="container">
      <p>&copy; <span id="year">2026</span> Ngo Gia Hy – Student ID 106217563 · This website was developed with GenAI support.</p>
    </div>
  </footer>
</body>
</html>
```

- [ ] **Step 6: Browser check (double-click `televisions.html`)**

Expected:
1. **Happy path:** Technology `LCD (LED)` → size `55–64"` → a brand → a model. Size, brand and model are disabled until their previous step is chosen. Results appear immediately with a basis line, day/month/year kWh and AUD, and the "Energy label figure (assumes 10 h/day)" line.
2. **Change technology after a full selection:** size, brand and model reset and disable; results show the "Choose a TV model…" instruction, not the old figures.
3. **Manual mode:** tick the box → the picker hides and the watts field shows, with no error yet. Type `100` → results show `0.50 kWh / $0.17` per day and `182.50 kWh / $60.23` per year, with no label line. Untick → the picker returns with its earlier choice, and results switch back with no leftover watts error.
4. **Bad input:** in hours type `abc`, then `-1`, then `25` → each time the message "Hours per day must be between 0 and 24." appears under the field, the field has a red border, and results say "Fix the highlighted fields to see results." (never `NaN`). Price `0` → the price message. Manual watts `1e9` → the watts message.
5. **Hours `0`:** valid; results show `0.00 kWh` and `$0.00`.
6. **Submit with no model:** refresh, press Calculate → the model error appears under Model and focus moves to the model select.
7. **Refresh mid-way:** pick technology + size, then refresh (F5) → the form is back to defaults (hours 5, price 33), only Technology is enabled, results show the instruction. Repeat with manual mode ticked → after refresh, the picker is shown again and watts is hidden.
8. **Layout:** at 375px the results panel sits under the form with no horizontal scroll; at ≥900px they sit side by side.
9. **Nav:** Televisions is the active link; the footer year is correct.

---

### Task 4: README and final quality passes

**Files:**
- Create: `README.md`
- Modify: any file flagged by the passes below

**Interfaces:**
- Consumes: everything from Tasks 1–3.
- Produces: the final deliverable.

- [ ] **Step 1: Write `README.md`**

````markdown
# Appliance Energy Consumption Website

A small three-page website about appliance energy consumption in the Australian market, built for
COS30045 Data Visualisation (Demonstration 1). It includes an interactive TV energy calculator written in
vanilla JavaScript.

## How to view

Open `index.html` in a web browser (double-click it). No server, build step or internet connection is needed.

## Pages

- **Home** (`index.html`): introduction, key facts and a FAQ accordion.
- **Televisions** (`televisions.html`): the TV energy calculator.
- **About Us** (`about.html`): project purpose, data source and author.

## Folder structure

```
/
  index.html, televisions.html, about.html
  assets/
    css/styles.css            all styling
    js/main.js                footer year and FAQ accordion (all pages)
    js/calculator.js          energy calculator (Televisions page)
    data/tv-models.js         TV model data generated from the CSV
    img/power-logo.png        site logo
  dataset/tv_2026_02_15.csv   original data (Energy Rating register)
  tools/convert-tv-data.py    converts the CSV into assets/data/tv-models.js
  README.md
```

This follows the recommended structure, plus three additions:
- `assets/data/` holds the converted data. The site loads it as a script because browsers block reading a CSV
  file directly from a page opened by double-click.
- `dataset/` keeps the original, unmodified source data.
- `tools/` holds the conversion script, which is not part of the website itself.

## Updating the data

The calculator uses a demo dataset. To use another Energy Rating TV extract, put the CSV in `dataset/`, update
`SOURCE` in `tools/convert-tv-data.py`, then run:

```
python tools/convert-tv-data.py
```

## Data source

Australian Energy Rating product register: televisions (extract dated 15 February 2026).

## Author

Ngo Gia Hy – Student ID 106217563
````

- [ ] **Step 2: Repo-wide rule check**

```bash
python -c "
import pathlib,re
bad=[]
for p in ['index.html','televisions.html','about.html']:
    t=pathlib.Path(p).read_text(encoding='utf-8')
    if re.search(r'\sstyle=',t): bad.append(p+': inline style')
    if t.count('aria-current=\"page\"')!=1: bad.append(p+': active link count')
    if 'developed with GenAI support' not in t: bad.append(p+': GenAI footer')
for p in pathlib.Path('assets/js').glob('*.js'):
    if 'alert(' in p.read_text(encoding='utf-8'): bad.append(str(p)+': alert')
print(bad or 'OK')
"
```

Expected: `OK`

- [ ] **Step 3: Over-engineering pass**

Invoke the `ponytail:ponytail-review` skill on `assets/js/`, `assets/css/styles.css` and `tools/`. Apply the cuts that do not remove a spec requirement; list any declined cuts with the reason.

- [ ] **Step 4: Design and accessibility pass**

Invoke the `impeccable` skill (audit) on the three pages and run through the ui-ux-pro-max Quick Reference §1–§3 (accessibility, interaction, performance) and §8 (forms). Fix real findings; record any accepted exceptions.

- [ ] **Step 5: Final regression**

Re-run: the Task 1 Step 5 check, the Task 2 Step 1 check (extended to `televisions.html`), the Task 3 Step 1 check, and the Step 2 rule check above. All must match their expected output. Then repeat the Task 2 Step 9 and Task 3 Step 6 browser checks.
