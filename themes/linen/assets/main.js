// Casper Theme – main.js
// Vanilla JS enhancements. htmx and Alpine handle most interactivity.

document.addEventListener('DOMContentLoaded', () => {
  // Animate cart count badge when updated by htmx
  document.body.addEventListener('htmx:afterSwap', (e) => {
    const el = e.target;
    if (el && el.classList && el.classList.contains('cart-count')) {
      el.classList.remove('cart-count-updated');
      void el.offsetWidth; // reflow
      el.classList.add('cart-count-updated');
    }
  });

  // Variant selector: update price display when variant changes
  const variantSelect = document.getElementById('variant-select');
  if (variantSelect) {
    variantSelect.addEventListener('change', () => {
      const selected = variantSelect.options[variantSelect.selectedIndex];
      const price = selected.dataset.price;
      const priceEl = document.getElementById('product-price');
      if (price && priceEl) priceEl.textContent = price;
    });
  }
});
