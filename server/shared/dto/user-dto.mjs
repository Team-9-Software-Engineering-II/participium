/**
 * Mappa l'oggetto User recuperato dal DB in un DTO User per l'API.
 * Rimuove esplicitamente i campi sensibili come email e password.
 * * @param {object} user - L'oggetto User completo (plain object).
 * @returns {object | null} L'oggetto User DTO pulito.
 */
export function mapUserToPublicDTO(user) {
  if (!user) return null;

  const plainUser = user.get ? user.get({ plain: true }) : user;

  return {
    id: plainUser.id,
    username: plainUser.username,
    firstName: plainUser.firstName,
    lastName: plainUser.lastName,
    photoURL: plainUser.photoURL,
  };
}
