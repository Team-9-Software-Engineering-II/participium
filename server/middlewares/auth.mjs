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

export function isExternalMaintainer(req, res, next) {
  if (req.user?.role?.name === "external_maintainer") {
    return next();
  }
  return res.status(403).json({ error: "Forbidden: external maintainer only" });
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

/**
 * Middleware to verify that the authenticated user is either the technical officer
 * or external maintainer assigned to the report specified in req.params.reportId.
 * This is used for message creation to ensure only authorized parties can exchange messages.
 */
export async function isReportParticipant(req, res, next) {
  try {
    const reportId = Number(req.params.reportId);
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    if (!Number.isInteger(reportId) || reportId <= 0) {
      return res.status(400).json({ error: "Invalid report ID" });
    }

    // Dynamically import to avoid circular dependencies
    const { findReportById } = await import("../repositories/report-repo.mjs");
    const report = await findReportById(reportId);

    if (!report) {
      return res.status(404).json({ error: "Report not found" });
    }

    // Check both the foreign key fields and the related objects (in case includes are used)
    const isTechnicalOfficer = 
      report.technicalOfficerId === userId || 
      report.technicalOfficer?.id === userId;
    const isExternalMaintainer = 
      report.externalMaintainerId === userId || 
      report.externalMaintainer?.id === userId;

    if (isTechnicalOfficer || isExternalMaintainer) {
      return next();
    }

    return res.status(403).json({
      error: "Forbidden: You must be the technical officer or external maintainer assigned to this report",
    });
  } catch (error) {
    return next(error);
  }
}
