# Changelog — Kontab Lakay

Tout chanjman enpòtan nan pwojè a ap dokimante nan fichye sa a.

Fòma a baze sou [Keep a Changelog](https://keepachangelog.com/fr/1.0.0/).

---

## [Unreleased]

### 🚧 An Konstriksyon
- 12 nan 13 modil yo (Structure, Finance, Operations, Logistique, RH, Actifs, GED, Juridique, SaaS, BI, IA, E-Commerce) gen sèlman UI/HTML ak done demo — pa gen backend Firestore konekte ankò.
- Login/Authentification dezaktive tanporèman (kòmante nan `index.html`) pou fasilite devlopman — **pa dwe rete konsa pou pwodiksyon**.
- Aucun rapò (`reports/*.html`) poko konekte ak done reyèl — yo tout gen chif estatik/demo.

### ⚠️ Konnen Pwoblèm
- Balance Générale demo te gen yon diferans Débit ≠ Crédit ki korije apre ak yon chif "plug" — pa yon vrè rekonsilyasyon kontab, sèlman ajisteman demo.
- `firebaseConfig` nan `config.js` gen valè placeholder (`"REMPLASE_AK_KLE_OU"`) — dwe ranpli ak vrè kle Firebase anvan app la ka konekte.

---

## [0.3.0] — Modil Ventes fonksyonèl (premye modil 100% reyèl)

### Ajoute
- `js/services/salesService.js` — CRUD vant konplè:
  - `createSale()` — kreye vant, diminye stock, verifye limit kredi, kreye ekriti jounal double-entry
  - `getSales()` — lis vant yo (Firestore, pa demo)
  - `cancelSale()` — anilasyon via Reversal Entry (RV-######), jamè hard-delete
- `js/services/productsService.js` — CRUD pwodwi:
  - `createProduct()`, `getProducts()`, `updateProduct()`
  - `adjustStock()` — ajistman manyèl stock ak istorik (`ajistman_stock`)
  - `deactivateProduct()` / `reactivateProduct()` (soft-delete)
  - `getLowStockProducts()` — pou alèt stock ba
- `js/services/customersService.js` — CRUD kliyan:
  - `createCustomer()`, `getCustomers()`, `updateCustomer()`
  - `checkCreditLimit()` — verifikasyon limit kredi
  - `recordPayment()` — anrejistreman peman/recouvrement ak ekriti jounal
  - `getCustomersWithDebt()` — pou rapò recouvrement
- `js/modules/ventes_ui.js` — konekte UI Ventes ak 3 sèvis yo:
  - Modal "Nouvo Vant" ak panye (cart) entèraktif
  - Modal "Nouvo Kliyan" ak "Nouvo Pwodwi" entegre dirèkteman nan modal vant lan
  - Tablo "Facturation" chaje done reyèl (`ventesTableBody`)
- `js/services/accountingService.js` — mòtè kontab santral:
  - `getChartOfAccounts()`, `addJournalEntry()` (ak verifikasyon Débit=Crédit)
  - `getBalanceSheet()`, `getProfitAndLoss()` — kalkile apati vrè ekriti jounal
- `js/core/config.js` — sèl pwen inisyalizasyon Firebase (`window.db`, `window.auth`)
- `js/core/db.js` — verifikasyon sekirite (pa redeklare `db`/`auth`)

### Korije
- `salesService.createSale()` mete ajou pou l rele verifikasyon limit kredi **anndan menm transaksyon an** (lekti dosye kliyan anvan ekriti, respekte règ transaction Firestore).
- Retire konfli `const db` doub deklarasyon ant `db.js` ak script prensipal `index.html` la (te lakòz paj blanch).

---

## [0.2.0] — 15 seksyon UI konplè (façade)

### Ajoute
- Dashboard (Akeyi) ak KPI, alèt, aktivite resan, aksyon rapid, rezime IA
- 13 modil ERP konplè an HTML/CSS (done demo): Structure, Finance, Ventes, Operations, Logistique, RH, Actifs, GED, Juridique, SaaS, BI, IA, E-Commerce
- Paramètres Généraux (Settings) — 15 sou-seksyon
- 9 rapò finansye separe (`reports/`): Bilan, Compte de Résultat, Balance Générale, Grand Livre, Journal Général, Cashflow, Audit Log, Dashboard Exécutif, État des Capitaux Propres

### Chanje
- Non pwodwi a: "Kontab Lakay ERP" → "Kontab Lakay" (san "ERP")

---

## [0.1.0] — Fondasyon

### Ajoute
- `index.html` monolit ak sidebar, topbar, login, dashboard debaz
- Estrikti CSS (glassmorphism, KPI cards, chart sections)
- Entegrasyon Firebase SDK (compat) ak Chart.js
- Règ achitekti etabli:
  - `db.js` kòm sèl pòtay Firestore
  - `runTransaction()` obligatwa ak lekti-anvan-ekriti pou tout tranzaksyon finansye
  - Efasman fizik entèdi pou dosye finansye — sèlman Reversal Entry (RV-######)
  - Non koleksyon/chan Firestore an Kreyòl ASCII-safe

---

## Fòma Vèsyon

- **[Unreleased]** — chanjman ki nan travay kounya
- **X.Y.Z** — `X` = chanjman achitekti gwo (breaking), `Y` = nouvo fonksyonalite, `Z` = korije bug
