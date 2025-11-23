export function isAuthenticated(req, res, next) {
  if (req.isAuthenticated && req.isAuthenticated()) {
    return next();
  }
  return res.status(401).json({ error: "User not authenticated" });
}

export function isAdmin(req, res, next) {
  if (req.user?.role.name === "admin") {
    return next();
  }
  return res.status(403).json({ error: "Forbidden: admin only" });
}

export function isCitizen(req, res, next) {
  if (req.user?.role.name === "citizen") {
    return next();
  }
  return res.status(403).json({ error: "Forbidden: citizen only" });
}

export function isTechnicalStaff(req, res, next) {
  if (req.user?.role.name === "technical_staff") {
    return next();
  }
  return res.status(403).json({ error: "Forbidden: technical staff only" });
}

export function isUrpOfficer(req, res, next) {
  if (req.user?.role?.name === "municipality_public_relations_officer") {
    return next();
  }
  return res.status(403).json({ error: "Forbidden: URP officer only" });
}