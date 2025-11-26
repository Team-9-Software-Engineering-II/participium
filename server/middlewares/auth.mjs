import { ROLE } from "../shared/constants/models.mjs";

export function isAuthenticated(req, res, next) {
  if (req.isAuthenticated?.()) return next();

  return res.status(401).json({ error: "User not authenticated" });
}

export function isAdmin(req, res, next) {
  if (req.user?.role?.name === "admin") {
    return next();
  }
  return res.status(403).json({ error: "Forbidden: admin only" });
}

export function isCitizen(req, res, next) {
  if (req.user?.role?.name === "citizen") {
    return next();
  }
  return res.status(403).json({ error: "Forbidden: citizen only" });
}

export function isTechnicalStaff(req, res, next) {
  if (req.user?.role?.name === "technical_staff") {
    return next();
  }
  return res.status(403).json({ error: "Forbidden: technical staff only" });
}

export function isPublicRelationsOfficer(req, res, next) {
  if (req.user?.role?.name === ROLE.MUNICIP_PUBLIC_RELATIONS_OFFICER) {
    return next();
  }
  return res
    .status(403)
    .json({ error: "Forbidden: municipal public relations officer only" });
}

/**
 * This middleware aims to verify that the requested resource belongs to the user currently logged in the system
 */
export function isOwner(req, res, next) {
  const requestedId = Number(req.params.userId);
  const loggedInId = req.user.id;

  if (requestedId === loggedInId) {
    return next();
  }

  return res
    .status(403)
    .json({ error: "Forbidden: Cannot access other users' data." });
}

/**
 * This middleware aims to verify that the requested resource belongs to the user currently logged in the system or
 * if it is requested by a public relations officer
 */
export function isOwnerOrPublicRelationsOfficer(req, res, next) {
  const authorizationFailed = () => {
    return res.status(403).json({
      error: "Forbidden: Cannot access this resource",
    });
  };

  const isOwner = () => {
    const requestedId = Number(req.params.userId);
    const loggedInId = req.user.id;

    return requestedId === loggedInId;
  };

  const isPublicRelationsOfficer = () => {
    return req.user?.role?.name === ROLE.MUNICIP_PUBLIC_RELATIONS_OFFICER;
  };

  if (isOwner()) return next();
  if (isPublicRelationsOfficer()) return next();
  return authorizationFailed;
}

