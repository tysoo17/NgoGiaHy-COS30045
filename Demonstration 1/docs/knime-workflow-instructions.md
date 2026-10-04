# KNIME Workflow Instructions: "Bigger TVs, Bigger Bills"

Dataset: `dataset/tv_2026_10_03.csv` (5,340 TV models, Energy Rating register)

**Story:** bigger TVs are pushing up household energy bills.

| Chart | Audience question | Insight |
|---|---|---|
| A | Does screen size really change energy use? | 1: size vs kWh |
| B | Are TVs actually getting bigger? | 3: trend by registration year |
| C | What does that cost me, and does the star rating help? | 8: running cost in dollars |

The workflow has one shared **preparation** section, then three **branches**, one per chart, plus the
**class exercise branches** (Exercise 1 and 2, Part 5) that Demonstration 1 requires.
"Expected" values are included at each checkpoint so you can check your result.

```
CSV Reader ─┬─ Ex 1 branch: Column Filter → String Cleaner → String Replacer ×3 → Row Filter ×2
            │               → GroupBy → Sorter → Bar / Pie Chart → CSV Writer
            └─ Column Filter → Column Renamer → Math Formula (inch) → Math Formula (cost)
                 → String Manipulation (ExpYear) → Math Formula (RegYear) → Rule Engine (size band)
                      ├── Branch A: Linear Correlation / Scatter Plot / GroupBy → Bar Chart
                      ├── Branch B: Row Filter → GroupBy → Sorter → Line Plot
                      ├── Branch C: GroupBy → Bar Chart  and  Row Filter (65") → GroupBy → Bar Chart
                      └── Ex 2 branches: Histogram / inch bar chart / Small-Medium-Large / screen tech Pivot
```

Tip: right-click a node → **Execute**, then right-click → open the output table to check it before moving on.
Use **annotations** (right-click canvas → New workflow annotation) to label each section: your marker
will look for these.

---

## Part 1: Data preparation

### Step 1: CSV Reader
- **First, so the data is exported with the workflow:** in File Explorer, create a `data` folder inside this
  workflow's folder (e.g. `KNIME-WORKSPACE/COS30045/Demo1/data/`) and copy `tv_2026_10_03.csv` into it.
- Drag in **CSV Reader**, set **"Relative to → Current workflow data area"**, then browse to the CSV.
  Do not use an absolute path (`C:\...`), or the exported `.knwf` will not contain the data.
- Settings: delimiter `,`, "Has column header" ticked.
- **Checkpoint:** 5,340 rows, 32 columns.
- `ExpDate` can stay as a String (`S`): Step 6 reads the year straight from the text.

### Step 2: Column Filter
Keep only the columns the story needs:
`Brand_Reg`, `Model_No`, `screensize`, `Screen_Area`, `Screen_Tech`, `Star2`,
`Labelled energy consumption (kWh/year)`, `ExpDate`.

Why: smaller tables are easier to check, and you can explain that personal or irrelevant fields were excluded
(useful for the README "privacy" and "data processing" sections).

### Step 3: Column Renamer
Rename columns with spaces and brackets, because formulas cannot easily refer to them:
- `Labelled energy consumption (kWh/year)` → `kWh_year`
- `Star2` → `Star_Rating`

### Step 4: Math Formula: screen size in inches
`screensize` is in centimetres, but Australians shop by inches.
- Expression: `$screensize$ / 2.54`
- "Append column": `Inches`
- **Checkpoint:** most common values are around 55, 65, 75, 85, 43, 32.

### Step 5: Math Formula: annual running cost
- Expression: `$kWh_year$ * 0.33`
- Append column: `Cost_AUD_year`
- Assumption: $0.33 per kWh, a typical Australian residential rate. Write this in the README limitations section.

### Steps 6–7: the year (only needed for Branch B)
The register has **no registration date**. The only time information is `ExpDate`, the label expiry date
(`GrandDate` is empty for 99.5% of rows). Only the **year** is needed, because Branch B groups by year.

**If you are adding these to a workflow that already has Steps 1–5 and 8:**
1. Open the **Column Filter** (Step 2) and make sure `ExpDate` is included.
2. Delete the connection between **Math Formula (Cost)** and **Rule Engine** (click the line, press Delete).
3. Insert the two nodes below, so the chain becomes:
   ```
   Math Formula (Cost) → String Manipulation (ExpYear) → Math Formula (RegYear) → Rule Engine
   ```
4. Re-execute the Rule Engine. Branch A is unaffected: it only gains two extra columns.

#### Step 6: String Manipulation: expiry year
`ExpDate` is text like `2112-02-15`, so the year is the first 4 characters. No date conversion is needed.
- Expression: `toInt(substr($ExpDate$, 0, 4))`
- Append column: `ExpYear`
- 10 rows have no `ExpDate`, so their year will be missing. That is fine.
- (If your CSV Reader reads `ExpDate` as a Date, not a String, use **Extract Date&Time Fields** → Year instead.)

#### Step 7: Math Formula: estimated registration year
Labels expire 5 years after registration, so **registration year ≈ expiry year − 5**. Legacy models (2012–2013)
have odd expiry years 2112–2126 (+100 years), so those use −100.
- Expression: `if($ExpYear$ > 2100, $ExpYear$ - 100, $ExpYear$ - 5)`
- Append column: `RegYear`, and tick "Convert to Int".
- **Checkpoint:** most `RegYear` values are 2021–2026. 10 are missing.
- Document this as an **estimate** in the README "accuracy and limitations" section.

### Step 8: Rule Engine: size band
Create a category column for grouping. Rules (one per line, the first match wins):
```
$Inches$ <= 32.5 => "32 and under"
$Inches$ <= 43.5 => "33-43"
$Inches$ <= 55.5 => "44-55"
$Inches$ <= 65.5 => "56-65"
$Inches$ <= 75.5 => "66-75"
TRUE => "Over 75"
```
- Append column: `Size_Band`

Add an annotation around Steps 1–8: **"Data preparation"**.

---

## Part 2: Branch A: "Size drives energy use" (Insight 1)

Connect the output of the Rule Engine to each of the nodes below.

### A1: Linear Correlation
- Include `Inches` and `kWh_year`.
- **Checkpoint:** correlation ≈ **0.85** (strong positive). Quote this number in your story.

### A2: Scatter Plot (optional: add a Color Manager before it)
- (Optional) **Color Manager** on `Screen_Tech` to colour points by technology.
- **Scatter Plot**: X = `Inches`, Y = `kWh_year`.
- Title: "Bigger screens use more electricity". Axis labels: "Screen size (inches)", "Energy use (kWh per year)".

### A3: GroupBy → Bar Chart
- **GroupBy**: Group column `Size_Band`; Manual aggregation: `kWh_year` → **Median**, `Model_No` → **Count**.
- **Sorter** (optional): sort by median kWh ascending so the bands appear in size order.
- **Bar Chart**: category = `Size_Band`, value = `Median(kWh_year)`.
- **Checkpoint:**

| Size band | Models | Median kWh/yr |
|---|---|---|
| 32 and under | 663 | 105 |
| 33-43 | 706 | 205 |
| 44-55 | 1,394 | 320 |
| 56-65 | 1,010 | 452 |
| 66-75 | 783 | 576 |
| Over 75 | 784 | 806 |

Story line: *"A TV over 75 inches uses about 8× the electricity of a 32-inch TV."*

Use the median, not the mean: a few huge TVs (e.g. a 115" model at 2,652 kWh) would distort the mean.

---

## Part 3: Branch B: "TVs are getting bigger" (Insight 3)

**Question:** are TVs getting bigger over time, and is energy use rising with them? Needs `RegYear` (Steps 6–7).

```
Rule Engine ──► B1 Row Filter ──► B2 GroupBy ──► B3 Sorter ──┬──► B4a Line Plot (median kWh)
                                                             └──► B4b Line Plot (median inches)
```
B1 connects to the **Rule Engine output**, the same port Branch A uses. B1 → B2 → B3 is a chain. Both line plots
connect to the **Sorter** output.

### B1: Row Filter: keep 2021 onwards
- Criterion: column `RegYear`, operator **≥**, value **2021**, **include** matching rows.
- Why: earlier years have fewer than 35 models each, which is too few for a reliable median. This also drops the 10
  rows with no year.
- **Checkpoint:** **5,208 rows**.

### B2: GroupBy: one row per year
- **Groups** tab: `RegYear`.
- **Manual Aggregation** tab:

| Column | Aggregation | Why |
|---|---|---|
| `Inches` | Median | typical screen size that year |
| `kWh_year` | Median | typical energy use that year |
| `Star_Rating` | Mean | shows small changes in efficiency (the median is 5 almost every year and would hide them) |
| `Model_No` | Count | number of models, to show each year is reliable |

- Column naming: keep "Aggregation method (column name)", e.g. `Median(kWh_year)`.
- **Checkpoint:** 6 rows.

### B3: Sorter
- Sort by `RegYear` **ascending**. A line plot joins points in row order, and GroupBy does not guarantee the order.
- **Checkpoint:**

| RegYear | Median(Inches) | Median(kWh_year) | Mean(Star_Rating) | Count |
|---|---|---|---|---|
| 2021 | 54.6 | 354 | 4.85 | 293 |
| 2022 | 54.6 | 361 | 4.65 | 942 |
| 2023 | 54.6 | 372 | 4.74 | 849 |
| 2024 | **64.5** | **404** | 4.76 | 904 |
| 2025 | 64.5 | 404 | 4.94 | 1,346 |
| 2026 | 64.5 | 405 | 5.06 | 874 |

(54.6" and 64.5" are what "55-inch" and "65-inch" TVs actually measure. Call them 55" and 65" on the chart.)

### B4: Two Line Plots
| | B4a: energy | B4b: size |
|---|---|---|
| X axis | `RegYear` | `RegYear` |
| Y axis | `Median(kWh_year)` | `Median(Inches)` |
| Title | "Energy use of new TVs is rising" | "New TVs jumped from 55 to 65 inches in 2024" |
| Y label | "Median energy use (kWh per year)" | "Median screen size (inches)" |

- X label for both: "Estimated registration year".
- Two plots, because the scales differ (about 55–65 vs about 354–405), so one line would look flat on a shared axis.
- If years show as `2,021`, set whole-number ticks, or use **Number to String** on `RegYear` before plotting.

Add an annotation: **"Branch B: TVs are getting bigger (Insight 3)"**.

Story line: *"Since 2024 the typical new TV jumped from 55 to 65 inches, and energy use rose 14%, even though
star ratings slightly improved."*

Limitations: the years are estimated (Step 7); 2026 is a partial year (data to 3 Oct 2026); registered models are not
the same as sales.

---

## Part 4: Branch C: "What it costs you" (Insight 8)

**Question:** what does a TV cost to run, and does the star rating help? Does **not** use the year: it works with
or without Steps 6–7.

```
Rule Engine ─┬──► C1  GroupBy (Size_Band) ──► Bar Chart
             │
             └──► C2  Row Filter (65") ──► GroupBy (Star_Rating) ──► Sorter ──► Bar Chart
```
Both parts connect to the **Rule Engine output**, separately from each other.

### C1: Running cost by size band
1. **GroupBy:** Groups `Size_Band`. Manual Aggregation: `Cost_AUD_year` → **Median**, `Model_No` → **Count**.
2. **Bar Chart:** category `Size_Band`, value `Median(Cost_AUD_year)`.
   Title "Bigger TVs cost more to run". Y label "Median running cost ($ per year)".
- **Checkpoint:**

| Size band | 32 and under | 33-43 | 44-55 | 56-65 | 66-75 | Over 75 |
|---|---|---|---|---|---|---|
| Median $/year | 35 | 68 | 106 | 149 | 190 | **266** |

This is Branch A in dollars (kWh × $0.33), the unit the audience cares about.

### C2: Same size, different stars: does the rating matter?
Stars are calculated **relative to screen size**, so they can only be compared fairly within one size. Fixing the
size at 65" (one of the two most common sizes, with 826 models) compares like with like.

1. **Row Filter:** keep `Inches` **≥ 64.5 AND < 65.5** (two criteria, both must match).
   Or use a **Rule-based Row Filter**: `$Inches$ >= 64.5 AND $Inches$ < 65.5 => TRUE`.
   - **Checkpoint:** **826 rows**.
2. **GroupBy:** Groups `Star_Rating`. Manual Aggregation: `Cost_AUD_year` → **Median**, `Model_No` → **Count**.
3. **Sorter:** `Star_Rating` **ascending**, so the bars run from fewest to most stars.
4. **Bar Chart:** category `Star_Rating`, value `Median(Cost_AUD_year)`.
   Title "More stars, lower bills (65-inch TVs)". X label "Star rating". Y label "Median running cost ($ per year)".
   If `Star_Rating` is not offered as a category, add **Number to String** on it before the chart.
- **Checkpoint (65" TVs):**

| Stars | 1 | 2 | 3 | 4 | 4.5 | 5 | 5.5 | **6** | 7 | 8 |
|---|---|---|---|---|---|---|---|---|---|---|
| Models | 12 | 11 | 18 | 149 | 118 | 186 | 131 | 131 | 8 | 3 |
| Median $/yr | 355 | **296** | 230 | 185 | 167 | 148 | 134 | **119** | 84 | 68 |

(Half-star levels 1.5, 2.5 and 3.5 are also in the table: $314, $256 and $211.)

Add an annotation: **"Branch C: What it costs you (Insight 8)"**.

Story line: *"Two 65-inch TVs can differ by about $177 a year to run. Over a 10-year life, choosing 6 stars over
2 stars saves about $1,770."*

Small groups: levels with fewer than 20 models (below 4★, and 7★ and above) are less reliable. Say so, or merge
them (e.g. "3 or fewer", "7+") with a Rule Engine before the GroupBy. The comparison in the story uses 2★ vs 6★.

---

## Part 5: Class exercises (Exercise 1 and 2) linked to the story

Demonstration 1 marks the class exercises, so they must be in the same `.knwf`. Each one below is tied to an
insight, so you can present the class work and the story as **one** piece of analysis.
These checkpoints use `tv_2026_10_03.csv`, so they differ from the numbers on Canvas (which use the February file).

### Exercise 1: "How many TV models does each brand currently have available in Australia?"
**Link to the story:** this is the data-cleaning groundwork. It shows the market is dominated by a few big brands, and
it explains why the story **does not rank brands** (see README "Ethics").

Connect these to the **CSV Reader** directly (the shared Column Filter drops `SoldIn` and `Availability Status`).

| # | Node | Settings | Checkpoint |
|---|---|---|---|
| E1.1 | Column Filter | Keep `Brand_Reg`, `SoldIn`, `Availability Status` | 5,340 rows, 3 columns. Statistics: **105** unique brands |
| E1.2 | String Cleaner | `Brand_Reg`: trim whitespace, change case to **lower case** | **91** brands ("Kogan"/"KOGAN"/"kogan" merge) |
| E1.3 | String Replacer ×3 | `samsung electronics` → `samsung`; `q.bell` → `qbell`; `s vision` → `svision` (match the whole string) | **88** brands |
| E1.4 | Row Filter | `Availability Status` = `Available` | 5,025 rows, **78** brands |
| E1.5 | Row Filter | Remove `SoldIn` values without Australia (`New Zealand`, `Fiji,New Zealand`), e.g. wildcard `*Australia*` | 4,845 rows, **74** brands, 4 SoldIn values |
| E1.6 | GroupBy | Group `Brand_Reg`; aggregation `SoldIn` → **Count** | 74 rows |
| E1.7 | Sorter | Count descending | Samsung 1,199 · Kogan 842 · LG 723 · Hisense 332 · EKO 182 |
| E1.8 | Bar Chart + Pie Chart | Category `Brand_Reg`, value Count. Pie: keep "aggregate small categories" | Pie is readable; bar has too many categories |
| E1.9 | CSV Writer | `brand_count.csv`, "if file exists" → **overwrite** | |

Talking points:
- **Brand merges are judgement calls:** Samsung/Samsung Electronics, Q.Bell/QBell and S Vision/SVision are the same
  company. I did **not** merge `hubbl` and `hubbl glass` (Hubbl Glass is a product line, so it is arguable), or
  `signify` and `philips`: Signify makes Philips **lighting**, and the TVs are made by a different company, so the
  names alone don't prove they are the same brand.
- **Why remove Unavailable and non-Australian models:** the audience is Australian shoppers buying now.
- **Limitation:** some model numbers appear several times (e.g. the same model registered for different markets), so
  counts are slightly inflated. The exercise assumes no duplicates.

### Exercise 2, Q1: "How frequent is each size of TV?" (Histogram)
**Link:** it checks the size data that Insight 1 relies on.

- **Histogram** on `screensize` (cm), from the Rule Engine output. Try bin counts of 10, 20 and 30.
- **Checkpoint (20 bins):** tall bars at about 129–141 cm (55"), 154–166 cm (65") and 179–192 cm (75"). Small bars
  at about **141–154 cm (64 models)** and **166–179 cm (95 models)**.
- **What the small bars are:** checking model numbers (which contain the size in inches), they are mostly
  **real niche sizes**: 58" (e.g. TCL 58P635, Hisense 58A6HAU), 60" (Kogan KALED60…) and 70" (Hisense 70A6G, EKO K70USW).
  They are not errors, just less common sizes falling between the popular ones.
- **One likely misclassification:** Sylvox `OT50A2K3GD` is recorded as 143 cm (56") but the model number suggests 50".
  Flag it rather than delete it: one row does not change the medians.
- **Also notice:** "65-inch" TVs measure 64.5" (163.9 cm). That's why the bands in Step 8 split at x.5.
- **Bin size:** with fewer bins, the niche sizes are hidden inside larger bars. With more bins, each popular size
  becomes its own spike.

### Exercise 2, Q2: "How does screen size impact energy consumption?"
**Link:** this **is** Insight 1. Reuse Branch A rather than duplicating it:
- **Scatter plot (cm → inches):** Steps 4 and A2 already do this. Correlation **r = 0.85**.
- **Bar chart per screen size:**
  1. Math Formula `round($Inches$)` → append `Inch_Round`, tick "Convert to Int".
  2. **Number to String** on `Inch_Round`. Bar charts need a nominal (string) category.
  3. GroupBy `Inch_Round` → `kWh_year` **Mean** → Sorter → Bar Chart.
  - **Checkpoint (mean kWh):** 32" 123 · 43" 235 · 55" 360 · 65" 492 · 75" 618 · 85" 808.
- **Small / Medium / Large:**
  1. Rule Engine on `Inches` → append `Size_Category`:
     ```
     $Inches$ <= 43.5 => "Small"
     $Inches$ <= 65.5 => "Medium"
     TRUE => "Large"
     ```
     (43.5 and 65.5 cover the gaps in the exercise's "under 43", "44 to 65" and "over 66", and match Step 8.)
  2. GroupBy `Size_Category` → `kWh_year` Mean and Count → Bar Chart.
  - **Checkpoint:** Small 1,369 models, **159** kWh · Medium 2,404, **396** · Large 1,567, **749**.
  - In dollars at $0.33/kWh (link to Insight 8): about **$52 vs $131 vs $247** per year.

### Exercise 2, Q3: "How does screen type affect energy consumption?"
**Link:** this is the same "compare like with like" idea as Insight 8 (C2), and it produces a **surprising result**.

| # | Node | Checkpoint |
|---|---|---|
| Q3.1 | GroupBy `Screen_Tech` → Count → Bar Chart | LCD (LED) **4,332** · LCD 678 · OLED 324 · Plasma 6 |
| Q3.2 | GroupBy `Screen_Tech` → `Inches` Mean → Bar Chart | LCD 51.2" · LED 59.2" · **OLED 64.7"** (largest) |
| Q3.3 | GroupBy `Screen_Tech` → `kWh_year` Mean | LCD 350 · LED 450 · **OLED 480**. OLED looks worst... |
| Q3.4 | **Pivot**: Groups `Screen_Tech`, Pivots `Size_Category`, Manual aggregation `kWh_year` **Mean** → Grouped Bar Chart | see below |

Pivot result (mean kWh/year; model counts in brackets):

| Screen_Tech | Small | Medium | Large |
|---|---|---|---|
| LCD | 137 (266) | 375 (281) | 729 (131) |
| LCD (LED) | 163 (1,081) | 401 (1,924) | 755 (1,327) |
| OLED | 233 (**19**) | **376** (196) | **708** (109) |
| Plasma | 370 (3) | 486 (3) | none |

**Key finding:** overall, OLED seems to use the most energy (480). But at the **same size**, medium and large OLEDs
use **less** than LED TVs (376 vs 401, and 708 vs 755). OLED only looked worse because OLED TVs are bigger on average.
Small OLED (19 models) and Plasma (6) are too few to trust.
This is exactly why Insight 8 fixes the size at 65" before comparing star ratings.

**Questions from the exercise:**
- *Why mean for energy?* kWh/year is a continuous quantity, so averages make sense. (The story itself uses the
  **median** because a few huge TVs skew the mean; be ready to explain both choices.)
- *What summary suits Star2?* Star ratings are **ordinal** (ranked steps, not equal amounts of energy), so use the
  **median** or **mode**. Here the median is **5 stars for Small, Medium and Large alike**.
- *Star2 for comparing sizes?* It would mislead. Stars are calculated **relative to screen size**, so a large TV can
  have the same stars as a small one while using 4–5× the energy. This is why Insight 8 uses stars only **within
  one size**.
- *Data quality:* 28 models have Star2 = 0. Their `Star Rating Index` is "-", so these are **missing values**, not
  real ratings. None of them are 65" TVs, so Branch C is unaffected, but exclude them before averaging stars.

Add annotations: **"Exercise 1: Models per brand"**, **"Exercise 2: Size, energy and screen technology"**.

---

## Part 6: Export

- **CSV Writer** after each final GroupBy/Sorter so the results can feed your website charts:
  `size_band_energy.csv`, `trend_by_year.csv`, `cost_65inch_by_star.csv`.
- Export each chart: open the view → use its download/export image option, or take a screenshot. Annotate the
  images (key number, short takeaway title) in PowerPoint or Excel if needed.
- Save the three images with these exact names so they appear on the Televisions page automatically:
  - `assets/img/chart-a-size.png`: Branch A bar chart (median kWh by size band)
  - `assets/img/chart-b-trend.png`: Branch B line chart (by year)
  - `assets/img/chart-c-cost.png`: Branch C2 bar chart (65" cost by star rating)
- If your numbers differ from the checkpoints, update the matching text and alt text in `televisions.html`.
- Save the workflow and export it via **File → Export KNIME Workflow** (`.knwf`) for submission.

## Checklist before submitting
- [ ] Annotations on: Data preparation, Branch A, Branch B, Branch C, Exercise 1, Exercise 2, Export
- [ ] CSV Reader uses "Relative to → Current workflow data area"; exported `.knwf` re-imports and runs
- [ ] Exercise 1 and 2 checkpoints match (Part 5)
- [ ] Every chart has a title that states the takeaway, plus axis labels with units
- [ ] Assumptions written in README: $0.33/kWh, estimated RegYear, 2026 partial year, median used
- [ ] Checkpoint numbers match (small differences are fine if your band boundaries differ slightly)
