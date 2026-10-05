// Interactive chart C (Televisions page): yearly running cost by star rating.
// Needs TV_MODELS (tv-models.js) and readNumber() (calculator.js), loaded before this file.

const COST_SIZES = [32, 43, 50, 55, 65, 75, 85];
const MIN_MODELS = 3;

function median(values) {
  const sorted = values.slice().sort(function (a, b) { return a - b; });
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

// Median label kWh per star rating for one screen size. Unrated models and thin groups are left out.
function starGroups(sizeIn) {
  const groups = new Map();
  TV_MODELS.forEach(function (m) {
    if (m.sizeIn !== sizeIn || m.stars === 0) return;
    if (!groups.has(m.stars)) groups.set(m.stars, []);
    groups.get(m.stars).push(m.labelKwh);
  });
  return Array.from(groups, function (entry) { return { stars: entry[0], count: entry[1].length, kwh: median(entry[1]) }; })
    .filter(function (g) { return g.count >= MIN_MODELS; })
    .sort(function (a, b) { return a.stars - b.stars; });
}

function initCostChart() {
  const figure = document.querySelector('.cost-chart');
  const size = document.getElementById('cost-size');
  const price = document.getElementById('cost-price');
  const rows = document.getElementById('cost-rows');
  const tip = document.getElementById('cost-tip');
  const aud = new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD', maximumFractionDigits: 0 });
  const kwhFormat = new Intl.NumberFormat('en-AU', { maximumFractionDigits: 0 });

  const bySize = new Map(COST_SIZES.map(function (s) { return [s, starGroups(s)]; }));
  // One scale for every size, so a bigger screen really does show longer bars.
  const maxKwh = Math.max.apply(null, Array.from(bySize.values()).flat().map(function (g) { return g.kwh; }));
  let pricePerKwh = 0.33;

  function showTip(row, bar, g) {
    tip.replaceChildren();
    const cost = document.createElement('strong');
    cost.textContent = aud.format(g.kwh * pricePerKwh) + ' a year';
    tip.append(cost, g.stars + (g.stars === 1 ? ' star · ' : ' stars · ') + g.count + ' models · ' + kwhFormat.format(g.kwh) + ' kWh a year · ' +
      aud.format(g.kwh * pricePerKwh * 10) + ' over 10 years');
    tip.hidden = false;

    // Sit just above the bar's end, without running past the chart's right edge.
    const box = figure.getBoundingClientRect();
    const end = bar.getBoundingClientRect();
    tip.style.left = Math.max(0, Math.min(end.right - box.left - 24, box.width - tip.offsetWidth)) + 'px';
    tip.style.top = (end.top - box.top - tip.offsetHeight - 6) + 'px';
  }

  function hideTip() { tip.hidden = true; }

  function drawBars() {
    hideTip();
    rows.replaceChildren();
    bySize.get(Number(size.value)).forEach(function (g) {
      const row = rows.insertRow();
      row.tabIndex = 0;
      row.setAttribute('aria-describedby', 'cost-tip');

      const label = document.createElement('th');
      label.scope = 'row';
      label.textContent = g.stars + (g.stars === 1 ? ' star' : ' stars');

      const track = document.createElement('div');
      track.className = 'bar-track';
      const bar = document.createElement('span');
      bar.className = 'bar';
      bar.style.setProperty('--share', g.kwh / maxKwh);
      const value = document.createElement('span');
      value.className = 'bar-value';
      value.textContent = aud.format(g.kwh * pricePerKwh);
      track.append(bar, value);

      row.append(label);
      row.insertCell().append(track);
      row.addEventListener('pointerenter', function () { showTip(row, bar, g); });
      row.addEventListener('focus', function () { showTip(row, bar, g); });
      row.addEventListener('pointerleave', hideTip);
      row.addEventListener('blur', hideTip);
    });
  }

  // A price change only rewrites the costs; the bar lengths are kWh and stay put.
  function updateCosts() {
    const cents = readNumber(price, 1, 200);
    document.getElementById('cost-price-error').textContent = cents === null ? 'Price must be between 1 and 200 cents per kWh.' : '';
    if (cents === null) {
      price.setAttribute('aria-invalid', 'true');
      return;
    }
    price.removeAttribute('aria-invalid');
    pricePerKwh = cents / 100;
    const groups = bySize.get(Number(size.value));
    rows.querySelectorAll('.bar-value').forEach(function (value, i) {
      value.textContent = aud.format(groups[i].kwh * pricePerKwh);
    });
    hideTip();
  }

  COST_SIZES.forEach(function (s) { size.add(new Option(s + ' inches', s)); });
  size.value = '65';
  price.value = '33';
  size.addEventListener('change', drawBars);
  price.addEventListener('input', updateCosts);
  drawBars();
}

document.addEventListener('DOMContentLoaded', initCostChart);
