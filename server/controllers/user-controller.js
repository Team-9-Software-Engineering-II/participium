/**
 * Handles user profile requests.
 */
export async function getProfile(req, res, next) {
  try {
    if (!req.isAuthenticated || !req.isAuthenticated()) {
      return res.status(401).json({ message: 'Non autenticato' });
    }

    // req.user è già popolato da passport
    const { password, ...userWithoutPassword } = req.user.toJSON();
    
    return res.status(200).json(userWithoutPassword);
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
      return res.status(401).json({ message: 'Non autenticato' });
    }

    const { photoUrl, telegramUsername, emailNotificationsEnabled } = req.body;

    // Aggiorna solo i campi permessi
    const updates = {};
    if (photoUrl !== undefined) updates.photoUrl = photoUrl;
    if (telegramUsername !== undefined) updates.telegramUsername = telegramUsername;
    if (emailNotificationsEnabled !== undefined) updates.emailNotificationsEnabled = emailNotificationsEnabled;

    // Aggiorna l'utente nel database
    await req.user.update(updates);

    const { password, ...userWithoutPassword } = req.user.toJSON();
    
    return res.status(200).json(userWithoutPassword);
  } catch (error) {
    return next(error);
  }
}
