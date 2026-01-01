import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { AuthService } from "./auth-service.mjs";
import logger from "../shared/logging/logger.mjs";

/**
 * Configures the passport instance with strategies and serializers.
 */
function configurePassport() {
  passport.use(
    new LocalStrategy(
      {
        usernameField: "username",
        passwordField: "password",
        session: true,
      },
      /**
       * Validates user credentials received from the client.
       * @param {string} username - Username submitted by the client.
       * @param {string} password - Plain text password submitted by the client.
       * @param {(err: Error|null, user?: object, info?: object) => void} done - Passport callback.
       */
      async (username, password, done) => {
        try {
          logger.debug(`Attempting login for user: ${username}`);

          const user = await AuthService.validateCredentials(
            username,
            password
          );
          if (!user) {
            logger.warn(
              `Failed login attempt for username: ${username}. Invalid credentials.`
            );
            return done(null, false, { message: "Invalid credentials." });
          }
          logger.info(
            `User logged in successfully: ${user.username} (ID: ${user.id})`
          );
          return done(null, user);
        } catch (err) {
          logger.error(
            `System error during login for username: ${username}. Error: ${err.message}`,
            { stack: err.stack }
          );
          return done(err);
        }
      }
    )
  );

  /**
   * Persists the user identifier into the session store.
   */
  passport.serializeUser((user, done) => {
    done(null, user.id);
  });

  /**
   * Restores a user instance from the session identifier.
   */
  passport.deserializeUser(async (id, done) => {
    try {
      const user = await AuthService.findUserById(id);
      done(null, user);
    } catch (err) {
      done(err);
    }
  });
}

configurePassport();

export { passport };
