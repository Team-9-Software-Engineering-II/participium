/**
 * Converts a Sequelize user instance into a plain object and omits sensitive fields.
 * @param {import("sequelize").Model | null} user - User instance returned by Sequelize.
 * @returns {object | null} Plain JavaScript object without sensitive attributes.
 */
export function sanitizeUser(user) {
  if (!user) {
    return null;
  }

  const plainUser = user.get ? user.get({ plain: true }) : { ...user };
  delete plainUser.hashedPassword;

  return plainUser;
}
