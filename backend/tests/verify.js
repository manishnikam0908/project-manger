const fs = require('fs');
const path = require('path');

console.log('--- ProjectMentor AI Backend verification script ---');

const filesToCheck = [
  'index.js',
  'config/database.js',
  'middlewares/auth.js',
  'controllers/authController.js',
  'controllers/projectController.js',
  'controllers/aiController.js',
  'routes/auth.js',
  'routes/projects.js',
  'routes/ai.js'
];

let allExist = true;

filesToCheck.forEach(file => {
  const filePath = path.join(__dirname, '..', file);
  if (fs.existsSync(filePath)) {
    console.log(`[OK] File exists: ${file}`);
  } else {
    console.error(`[ERROR] File missing: ${file}`);
    allExist = false;
  }
});

if (allExist) {
  console.log('Verification Successful: All backend files are in place.');
  process.exit(0);
} else {
  console.error('Verification Failed: Some files are missing.');
  process.exit(1);
}
