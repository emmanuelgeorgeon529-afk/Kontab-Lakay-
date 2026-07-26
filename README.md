# Kontab Lakay MVP — Sik Komèsyal (Ventes/POS + Stok)

## Estrikti Dosye

```
kontab-lakay-mvp/
├── index.html                 # Shell HTML sèlman — chaje modil ES6 yo
├── js/
│   ├── core/
│   │   ├── firebase-config.js # Inisyalizasyon Firebase (yon sèl fwa)
│   │   ├── db.js              # Tout Firestore transactions (POS, Stok, Kès)
│   │   └── auth.js            # Login, session, bizId + wòl itilizatè
│   ├── modules/
│   │   ├── pos.js             # UI + lojik Pwen de Vant
│   │   ├── stock.js           # UI + lojik Stok/Achats
│   │   ├── accounting.js      # (pwochen etap) Jounal & Kès
│   │   └── hr.js              # (pwochen etap) Pointage & Pewòl
│   └── utils/
│       └── helpers.js         # Fonksyon jenerik (fòmate lajan, dat, ID)
```

## Poukisa achitekti sa a

- **Chak modil se yon fichye ES module endepandan** (`import`/`export`) — ou ka
  travay sou `pos.js` san w pa touche `hr.js`, e chak fichye rete anba 500-800
  liy olye 15 000+ liy nan yon sèl `index.html`.
- **`db.js` se sèl pòt pou tout ekriti sansib** (vant, stòk, kès). Modil yo
  (`pos.js`, `stock.js`) rele fonksyon `db.js`, yo pa janm ekri Firestore
  dirèkteman. Sa garanti chak `runTransaction()` toujou pase nan menm kontwòl.
- **`bizId` toujou premye paramèt** nan chak fonksyon — menm modèl multi-tenant
  ou deja genyen an, men kounye a li aplike de manyè sistematik nan yon sèl
  kote olye l gaye nan 35 render points.

## Pwochen etap
1. Konplete `stock.js` (UI: lis pwodwi, ajisteman, bon de commande)
2. Konplete `pos.js` (UI: panyen, mòd peman, resi PDF)
3. Lè Sik Komèsyal la stab → pase nan Comptabilité (jounal otomatik ki soti nan vant/acha)
