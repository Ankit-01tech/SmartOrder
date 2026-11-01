// routes/recommendations.js
const express = require('express');
const router = express.Router();
const { getRecommendations, getBatchSuggestions } = require('../services/recommendationService');
const { protect, requireRole } = require('../middleware/auth');

router.get('/', protect, async (req, res) => {
  const recs = await getRecommendations(req.user._id);
  res.json({ success: true, recommendations: recs });
});

router.get('/batch', protect, requireRole('kitchen', 'admin'), async (_req, res) => {
  const suggestions = await getBatchSuggestions();
  res.json({ success: true, suggestions });
});

module.exports = router;
