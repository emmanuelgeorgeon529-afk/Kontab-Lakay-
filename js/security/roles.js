// js/security/roles.js
//
// Definisyon santralize pou 6 wòl yo. Chan "wol" nan biznis/{bizId}/manm/{uid}
// dwe toujou pran youn nan valè sa yo — pa janm ekri wòl kòm string an dir
// nan lòt fichye, toujou enpòte soti isit pou evite fòt òtograf.

export const WOL = {
  PWOPRIYETE: "Propriétaire",
  ADMINISTRATE: "Administratè",
  VANDE: "Vandè",
  MAGASINYE: "Magasinier",
  KOMI: "Kòmis",
  KONTAB: "Kontablè",
};

export const TOUT_WOL = Object.values(WOL);

// Nivo yerachi — itil pou konpare "èske wòl A gen otorite sou wòl B"
// (pa egzanp: yon Administratè ka envite yon Vandè, men yon Vandè pa ka envite pèsòn).
export const NIVO_WOL = {
  [WOL.PWOPRIYETE]: 100,
  [WOL.ADMINISTRATE]: 80,
  [WOL.KONTAB]: 60,
  [WOL.MAGASINYE]: 40,
  [WOL.VANDE]: 30,
  [WOL.KOMI]: 20,
};

export function wolGenOtoriteSou(wolA, wolB) {
  return (NIVO_WOL[wolA] ?? 0) > (NIVO_WOL[wolB] ?? 0);
}

export function wolValid(wol) {
  return TOUT_WOL.includes(wol);
}
