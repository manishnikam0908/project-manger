const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const aiController = require('../controllers/aiController');
const authMiddleware = require('../middlewares/auth');

// Setup multer upload directory
const uploadDir = path.resolve(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

router.use(authMiddleware);

router.post('/analyze', aiController.analyzeProject);
router.post('/generate-roadmap', aiController.generateRoadmap);
router.post('/breakdown', aiController.breakdownFeature);
router.post('/chat', aiController.chat);
router.post('/review', aiController.reviewCode);
router.post('/upload-file', upload.single('file'), aiController.uploadFile);
router.post('/save-tasks', aiController.saveTasks);
router.post('/generate-doc', aiController.generateDoc);

module.exports = router;
