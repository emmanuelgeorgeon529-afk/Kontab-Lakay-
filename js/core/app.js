// js/core/app.js
//
// Pwen antre prensipal la. Responsablite li:
//   1. Jere ekran auth (koneksyon/enskripsyon) vs app-shell la
//   2. Jere tab navigation (montre/kache panel yo)
//   3. Inisyalize CHAK modil PARESE — sèlman lè ou premye ouvri tab li a

import {
  koumanseKouteAuth,
  jwennKontèksItilizatè,
  enskriNouvoBiznis,
  enskriAkEnvitasyon,
  jwennEnvitasyon,
  konekteItilizatè,
  dekonekte,
  voyeReyajisManPas,
} from "./auth.js";

import { inisyalizePOS } from "../modules/pos.js";
import { inisyalizeStock } from "../modules/stock.js";
import { inisyalizeExpenses } from "../modules/expenses.js";
import { inisyalizeReceivables } from "../modules/receivables.js";
import { inisyalizePayables } from "../modules/payables.js";
import { inisyalizeHR } from "../modules/hr.js";
import { inisyalizeAccounting } from "../modules/accounting.js";
import { inisyalizeTeam } from "../modules/team.js";
import { inisyalizeDashboard } from "../modules/dashboard.js";

/* ------------------------------------------------------------------ */
/* ETA APLIKASYON AN                                                     */
/* ------------------------------------------------------------------ */
let BIZ_ID = null;
let ITILIZATÈ_ID = null;
let ITILIZATÈ_NON = null;
const modilInisyalize = new Set();

const INISYALIZATÈ = {
  dashboard: () => inisyalizeDashboard(BIZ_ID),
  pos: () => inisyalizePOS(BIZ_ID, ITILIZATÈ_ID, ITILIZATÈ_NON),
  stock: () => inisyalizeStock(BIZ_ID),
  expenses: () => inisyalizeExpenses(BIZ_ID, ITILIZATÈ_ID, ITILIZATÈ_NON),
  receivables: () => inisyalizeReceivables(BIZ_ID, ITILIZATÈ_ID, ITILIZATÈ_NON),
  payables: () => inisyalizePayables(BIZ_ID, ITILIZATÈ_ID, ITILIZATÈ_NON),
  hr: () => inisyalizeHR(BIZ_ID, ITILIZATÈ_ID, ITILIZATÈ_NON),
  accounting: () => inisyalizeAccounting(BIZ_ID),
  team: () => inisyalizeTeam(BIZ_ID),
};

/* ------------------------------------------------------------------ */
/* ELEMAN DOM                                                            */
/* ------------------------------------------------------------------ */
const authScreen = document.getElementById("auth-screen");
const appShell = document.getElementById("app-shell");
const authMesajErè = document.getElementById("auth-mesaj-erè");

/* ------------------------------------------------------------------ */
/* TAB NAVIGATION                                                        */
/* ------------------------------------------------------------------ */
async function ouvriTab(non) {
  document.querySelectorAll(".tab-btn").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.tab === non);
  });
  document.querySelectorAll(".panel").forEach((panel) => {
    panel.classList.toggle("active", panel.id === `panel-${non}`);
  });

  if (!modilInisyalize.has(non)) {
    modilInisyalize.add(non);
    try {
      await INISYALIZATÈ[non]();
    } catch (error) {
      console.error(`Erè inisyalizasyon modil "${non}":`, error);
      modilInisyalize.delete(non);
    }
  }
}

document.querySelectorAll(".tab-btn").forEach((btn) => {
  btn.addEventListener("click", () => ouvriTab(btn.dataset.tab));
});

/* ------------------------------------------------------------------ */
/* AUTH — tab Konekte / Enskri                                           */
/* ------------------------------------------------------------------ */
const tabKonekte = document.getElementById("tab-auth-konekte");
const tabEnskri = document.getElementById("tab-auth-enskri");
const formKonekte = document.getElementById("form-konekte");
const formEnskri = document.getElementById("form-enskri");

function montreOnglèAuth(non) {
  const seKonekte = non === "konekte";
  formKonekte.classList.toggle("hidden", !seKonekte);
  formEnskri.classList.toggle("hidden", seKonekte);
  tabKonekte.classList.toggle("text-gray-400", !seKonekte);
  tabKonekte.style.borderColor = seKonekte ? "var(--gold)" : "transparent";
  tabEnskri.classList.toggle("text-gray-400", seKonekte);
  tabEnskri.style.borderColor = seKonekte ? "transparent" : "var(--gold)";
  authMesajErè.classList.add("hidden");
}
tabKonekte.addEventListener("click", () => montreOnglèAuth("konekte"));
tabEnskri.addEventListener("click", () => montreOnglèAuth("enskri"));

function afficheErèAuth(message) {
  authMesajErè.textContent = message;
  authMesajErè.classList.remove("hidden");
}

formKonekte.addEventListener("submit", async (e) => {
  e.preventDefault();
  const formData = new FormData(formKonekte);
  const btn = formKonekte.querySelector('button[type="submit"]');
  btn.disabled = true;
  try {
    await konekteItilizatè({
      email: formData.get("email"),
      modpas: formData.get("modpas"),
    });
    // koumanseKouteAuth() ap detekte chanjman an otomatikman epi montre app-shell la
  } catch (error) {
    afficheErèAuth(error.message);
  } finally {
    btn.disabled = false;
  }
});

formEnskri.addEventListener("submit", async (e) => {
  e.preventDefault();
  const formData = new FormData(formEnskri);
  const btn = formEnskri.querySelector('button[type="submit"]');
  btn.disabled = true;
  try {
    const { uid, bizId } = await enskriNouvoBiznis({
      email: formData.get("email"),
      modpas: formData.get("modpas"),
      bizNon: formData.get("bizNon"),
      itilizatèNon: formData.get("itilizatèNon"),
    });
    // NÒT: pa depann sèlman sou koumanseKouteAuth() paske li ka gentan
    // deklanche AVAN ekriti Firestore yo fin fèt (race condition — gade
    // auth.js pou detay). Rele rechèch la ankò MANYÈLMAN, kounye a nou
    // sèten ekriti yo fini paske enskriNouvoBiznis() fin egzekite.
    const kontèks = await jwennKontèksItilizatè(uid, formData.get("email"));
    aplikeKontèks(kontèks);
  } catch (error) {
    afficheErèAuth(error.message);
  } finally {
    btn.disabled = false;
  }
});

document.getElementById("btn-reyajis-manpas").addEventListener("click", async () => {
  const email = formKonekte.email.value;
  if (!email) {
    afficheErèAuth("Antre email ou nan chan ki anlè a dabò, epi klike ankò.");
    return;
  }
  try {
    await voyeReyajisManPas(email);
    afficheErèAuth("Yon lyen reyajisman voye nan email ou.");
  } catch (error) {
    afficheErèAuth(error.message);
  }
});

document.getElementById("btn-dekonekte").addEventListener("click", async () => {
  await dekonekte();
});

/* ------------------------------------------------------------------ */
/* LYEN ENVITASYON (?biz=...&kod=...) — pran priyorite sou fòm nòmal la  */
/* ------------------------------------------------------------------ */
const paramèt = new URLSearchParams(window.location.search);
const bizIdEnvitasyon = paramèt.get("biz");
const kòdEnvitasyon = paramèt.get("kod");

if (bizIdEnvitasyon && kòdEnvitasyon) {
  const formEnskriEnvitasyon = document.getElementById("form-enskri-envitasyon");
  const detayEl = document.getElementById("envitasyon-detay");

  // Kache tab nòmal yo, montre sèlman fòm envitasyon an
  document.querySelector(".flex.mb-4.border-b")?.classList.add("hidden");
  formKonekte.classList.add("hidden");
  formEnskri.classList.add("hidden");
  formEnskriEnvitasyon.classList.remove("hidden");

  jwennEnvitasyon(bizIdEnvitasyon, kòdEnvitasyon).then((envitasyon) => {
    if (!envitasyon || envitasyon.itilize) {
      detayEl.textContent = "Kòd envitasyon sa a pa valid ankò oswa li deja itilize.";
      formEnskriEnvitasyon.querySelector('button[type="submit"]').disabled = true;
      return;
    }
    const ekspireLe = envitasyon.ekspireLe?.toDate ? envitasyon.ekspireLe.toDate() : new Date(envitasyon.ekspireLe);
    if (ekspireLe && ekspireLe.getTime() < Date.now()) {
      detayEl.textContent = "Kòd envitasyon sa a ekspire. Mande Propriétaire a kreye yon nouvo kòd.";
      formEnskriEnvitasyon.querySelector('button[type="submit"]').disabled = true;
      return;
    }
    detayEl.textContent = `Ou envite kòm "${envitasyon.wol}" — ${envitasyon.non}`;

    formEnskriEnvitasyon.addEventListener("submit", async (e) => {
      e.preventDefault();
      const formData = new FormData(formEnskriEnvitasyon);
      const btn = formEnskriEnvitasyon.querySelector('button[type="submit"]');
      btn.disabled = true;
      try {
        const { uid, bizId } = await enskriAkEnvitasyon({
          email: formData.get("email"),
          modpas: formData.get("modpas"),
          non: envitasyon.non,
          bizId: bizIdEnvitasyon,
          kòd: kòdEnvitasyon,
          wòl: envitasyon.wol,
        });
        const kontèks = await jwennKontèksItilizatè(uid, formData.get("email"));
        aplikeKontèks(kontèks);
      } catch (error) {
        afficheErèAuth(error.message);
        btn.disabled = false;
      }
    });
  });
}

/* ------------------------------------------------------------------ */
/* APLIKE KONTÈKS — separe de listener a pou l ka rele ni pa listener a  */
/* pasif la, ni MANYÈLMAN apre yon enskripsyon reyisi (gade pi ba).      */
/* ------------------------------------------------------------------ */
function aplikeKontèks(kontèks) {
  if (!kontèks) {
    BIZ_ID = null;
    ITILIZATÈ_ID = null;
    ITILIZATÈ_NON = null;
    modilInisyalize.clear();
    authScreen.classList.remove("hidden");
    appShell.classList.add("hidden");
    return;
  }

  if (!kontèks.bizId) {
    authMesajErè.innerHTML = `
      Kont ou pa lye ak yon biznis. Dekonekte epi eseye enskri ankò, oswa kontakte sipò.
      <button id="btn-dekonekte-kwense" class="block mt-2 underline font-semibold text-red-700">Dekonekte kounye a</button>
    `;
    authMesajErè.classList.remove("hidden");
    document.getElementById("btn-dekonekte-kwense")?.addEventListener("click", async () => {
      await dekonekte();
    });
    return;
  }

  BIZ_ID = kontèks.bizId;
  ITILIZATÈ_ID = kontèks.uid;
  ITILIZATÈ_NON = kontèks.non;

  document.getElementById("header-sub-titre").textContent =
    `${ITILIZATÈ_NON} · ${kontèks.wòl || ""}`;

  const wòlKaWèEkip = ["Propriétaire", "Administratè"].includes(kontèks.wòl);
  document.getElementById("tab-btn-team").classList.toggle("hidden", !wòlKaWèEkip);

  authScreen.classList.add("hidden");
  appShell.classList.remove("hidden");

  ouvriTab("dashboard");
}

koumanseKouteAuth(aplikeKontèks);
