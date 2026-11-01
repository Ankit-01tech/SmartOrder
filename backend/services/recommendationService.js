const Menu = require('../models/Menu');
const Order = require('../models/Order');

/**
 * Smart Recommendation Engine
 * Combines: user history, trending, fast prep, low queue priority
 */
const getRecommendations = async (userId) => {
  try {
    const [allItems, userOrders] = await Promise.all([
      Menu.find({ isAvailable: true }),
      Order.find({ student: userId })
        .sort({ createdAt: -1 })
        .limit(20)
        .populate('items.menuItem', '_id'),
    ]);

    // Get user's frequently ordered item IDs
    const userFrequency = {};
    userOrders.forEach((order) => {
      order.items.forEach((item) => {
        const id = item.menuItem?._id?.toString();
        if (id) userFrequency[id] = (userFrequency[id] || 0) + item.quantity;
      });
    });

    // Get pending orders count for queue load calc
    const pendingCount = await Order.countDocuments({ status: { $in: ['confirmed', 'preparing'] } });
    const queueDelay = pendingCount * 0.3;

    // Score each item
    const scored = allItems.map((item) => {
      const id = item._id.toString();
      let score = 0;
      let reason = '';

      // Personal history (max 30 pts)
      if (userFrequency[id]) { score += Math.min(userFrequency[id] * 5, 30); reason = '🧠 Your Pick'; }

      // Trending (max 25 pts)
      score += Math.min(item.todayOrderCount * 0.5, 25);
      if (item.todayOrderCount > 20 && !reason) reason = '🔥 Trending';

      // Fast prep bonus (max 20 pts) — inversely proportional to prepTime
      const fastBonus = Math.max(0, 20 - item.prepTime);
      score += fastBonus;
      if (item.prepTime <= 3 && !reason) reason = '⚡ Fastest Now';

      // Low total ETA (lower = better) (max 15 pts)
      const eta = item.prepTime + queueDelay;
      score += Math.max(0, 15 - eta);
      if (!reason) reason = '⭐ Recommended';

      // Popularity rating (max 10 pts)
      score += (item.rating - 1) * 2.5;

      return { item, score: Math.round(score), reason };
    });

    // Sort by score, deduplicate reasons
    scored.sort((a, b) => b.score - a.score);

    // Return top 6 with distinct categories if possible
    return scored.slice(0, 6).map(({ item, reason }) => ({ item, reason }));
  } catch (err) {
    console.error('Recommendation error:', err);
    return [];
  }
};

// Smart Batch Cooking Suggestion
const getBatchSuggestions = async () => {
  try {
    const confirmedOrders = await Order.find({
      status: { $in: ['confirmed', 'preparing'] },
    }).populate('items.menuItem');

    const itemCounts = {};
    confirmedOrders.forEach((order) => {
      order.items.forEach((item) => {
        const name = item.menuItem?.name || item.name;
        itemCounts[name] = (itemCounts[name] || 0) + item.quantity;
      });
    });

    return Object.entries(itemCounts)
      .filter(([, count]) => count >= 3)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([name, count]) => ({
        itemName: name,
        quantity: count,
        estimatedTimeSaved: Math.round(count * 1.5) + ' min',
      }));
  } catch (err) {
    return [];
  }
};

module.exports = { getRecommendations, getBatchSuggestions };
