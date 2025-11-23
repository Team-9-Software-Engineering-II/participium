import { UserService } from "../services/user-service.mjs";
import { sanitizeUser } from "../shared/utils/userUtils.mjs";
import { validateProfileUpdateInput } from "../shared/validators/user-profile-update-validator.mjs";

/**
 * Handles user profile requests.
 */
export async function getProfile(req, res, next) {
  try {
    if (!req.isAuthenticated || !req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const sanitizedUser = sanitizeUser(req.user);
    return res.status(200).json(sanitizedUser);
  } catch (error) {
    return next(error);
  }
}

/**
 * Handles user profile update requests.
 */
export async function updateProfile(req, res, next) {
  try {
    if (!req.isAuthenticated || !req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const validatedInput = validateProfileUpdateInput(req, res);

    if (!validatedInput) {
      return;
    }

    const updatedUser = await UserService.updateProfile(req.user.id, validatedInput);

    return res.status(200).json(updatedUser);
  } catch (error) {
    return next(error);
  }
}
