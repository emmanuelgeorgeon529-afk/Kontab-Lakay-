// js/core/db.js
// PA REDEKLARE db oswa auth isit la — config.js deja fè sa.
// Fichye sa a sèlman verifye window.db egziste anvan lòt script yo mache.

if (!window.db) {
    console.error('❌ db.js: window.db pa defini. Verifye config.js chaje AVAN db.js nan index.html.');
}
