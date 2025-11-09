import { jest, describe, it, expect, beforeEach } from '@jest/globals';

const mockCreateUser = jest.fn();
const mockFindUserByEmail = jest.fn();
const mockFindUserByUsername = jest.fn();
const mockFindUserById = jest.fn();

jest.unstable_mockModule("../../repositories/user-repo.mjs", () => ({
  createUser: mockCreateUser,
  findUserByEmail: mockFindUserByEmail,
  findUserByUsername: mockFindUserByUsername,
  findUserById: mockFindUserById,
}));

const mockHash = jest.fn();
const mockCompare = jest.fn();

jest.unstable_mockModule("bcrypt", () => ({
  __esModule: true,
  default: {
    hash: mockHash,
    compare: mockCompare,
  },
}));

let AuthService;

describe("AuthService", () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    const authServiceModule = await import("../../services/auth-service.mjs");
    AuthService = authServiceModule.AuthService;
  });

  const mockUserInput = {
    email: "test@example.com",
    username: "testuser",
    password: "password123",
    firstName: "Test",
    lastName: "User",
  };

  const expectedSanitizedUser = {
    id: 1,
    email: "test@example.com",
    username: "testuser",
    firstName: "Test",
    lastName: "User",
  };

  const mockPlainUser = {
    id: 1,
    email: "test@example.com",
    username: "testuser",
    firstName: "Test",
    lastName: "User",
    hashedPassword: "hashed-password-123",
  };

  const mockSequelizeUser = {
    ...mockPlainUser,
    get: jest.fn(),
  };

  describe("registerUser", () => {
    it("should register a new user successfully", async () => {
      mockFindUserByEmail.mockResolvedValue(null);
      mockFindUserByUsername.mockResolvedValue(null);
      mockHash.mockResolvedValue("hashed-password-123");
      mockCreateUser.mockResolvedValue(mockSequelizeUser);

      mockSequelizeUser.get.mockReturnValue(mockPlainUser);

      const result = await AuthService.registerUser(mockUserInput);

      expect(mockFindUserByEmail).toHaveBeenCalledWith("test@example.com");
      expect(mockFindUserByUsername).toHaveBeenCalledWith("testuser");
      expect(mockHash).toHaveBeenCalledWith("password123", 10);
      expect(mockCreateUser).toHaveBeenCalledWith({
        email: "test@example.com",
        username: "testuser",
        firstName: "Test",
        lastName: "User",
        hashedPassword: "hashed-password-123",
      });
      expect(mockSequelizeUser.get).toHaveBeenCalledWith({ plain: true });
      expect(result).toEqual(expectedSanitizedUser);
    });

    it("should throw a 409 error if email is already registered", async () => {
      mockFindUserByEmail.mockResolvedValue(mockSequelizeUser);
      mockFindUserByUsername.mockResolvedValue(null);

      await expect(AuthService.registerUser(mockUserInput))
        .rejects.toThrow("Email is already registered.");

      await expect(AuthService.registerUser(mockUserInput))
        .rejects.toHaveProperty("statusCode", 409);

      expect(mockFindUserByUsername).not.toHaveBeenCalled();
      expect(mockCreateUser).not.toHaveBeenCalled();
    });

    it("should throw a 409 error if username is already registered", async () => {
      mockFindUserByEmail.mockResolvedValue(null);
      mockFindUserByUsername.mockResolvedValue(mockSequelizeUser);

      await expect(AuthService.registerUser(mockUserInput))
        .rejects.toThrow("Username is already registered.");

      await expect(AuthService.registerUser(mockUserInput))
        .rejects.toHaveProperty("statusCode", 409);

      expect(mockFindUserByEmail).toHaveBeenCalled();
      expect(mockCreateUser).not.toHaveBeenCalled();
      expect(mockHash).not.toHaveBeenCalled();
    });
  });

  describe("validateCredentials", () => {
    it("should return a sanitized user for valid credentials", async () => {
      mockFindUserByUsername.mockResolvedValue(mockSequelizeUser);
      mockCompare.mockResolvedValue(true);
      mockSequelizeUser.get.mockReturnValue(mockPlainUser);

      const result = await AuthService.validateCredentials("testuser", "password123");

      expect(mockFindUserByUsername).toHaveBeenCalledWith("testuser");
      expect(mockCompare).toHaveBeenCalledWith("password123", "hashed-password-123");
      expect(mockSequelizeUser.get).toHaveBeenCalledWith({ plain: true });
      expect(result).toEqual(expectedSanitizedUser);
    });

    it("should return null if user is not found", async () => {
      mockFindUserByUsername.mockResolvedValue(null);

      const result = await AuthService.validateCredentials("wronguser", "password123");

      expect(mockFindUserByUsername).toHaveBeenCalledWith("wronguser");
      expect(mockCompare).not.toHaveBeenCalled();
      expect(result).toBeNull();
    });

    it("should return null for incorrect password", async () => {
      mockFindUserByUsername.mockResolvedValue(mockSequelizeUser);
      mockCompare.mockResolvedValue(false);

      const result = await AuthService.validateCredentials("testuser", "wrongpassword");

      expect(mockFindUserByUsername).toHaveBeenCalledWith("testuser");
      expect(mockCompare).toHaveBeenCalledWith("wrongpassword", "hashed-password-123");
      expect(mockSequelizeUser.get).not.toHaveBeenCalled();
      expect(result).toBeNull();
    });
  });
});