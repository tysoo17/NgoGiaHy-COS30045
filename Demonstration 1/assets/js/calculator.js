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
    kwhDay,
    kwhMonth,
    kwhYear,
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
    if (wattage === null) {
      showMessage(manual.checked
        ? 'Enter the power usage in watts to see your estimate.'
        : 'Choose a TV model, or tick “Enter wattage manually”, to see your estimate.');
      return;
    }
    if (h === null || p === null) {
      showMessage('Enter hours of use and electricity price to see your estimate.');
      return;
    }

    const r = calculateEnergy(wattage, h, p);
    $('results-basis').textContent = selected
      ? selected.brand + ' ' + selected.model + ' (' + selected.watts + ' W), ' + h + ' h/day at ' + p + ' cents/kWh'
      : wattage + ' W, ' + h + ' h/day at ' + p + ' cents/kWh';
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
  // A new choice also starts a fresh attempt, so "missing" errors wait for the next submit.
  tech.addEventListener('change', function () {
    submitted = false;
    const bands = tech.value
      ? SIZE_BANDS.filter(function (b) { return models.some(function (m) { return m.tech === tech.value && sizeBand(m.sizeIn) === b; }); })
      : [];
    fillSelect(size, 'Select a size', bands.map(function (b) { return { text: b, value: b }; }));
    fillSelect(brand, 'Select a brand', []);
    fillSelect(model, 'Select a model', []);
  });

  size.addEventListener('change', function () {
    submitted = false;
    const brands = size.value
      ? Array.from(new Set(matches().map(function (m) { return m.brand; }))).sort(function (a, b) { return a.localeCompare(b); })
      : [];
    fillSelect(brand, 'Select a brand', brands.map(function (b) { return { text: b, value: b }; }));
    fillSelect(model, 'Select a model', []);
  });

  brand.addEventListener('change', function () {
    submitted = false;
    const list = brand.value
      ? matches().sort(function (a, b) { return a.model.localeCompare(b.model); })
      : [];
    fillSelect(model, 'Select a model', list.map(function (m) { return { text: m.model + ' – ' + m.watts + ' W', value: m.id }; }));
  });

  manual.addEventListener('change', function () {
    submitted = false;
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
    if (firstInvalid === model && model.disabled) {
      // The model list is not available yet: send the user to the first step still to fill in.
      [tech, size, brand].find(function (s) { return !s.disabled && !s.value; }).focus();
    } else if (firstInvalid) {
      firstInvalid.focus();
    }
  });

  // Start from a known state even if the browser restored old form values.
  form.reset();
  const techs = Array.from(new Set(models.map(function (m) { return m.tech; }))).sort();
  fillSelect(tech, 'Select a technology', techs.map(function (t) { return { text: t, value: t }; }));
  fillSelect(size, 'Select a size', []);
  fillSelect(brand, 'Select a brand', []);
  fillSelect(model, 'Select a model', []);
  update();
}

document.addEventListener('DOMContentLoaded', initCalculator);
