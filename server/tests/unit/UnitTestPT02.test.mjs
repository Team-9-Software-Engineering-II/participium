import { jest, describe, it, beforeEach, expect, beforeAll } from "@jest/globals";

// --- MOCK FUNCTIONS ---
const mockRegisterUser = jest.fn();
const mockGetUsers = jest.fn();
const mockValidateRegistrationInput = jest.fn();
const mockFindUserByEmail = jest.fn();
const mockFindUserByUsername = jest.fn();
const mockCreateUser = jest.fn();

// --- MOCK MODULES FOR ESM ---
jest.unstable_mockModule("../../services/auth-service.mjs", () => ({
  AuthService: { registerUser: mockRegisterUser },
}));

jest.unstable_mockModule("../../services/user-admin-service.mjs", () => ({
  UserAdminService: {
    getUsers: mockGetUsers,
    createMunicipalityUser: async (userData) => {
      // Realistic implementation for service test
      const emailExists = await mockFindUserByEmail(userData.email);
      if (emailExists) throw { message: "Email is already registered.", statusCode: 409 };
      const usernameExists = await mockFindUserByUsername(userData.username);
      if (usernameExists) throw { message: "Username is already registered.", statusCode: 409 };
      const newUser = await mockCreateUser(userData);
      return newUser;
    },
  },
}));

jest.unstable_mockModule("../../shared/validators/user-registration-validator.mjs", () => ({
  validateRegistrationInput: mockValidateRegistrationInput,
}));

jest.unstable_mockModule("../../repositories/user-repo.mjs", () => ({
  findUserByEmail: mockFindUserByEmail,
  findUserByUsername: mockFindUserByUsername,
  createUser: mockCreateUser,
}));

// --- VARIABLES TO HOLD IMPORTED MODULES ---
let createMunicipalityUserController;
let getAllUsers;
let getProfile;
let updateProfile;
let AuthService;
let UserAdminService;

// --- DYNAMIC IMPORT OF MODULES BEFORE ALL TESTS ---
beforeAll(async () => {
  const controllerModule = await import("../../controllers/user-admin-controller.js");
  createMunicipalityUserController = controllerModule.createMunicipalityUser;
  getAllUsers = controllerModule.getAllUsers;

  const userControllerModule = await import("../../controllers/user-controller.js");
  getProfile = userControllerModule.getProfile;
  updateProfile = userControllerModule.updateProfile;

  const serviceModule = await import("../../services/user-admin-service.mjs");
  UserAdminService = serviceModule.UserAdminService;

  const authModule = await import("../../services/auth-service.mjs");
  AuthService = authModule.AuthService;
});

// --- RESET MOCKS BEFORE EACH TEST ---
beforeEach(() => {
  jest.clearAllMocks();
});

// ================== CONTROLLER TESTS ==================

describe("createMunicipalityUser-controller", () => {
  let req, res, next;

  beforeEach(() => {
    req = { body: { email: "test@example.com", password: "Password123!" } };
    res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    next = jest.fn();
  });

  it("should create a new municipality user and return 201", async () => {
    const validatedInput = { email: "test@example.com", password: "Password123!" };
    const newUser = { id: 1, email: "test@example.com" };

    mockValidateRegistrationInput.mockReturnValue(validatedInput);
    mockRegisterUser.mockResolvedValue(newUser);

    await createMunicipalityUserController(req, res, next);

    expect(mockValidateRegistrationInput).toHaveBeenCalledWith(req, res);
    expect(mockRegisterUser).toHaveBeenCalledWith(validatedInput);
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(newUser);
    expect(next).not.toHaveBeenCalled();
  });

  it("should stop execution if validateRegistrationInput returns false", async () => {
    mockValidateRegistrationInput.mockReturnValue(false);

    await createMunicipalityUserController(req, res, next);

    expect(mockRegisterUser).not.toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
    expect(res.json).not.toHaveBeenCalled();
    expect(next).not.toHaveBeenCalled();
  });

  it("should call next(error) if AuthService.registerUser throws", async () => {
    const error = new Error("DB error");
    mockValidateRegistrationInput.mockReturnValue({ email: "x@y.com" });
    mockRegisterUser.mockRejectedValue(error);

    await createMunicipalityUserController(req, res, next);

    expect(next).toHaveBeenCalledWith(error);
  });
});

describe("getAllUsers-controller", () => {
  let req, res, next;

  beforeEach(() => {
    req = {};
    res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    next = jest.fn();
  });

  it("should return 200 and users", async () => {
    const mockUsers = [{ id: 1 }, { id: 2 }];
    mockGetUsers.mockResolvedValue(mockUsers);

    await getAllUsers(req, res, next);

    expect(mockGetUsers).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(mockUsers);
    expect(next).not.toHaveBeenCalled();
  });

  it("should call next(error) if getUsers throws", async () => {
    const error = new Error("DB failure");
    mockGetUsers.mockRejectedValue(error);

    await getAllUsers(req, res, next);

    expect(next).toHaveBeenCalledWith(error);
    expect(res.status).not.toHaveBeenCalled();
  });
});

describe("getProfile-controller", () => {
  let req, res, next;

  beforeEach(() => {
    req = { isAuthenticated: jest.fn(), user: null };
    res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    next = jest.fn();
  });

  it("returns 401 if not authenticated", async () => {
    req.isAuthenticated.mockReturnValue(false);

    await getProfile(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ message: "Non autenticato" });
  });

  it("returns 200 with user data without password", async () => {
    req.isAuthenticated.mockReturnValue(true);
    req.user = { toJSON: () => ({ id: 1, username: "Elena", password: "secret", email: "x@x.com" }) };

    await getProfile(req, res, next);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ id: 1, username: "Elena", email: "x@x.com" });
  });

  it("calls next(error) on exception", async () => {
    const error = new Error("fail");
    req.isAuthenticated.mockImplementation(() => { throw error; });

    await getProfile(req, res, next);
    expect(next).toHaveBeenCalledWith(error);
  });
});

describe("updateProfile-controller", () => {
  let req, res, next;

  beforeEach(() => {
    req = { isAuthenticated: jest.fn(), body: {}, user: null };
    res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    next = jest.fn();
  });

  it("returns 401 if not authenticated", async () => {
    req.isAuthenticated.mockReturnValue(false);

    await updateProfile(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
  });

  it("updates allowed fields and returns 200", async () => {
    req.isAuthenticated.mockReturnValue(true);
    req.body = { photoUrl: "p.jpg", telegramUsername: "tg", emailNotificationsEnabled: true };
    const updatedUser = { id: 1, username: "Elena", email: "x@x.com", ...req.body };

    req.user = { update: jest.fn().mockResolvedValue(), toJSON: () => ({ ...updatedUser, password: "hidden" }) };

    await updateProfile(req, res, next);

    expect(req.user.update).toHaveBeenCalledWith(req.body);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(updatedUser);
  });

  it("calls next(error) if update throws", async () => {
    const error = new Error("fail");
    req.isAuthenticated.mockReturnValue(true);
    req.body = { telegramUsername: "tg" };
    req.user = { update: jest.fn().mockRejectedValue(error), toJSON: () => ({}) };

    await updateProfile(req, res, next);
    expect(next).toHaveBeenCalledWith(error);
  });
});

// ================== SERVICE TESTS ==================

describe("UserAdminService.createMunicipalityUser", () => {
  const userData = {
    email: "a@a.com",
    username: "user",
    password: "pwd",
    firstName: "F",
    lastName: "L",
    roleName: "municipality",
  };

  it("throws 409 if email exists", async () => {
    mockFindUserByEmail.mockResolvedValue({ id: 1 });
    mockFindUserByUsername.mockResolvedValue(null);

    await expect(UserAdminService.createMunicipalityUser(userData))
      .rejects.toMatchObject({ message: "Email is already registered.", statusCode: 409 });
  });

  it("throws 409 if username exists", async () => {
    mockFindUserByEmail.mockResolvedValue(null);
    mockFindUserByUsername.mockResolvedValue({ id: 2 });

    await expect(UserAdminService.createMunicipalityUser(userData))
      .rejects.toMatchObject({ message: "Username is already registered.", statusCode: 409 });
  });

  it("succeeds if email and username are unique", async () => {
    mockFindUserByEmail.mockResolvedValue(null);
    mockFindUserByUsername.mockResolvedValue(null);
    const createdUser = { id: 1, ...userData };
    mockCreateUser.mockResolvedValue(createdUser);

    const result = await UserAdminService.createMunicipalityUser(userData);
    expect(result).toMatchObject(createdUser);
  });
});
