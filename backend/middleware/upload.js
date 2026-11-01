/**
 * Multer middleware for image uploads
 * Stores images as base64 in MongoDB (no cloud service needed)
 * For production scale, swap memoryStorage for Cloudinary/S3
 */
const multer = require('multer');

const storage = multer.memoryStorage();

const fileFilter = (_req, file, cb) => {
  const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  if (allowed.includes(file.mimetype)) cb(null, true);
  else cb(new Error('Only JPEG/PNG/WebP/GIF images allowed'), false);
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2 MB max
});

module.exports = upload;
