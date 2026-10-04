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
