import { jest, describe, it, expect, beforeEach, afterEach } from "@jest/globals";
import path from "path";

const mockSequelizeConstructor = jest.fn();

jest.unstable_mockModule("sequelize", () => ({
  Sequelize: mockSequelizeConstructor,
}));

describe("DB Config (Unit)", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("should use default relative path and verbose logging if env vars are missing", async () => {
    delete process.env.DB_PATH;
    delete process.env.DB_LOGGING;

    await import("../../../config/db/db-config.mjs");

    expect(mockSequelizeConstructor).toHaveBeenCalledWith(expect.objectContaining({
      dialect: "sqlite",
      logging: console.log,
    }));
  });

  it("should use custom absolute path if DB_PATH is provided and absolute", async () => {
    const absolutePath = path.resolve("/custom/path/to/db.sqlite");
    process.env.DB_PATH = absolutePath;

    await import("../../../config/db/db-config.mjs");

    expect(mockSequelizeConstructor).toHaveBeenCalledWith(expect.objectContaining({
      storage: absolutePath,
    }));
  });

  it("should resolve custom relative path if DB_PATH is relative", async () => {
    const relativePath = "custom/db.sqlite";
    process.env.DB_PATH = relativePath;

    await import("../../../config/db/db-config.mjs");

    const expectedPath = path.resolve(process.cwd(), relativePath);
    expect(mockSequelizeConstructor).toHaveBeenCalledWith(expect.objectContaining({
      storage: expectedPath,
    }));
  });

  it("should use console.log if DB_LOGGING is 'true'", async () => {
    process.env.DB_LOGGING = "true";

    await import("../../../config/db/db-config.mjs");

    expect(mockSequelizeConstructor).toHaveBeenCalledWith(expect.objectContaining({
      logging: console.log,
    }));
  });

  it("should disable logging if DB_LOGGING is 'false'", async () => {
    process.env.DB_LOGGING = "false";

    await import("../../../config/db/db-config.mjs");

    expect(mockSequelizeConstructor).toHaveBeenCalledWith(expect.objectContaining({
      logging: false,
    }));
  });
});