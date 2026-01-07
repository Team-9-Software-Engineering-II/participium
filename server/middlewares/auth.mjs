import { findReportById } from "../repositories/report-repo.mjs";
import { ROLE } from "../shared/constants/models.mjs";
import AppError from "../shared/utils/app-error.mjs";

export function isAuthenticated(req, res, next) {
  if (req.isAuthenticated?.()) return next();
  throw new AppError("User not authenticated", 401);
}

export function isAdmin(req, res, next) {
  const roles = req.user?.roles || [];
  const hasAdminRole = roles.some(role => role.name === "admin");
  if (hasAdminRole) {
    return next();
  }
  throw new AppError("Forbidden: admin only", 403);
}

export function isCitizen(req, res, next) {
  const roles = req.user?.roles || [];
  const hasCitizenRole = roles.some(role => role.name === "citizen");
  if (hasCitizenRole) {
    return next();
  }
  throw new AppError("Forbidden: citizen only", 403);
}

export function isTechnicalStaff(req, res, next) {
  const roles = req.user?.roles || [];
  const hasTechnicalRole = roles.some(role => role.name === "technical_staff");
  if (hasTechnicalRole) {
    return next();
  }
  throw new AppError("Forbidden: technical staff only", 403);
}

export function isExternalMaintainer(req, res, next) {
  const roles = req.user?.roles || [];
  const hasExternalRole = roles.some(role => role.name === "external_maintainer");
  if (hasExternalRole) {
    return next();
  }
  throw new AppError("Forbidden: external maintainer only", 403);
}

export function isTechnicalStaffOrExternalMaintainer(req, res, next) {
  const roles = req.user?.roles || [];
  const hasRequiredRole = roles.some(role => 
    role.name === "technical_staff" || role.name === "external_maintainer"
  );
  if (hasRequiredRole) {
    return next();
  }
  throw new AppError(
    "Forbidden: technical staff or external maintainer only",
    403
  );
}

export function isPublicRelationsOfficer(req, res, next) {
  const roles = req.user?.roles || [];
  const hasOfficerRole = roles.some(role => role.name === ROLE.MUNICIP_PUBLIC_RELATIONS_OFFICER);
  if (hasOfficerRole) {
    return next();
  }
  throw new AppError("Forbidden: municipal public relations officer only", 403);
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

  throw new AppError("Forbidden: Cannot access other users' data.", 403);
}

/**
 * This middleware aims to verify that the requested resource belongs to the user currently logged in the system or
 * if it is requested by a public relations officer
 */
export function isOwnerOrPublicRelationsOfficer(req, res, next) {
  const authorizationFailed = () => {
    throw new AppError("Forbidden: Cannot access this resource", 403);
  };

  const isOwner = () => {
    const requestedId = Number(req.params.userId);
    const loggedInId = req.user.id;

    return requestedId === loggedInId;
  };

  const isPublicRelationsOfficer = () => {
    const roles = req.user?.roles || [];
    return roles.some(role => role.name === ROLE.MUNICIP_PUBLIC_RELATIONS_OFFICER);
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
      throw new AppError("User not authenticated", 401);
    }

    if (!Number.isInteger(reportId) || reportId <= 0) {
      throw new AppError("Invalid report ID", 400);
    }

    const report = await findReportById(reportId);
    if (!report) {
      throw new AppError("Report not found", 404);
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

    throw new AppError(
      "Forbidden: You must be the technical officer or external maintainer assigned to this report",
      403
    );
  } catch (error) {
    return next(error);
  }
}
