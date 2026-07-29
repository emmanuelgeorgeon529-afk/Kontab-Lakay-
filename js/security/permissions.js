// js/security/permissions.js
//
// Matris santral: pou chak wòl, ki modil li ka touche, ak ki aksyon
// (view / create / edit / delete / approve) li gen dwa fè sou modil sa a.
//
// AJISTE MATRIS SA A selon reyalite biznis ou — sa se yon pwopozisyon
// rezonab pou kòmanse, pa yon règ fiks.

import { WOL } from "./roles.js";

export const MODIL = {
  POS: "pos",
  STOCK: "stock",
  ACCOUNTING: "accounting",
  EXPENSES: "expenses",
  RECEIVABLES: "receivables",
  PAYABLES: "payables",
  HR: "hr",
  TEAM: "team",
  AUDIT: "audit",
  SESSIONS: "sessions",
};

export const AKSYON = {
  VIEW: "view",
  CREATE: "create",
  EDIT: "edit",
  DELETE: "delete",
  APPROVE: "approve",
};

const tou = () => ({ view: true, create: true, edit: true, delete: true, approve: true });
const okenn = () => ({ view: false, create: false, edit: false, delete: false, approve: false });
const sèlmanGade = () => ({ view: true, create: false, edit: false, delete: false, approve: false });

// Rakoursi pou modil yo ki pa nan lis la pou yon wòl — defo se okenn aksè.
function pa(dispozisyon) {
  return new Proxy(dispozisyon, {
    get(target, prop) {
      return prop in target ? target[prop] : okenn();
    },
  });
}

export const MATRIS_PEMISYON = {
  [WOL.PWOPRIYETE]: pa({
    pos: tou(), stock: tou(), accounting: tou(), expenses: tou(),
    receivables: tou(), payables: tou(), hr: tou(), team: tou(),
    audit: tou(), sessions: tou(),
  }),

  [WOL.ADMINISTRATE]: pa({
    pos: tou(), stock: tou(), accounting: tou(), expenses: tou(),
    receivables: tou(), payables: tou(), hr: tou(), team: tou(),
    audit: sèlmanGade(), sessions: { ...sèlmanGade(), edit: true }, // ka fòse dekonekte
  }),

  [WOL.KONTAB]: pa({
    accounting: tou(), expenses: tou(), receivables: tou(), payables: tou(),
    pos: sèlmanGade(), stock: sèlmanGade(), hr: sèlmanGade(),
    team: okenn(), audit: sèlmanGade(), sessions: okenn(),
  }),

  [WOL.MAGASINYE]: pa({
    stock: tou(), pos: sèlmanGade(),
    accounting: okenn(), expenses: okenn(), receivables: okenn(),
    payables: okenn(), hr: okenn(), team: okenn(), audit: okenn(), sessions: okenn(),
  }),

  [WOL.VANDE]: pa({
    pos: { view: true, create: true, edit: true, delete: false, approve: false },
    stock: sèlmanGade(), receivables: sèlmanGade(),
    accounting: okenn(), expenses: okenn(), payables: okenn(),
    hr: okenn(), team: okenn(), audit: okenn(), sessions: okenn(),
  }),

  [WOL.KOMI]: pa({
    pos: { view: true, create: true, edit: false, delete: false, approve: false },
    stock: sèlmanGade(),
    accounting: okenn(), expenses: okenn(), receivables: okenn(),
    payables: okenn(), hr: okenn(), team: okenn(), audit: okenn(), sessions: okenn(),
  }),
};

/**
 * Verifye si yon wòl gen dwa fè yon aksyon sou yon modil.
 * @param {string} wol - youn nan valè WOL yo
 * @param {string} modil - youn nan valè MODIL yo
 * @param {string} aksyon - youn nan valè AKSYON yo
 * @returns {boolean}
 */
export function genPèmisyon(wol, modil, aksyon) {
  const wolMatris = MATRIS_PEMISYON[wol];
  if (!wolMatris) return false;
  const modilMatris = wolMatris[modil];
  if (!modilMatris) return false;
  return !!modilMatris[aksyon];
    }
