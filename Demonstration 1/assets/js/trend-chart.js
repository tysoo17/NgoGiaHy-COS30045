// Interactive chart B (Televisions page): median screen size and energy use by registration year.
// Values follow the KNIME workflow: registration year = expiry year - 5 (- 100 for 21xx typos),
// medians over all register rows from 2021 on.

const TREND = [
  { year: 2021, size: 54.6, kwh: 354 },
  { year: 2022, size: 54.6, kwh: 361 },
  { year: 2023, size: 54.6, kwh: 372 },
  { year: 2024, size: 64.5, kwh: 404 },
  { year: 2025, size: 64.5, kwh: 404 },
  { year: 2026, size: 64.5, kwh: 405 }
];

// Two charts, one measure each: never two y-scales on one plot.
const TREND_PANELS = {
  size: { title: 'Median screen size', axis: 'Screen size (inches)', min: 50, max: 70, ticks: [50, 60, 70],
    format: function (v) { return Math.round(v) + '"'; },
    describe: function (d) { return 'median screen size ' + Math.round(d.size) + ' inches'; } },
  kwh: { title: 'Median energy use', axis: 'Energy use (kWh per year)', min: 300, max: 450, ticks: [300, 350, 400, 450],
    format: function (v) { return v + ' kWh'; },
    describe: function (d) { return 'median energy use ' + d.kwh + ' kWh a year'; } }
};

function svgEl(parent, name, attrs) {
  const el = document.createElementNS('http://www.w3.org/2000/svg', name);
  Object.keys(attrs).forEach(function (k) { el.setAttribute(k, attrs[k]); });
  parent.append(el);
  return el;
}

// One line chart in its own figure. link.show/link.hide keep the year highlight in step across charts.
function trendChart(holder, key, link) {
  const p = TREND_PANELS[key];
  const figure = holder.closest('figure');
  const tip = figure.querySelector('.chart-tip');
  const margin = { left: 60, right: 72, top: 28, bottom: 52 };
  const panelHeight = 140;
  const last = TREND.length - 1;
  const chart = {};
  let drawnWidth = 0;
  let x = null;
  let dots = [];
  let crosshair = null;

  // Drawn at the real pixel width so text stays the same size on phones and desktops.
  function draw() {
    const width = holder.clientWidth;
    if (width === drawnWidth) return;
    drawnWidth = width;
    const height = margin.top + panelHeight + margin.bottom;
    const step = (width - margin.left - margin.right) / last;
    const y = function (v) { return margin.top + panelHeight - (v - p.min) / (p.max - p.min) * panelHeight; };
    x = function (i) { return margin.left + i * step; };

    holder.replaceChildren();
    const svg = svgEl(holder, 'svg', { width: width, height: height, role: 'group', 'aria-label': p.title + ' by registration year' });
    const art = svgEl(svg, 'g', { 'aria-hidden': 'true' });

    svgEl(art, 'text', { x: 0, y: 14, class: 'trend-title' }).textContent = p.title;
    p.ticks.forEach(function (t) {
      svgEl(art, 'line', { x1: margin.left, x2: width - margin.right, y1: y(t), y2: y(t), class: 'trend-grid' });
      svgEl(art, 'text', { x: margin.left - 8, y: y(t), class: 'trend-tick', 'text-anchor': 'end', 'dominant-baseline': 'middle' }).textContent = t;
    });
    TREND.forEach(function (d, i) {
      svgEl(art, 'text', { x: x(i), y: margin.top + panelHeight + 20, class: 'trend-tick', 'text-anchor': 'middle' }).textContent = d.year;
    });

    // Axis titles: years along the bottom, the measure up the left side.
    svgEl(art, 'text', { x: (margin.left + width - margin.right) / 2, y: height - 6, class: 'trend-axis', 'text-anchor': 'middle' }).textContent = 'Registration year';
    svgEl(art, 'text', {
      x: -(margin.top + panelHeight / 2), y: 12, class: 'trend-axis', 'text-anchor': 'middle',
      'dominant-baseline': 'middle', transform: 'rotate(-90)'
    }).textContent = p.axis;

    const pts = TREND.map(function (d, i) { return [x(i), y(d[key])]; });
    svgEl(art, 'polyline', { points: pts.slice(0, last).join(' '), class: 'trend-line' });
    svgEl(art, 'polyline', { points: pts.slice(last - 1).join(' '), class: 'trend-line is-partial' });
    crosshair = svgEl(art, 'line', { y1: margin.top - 4, y2: margin.top + panelHeight, class: 'trend-crosshair', visibility: 'hidden' });
    dots = pts.map(function (pt, i) {
      return svgEl(art, 'circle', { cx: pt[0], cy: pt[1], r: 4, class: i === last ? 'trend-dot is-partial' : 'trend-dot' });
    });

    // Direct labels on the first and last years only; the tooltip carries the rest.
    svgEl(art, 'text', { x: pts[0][0], y: pts[0][1] - 12, class: 'trend-value' }).textContent = p.format(TREND[0][key]);
    svgEl(art, 'text', { x: pts[last][0] + 10, y: pts[last][1], class: 'trend-value', 'dominant-baseline': 'middle' }).textContent = p.format(TREND[last][key]);

    // One hit column per year, so the pointer only has to be near the year, not on the dot.
    TREND.forEach(function (d, i) {
      const hit = svgEl(svg, 'rect', {
        x: x(i) - step / 2, y: 0, width: step, height: height, class: 'trend-hit', tabindex: 0,
        'aria-label': d.year + (i === last ? ' (partial year)' : '') + ': ' + p.describe(d)
      });
      hit.addEventListener('pointerenter', function () { link.show(i, chart); });
      hit.addEventListener('focus', function () { link.show(i, chart); });
      hit.addEventListener('blur', link.hide);
    });
    svg.addEventListener('pointerleave', link.hide);
  }

  // Every chart marks the year; only the one being pointed at shows the tooltip.
  chart.show = function (i, withTip) {
    crosshair.setAttribute('x1', x(i));
    crosshair.setAttribute('x2', x(i));
    crosshair.setAttribute('visibility', 'visible');
    dots.forEach(function (dot, j) { dot.setAttribute('r', j === i ? 6 : 4); dot.classList.toggle('is-active', j === i); });
    if (!withTip) {
      tip.hidden = true;
      return;
    }

    const d = TREND[i];
    tip.replaceChildren();
    const year = document.createElement('strong');
    year.textContent = d.year + (i === last ? ' (partial year)' : '');
    tip.append(year, TREND_PANELS.size.format(d.size) + ' screen · ' + TREND_PANELS.kwh.format(d.kwh) + ' a year');
    tip.hidden = false;

    // Beside the crosshair (flipping left near the right edge), on the far side of the point from the line's level.
    const box = figure.getBoundingClientRect();
    const plot = holder.getBoundingClientRect();
    const cx = plot.left - box.left + x(i);
    const cy = Number(dots[i].getAttribute('cy'));
    const pointTop = plot.top - box.top + cy;
    tip.style.left = (cx + 12 + tip.offsetWidth > box.width ? Math.max(0, cx - 12 - tip.offsetWidth) : cx + 12) + 'px';
    tip.style.top = (cy < margin.top + panelHeight / 2 ? pointTop + 14 : pointTop - 14 - tip.offsetHeight) + 'px';
  };

  chart.hide = function () {
    tip.hidden = true;
    crosshair.setAttribute('visibility', 'hidden');
    dots.forEach(function (dot) { dot.setAttribute('r', 4); dot.classList.remove('is-active'); });
  };

  draw();
  new ResizeObserver(draw).observe(holder);
  return chart;
}

function initTrendCharts() {
  const charts = [];
  const link = {
    show: function (i, from) { charts.forEach(function (c) { c.show(i, c === from); }); },
    hide: function () { charts.forEach(function (c) { c.hide(); }); }
  };
  document.querySelectorAll('.trend-chart').forEach(function (holder) {
    charts.push(trendChart(holder, holder.dataset.measure, link));
  });
}

document.addEventListener('DOMContentLoaded', initTrendCharts);
