const multer = require("multer");
const path = require("path");
const { randomBytes } = require("crypto");

// Allowed MIME types
const ALLOWED_TYPES = ["image/jpeg", "image/png", "application/pdf", "video/mp4", "video/webm"];

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    let folder = "documents";
    if (file.fieldname === "proofFile") folder = "payments";
    if (file.fieldname === "reportMedia" || file.fieldname === "replyMedia") folder = "reports";
    
    cb(null, path.join(__dirname, `../../public/uploads/${folder}`));
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = randomBytes(8).toString("hex");
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${uniqueSuffix}${ext}`);
  },
});

const fileFilter = (req, file, cb) => {
  if (ALLOWED_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new Error(
        "Format file tidak didukung. Gunakan JPG, PNG, PDF, MP4, atau WEBM."
      ),
      false
    );
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
});

module.exports = upload;
