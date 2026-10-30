const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure directories exist
const ensureDirectoryExists = (dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
};

// Storage configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    let uploadPath;
    
    // Determine folder based on fieldname
    switch (file.fieldname) {
      case 'profile':
        uploadPath = path.join(__dirname, '../Images/profiles');
        break;
      case 'resume':
        uploadPath = path.join(__dirname, '../Images/resumes');
        break;
      case 'offerLetter':
      case 'InternofferLetter':
        uploadPath = path.join(__dirname, '../Images/offer_letters');
        break;
      case 'aadhar':
      case 'panCard':
      case 'voterId':
      case 'drivingLicense':
        uploadPath = path.join(__dirname, '../Images/ids');
        break;
      case 'tenth':
      case 'twelfth':
      case 'degree':
      case 'probation':
        uploadPath = path.join(__dirname, '../Images/certificates');
        break;
      case 'paySlip':
      case 'experienceLetter':
      case 'relievingLetter':
      case 'intershipCertificate':
        uploadPath = path.join(__dirname, '../Images/exit_docs');
        break;
      default:
        uploadPath = path.join(__dirname, '../Images/others');
    }
    
    ensureDirectoryExists(uploadPath);
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    // Generate filename: datetime-randomnumber.ext
    const timestamp = Date.now();
    const randomNumber = Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    const filename = `${timestamp}-${randomNumber}${ext}`;
    
    console.log(`Saving file as: ${filename} in field: ${file.fieldname}`);
    cb(null, filename);
  },
});

// File filter
const fileFilter = (req, file, cb) => {
  // Accept images and PDFs
  if (
    file.mimetype.startsWith('image/') ||
    file.mimetype === 'application/pdf' ||
    file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    file.mimetype === 'application/msword'
  ) {
    cb(null, true);
  } else {
    cb(
      new Error('Invalid file type. Only images, PDFs, and Word documents are allowed.'),
      false
    );
  }
};

// Configure multer
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB max file size per file
  },
});

// Multiple file fields
const multerUploadFields = upload.fields([
  { name: 'profile', maxCount: 1 },
  { name: 'resume', maxCount: 1 },
  { name: 'offerLetter', maxCount: 1 },
  { name: 'aadhar', maxCount: 1 },
  { name: 'panCard', maxCount: 1 },
  { name: 'voterId', maxCount: 1 },
  { name: 'drivingLicense', maxCount: 1 },
  { name: 'tenth', maxCount: 1 },
  { name: 'twelfth', maxCount: 1 },
  { name: 'degree', maxCount: 1 },
  { name: 'probation', maxCount: 1 },
  { name: 'paySlip', maxCount: 1 },
  { name: 'experienceLetter', maxCount: 1 },
  { name: 'relievingLetter', maxCount: 1 },
  { name: 'intershipCertificate', maxCount: 1 },
  { name: 'InternofferLetter', maxCount: 1 },
  { name: 'otherDocs', maxCount: 10 },
]);

const uploadFields = (req, res, next) => {
  multerUploadFields(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      console.error("Multer Error:", err);
      if (err.code === "LIMIT_FILE_SIZE") {
        return res.status(400).json({
          status: false,
          message: `File too large. Maximum allowed file size is 50MB. (${err.field || "upload"})`,
        });
      }
      return res.status(400).json({
        status: false,
        message: `Upload error: ${err.message}`,
      });
    } else if (err) {
      console.error("Upload Middleware Error:", err);
      return res.status(400).json({
        status: false,
        message: err.message || "File upload failed",
      });
    }
    next();
  });
};

module.exports = uploadFields;
