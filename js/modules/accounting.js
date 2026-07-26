// js/modules/accounting.js
//
// NÒT ACHITEKTI ENPÒTAN:
// Ekriti jounal yo pa jenere ISIT LA. Yo kreye ATOMIKMAN anndan menm
// runTransaction() ak chak vant, nan js/core/db.js (gade
// konstwiLiyJounalVant() ak anrejistreVant()). Sa garanti liv kontab yo
// PA JANM ka dekonekte de vant reyèl yo — pa gen fenèt danje kote yon vant
// ta egziste san ekriti kontab li.
//
// Modil sa a se sèlman pou LI ak AFICHE done kontab yo.

import { jwennTouEkriJounal } from "../core/db.js";
import { KONT, NON_KONT } from "../core/plan-comptes.js";

let bizIdAktyèl = null;
let jounalKache = []; // kache lokal pou evite relire Firestore chak fwa

/* ------------------------------------------------------------------ */
/* INISYALIZASYON                                                        */
/* ------------------------------------------------------------------ */
export async function inisyalizeAccounting(bizId) {
  bizIdAktyèl = bizId;
  await rafrechiJounal();
  branchevènman();
}

function branchevènman() {
  const selectKont = document.getElementById("grand-livre-select-kont");
  if (selectKont) {
    // Ranpli lis kont yo nan dropdown
    selectKont.innerHTML = Object.values(KONT)
      .map((kod) => `<option value="${kod}">${kod} - ${NON_KONT[kod]}</option>`)
      .join("");
    selectKont.addEventListener("change", () => {
      afficheGrandLivre(selectKont.value);
    });
    // Afiche premye kont la pa default
    afficheGrandLivre(selectKont.value);
  }
}

async function rafrechiJounal() {
  jounalKache = await jwennTouEkriJounal(bizIdAktyèl);
  afficheJounalGenerik();
  const selectKont = document.getElementById("grand-livre-select-kont");
  if (selectKont) afficheGrandLivre(selectKont.value);
}

/* ------------------------------------------------------------------ */
/* GRAND LIVRE — istorik + solde pou YON kont espesifik                  */
/* ------------------------------------------------------------------ */
export function obteniGrandLivre(kontId) {
  const mouvman = [];
  let soldeKouran = 0;

  // jounalKache deja ordone desandan (pi resan an premye) — nou ranvèse
  // pou kalkile solde kwonolojikman, epi nou re-ranvèse pou afichaj.
  const jounalKwonolojik = [...jounalKache].reverse();

  for (const antre of jounalKwonolojik) {
    for (const liy of antre.liy) {
      if (liy.kont !== kontId) continue;
      soldeKouran += liy.debi - liy.kredi;
      mouvman.push({
        dat: antre.kreyeLe,
        nimewoFacti: antre.nimewoFacti,
        libele: liy.libele,
        debi: liy.debi,
        kredi: liy.kredi,
        solde: soldeKouran,
      });
    }
  }

  return mouvman.reverse(); // pi resan an premye pou afichaj
}

function afficheGrandLivre(kontId) {
  const container = document.getElementById("grand-livre-tab");
  if (!container || !kontId) return;

  const mouvman = obteniGrandLivre(kontId);
  const soldeFinal = mouvman.length > 0 ? mouvman[0].solde : 0;

  container.innerHTML = `
    <div class="mb-2 font-semibold">
      ${kontId} — ${NON_KONT[kontId]} &middot;
      Solde: <span class="${soldeFinal >= 0 ? "text-green-600" : "text-red-600"}">${fòmateLajan(soldeFinal)} HTG</span>
    </div>
    <table class="w-full text-sm border-collapse">
      <thead>
        <tr class="border-b text-left">
          <th class="py-1">Facti</th>
          <th class="py-1">Libellé</th>
          <th class="py-1 text-right">Débit</th>
          <th class="py-1 text-right">Crédit</th>
          <th class="py-1 text-right">Solde</th>
        </tr>
      </thead>
      <tbody>
        ${mouvman
          .map(
            (m) => `
          <tr class="border-b">
            <td class="py-1">${escapeHTML(m.nimewoFacti)}</td>
            <td class="py-1">${escapeHTML(m.libele)}</td>
            <td class="py-1 text-right">${m.debi > 0 ? fòmateLajan(m.debi) : ""}</td>
            <td class="py-1 text-right">${m.kredi > 0 ? fòmateLajan(m.kredi) : ""}</td>
            <td class="py-1 text-right">${fòmateLajan(m.solde)}</td>
          </tr>`
          )
          .join("")}
      </tbody>
    </table>`;
}

/* ------------------------------------------------------------------ */
/* BILAN AJE (P&L senp) — Total Ventes vs Total CMV vs Total Charges     */
/*                                                                       */
/* Charges Générales (6900) ak Charges de Personnel (6910) ranpli        */
/* otomatikman pa expenses.js ak hr.js (pewòl), respektivman. Nou kenbe   */
/* yo SEPAREMAN nan rezilta a pou Emmanuel ka wè kle kisa k ap manje      */
/* pwofi a (salè vs lòt depans), men totalCharges konbine yo pou          */
/* Bénéfice Net final la:                                                */
/*   Bénéfice Brut = Ventes − Coût des Marchandises Vendues               */
/*   Bénéfice Net  = Bénéfice Brut − (Charges Générales + Charges Personnel) */
/* ------------------------------------------------------------------ */
export function kalkileBilanAje() {
  let totalVentes = 0;
  let totalCMV = 0;
  let totalChargesGenerales = 0;
  let totalChargesPersonnel = 0;

  for (const antre of jounalKache) {
    for (const liy of antre.liy) {
      if (liy.kont === KONT.VENTES_MARCHANDISES) totalVentes += liy.kredi;
      if (liy.kont === KONT.COUT_MARCHANDISES_VENDUES) totalCMV += liy.debi;
      if (liy.kont === KONT.CHARGES_GENERALES) totalChargesGenerales += liy.debi;
      if (liy.kont === KONT.CHARGES_PERSONNEL) totalChargesPersonnel += liy.debi;
    }
  }

  const totalCharges = totalChargesGenerales + totalChargesPersonnel;
  const beneficeBrit = totalVentes - totalCMV;
  const beneficeNet = beneficeBrit - totalCharges;

  return {
    totalVentes,
    totalCMV,
    totalChargesGenerales,
    totalChargesPersonnel,
    totalCharges,
    beneficeBrit,
    beneficeNet,
  };
}

function afficheBilan() {
  const container = document.getElementById("bilan-tab");
  if (!container) return;

  const b = kalkileBilanAje();
  container.innerHTML = `
    <table class="w-full text-sm">
      <tbody>
        <tr class="border-b"><td class="py-1">Total Ventes</td><td class="py-1 text-right">${fòmateLajan(b.totalVentes)} HTG</td></tr>
        <tr class="border-b"><td class="py-1">Coût des Marchandises Vendues</td><td class="py-1 text-right text-red-600">(${fòmateLajan(b.totalCMV)}) HTG</td></tr>
        <tr class="border-b font-semibold"><td class="py-1">Bénéfice Brut</td><td class="py-1 text-right">${fòmateLajan(b.beneficeBrit)} HTG</td></tr>
        <tr class="border-b"><td class="py-1">Charges de Personnel (Pewòl)</td><td class="py-1 text-right text-red-600">(${fòmateLajan(b.totalChargesPersonnel)}) HTG</td></tr>
        <tr class="border-b"><td class="py-1">Charges Générales</td><td class="py-1 text-right text-red-600">(${fòmateLajan(b.totalChargesGenerales)}) HTG</td></tr>
        <tr class="font-bold"><td class="py-1">Bénéfice Net</td><td class="py-1 text-right">${fòmateLajan(b.beneficeNet)} HTG</td></tr>
      </tbody>
    </table>`;
}

/* ------------------------------------------------------------------ */
/* JOUNAL GENERIK — tab konplè tout ekriti yo (Date, Facti, Kont, Débit, Crédit) */
/* ------------------------------------------------------------------ */
export function afficheJounalGenerik() {
  const container = document.getElementById("jounal-tab");
  if (!container) return;

  const liyAplati = [];
  for (const antre of jounalKache) {
    for (const liy of antre.liy) {
      liyAplati.push({
        dat: antre.kreyeLe,
        nimewoFacti: antre.nimewoFacti,
        ...liy,
      });
    }
  }

  container.innerHTML = `
    <table class="w-full text-sm border-collapse">
      <thead>
        <tr class="border-b text-left">
          <th class="py-1">Facti</th>
          <th class="py-1">Kont</th>
          <th class="py-1">Libellé</th>
          <th class="py-1 text-right">Débit</th>
          <th class="py-1 text-right">Crédit</th>
        </tr>
      </thead>
      <tbody>
        ${liyAplati
          .map(
            (l) => `
          <tr class="border-b">
            <td class="py-1">${escapeHTML(l.nimewoFacti)}</td>
            <td class="py-1">${l.kont} — ${NON_KONT[l.kont] || "?"}</td>
            <td class="py-1">${escapeHTML(l.libele)}</td>
            <td class="py-1 text-right">${l.debi > 0 ? fòmateLajan(l.debi) : ""}</td>
            <td class="py-1 text-right">${l.kredi > 0 ? fòmateLajan(l.kredi) : ""}</td>
          </tr>`
          )
          .join("")}
      </tbody>
    </table>`;

  afficheBilan(); // rafrechi bilan an chak fwa jounal la afiche
}

/* ------------------------------------------------------------------ */
/* ITILITÈ                                                                */
/* ------------------------------------------------------------------ */
function fòmateLajan(montan) {
  return (montan || 0).toLocaleString("fr-HT", { maximumFractionDigits: 2 });
}

function escapeHTML(str) {
  const div = document.createElement("div");
  div.textContent = str ?? "";
  return div.innerHTML;
}
