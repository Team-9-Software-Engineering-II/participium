import { AuthService } from "../services/auth-service.mjs";
import { passport } from "../services/passport-service.mjs";

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
    const {
      email,
      username,
      firstName,
      lastName,
      password,
      roleId: requestedRoleId,
    } = req.body ?? {};

    if (!email || !username || !firstName || !lastName || !password) {
      return res.status(400).json({
        message:
          "Missing required fields: email, username, firstName, lastName, password.",
      });
    }

    let roleId;
    if (requestedRoleId !== undefined) {
      const parsedRoleId = Number(requestedRoleId);
      if (!Number.isInteger(parsedRoleId) || parsedRoleId <= 0) {
        return res.status(400).json({
          message: "roleId must be a positive integer when provided.",
        });
      }
      roleId = parsedRoleId;
    }

    const user = await AuthService.registerUser({
      email,
      username,
      firstName,
      lastName,
      password,
      roleId,
    });

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
        return res.status(204).send();
      });
    } else {
      res.clearCookie("connect.sid");
      return res.status(204).send();
    }
  });
}
