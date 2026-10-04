# Appliance Energy Consumption Website

A small three-page website about appliance energy consumption in the Australian market, built for
COS30045 Data Visualisation (Demonstration 1). It includes an interactive TV energy calculator written in
vanilla JavaScript.

## How to view

Open `index.html` in a web browser (double-click it). No server, build step or internet connection is needed.

## Pages

- **Home** (`index.html`): introduction, key facts and a FAQ accordion.
- **Televisions** (`televisions.html`): the data story "Bigger TVs, bigger bills" (three annotated KNIME charts),
  the TV energy calculator, and the storyboard used to plan the page.
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
  dataset/tv_2026_10_03.csv   original data used by the story and calculator (Energy Rating register)
  dataset/tv_2026_02_15.csv   earlier extract, kept for reference
  tools/convert-tv-data.py    converts the CSV into assets/data/tv-models.js
  README.md
```

This follows the recommended structure, plus three additions:
- `assets/data/` holds the converted data. The site loads it as a script because browsers block reading a CSV
  file directly from a page opened by double-click.
- `dataset/` keeps the original, unmodified source data.
- `tools/` holds the conversion script, which is not part of the website itself.

## Updating the data

The calculator uses the 3 October 2026 extract. To use another Energy Rating TV extract, put the CSV in `dataset/`, update
`SOURCE` in `tools/convert-tv-data.py`, then run:

```
python tools/convert-tv-data.py
```

## Submitting

Zip only the site files listed under "Folder structure" above. Leave out the tooling folders `.claude/`,
`.impeccable/`, `.superpowers/` and `docs/` (design notes and plans); they are not part of the website.

## Data Story: Bigger TVs, bigger bills

**Main message:** TVs sold in Australia are getting bigger, and bigger screens use more electricity. The star
label is the easiest way for a household to keep a big screen without a big bill.

The story uses the Australian Energy Rating register of 5,340 television models (extract dated 3 October 2026).

### Step 1: Who is the audience?

**Primary audience:** Australian households shopping for a new or replacement TV.

**Characteristics**

| Characteristic | What it means for the design |
|---|---|
| Not energy experts. "kWh" and "standby power" mean little to them. | Lead with dollars; explain kWh once, in plain words. |
| They shop by screen size in **inches** and by **price**. | Use inches (the register records centimetres) and dollars throughout. |
| They see the star label in store but rarely know what it is worth. | Show the star rating's value as a yearly dollar saving. |
| Short attention span; often reading on a **phone**, sometimes in the shop. | One point per chart, short paragraphs, mobile-first layout. |
| Range of ages and backgrounds, including people with low vision. | Plain English, text alternatives for every chart, colours that are not the only cue. |
| Making a one-off purchase that lasts about 10 years. | Show lifetime cost, not only yearly cost. |

**Example visitor:** a couple replacing a 55-inch TV. A 75-inch model is on sale, and they wonder whether it will
noticeably change their power bill.

**Which questions matter most?** Running cost matters most, because it affects the household budget directly.
The size question comes next, because it explains *why* costs differ. The market trend matters least to an
individual buyer, but it shows the problem is growing, which gives the story urgency.

**What the audience does not need:** technical test standards, registration numbers, manufacturing country or
brand rankings. These columns were left out of the story so the main message stays clear.

**Guidelines for the visualisation story**
1. Plain language; no unexplained jargon or abbreviations.
2. Numbers in dollars and inches; round to whole numbers.
3. One point per chart; the chart title states the takeaway (e.g. "Bigger screens use more electricity"),
   not just the variables.
4. Use medians, not means, so a few huge TVs (up to 2,652 kWh/year) do not distort the picture.
5. Label every assumption (electricity price, hours of use, estimated years) next to the chart.
6. Compare like with like: cost by star rating is shown for one screen size (65 inches).
7. Design for mobile first; each chart readable on a 375 px wide screen.
8. Accessible: alt text for every chart, sufficient contrast, colour never the only way to read the data.
9. End with an action: the calculator lets visitors check their own TV.

### Step 2: What do they want to know?

| # | Audience question | Why it matters to them | Answer from the data |
|---|---|---|---|
| 1 | **Does screen size really change energy use?** | They are deciding how big to go. | Yes, strongly (correlation r = 0.85). Median use rises from 105 kWh/year (32 inches and under) to 806 kWh/year (over 75 inches), about 8 times as much. |
| 2 | **Are TVs actually getting bigger?** | Shows their next TV will likely use more than their last one. | Yes. The median newly registered TV jumped from 55 to 65 inches in 2024, and median energy use rose 14% (354 to 405 kWh/year, 2021 to 2026). |
| 3 | **What will it cost me, and does the star rating help?** | Turns energy into money and gives them something to act on. | For 65-inch TVs, 2 stars costs about $296/year and 6 stars about $119/year: a saving of about $177/year, or about $1,770 over 10 years. |

### Step 3: How is the information presented?

The page follows a simple narrative arc: **hook → evidence → why it is getting worse → what you can do → try it
yourself**.

| Story beat | Visualisation | Why this form | Annotation |
|---|---|---|---|
| Hook | Headline and one key number (typical TV costs about $129/year to run) | A single number is quicker to read than a chart and makes the topic personal. | None needed. |
| Evidence | **Bar chart:** median kWh/year by six size bands. A scatter plot of size vs kWh supports it. | Bars compare categories accurately; bands match how people shop. The scatter shows the relationship holds across all 5,340 models. | "Over 75 inches uses about 8x the energy of 32 inches." |
| Getting worse | **Line chart:** median screen size and median kWh by year, 2021 to 2026 | Lines are the standard form for change over time. | Mark 2024: "Typical new TV jumped from 55 to 65 inches." Note that 2026 is a partial year. |
| What you can do | **Bar chart:** median yearly cost of 65-inch TVs by star rating | Fixing the size isolates the effect of the star rating; dollars speak to the audience directly. | Highlight 2 and 6 stars: "Save about $177 a year." |
| Try it yourself | Existing TV energy calculator | Lets visitors apply the story to their own TV. | None. |

**Design choices**
- Charts are produced in KNIME (see `docs/knime-workflow-instructions.md`), then titled and annotated in Excel or
  PowerPoint, and shown as images on the Televisions page.
- Colours come from the site palette (amber and brown from the logo). The key bar or point is highlighted in amber,
  and the rest are muted.
- No pie charts or 3D effects: they make it harder to compare values.
- Each chart sits beside two or three sentences that explain it, with a caption giving the source and assumptions.

**Storyboard:** a text-sketch storyboard of the six screens a visitor moves through is shown at the bottom of the
Televisions page under "How this page was planned". Each sketch links to its finished chart.

## About the data

### Data source
- **Australian Energy Rating product register: televisions**, extract dated 3 October 2026
  (`dataset/tv_2026_10_03.csv`). The register is published by the Australian and New Zealand governments'
  Equipment Energy Efficiency (E3) program at https://reg.energyrating.gov.au.
- 5,340 rows (one per registered TV model) and 32 columns, including screen size, screen technology, labelled
  energy use, star rating, standby power, brand, country of manufacture and label expiry date.
- Every TV sold in Australia must be registered and carry an energy label, so the register covers the whole
  market of registered models, not a sample.

### Data processing
Processing was done in KNIME, following `docs/knime-workflow-instructions.md`:
1. **Selected columns:** kept only the 8 columns the story needs (brand, model, screen size, screen area,
   screen technology, star rating, labelled kWh/year, expiry date).
2. **Renamed columns** with spaces and brackets so formulas can use them.
3. **Converted units:** screen size from centimetres to inches (÷ 2.54), because Australians shop in inches.
4. **Calculated running cost:** labelled kWh/year × $0.33 per kWh.
5. **Estimated registration year:** label expiry year − 5 (labels last 5 years); legacy models with expiry years
   2112–2126 use − 100.
6. **Grouped screen sizes** into six bands (32 and under, 33–43, 44–55, 56–65, 66–75, over 75 inches).
7. **Aggregated** with medians: energy and cost by size band, size and energy by year (2021–2026), and cost by star
   rating for 65-inch TVs only.

For the calculator, `tools/convert-tv-data.py` keeps one row per brand and model (the latest registration),
merges brand names that differ only in capitalisation, and writes `assets/data/tv-models.js` (5,080 models).

### Privacy
The dataset describes TV **products**, not people. It contains no personal information about consumers. The only
names are company brands and manufacturer website links, which are already public. The calculator runs entirely
in the browser: nothing the visitor enters is stored or sent anywhere.

### Accuracy and limitations
- **Labelled energy is a test figure, not real use.** It assumes 10 hours a day in a standard test mode. Real
  use depends on viewing hours, brightness settings and content (e.g. HDR uses more).
- **Electricity price is an assumption.** $0.33/kWh is a typical Australian residential rate; actual rates vary
  by state, retailer and tariff.
- **Registration years are estimated** from label expiry dates; the register has no registration date column.
  10 models have no expiry date and are left out of the trend. 2026 is a partial year (to 3 October).
- **Registered is not the same as sold.** Each model counts once, whether it sold one unit or a million, so
  medians describe the range of models on offer, not what households own.
- **Duplicates:** some models are registered more than once (e.g. under different submissions or markets), and
  some near-identical models differ only in model number. These can slightly over-weight some brands and sizes.
- **Small groups:** star levels with fewer than 10 models (7 stars and above at 65 inches) are less reliable.
- **Data quality:** 949 rows have "-" instead of a number for standby power, and some brand names are spelled
  inconsistently. Neither affects the three charts, which do not use those fields.

### Ethics
- **Fair comparison:** costs by star rating are compared at a single screen size (65 inches), so the story does
  not blame large TVs or favour small ones unfairly.
- **No brand shaming:** the story does not rank or name brands, because model counts differ widely and
  duplicates would make rankings misleading.
- **Honest charts:** bar charts start at zero, assumptions are stated next to each chart, and medians are used
  so extreme models do not exaggerate the message.
- **Respecting the reader's choice:** the story shows the cost of a bigger screen and how to reduce it; it does
  not tell people which TV to buy.
- **Source attribution:** the data is credited to the Energy Rating register on every page that uses it.

## AI Declaration

I used generative AI (Claude Code, by Anthropic) in this project for:
- profiling the dataset and suggesting possible insights to analyse;
- writing step-by-step instructions for building the KNIME workflow (I built and ran the workflow myself);
- drafting the storyboard, the audience analysis and the data story text;
- writing and updating the website's HTML, CSS and JavaScript, and the data conversion script;
- drafting this README.

I chose the story, audience and insights, checked the figures against my own KNIME results, and reviewed and
edited all AI-generated content. I am responsible for the final work.

## Author

Ngo Gia Hy – Student ID 106217563
