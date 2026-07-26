// js/core/plan-comptes.js
// Plan de comptes MINIMAL pou MVP la. Chak vant otomatikman itilize kont sa
// yo. Pi devan, sa ap vin konfigirab pa biznis (SYSCOHADA/IFRS/etc) — men
// pou kounye a, yon sèl plan senp ki mache pou tout moun.

export const KONT = {
  CAISSE: "1010",              // Kès Prensipal (lajan kach)
  BANQUE: "1020",              // Kont Bank
  MONCASH: "1030",             // MonCash
  CLIENTS: "1200",             // Kont Kliyan (Comptes Recevables / dèt kliyan)
  STOCK_MARCHANDISES: "1110",  // Stock de Marchandises (envantè)
  FOURNISSEURS: "2010",        // Kont Founisè (dèt nou dwe yo)
  VENTES_MARCHANDISES: "4010", // Ventes de Marchandises
  COUT_MARCHANDISES_VENDUES: "6010", // Coût des Marchandises Vendues (CMV)
  CHARGES_PERSONNEL: "6910",   // Charges de Personnel (salè, pewòl)
  CHARGES_GENERALES: "6900",   // Lòt depans jeneral
};

export const NON_KONT = {
  [KONT.CAISSE]: "Caisse Principale",
  [KONT.BANQUE]: "Banque",
  [KONT.MONCASH]: "MonCash",
  [KONT.CLIENTS]: "Clients (Dèt Kliyan)",
  [KONT.STOCK_MARCHANDISES]: "Stock de Marchandises",
  [KONT.FOURNISSEURS]: "Fournisseurs (Dèt Founisè)",
  [KONT.VENTES_MARCHANDISES]: "Ventes de Marchandises",
  [KONT.COUT_MARCHANDISES_VENDUES]: "Coût des Marchandises Vendues",
  [KONT.CHARGES_PERSONNEL]: "Charges de Personnel",
  [KONT.CHARGES_GENERALES]: "Charges Générales",
};

// Ki kont ki reprezante "kès" selon mòd peman an — itil pou POS.
export function kontKèsPouModPeman(mòd) {
  if (mòd === "MonCash") return KONT.MONCASH;
  if (mòd === "Transfè Bank") return KONT.BANQUE;
  return KONT.CAISSE; // default: Cash
}
