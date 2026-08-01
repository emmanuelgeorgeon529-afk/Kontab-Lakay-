// js/utils/currency.js
// Fonksyon pou fòma lajan
export function formatCurrency(amount, currency = 'HTG', locale = 'fr-HT') {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currency
  }).format(amount);
}

// Konvèsyon senplifye (Tankou yon API fiks pou kounya)
export function convertCurrency(amount, fromCurrency, toCurrency) {
  const rates = { HTG: 1, USD: 0.0067, EUR: 0.0062 }; // Egzanp tès
  if (fromCurrency === toCurrency) return amount;
  const inHTG = amount / rates[fromCurrency];
  return inHTG * rates[toCurrency];
}
