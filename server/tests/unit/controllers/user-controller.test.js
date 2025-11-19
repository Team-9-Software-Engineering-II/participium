import { jest, describe, it, expect, beforeEach, beforeAll } from "@jest/globals";

// Non ci sono dipendenze esterne mockate nel test originale per questi metodi,
// perché usano req.user direttamente.

let getProfile;
let updateProfile;

describe("UserController (Unit)", () => {
  beforeAll(async () => {
    const userControllerModule = await import("../../../controllers/user-controller.js");
    getProfile = userControllerModule.getProfile;
    updateProfile = userControllerModule.updateProfile;
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("getProfile", () => {
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

  describe("updateProfile", () => {
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

    it("should ignore undefined fields and update only provided ones", async () => {
      req.isAuthenticated.mockReturnValue(true);
      
      // Simuliamo un payload PARZIALE.
      // Manca 'telegramUsername' e 'emailNotificationsEnabled' (saranno undefined)
      req.body = { photoUrl: "new_photo.jpg" };
      
      // Mock dell'utente
      const updatedUser = { id: 1, username: "Elena", ...req.body };
      req.user = { 
          update: jest.fn().mockResolvedValue(), 
          toJSON: () => ({ ...updatedUser, password: "hidden" }) 
      };

      await updateProfile(req, res, next);

      // VERIFICA CHIAVE:
      // Ci aspettiamo che update sia stato chiamato SOLO con photoUrl.
      // Questo prova che gli altri 'if' sono stati valutati come FALSI (Branch coverage!)
      expect(req.user.update).toHaveBeenCalledWith({ photoUrl: "new_photo.jpg" });
      
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(updatedUser);
    });
  });
});