/**
 * @file Unit tests for the user utility functions.
 * @description Ensures the Data Transfer Object (DTO) mapper correctly sanitizes
 * user objects by keeping public fields and removing sensitive/internal fields.
 */

import { mapUserToPublicDTO } from "../../../shared/dto/user-dto.mjs";

describe("mapUserToPublicDTO Unit Tests", () => {
  // Mock data representing a complete user object retrieved from the database
  const fullUserObject = {
    id: 101,
    email: "test.user@participium.com", // Sensitive field
    username: "testuser",
    hashedPassword: "hashedSecretPassword", // Sensitive field
    firstName: "Test",
    lastName: "User",
    photoURL: "/uploads/photos/test.jpg",
    roleId: 4, // Internal field
    technicalOfficeId: 2, // Internal field
    createdAt: new Date(),
    updatedAt: new Date(),
    // Include the .get method to simulate a Sequelize instance
    get: function ({ plain }) {
      if (plain) {
        // Return a plain copy of itself for testing Sequelize behavior
        const copy = { ...this };
        delete copy.get;
        return copy;
      }
      return this;
    },
  };

  // Expected output structure (fields that MUST be present)
  const expectedPublicFields = {
    id: 101,
    username: "testuser",
    firstName: "Test",
    lastName: "User",
    photoURL: "/uploads/photos/test.jpg",
  };

  test("should correctly map and sanitize a Sequelize instance of a user", () => {
    // Input is the mock object which includes the .get() method
    const result = mapUserToPublicDTO(fullUserObject);

    // 1. Check for correct public fields
    expect(result).toEqual(expectedPublicFields);

    // 2. Check for removal of sensitive/internal fields
    expect(result).not.toHaveProperty("email");
    expect(result).not.toHaveProperty("hashedPassword");
    expect(result).not.toHaveProperty("roleId");
    expect(result).not.toHaveProperty("technicalOfficeId");
    expect(result).not.toHaveProperty("createdAt");
  });

  test("should correctly map and sanitize a plain JavaScript user object", () => {
    // Remove the .get method to simulate a standard JS object
    const plainInput = { ...fullUserObject };
    delete plainInput.get;

    const result = mapUserToPublicDTO(plainInput);

    // 1. Check for correct public fields
    expect(result).toEqual(expectedPublicFields);

    // 2. Check for removal of sensitive/internal fields
    expect(result).not.toHaveProperty("email");
    expect(result).not.toHaveProperty("hashedPassword");
  });

  test("should return null if the input user object is null", () => {
    const result = mapUserToPublicDTO(null);
    expect(result).toBeNull();
  });

  test("should return null if the input user object is undefined", () => {
    const result = mapUserToPublicDTO(undefined);
    expect(result).toBeNull();
  });

  test("should handle missing optional fields (like photoURL)", () => {
    const userWithoutPhoto = {
      ...fullUserObject,
      photoURL: null,
      get: function ({ plain }) {
        const copy = { ...this };
        delete copy.get;
        return copy;
      },
    };

    const expected = {
      ...expectedPublicFields,
      photoURL: null, // Expect null if the field is present as null
    };

    const result = mapUserToPublicDTO(userWithoutPhoto);

    expect(result).toEqual(expected);
    expect(result).toHaveProperty("photoURL", null);
  });
});
