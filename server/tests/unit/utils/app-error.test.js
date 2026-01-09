import { describe, it, expect } from "@jest/globals";
import AppError from "../../../../server/shared/utils/app-error.mjs"; 
// Controlla sempre i puntini ../ per arrivare al file giusto!

describe("AppError (Unit)", () => {
  
  // Copre il caso "fail" (4xx)
  it("should set status to 'fail' for 4xx status codes", () => {
    const error = new AppError("Bad Request", 400);
    
    expect(error.statusCode).toBe(400);
    expect(error.status).toBe("fail");
    expect(error.isOperational).toBe(true);
  });

  // Copre il caso "error" (5xx) -> QUELLO CHE TI MANCAVA
  it("should set status to 'error' for 5xx status codes", () => {
    const error = new AppError("Server Boom", 500);
    
    expect(error.statusCode).toBe(500);
    expect(error.status).toBe("error");
  });

  // Test extra per sicurezza
  it("should capture stack trace", () => {
    const error = new AppError("Trace me", 404);
    expect(error.stack).toBeDefined();
  });
});