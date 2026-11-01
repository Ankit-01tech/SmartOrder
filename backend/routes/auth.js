const express = require('express');
const router  = express.Router();
const { register, login, getMe, updateProfile } = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const upload  = require('../middleware/upload');

router.post('/register', register);
router.post('/login',    login);
router.get('/me',        protect, getMe);
router.patch('/profile', protect, upload.single('avatar'), updateProfile);

module.exports = router;
