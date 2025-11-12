import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configure storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, "../uploads/reports");
    
    // Ensure directory exists
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    // Generate unique filename: timestamp-random-originalname
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    const name = path.basename(file.originalname, ext);
    cb(null, `${name}-${uniqueSuffix}${ext}`);
  },
});

// File filter - only allow images
const fileFilter = (req, file, cb) => {
  const allowedMimes = ["image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp"];
  
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new Error("Invalid file type. Only JPEG, PNG, GIF, and WebP images are allowed."),
      false
    );
  }
};

// Configure multer
export const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB max file size
  },
});

/**
 * Handles single file upload for report photos.
 */
export async function uploadPhoto(req, res, next) {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded." });
    }

    // Return the file URL
    const fileUrl = `/uploads/reports/${req.file.filename}`;
    
    return res.status(200).json({
      message: "File uploaded successfully.",
      url: fileUrl,
      filename: req.file.filename,
    });
  } catch (error) {
    return next(error);
  }
}

/**
 * Handles multiple file uploads for report photos.
 */
export async function uploadPhotos(req, res, next) {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: "No files uploaded." });
    }

    // Validate number of files (max 3)
    if (req.files.length > 3) {
      // Delete uploaded files
      req.files.forEach((file) => {
        const filePath = path.join(__dirname, "../uploads/reports", file.filename);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      });
      return res.status(400).json({ message: "Maximum 3 files allowed." });
    }

    // Return the file URLs
    const fileUrls = req.files.map((file) => ({
      url: `/uploads/reports/${file.filename}`,
      filename: file.filename,
    }));

    return res.status(200).json({
      message: "Files uploaded successfully.",
      files: fileUrls,
    });
  } catch (error) {
    return next(error);
  }
}

