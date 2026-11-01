const express  = require('express');
const router   = express.Router();
const { getMenu, createMenuItem, updateMenuItem, deleteMenuItem } = require('../controllers/menuController');
const { protect, requireRole } = require('../middleware/auth');
const upload   = require('../middleware/upload');

router.get('/', getMenu);
router.post('/', protect, requireRole('admin','kitchen'), upload.single('image'), createMenuItem);
router.patch('/:id', protect, requireRole('admin','kitchen'), upload.single('image'), updateMenuItem);
router.delete('/:id', protect, requireRole('admin'), deleteMenuItem);

module.exports = router;
