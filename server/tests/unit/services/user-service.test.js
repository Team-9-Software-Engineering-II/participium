import { jest, describe, it, expect, beforeEach, beforeAll } from "@jest/globals";

// --- 1. MOCK DELLE DIPENDENZE ---

const mockUpdateUser = jest.fn();
const mockFindUserById = jest.fn();

jest.unstable_mockModule("../../../repositories/user-repo.mjs", () => ({
  updateUser: mockUpdateUser,
  findUserById: mockFindUserById,
}));

const mockSanitizeUser = jest.fn((u) => u); // Pass-through mock
jest.unstable_mockModule("../../../shared/utils/userUtils.mjs", () => ({
  sanitizeUser: mockSanitizeUser,
}));

// --- 2. TEST SUITE ---

let UserService;

describe("UserService (Unit)", () => {
  beforeAll(async () => {
    const module = await import("../../../services/user-service.mjs");
    UserService = module.UserService;
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("updateProfile", () => {
    const userId = 1;
    const mockUser = { id: 1, username: "test" };

    it("should map fields correctly and update profile", async () => {
      // Setup: input dal frontend (nomi stile camelCase)
      const updates = {
        photoUrl: "http://img.jpg",
        telegramUsername: "tg_user",
        emailNotificationsEnabled: false,
      };

      // Configura i mock
      mockUpdateUser.mockResolvedValue(true); // Update riuscito
      mockFindUserById.mockResolvedValue(mockUser); // Utente trovato dopo update

      // Esecuzione
      const result = await UserService.updateProfile(userId, updates);

      // VERIFICA IL MAPPING (Il cuore di questo test):
      // Il servizio deve aver chiamato il repo con i nomi del DB (es. photoURL, emailConfiguration)
      expect(mockUpdateUser).toHaveBeenCalledWith(userId, {
        photoURL: "http://img.jpg",          // Mappato da photoUrl
        telegramUsername: "tg_user",
        emailConfiguration: false            // Mappato da emailNotificationsEnabled
      });

      expect(result).toEqual(mockUser);
    });

    it("should handle partial updates", async () => {
      // Solo un campo
      const updates = { photoUrl: "http://img.jpg" };
      
      mockUpdateUser.mockResolvedValue(true);
      mockFindUserById.mockResolvedValue(mockUser);

      await UserService.updateProfile(userId, updates);

      // Verifica che solo quel campo sia stato passato, con la chiave giusta
      expect(mockUpdateUser).toHaveBeenCalledWith(userId, {
        photoURL: "http://img.jpg"
      });
    });

    it("should throw 404 if user to update is not found (update returns false)", async () => {
      mockUpdateUser.mockResolvedValue(false); // Nessuna riga aggiornata

      await expect(UserService.updateProfile(userId, { photoUrl: "a" }))
        .rejects.toHaveProperty("statusCode", 404);
      
      expect(mockUpdateUser).toHaveBeenCalled();
    });

    it("should throw 404 if user is not found AFTER update (edge case)", async () => {
      mockUpdateUser.mockResolvedValue(true); // Update dice ok
      mockFindUserById.mockResolvedValue(null); // Ma poi non troviamo l'utente

      await expect(UserService.updateProfile(userId, { photoUrl: "a" }))
        .rejects.toHaveProperty("statusCode", 404);
    });

    it("should skip photoUrl mapping if not provided", async () => {
      // Setup: Input SENZA photoUrl (solo telegramUsername)
      const updatesWithoutPhoto = { telegramUsername: "new_tg" };
      
      mockUpdateUser.mockResolvedValue(true);
      mockFindUserById.mockResolvedValue(mockUser);

      await UserService.updateProfile(userId, updatesWithoutPhoto);

      // VERIFICA CHIAVE:
      // Controlliamo che update sia stato chiamato, ma SENZA la chiave 'photoURL'
      // Questo dimostra che l'IF è stato valutato come FALSO e il blocco saltato.
      expect(mockUpdateUser).toHaveBeenCalledWith(userId, expect.objectContaining({
        telegramUsername: "new_tg"
      }));
      
      // Controllo rigoroso: assicuriamoci che photoURL non ci sia proprio
      const calledArgs = mockUpdateUser.mock.calls[0][1]; // Il secondo argomento della prima chiamata
      expect(calledArgs).not.toHaveProperty("photoURL");
    });
  });
});