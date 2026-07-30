// js/core/db.js
// SÈL PÒT pou ekri nan Firestore pou Sik Komèsyal la (Vant, Stòk, Kès).
// Pa gen okenn lòt fichye ki dwe rele setDoc/updateDoc dirèkteman sou
// koleksyon sa yo — sa a se sa ki garanti pa gen race condition.

import { db } from "./firebase-config.js";
import { KONT, kontKèsPouModPeman } from "./plan-comptes.js";
import {
  doc,
  collection,
  runTransaction,
  serverTimestamp,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  Timestamp,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

/* ------------------------------------------------------------------ */
/* CHEMEN KOLEKSYON (toujou scope pa bizId)                            */
/* ------------------------------------------------------------------ */
const bizDoc = (bizId) => doc(db, "biznis", bizId);
const stokCol = (bizId) => collection(db, "biznis", bizId, "stok");
const lavantCol = (bizId) => collection(db, "biznis", bizId, "lavant");
const kesCol = (bizId) => collection(db, "biznis", bizId, "kes_mouvman");
const konpteCol = (bizId) => collection(db, "biznis", bizId, "konpte");
const jounalCol = (bizId) => collection(db, "biznis", bizId, "jounal");
const depansCol = (bizId) => collection(db, "biznis", bizId, "depans");
const pemanKliyanCol = (bizId) => collection(db, "biznis", bizId, "peman_kliyan");
const founisèCol = (bizId) => collection(db, "biznis", bizId, "founise");
const achaCol = (bizId) => collection(db, "biznis", bizId, "acha");
const pemanFounisèCol = (bizId) => collection(db, "biznis", bizId, "peman_founise");
const pwennajCol = (bizId) => collection(db, "biznis", bizId, "pwennaj");
const pewòlCol = (bizId) => collection(db, "biznis", bizId, "pewol");

/* ------------------------------------------------------------------ */
/* 1. NIMEWO SEKANSYÈL (kontè) — itilize pa depans. Pou vant, lojik la  */
/*    entegre dirèkteman nan anrejistreVant() pou respekte lòd          */
/*    lekti-anvan-ekriti Firestore mande a (gade pi ba).                */
/* ------------------------------------------------------------------ */
async function pwochenNimewoDepans(transaction, bizId) {
  const kontèRef = doc(db, "biznis", bizId, "konte", "depans");
  const kontèSnap = await transaction.get(kontèRef);
  const denyeNimewo = kontèSnap.exists() ? kontèSnap.data().denye : 0;
  const nouvoNimewo = denyeNimewo + 1;
  transaction.set(kontèRef, { denye: nouvoNimewo }, { merge: true });
  return `DEP-${String(nouvoNimewo).padStart(6, "0")}`;
}

async function pwochenNimewoRecouvrement(transaction, bizId) {
  const kontèRef = doc(db, "biznis", bizId, "konte", "peman-kliyan");
  const kontèSnap = await transaction.get(kontèRef);
  const denyeNimewo = kontèSnap.exists() ? kontèSnap.data().denye : 0;
  const nouvoNimewo = denyeNimewo + 1;
  transaction.set(kontèRef, { denye: nouvoNimewo }, { merge: true });
  return `REC-${String(nouvoNimewo).padStart(6, "0")}`;
}

async function pwochenNimewoAcha(transaction, bizId) {
  const kontèRef = doc(db, "biznis", bizId, "konte", "acha");
  const kontèSnap = await transaction.get(kontèRef);
  const denyeNimewo = kontèSnap.exists() ? kontèSnap.data().denye : 0;
  const nouvoNimewo = denyeNimewo + 1;
  transaction.set(kontèRef, { denye: nouvoNimewo }, { merge: true });
  return `ACH-${String(nouvoNimewo).padStart(6, "0")}`;
}

async function pwochenNimewoRegFounisè(transaction, bizId) {
  const kontèRef = doc(db, "biznis", bizId, "konte", "peman-founise");
  const kontèSnap = await transaction.get(kontèRef);
  const denyeNimewo = kontèSnap.exists() ? kontèSnap.data().denye : 0;
  const nouvoNimewo = denyeNimewo + 1;
  transaction.set(kontèRef, { denye: nouvoNimewo }, { merge: true });
  return `REG-${String(nouvoNimewo).padStart(6, "0")}`;
}

async function pwochenNimewoPewòl(transaction, bizId) {
  const kontèRef = doc(db, "biznis", bizId, "konte", "pewol");
  const kontèSnap = await transaction.get(kontèRef);
  const denyeNimewo = kontèSnap.exists() ? kontèSnap.data().denye : 0;
  const nouvoNimewo = denyeNimewo + 1;
  transaction.set(kontèRef, { denye: nouvoNimewo }, { merge: true });
  return `PAY-${String(nouvoNimewo).padStart(6, "0")}`;
}

/* ------------------------------------------------------------------ */
/* 1b. KONSTWI LIY JOUNAL AN PARTI DOUB POU YON VANT                    */
/*     Total DEBIT toujou egal total KREDIT — sa a se REGleman kontab.  */
/* ------------------------------------------------------------------ */
function konstwiLiyJounalVant(peman, total, koutMache) {
  const liy = [];

  // --- Kote lajan antre a (Débit) selon mòd peman ---
  if (peman.mòd === "Melanje") {
    const montanKach = peman.detay?.cash || 0;
    const montanKredi = peman.detay?.kredi || 0;
    if (montanKach > 0) {
      liy.push({ kont: KONT.CAISSE, debi: montanKach, kredi: 0, libele: "Pòsyon kach" });
    }
    if (montanKredi > 0) {
      liy.push({ kont: KONT.CLIENTS, debi: montanKredi, kredi: 0, libele: "Pòsyon kredi" });
    }
  } else if (peman.mòd === "Kredi") {
    liy.push({ kont: KONT.CLIENTS, debi: total, kredi: 0, libele: "Vant a kredi" });
  } else {
    // Cash, MonCash, Transfè Bank, Kat
    liy.push({
      kont: kontKèsPouModPeman(peman.mòd),
      debi: total,
      kredi: 0,
      libele: `Vant ${peman.mòd}`,
    });
  }

  // --- Kredi: Vant Pwodwi (toujou total la antye) ---
  liy.push({ kont: KONT.VENTES_MARCHANDISES, debi: 0, kredi: total, libele: "Vant pwodwi" });

  // --- Envantè pèmanan: CMV (débit) / Stock (kredi), si gen koutMache ---
  if (koutMache > 0) {
    liy.push({ kont: KONT.COUT_MARCHANDISES_VENDUES, debi: koutMache, kredi: 0, libele: "Coût des marchandises vendues" });
    liy.push({ kont: KONT.STOCK_MARCHANDISES, debi: 0, kredi: koutMache, libele: "Sòti stock" });
  }

  return liy;
}


/* ------------------------------------------------------------------ */
/* 2. VANT NAN POS — kè-a nan sistèm nan                               */
/*                                                                     */
/*   Sa fè 4 bagay ANSANM nan YON SÈL transaction atomik:              */
/*     a) Verifye + dediwi stòk pou chak atik nan panyen an             */
/*     b) Kreye rekò vant lan (ak nimewo LV sekansyèl)                 */
/*     c) Anrejistre mouvman kès (si peman kach/melanje)               */
/*     d) Mete ajou dèt kliyan si se kredi                             */
/*                                                                     */
/*   Si nenpòt atik pa gen ase stòk, TOUT transaction lan anile —      */
/*   pa gen okenn ekriti pasyèl.                                       */
/* ------------------------------------------------------------------ */
export async function anrejistreVant(bizId, {
  items,          // [{ produitId, kantite, prixInite, cmpInite }]
  peman,          // { mòd: "Cash"|"MonCash"|"Kredi"|"Melanje"|..., montan, detay }
  kliyanId,       // null si vant kontan/pa gen kliyan spesifik
  vandèId,
  vandèNon,
}) {
  return runTransaction(db, async (transaction) => {
    /* --- Kalkil ki pa mande Firestore, fè yo anvan pou konnen ki lekti nou bezwen --- */
    const total = items.reduce((sum, it) => sum + it.kantite * it.prixInite, 0);
    const koutMache = items.reduce((sum, it) => sum + it.kantite * it.cmpInite, 0);
    const montanKredi = peman.mòd === "Kredi"
      ? total
      : (peman.mòd === "Melanje" ? (peman.detay?.kredi || 0) : 0);

    /* ================================================================ */
    /* ETAP 1: TOUT LEKTI YO DABÒ — Firestore egzije sa: OKENN ekriti     */
    /* pa dwe rive anvan DÈNYE lekti a nan yon transaction.                */
    /* ================================================================ */
    const stokRefs = items.map((it) => doc(stokCol(bizId), it.produitId));
    const kontèRef = doc(db, "biznis", bizId, "konte", "lavant");
    const kliyanRef = (montanKredi > 0 && kliyanId) ? doc(konpteCol(bizId), kliyanId) : null;

    const [stokSnaps, kontèSnap, kliyanSnap] = await Promise.all([
      Promise.all(stokRefs.map((ref) => transaction.get(ref))),
      transaction.get(kontèRef),
      kliyanRef ? transaction.get(kliyanRef) : Promise.resolve(null),
    ]);

    /* --- ETAP 2: VERIFYE disponiblite AVAN nenpòt ekriti --- */
    const stokAjou = [];
    for (let i = 0; i < items.length; i++) {
      const snap = stokSnaps[i];
      const it = items[i];
      if (!snap.exists()) {
        throw new Error(`Pwodwi ${it.produitId} pa egziste nan stòk.`);
      }
      const kantiteAktyèl = snap.data().kantite || 0;
      if (kantiteAktyèl < it.kantite) {
        throw new Error(
          `Stòk pa ase pou "${snap.data().non}" — rete ${kantiteAktyèl}, ` +
          `w ap eseye vann ${it.kantite}.`
        );
      }
      stokAjou.push({
        ref: stokRefs[i],
        nouvoKantite: kantiteAktyèl - it.kantite,
      });
    }

    /* --- ETAP 3: KALKILE nimewo facti sekansyèl (ekriti kontè a pita) --- */
    const denyeNimewo = kontèSnap.exists() ? kontèSnap.data().denye : 0;
    const nouvoNimewo = denyeNimewo + 1;
    const nimewoFacti = `LV-${String(nouvoNimewo).padStart(6, "0")}`;

    /* ================================================================ */
    /* ETAP 4+: KOUNYE A TOUT EKRITI YO — okenn lòt lekti apre pwen sa a  */
    /* ================================================================ */
    transaction.set(kontèRef, { denye: nouvoNimewo }, { merge: true });

    for (const s of stokAjou) {
      transaction.update(s.ref, { kantite: s.nouvoKantite });
    }

    const nouvoVantRef = doc(lavantCol(bizId));
    transaction.set(nouvoVantRef, {
      nimewoFacti,
      items,
      total,
      koutMache,          // pou kalkile Benefis Kontab Reyèl pita
      peman,
      kliyanId: kliyanId || null,
      vandèId,
      vandèNon,
      kreyeLe: serverTimestamp(),
    });

    /* --- EKRI — jounal kontab an parti doub (ATOMIK ak vant lan) --- */
    const liyJounal = konstwiLiyJounalVant(peman, total, koutMache);
    const totalDebi = liyJounal.reduce((s, l) => s + l.debi, 0);
    const totalKredi = liyJounal.reduce((s, l) => s + l.kredi, 0);
    // Garanti kontab: si sa pa balanse, pa gen okenn ekriti — anile tout.
    if (Math.round((totalDebi - totalKredi) * 100) !== 0) {
      throw new Error(
        `Ekriti jounal pa balanse (Débit ${totalDebi} ≠ Crédit ${totalKredi}) — vant lan anile.`
      );
    }
    const nouvoJounalRef = doc(jounalCol(bizId));
    transaction.set(nouvoJounalRef, {
      nimewoFacti,
      referansVantId: nouvoVantRef.id,
      liy: liyJounal,
      totalDebi,
      totalKredi,
      kreyeLe: serverTimestamp(),
    });

    /* --- EKRI — mouvman kès si gen kach ladan --- */
    if (peman.mòd === "Cash" || peman.mòd === "Melanje") {
      const montanKach = peman.mòd === "Cash" ? total : (peman.detay?.cash || 0);
      if (montanKach > 0) {
        const nouvoMouvmanRef = doc(kesCol(bizId));
        transaction.set(nouvoMouvmanRef, {
          tip: "antre",
          montan: montanKach,
          referans: nimewoFacti,
          motif: "Vant POS",
          kreyeLe: serverTimestamp(),
        });
      }
    }

    /* --- EKRI — dèt kliyan si se kredi (total oswa pasyèl) --- */
    if (montanKredi > 0 && kliyanId) {
      const dètAktyèl = kliyanSnap && kliyanSnap.exists() ? (kliyanSnap.data().dèt || 0) : 0;
      transaction.set(
        kliyanRef,
        { dèt: dètAktyèl + montanKredi },
        { merge: true }
      );
    }

    return { nimewoFacti, total };
  });
}

/* ------------------------------------------------------------------ */
/* 3. AJISTEMAN STÒK MANYÈL (antre/sòti san se pa vant, egz. korije)    */
/* ------------------------------------------------------------------ */
export async function ajisteStok(bizId, produitId, kantiteChanjman, motif) {
  return runTransaction(db, async (transaction) => {
    const stokRef = doc(stokCol(bizId), produitId);
    const snap = await transaction.get(stokRef);
    if (!snap.exists()) throw new Error("Pwodwi sa pa egziste.");

    const kantiteAktyèl = snap.data().kantite || 0;
    const nouvoKantite = kantiteAktyèl + kantiteChanjman;
    if (nouvoKantite < 0) {
      throw new Error("Ajisteman sa ta mete stòk anba zewo.");
    }

    transaction.update(stokRef, { kantite: nouvoKantite });

    const istorikRef = doc(collection(db, "biznis", bizId, "stok_istorik"));
    transaction.set(istorikRef, {
      produitId,
      kantiteChanjman,
      motif,
      kreyeLe: serverTimestamp(),
    });
  });
}

/* ------------------------------------------------------------------ */
/* 3b. DEPANS — atomik ak jounal kontab la, menm jan ak vant lan         */
/*                                                                       */
/*   Ekri ANSANM nan YON SÈL transaction:                                */
/*     a) Rekò depans lan (referans DEP-000001 sekansyèl)                */
/*     b) Ekriti jounal an parti doub (Débit 6900 / Crédit Kès-Bank)     */
/*     c) Mouvman kès "sòti" si peman an kach (pou rekonsilyasyon Z-Report) */
/* ------------------------------------------------------------------ */
export async function anrejistreDepans(bizId, {
  libele,
  montan,
  modePeman = "Cash",   // "Cash" | "MonCash" | "Transfè Bank" | "Kat"
  itilizatèId,
  itilizatèNon,
  dat,                  // optionel: Date JS, si absent = kounye a
}) {
  if (!montan || montan <= 0) {
    throw new Error("Montan depans lan dwe pi gran pase 0 HTG.");
  }
  if (!libele || !libele.trim()) {
    throw new Error("Libellé depans lan obligatwa.");
  }

  return runTransaction(db, async (transaction) => {
    /* --- ETAP 1: nimewo depans sekansyèl --- */
    const pieceRef = await pwochenNimewoDepans(transaction, bizId);

    /* --- ETAP 2: liy jounal an parti doub --- */
    const kontKèsOuBank = kontKèsPouModPeman(modePeman);
    const liyJounal = [
      { kont: KONT.CHARGES_GENERALES, debi: montan, kredi: 0, libele: `Depans: ${libele}` },
      { kont: kontKèsOuBank, debi: 0, kredi: montan, libele: `Peman ${modePeman}` },
    ];
    const totalDebi = liyJounal.reduce((s, l) => s + l.debi, 0);
    const totalKredi = liyJounal.reduce((s, l) => s + l.kredi, 0);
    if (Math.round((totalDebi - totalKredi) * 100) !== 0) {
      throw new Error("Ekriti jounal depans lan pa balanse — anile.");
    }

    const dateEkriti = dat ? Timestamp.fromDate(new Date(dat)) : serverTimestamp();

    /* --- ETAP 3: EKRI — rekò depans --- */
    const nouvoDepansRef = doc(depansCol(bizId));
    transaction.set(nouvoDepansRef, {
      pieceRef,
      libele,
      montan,
      modePeman,
      itilizatèId,
      itilizatèNon,
      kreyeLe: dateEkriti,
    });

    /* --- ETAP 4: EKRI — jounal kontab --- */
    const nouvoJounalRef = doc(jounalCol(bizId));
    transaction.set(nouvoJounalRef, {
      pieceRef,
      referansDepansId: nouvoDepansRef.id,
      liy: liyJounal,
      totalDebi,
      totalKredi,
      kreyeLe: dateEkriti,
    });

    /* --- ETAP 5: EKRI — mouvman kès "sòti" si peman an kach --- */
    if (modePeman === "Cash") {
      const nouvoMouvmanRef = doc(kesCol(bizId));
      transaction.set(nouvoMouvmanRef, {
        tip: "sòti",
        montan,
        referans: pieceRef,
        motif: `Depans: ${libele}`,
        kreyeLe: dateEkriti,
      });
    }

    return { pieceRef };
  });
}

/* ------------------------------------------------------------------ */
/* 3c. PEMAN KLIYAN (RECOUVREMENT DÈT) — diminye dèt, atomik ak jounal    */
/*                                                                       */
/*   Ekri ANSANM nan YON SÈL transaction:                                */
/*     a) Verifye kliyan egziste + montan pa depase dèt aktyèl la         */
/*     b) Diminye solde dèt kliyan an                                    */
/*     c) Anrejistre istorik peman an                                    */
/*     d) Ekriti jounal an parti doub (Débit Kès-Bank / Crédit 1200)     */
/*     e) Mouvman kès "antre" si peman an kach                           */
/* ------------------------------------------------------------------ */
export async function anrejistrePemanKliyan(bizId, {
  kliyanId,
  montanPeye,
  modePeman = "Cash",
  itilizatèId,
  itilizatèNon,
}) {
  if (!montanPeye || montanPeye <= 0) {
    throw new Error("Montan peman an dwe pi gran pase 0 HTG.");
  }

  return runTransaction(db, async (transaction) => {
    /* --- ETAP 1: TOUT LEKTI DABÒ --- */
    const kliyanRef = doc(konpteCol(bizId), kliyanId);
    const kliyanSnap = await transaction.get(kliyanRef);

    if (!kliyanSnap.exists()) {
      throw new Error("Kliyan sa a pa egziste nan sistèm nan.");
    }

    const kliyanData = kliyanSnap.data();
    const dètAktyèl = kliyanData.dèt || 0;

    if (montanPeye > dètAktyèl) {
      throw new Error(
        `Montan peye a (${montanPeye} HTG) pi gran pase dèt kliyan an (${dètAktyèl} HTG).`
      );
    }

    /* --- ETAP 2: nimewo peman sekansyèl (lekti+ekriti kontè, toujou anvan lòt ekriti yo) --- */
    const pieceRef = await pwochenNimewoRecouvrement(transaction, bizId);

    /* --- ETAP 3: liy jounal an parti doub — Débit Kès/Bank, Crédit Clients (1200) --- */
    const kontKèsOuBank = kontKèsPouModPeman(modePeman);
    const liyJounal = [
      { kont: kontKèsOuBank, debi: montanPeye, kredi: 0, libele: `Recouvrement — ${kliyanData.non || kliyanId}` },
      { kont: KONT.CLIENTS, debi: 0, kredi: montanPeye, libele: `Diminisyon dèt — ${kliyanData.non || kliyanId}` },
    ];
    const totalDebi = liyJounal.reduce((s, l) => s + l.debi, 0);
    const totalKredi = liyJounal.reduce((s, l) => s + l.kredi, 0);
    if (Math.round((totalDebi - totalKredi) * 100) !== 0) {
      throw new Error("Ekriti jounal recouvrement pa balanse — anile.");
    }

    /* --- ETAP 4+: TOUT EKRITI --- */
    const nouvoSolde = dètAktyèl - montanPeye;
    transaction.update(kliyanRef, { dèt: nouvoSolde });

    const nouvoPemanRef = doc(pemanKliyanCol(bizId));
    transaction.set(nouvoPemanRef, {
      pieceRef,
      kliyanId,
      montanPeye,
      modePeman,
      dètAvan: dètAktyèl,
      dètApre: nouvoSolde,
      itilizatèId,
      itilizatèNon,
      kreyeLe: serverTimestamp(),
    });

    const nouvoJounalRef = doc(jounalCol(bizId));
    transaction.set(nouvoJounalRef, {
      pieceRef,
      referansPemanId: nouvoPemanRef.id,
      liy: liyJounal,
      totalDebi,
      totalKredi,
      kreyeLe: serverTimestamp(),
    });

    if (modePeman === "Cash") {
      const nouvoMouvmanRef = doc(kesCol(bizId));
      transaction.set(nouvoMouvmanRef, {
        tip: "antre",
        montan: montanPeye,
        referans: pieceRef,
        motif: `Recouvrement dèt — ${kliyanData.non || kliyanId}`,
        kreyeLe: serverTimestamp(),
      });
    }

    return { pieceRef, nouvoSolde };
  });
}

/* ------------------------------------------------------------------ */
/* 3d. ACHA A KREDI — mete ajou stòk+CMP ak dèt founisè, atomik ak jounal */
/*                                                                       */
/*   BUG KRITIK KI KORIJE ISIT LA: yon vèsyon anvan te fè yon `for` loop  */
/*   ki li YON pwodwi (get), ekri l (update), epi li PWOCHEN an (get) —  */
/*   sa vyole règ Firestore a: TOUT lekti dwe fèt AVAN TOUT ekriti,       */
/*   pa item pa item. Isit la nou li TOUT pwodwi yo AVAN nou ekri okenn. */
/* ------------------------------------------------------------------ */
export async function anrejistreAchteKredi(bizId, {
  founisèId,
  founisèNon,
  items,          // [{ produitId, quantite, prixAchat }]
  itilizatèId,
  itilizatèNon,
}) {
  const montanTotal = items.reduce((s, it) => s + it.quantite * it.prixAchat, 0);
  if (!montanTotal || montanTotal <= 0) {
    throw new Error("Montan total achte a dwe pi gran pase 0 HTG.");
  }

  return runTransaction(db, async (transaction) => {
    /* --- ETAP 1: TOUT LEKTI DABÒ — founisè + TOUT pwodwi yo ANSANM --- */
    const founisèRef = doc(founisèCol(bizId), founisèId);
    const prodRefs = items.map((it) => doc(stokCol(bizId), it.produitId));

    const [founisèSnap, prodSnaps] = await Promise.all([
      transaction.get(founisèRef),
      Promise.all(prodRefs.map((ref) => transaction.get(ref))),
    ]);

    if (!founisèSnap.exists()) {
      throw new Error("Founisè sa a pa egziste nan sistèm nan.");
    }

    /* --- ETAP 2: KALKILE nouvo kantite + CMP pou chak pwodwi (san ekri) --- */
    const prodAjou = items.map((it, i) => {
      const snap = prodSnaps[i];
      const ansyenQte = snap.exists() ? (snap.data().kantite || 0) : 0;
      const ansyenCmp = snap.exists() ? (snap.data().cmp || 0) : 0;
      const nouvoQte = ansyenQte + it.quantite;
      const nouvoCmp = nouvoQte > 0
        ? ((ansyenQte * ansyenCmp) + (it.quantite * it.prixAchat)) / nouvoQte
        : it.prixAchat;

      return {
        ref: prodRefs[i],
        nouvoQte,
        nouvoCmp: Number(nouvoCmp.toFixed(2)),
        pwodwiEgziste: snap.exists(),
      };
    });

    const dètAktyèl = founisèSnap.data().dèt || 0;
    const nouvoDèt = dètAktyèl + montanTotal;
    const pieceRef = await pwochenNimewoAcha(transaction, bizId);

    /* --- ETAP 3: liy jounal — Débit Stock / Crédit Fournisseurs --- */
    const liyJounal = [
      { kont: KONT.STOCK_MARCHANDISES, debi: montanTotal, kredi: 0, libele: `Acha — ${founisèNon}` },
      { kont: KONT.FOURNISSEURS, debi: 0, kredi: montanTotal, libele: `Dèt founisè — ${founisèNon}` },
    ];
    const totalDebi = liyJounal.reduce((s, l) => s + l.debi, 0);
    const totalKredi = liyJounal.reduce((s, l) => s + l.kredi, 0);
    if (Math.round((totalDebi - totalKredi) * 100) !== 0) {
      throw new Error("Ekriti jounal acha pa balanse — anile.");
    }

    /* --- ETAP 4+: TOUT EKRITI — pa gen okenn lòt lekti apre pwen sa a --- */
    for (const p of prodAjou) {
      if (p.pwodwiEgziste) {
        transaction.update(p.ref, { kantite: p.nouvoQte, cmp: p.nouvoCmp });
      } else {
        // Pwodwi pa t egziste ankò — kreye l ak done acha a kòm pwen depa.
        transaction.set(p.ref, { kantite: p.nouvoQte, cmp: p.nouvoCmp, kreyeLe: serverTimestamp() });
      }
    }

    transaction.update(founisèRef, { dèt: nouvoDèt });

    const nouvoAchaRef = doc(achaCol(bizId));
    transaction.set(nouvoAchaRef, {
      pieceRef,
      founisèId,
      founisèNon,
      items,
      montanTotal,
      itilizatèId,
      itilizatèNon,
      kreyeLe: serverTimestamp(),
    });

    const nouvoJounalRef = doc(jounalCol(bizId));
    transaction.set(nouvoJounalRef, {
      pieceRef,
      referansAchaId: nouvoAchaRef.id,
      liy: liyJounal,
      totalDebi,
      totalKredi,
      kreyeLe: serverTimestamp(),
    });

    return { pieceRef, montanTotal };
  });
}

/* ------------------------------------------------------------------ */
/* 3e. PEMAN FOUNISÈ (RÈGLEMAN DÈT NOU DWE) — diminye dèt, atomik        */
/* ------------------------------------------------------------------ */
export async function anrejistrePemanFounisè(bizId, {
  founisèId,
  montanPeye,
  modePeman = "Cash",
  itilizatèId,
  itilizatèNon,
}) {
  if (!montanPeye || montanPeye <= 0) {
    throw new Error("Montan peman an dwe pi gran pase 0 HTG.");
  }

  return runTransaction(db, async (transaction) => {
    /* --- ETAP 1: TOUT LEKTI DABÒ --- */
    const founisèRef = doc(founisèCol(bizId), founisèId);
    const founisèSnap = await transaction.get(founisèRef);

    if (!founisèSnap.exists()) {
      throw new Error("Founisè sa a pa egziste.");
    }

    const founisèData = founisèSnap.data();
    const dètAktyèl = founisèData.dèt || 0;

    if (montanPeye > dètAktyèl) {
      throw new Error(
        `Peman an (${montanPeye} HTG) depase dèt ou dwe founisè a (${dètAktyèl} HTG).`
      );
    }

    const pieceRef = await pwochenNimewoRegFounisè(transaction, bizId);

    /* --- ETAP 2: liy jounal — Débit Fournisseurs / Crédit Kès-Bank --- */
    const kontKèsOuBank = kontKèsPouModPeman(modePeman);
    const liyJounal = [
      { kont: KONT.FOURNISSEURS, debi: montanPeye, kredi: 0, libele: `Règlement — ${founisèData.non || founisèId}` },
      { kont: kontKèsOuBank, debi: 0, kredi: montanPeye, libele: `Peman ${modePeman}` },
    ];
    const totalDebi = liyJounal.reduce((s, l) => s + l.debi, 0);
    const totalKredi = liyJounal.reduce((s, l) => s + l.kredi, 0);
    if (Math.round((totalDebi - totalKredi) * 100) !== 0) {
      throw new Error("Ekriti jounal règlement founisè pa balanse — anile.");
    }

    /* --- ETAP 3+: TOUT EKRITI --- */
    const nouvoDèt = dètAktyèl - montanPeye;
    transaction.update(founisèRef, { dèt: nouvoDèt });

    const nouvoPemanRef = doc(pemanFounisèCol(bizId));
    transaction.set(nouvoPemanRef, {
      pieceRef,
      founisèId,
      montanPeye,
      modePeman,
      dètAvan: dètAktyèl,
      dètApre: nouvoDèt,
      itilizatèId,
      itilizatèNon,
      kreyeLe: serverTimestamp(),
    });

    const nouvoJounalRef = doc(jounalCol(bizId));
    transaction.set(nouvoJounalRef, {
      pieceRef,
      referansPemanId: nouvoPemanRef.id,
      liy: liyJounal,
      totalDebi,
      totalKredi,
      kreyeLe: serverTimestamp(),
    });

    if (modePeman === "Cash") {
      const nouvoMouvmanRef = doc(kesCol(bizId));
      transaction.set(nouvoMouvmanRef, {
        tip: "sòti",
        montan: montanPeye,
        referans: pieceRef,
        motif: `Règlement founisè — ${founisèData.non || founisèId}`,
        kreyeLe: serverTimestamp(),
      });
    }

    return { pieceRef, nouvoDèt };
  });
}

/* ------------------------------------------------------------------ */
/* 3f. PWENNAJ (ANTRE/SÒTI ANPLWAYE) — senp anrejistreman, PA BEZWEN     */
/*     transaction: se yon istorik "append-only", pa gen eta pataje     */
/*     ki ka gen konfli ant 2 anplwaye k ap tape an menm tan.            */
/* ------------------------------------------------------------------ */
export async function anrejistrePwennaj(bizId, { anplwayeId, anplwayeNon, tip = "ENTREE", nòt = "" }) {
  const nouvoPwennajRef = doc(pwennajCol(bizId));
  await setDoc(nouvoPwennajRef, {
    anplwayeId,
    anplwayeNon,
    tip, // "ENTREE" oswa "SORTIE"
    nòt,
    kreyeLe: serverTimestamp(),
  });
  return nouvoPwennajRef.id;
}

/* ------------------------------------------------------------------ */
/* 3g. PEWÒL — peman salè atomik ak jounal kontab la                     */
/* ------------------------------------------------------------------ */
export async function anrejistrePewòl(bizId, {
  anplwayeId,
  anplwayeNon,
  salèDeBaz,
  prim = 0,
  dediksyon = 0,
  modePeman = "Cash",
  itilizatèId,
  itilizatèNon,
}) {
  const netAPeye = Number(salèDeBaz) + Number(prim) - Number(dediksyon);
  if (!netAPeye || netAPeye <= 0) {
    throw new Error("Salè nèt la dwe pi gran pase 0 HTG.");
  }

  return runTransaction(db, async (transaction) => {
    /* --- ETAP 1: LEKTI — sèl lekti a se kontè a --- */
    const pieceRef = await pwochenNimewoPewòl(transaction, bizId);

    /* --- ETAP 2: liy jounal — Débit Charges de Personnel / Crédit Kès-Bank --- */
    const kontKèsOuBank = kontKèsPouModPeman(modePeman);
    const liyJounal = [
      { kont: KONT.CHARGES_PERSONNEL, debi: netAPeye, kredi: 0, libele: `Salè — ${anplwayeNon}` },
      { kont: kontKèsOuBank, debi: 0, kredi: netAPeye, libele: `Peman ${modePeman}` },
    ];
    const totalDebi = liyJounal.reduce((s, l) => s + l.debi, 0);
    const totalKredi = liyJounal.reduce((s, l) => s + l.kredi, 0);
    if (Math.round((totalDebi - totalKredi) * 100) !== 0) {
      throw new Error("Ekriti jounal pewòl la pa balanse — anile.");
    }

    /* --- ETAP 3+: EKRITI --- */
    const nouvoPewòlRef = doc(pewòlCol(bizId));
    transaction.set(nouvoPewòlRef, {
      pieceRef,
      anplwayeId,
      anplwayeNon,
      salèDeBaz: Number(salèDeBaz),
      prim: Number(prim),
      dediksyon: Number(dediksyon),
      netAPeye,
      modePeman,
      itilizatèId,
      itilizatèNon,
      kreyeLe: serverTimestamp(),
    });

    const nouvoJounalRef = doc(jounalCol(bizId));
    transaction.set(nouvoJounalRef, {
      pieceRef,
      referansPewòlId: nouvoPewòlRef.id,
      liy: liyJounal,
      totalDebi,
      totalKredi,
      kreyeLe: serverTimestamp(),
    });

    if (modePeman === "Cash") {
      const nouvoMouvmanRef = doc(kesCol(bizId));
      transaction.set(nouvoMouvmanRef, {
        tip: "sòti",
        montan: netAPeye,
        referans: pieceRef,
        motif: `Pewòl — ${anplwayeNon}`,
        kreyeLe: serverTimestamp(),
      });
    }

    return { pieceRef, netAPeye };
  });
}

/* ------------------------------------------------------------------ */
/* 4. LEKTI (pa bezwen transaction — se jis li, pa gen konkirans)       */
/* ------------------------------------------------------------------ */
export async function jwennStokPwodwi(bizId, produitId) {
  const stokRef = doc(stokCol(bizId), produitId);
  const snap = await getDoc(stokRef);
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

export async function jwennKatalogStok(bizId) {
  const snap = await getDocs(stokCol(bizId));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

/* ------------------------------------------------------------------ */
/* 5. KREYE / METE AJOU PWODWI (itilize pa stock.js)                   */
/* ------------------------------------------------------------------ */
export async function kreyePwodwi(bizId, { non, priVant, cmp, kantiteInisyal, stokMinimòm }) {
  const nouvoRef = doc(stokCol(bizId));
  await setDoc(nouvoRef, {
    non,
    priVant,
    cmp: cmp || 0,
    kantite: kantiteInisyal || 0,
    stokMinimòm: stokMinimòm ?? null,
    kreyeLe: serverTimestamp(),
  });
  return nouvoRef.id;
}

export async function meteAjouPwiPwodwi(bizId, produitId, chanjman) {
  const ref = doc(stokCol(bizId), produitId);
  await updateDoc(ref, chanjman);
}

export async function jwennDènyeVant(bizId, kantite = 20) {
  const q = query(
    lavantCol(bizId),
    orderBy("kreyeLe", "desc"),
    limit(kantite)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

/* ------------------------------------------------------------------ */
/* 6. LEKTI JOUNAL (pou accounting.js — grand livre, bilan, UI)          */
/*    NÒT SCALABILITE: pou MVP nou li tout ekriti yo epi filtre nan JS.  */
/*    Lè volim vin gwo (plizyè mil ekriti/mwa), n ap bezwen pajinasyon   */
/*    oswa yon koleksyon "jounal_liy" separe ki queryab pa kont.         */
/* ------------------------------------------------------------------ */
export async function jwennTouEkriJounal(bizId, { limiteA = 500 } = {}) {
  const q = query(jounalCol(bizId), orderBy("kreyeLe", "desc"), limit(limiteA));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function jwennDènyeDepans(bizId, kantite = 20) {
  const q = query(depansCol(bizId), orderBy("kreyeLe", "desc"), limit(kantite));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function jwennKliyan(bizId, kliyanId) {
  const ref = doc(konpteCol(bizId), kliyanId);
  const snap = await getDoc(ref);
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

export async function jwennKliyanAkDèt(bizId) {
  const q = query(konpteCol(bizId), where("dèt", ">", 0));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function jwennFounisè(bizId, founisèId) {
  const ref = doc(founisèCol(bizId), founisèId);
  const snap = await getDoc(ref);
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

export async function jwennFounisèAkDèt(bizId) {
  const q = query(founisèCol(bizId), where("dèt", ">", 0));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function jwennTouFounisè(bizId) {
  const snap = await getDocs(founisèCol(bizId));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function jwennPwennajJodi(bizId, anplwayeId) {
  // Chèche pwennaj yon anplwaye — itil pou konnen si li deja "ENTREE" jodi a.
  const q = query(
    pwennajCol(bizId),
    where("anplwayeId", "==", anplwayeId),
    orderBy("kreyeLe", "desc"),
    limit(1)
  );
  const snap = await getDocs(q);
  return snap.docs.length > 0 ? { id: snap.docs[0].id, ...snap.docs[0].data() } : null;
}

export async function jwennDènyePewòl(bizId, kantite = 20) {
  const q = query(pewòlCol(bizId), orderBy("kreyeLe", "desc"), limit(kantite));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

/* ------------------------------------------------------------------ */
/* 5. DASHBOARD — fonksyon agregasyon KPI (lekti sèlman, pa transaction) */
/*                                                                       */
/* Chak fonksyon retounen { valeur, variation } kote sa fè sans (metrik  */
/* "pa jou" tankou vant/depans/benefis konpare ak yè). Pou balans        */
/* kimilatif (kès, dèt kliyan/founisè), `variation` rete `null` — yon    */
/* balans kimilatif pa gen yon "varyasyon jou" ki gen sans san yon       */
/* istorik daily snapshot separe, kidonk nou pa envante yon chif.        */
/* ------------------------------------------------------------------ */

function kòmansmanJou(dat = new Date()) {
  const d = new Date(dat);
  d.setHours(0, 0, 0, 0);
  return d;
}

function kalkileVaryasyon(jodiA, yèA) {
  if (!yèA) return null; // pa gen baz konparezon valab (0 oswa manke)
  return Math.round(((jodiA - yèA) / yèA) * 1000) / 10; // pousantaj, 1 desimal
}

async function sommeJounalPaJou(bizId, kontCode, kolòn, dat) {
  const dèbi = kòmansmanJou(dat);
  const fen = new Date(dèbi);
  fen.setDate(fen.getDate() + 1);

  const q = query(jounalCol(bizId), where("kreyeLe", ">=", dèbi), where("kreyeLe", "<", fen));
  const snap = await getDocs(q);

  let total = 0;
  snap.docs.forEach((d) => {
    const antre = d.data();
    (antre.liy || []).forEach((liy) => {
      if (liy.kont === kontCode) total += liy[kolòn] || 0;
    });
  });
  return total;
}

export async function getVentesJour(bizId) {
  const yè = new Date();
  yè.setDate(yè.getDate() - 1);

  const [jodiA, yèA] = await Promise.all([
    sommeJounalPaJou(bizId, KONT.VENTES_MARCHANDISES, "kredi", new Date()),
    sommeJounalPaJou(bizId, KONT.VENTES_MARCHANDISES, "kredi", yè),
  ]);

  return { valeur: jodiA, variation: kalkileVaryasyon(jodiA, yèA) };
}

export async function getDepansJour(bizId) {
  const yè = new Date();
  yè.setDate(yè.getDate() - 1);

  const [pèsonèlJodi, jeneralJodi, pèsonèlYè, jeneralYè] = await Promise.all([
    sommeJounalPaJou(bizId, KONT.CHARGES_PERSONNEL, "debi", new Date()),
    sommeJounalPaJou(bizId, KONT.CHARGES_GENERALES, "debi", new Date()),
    sommeJounalPaJou(bizId, KONT.CHARGES_PERSONNEL, "debi", yè),
    sommeJounalPaJou(bizId, KONT.CHARGES_GENERALES, "debi", yè),
  ]);

  const jodiA = pèsonèlJodi + jeneralJodi;
  const yèA = pèsonèlYè + jeneralYè;
  return { valeur: jodiA, variation: kalkileVaryasyon(jodiA, yèA) };
}

export async function getBeneficeJour(bizId) {
  const yè = new Date();
  yè.setDate(yè.getDate() - 1);

  const [ventesJodi, cmvJodi, depansJodi, ventesYè, cmvYè] = await Promise.all([
    sommeJounalPaJou(bizId, KONT.VENTES_MARCHANDISES, "kredi", new Date()),
    sommeJounalPaJou(bizId, KONT.COUT_MARCHANDISES_VENDUES, "debi", new Date()),
    getDepansJour(bizId).then((r) => r.valeur),
    sommeJounalPaJou(bizId, KONT.VENTES_MARCHANDISES, "kredi", yè),
    sommeJounalPaJou(bizId, KONT.COUT_MARCHANDISES_VENDUES, "debi", yè),
  ]);

  const jodiA = ventesJodi - cmvJodi - depansJodi;
  const yèA = ventesYè - cmvYè; // senplifye: pa reprann depans yè pou evite twòp apèl Firestore

  return { valeur: jodiA, variation: kalkileVaryasyon(jodiA, yèA) };
}

export async function getSoldeCaisse(bizId) {
  const snap = await getDocs(kesCol(bizId));
  let solde = 0;
  snap.docs.forEach((d) => {
    const m = d.data();
    solde += m.tip === "antre" ? m.montan : -m.montan;
  });
  return { valeur: solde, variation: null };
}

export async function getDetteClients(bizId) {
  const kliyanYo = await jwennKliyanAkDèt(bizId);
  const total = kliyanYo.reduce((s, k) => s + (k.dèt || 0), 0);
  return { valeur: total, variation: null };
}

export async function getDetteFournisseurs(bizId) {
  const founisèYo = await jwennFounisèAkDèt(bizId);
  const total = founisèYo.reduce((s, f) => s + (f.dèt || 0), 0);
  return { valeur: total, variation: null };
}

export async function getAlertesStock(bizId) {
  const katalòg = await jwennKatalogStok(bizId);
  const alèt = katalòg.filter(
    (p) => p.stokMinimòm != null && p.stokMinimòm > 0 && p.kantite <= p.stokMinimòm
  );
  return { valeur: alèt.length, alèt };
}
