/**
 * This method aims to verify that the ID is a positive number
 */
export function isIdNumberAndPositive(id) {
  return Number.isInteger(id) && id >= 0;
}
