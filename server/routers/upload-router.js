import { Router } from "express";
import multer from "multer";
import { upload, uploadPhoto, uploadPhotos } from "../controllers/upload-controller.js";
import { isAuthenticated } from "../middlewares/auth.mjs";

const router = Router();

/**
 * Multer error handler middleware (4 parameters = error handler)
 */
const handleMulterError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({ message: "File size too large. Maximum size is 5MB." });
    }
    if (err.code === "LIMIT_FILE_COUNT") {
      return res.status(400).json({ message: "Too many files. Maximum 3 files allowed." });
    }
    if (err.code === "LIMIT_UNEXPECTED_FILE") {
      return res.status(400).json({ message: "Unexpected file field." });
    }
    return res.status(400).json({ message: err.message });
  }
  if (err) {
    return res.status(400).json({ message: err.message || "File upload error." });
  }
  next();
};

/**
 * Single photo upload endpoint.
 */
router.post(
  "/photo",
  isAuthenticated,
  (req, res, next) => {
    upload.single("photo")(req, res, (err) => {
      if (err) {
        return handleMulterError(err, req, res, next);
      }
      next();
    });
  },
  uploadPhoto
);

/**
 * Multiple photos upload endpoint.
 */
router.post(
  "/photos",
  isAuthenticated,
  (req, res, next) => {
    upload.array("photos", 3)(req, res, (err) => {
      if (err) {
        return handleMulterError(err, req, res, next);
      }
      next();
    });
  },
  uploadPhotos
);

export default router;

