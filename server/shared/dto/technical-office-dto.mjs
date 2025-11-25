/**
 * Transforms an array of TechnicalOffice objects (with relations)
 * into a list of simplified objects containing only id and name.
 *
 * @param {Array<object>} offices - An array of TechnicalOffice objects retrieved from Sequelize.
 * @returns {Promise<Array<{id: number, name: string}>>} A promise that resolves to a list of simplified technical office objects.
 */
export function filterToSimplifiedList(offices) {
  if (!offices || !Array.isArray(offices)) {
    return [];
  }

  return offices.map((office) => ({
    id: office.id,
    name: office.name,
  }));
}
