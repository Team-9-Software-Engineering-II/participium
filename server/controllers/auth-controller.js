import { AuthService } from "../services/auth-service.mjs";
import { passport } from "../services/passport-service.mjs";
import logger from "../shared/logging/logger.mjs";
import { validateRegistrationInput } from "../shared/validators/user-registration-validator.mjs";
/**
 * Sends a JSON response containing sanitized user data and session metadata.
 * @param {import("express").Request} req - Express request object with session.
 * @param {import("express").Response} res - Express response object to send data.
 * @param {object} user - Sanitized user payload.
 * @param {number} statusCode - HTTP status code for the response.
 */
function sendSessionResponse(req, res, user, statusCode = 200) {
  return res.status(statusCode).json({
    authenticated: true,
    user,
    session: {
      id: req.sessionID,
      cookie: {
        expiresAt: req.session.cookie?.expires ?? null,
      },
    },
  });
}

/**
 * Handles user registration requests and logs the user in upon success.
 */
export async function register(req, res, next) {
  try {
    const validatedInput = validateRegistrationInput(req, res);

    if (!validatedInput) {
      return;
    }

    const user = await AuthService.registerUser(validatedInput);

    req.login(user, (loginError) => {
      if (loginError) {
        return next(loginError);
      }

      return sendSessionResponse(req, res, user, 201);
    });
  } catch (error) {
    return next(error);
  }
}

/**
 * Handles session based login leveraging Passport local strategy.
 */
export function login(req, res, next) {
  passport.authenticate("local", (err, user, info) => {
    if (err) {
      return next(err);
    }

    if (!user) {
      return res.status(401).json({
        message: info?.message || "Invalid credentials.",
      });
    }

    req.login(user, (loginError) => {
      if (loginError) {
        return next(loginError);
      }

      return sendSessionResponse(req, res, user);
    });
  })(req, res, next);
}

/**
 * Provides the authenticated session details when available.
 */
export function currentSession(req, res) {
  if (!req.isAuthenticated || !req.isAuthenticated()) {
    return res.status(200).json({ authenticated: false });
  }

  return sendSessionResponse(req, res, req.user);
}

/**
 * Terminates the current user session and clears related cookies.
 */
export function logout(req, res, next) {
  const user = req.user;
  req.logout((logoutError) => {
    if (logoutError) {
      return next(logoutError);
    }

    if (req.session) {
      req.session.destroy((sessionError) => {
        if (sessionError) {
          return next(sessionError);
        }
        res.clearCookie("connect.sid");
        logger.info(
          `User logged out successfully: ${user.username} (ID: ${user.id})`
        );
        return res.status(204).send();
      });
    } else {
      res.clearCookie("connect.sid");
      return res.status(204).send();
    }
  });
}

/**
 * Handles user registration request - saves user data temporarily to Redis
 * with a confirmation code for email verification.
 */
export async function registerRequest(req, res, next) {
  try {
    const validatedInput = validateRegistrationInput(req, res);

    if (!validatedInput) {
      return;
    }

    const result = await AuthService.registerUserRequest(validatedInput);

    return res.status(200).json(result);
  } catch (error) {
    return next(error);
  }
}

/**
 * Handles OTP verification and user creation.
 * Verifies the confirmation code against Redis and creates the user if valid.
 */
export async function verifyRegistration(req, res, next) {
  try {
    const { email, confirmationCode } = req.body ?? {};

    if (!email || !confirmationCode) {
      return res.status(400).json({
        message: "Missing required fields: email, confirmationCode.",
      });
    }

    const user = await AuthService.verifyAndCreateUser(email, confirmationCode);

    // Log the user in after successful registration
    req.login(user, (loginError) => {
      if (loginError) {
        return next(loginError);
      }

      return sendSessionResponse(req, res, user, 201);
    });
  } catch (error) {
    return next(error);
  }
}
