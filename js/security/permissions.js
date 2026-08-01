export const ROLES = {
  ADMIN: 'admin',
  COMPTABLE: 'comptable',
  RH: 'rh',
  CAISSIER: 'caissier'
};

export const canAccessModule = (userRole, moduleName) => {
  if (userRole === ROLES.ADMIN) return true;
  if (userRole === ROLES.COMPTABLE && ['finance', 'structure'].includes(moduleName)) return true;
  if (userRole === ROLES.RH && ['rh', 'structure'].includes(moduleName)) return true;
  return false;
};
