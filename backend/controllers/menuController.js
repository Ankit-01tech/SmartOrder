const Menu = require('../models/Menu');

// Default food images keyed by item name pattern (lowercase match)
// These are high-quality food-specific Unsplash URLs
const DEFAULT_FOOD_IMAGES = {
  'masala dosa':          'https://images.unsplash.com/photo-1668236543090-82eba5ee5976?w=400&q=80',
  'dosa':                 'https://images.unsplash.com/photo-1668236543090-82eba5ee5976?w=400&q=80',
  'idli sambar':          'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=400&q=80',
  'idli':                 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=400&q=80',
  'bread omelette':       'https://images.unsplash.com/photo-1525351484163-7529414344d8?w=400&q=80',
  'omelette':             'https://images.unsplash.com/photo-1525351484163-7529414344d8?w=400&q=80',
  'aloo paratha':         'https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?w=400&q=80',
  'paratha':              'https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?w=400&q=80',
  'poha':                 'https://images.unsplash.com/photo-1645177628172-a94c1f96e6db?w=400&q=80',
  'upma':                 'https://images.unsplash.com/photo-1605333396915-47ed6b68a00e?w=400&q=80',
  'veg biryani':          'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=400&q=80',
  'biryani':              'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=400&q=80',
  'paneer butter masala': 'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?w=400&q=80',
  'paneer':               'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?w=400&q=80',
  'veg fried rice':       'https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=400&q=80',
  'fried rice':           'https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=400&q=80',
  'thali set':            'https://images.unsplash.com/photo-1610192244261-3f33de3f55e4?w=400&q=80',
  'thali':                'https://images.unsplash.com/photo-1610192244261-3f33de3f55e4?w=400&q=80',
  'dal tadka':            'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=400&q=80',
  'chana masala':         'https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=400&q=80',
  'veg pulao':            'https://images.unsplash.com/photo-1645177628172-a94c1f96e6db?w=400&q=80',
  'pulao':                'https://images.unsplash.com/photo-1645177628172-a94c1f96e6db?w=400&q=80',
  'samosa':               'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=400&q=80',
  'veg puff':             'https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?w=400&q=80',
  'puff':                 'https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?w=400&q=80',
  'bread pakora':         'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=400&q=80',
  'pakora':               'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=400&q=80',
  'fruit bowl':           'https://images.unsplash.com/photo-1490474418585-ba9bad8fd0ea?w=400&q=80',
  'fruit':                'https://images.unsplash.com/photo-1490474418585-ba9bad8fd0ea?w=400&q=80',
  'veg sandwich':         'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=400&q=80',
  'sandwich':             'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=400&q=80',
  'dhokla':               'https://images.unsplash.com/photo-1601050690117-94f5f6fa8ad7?w=400&q=80',
  'chai':                 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?w=400&q=80',
  'tea':                  'https://images.unsplash.com/photo-1576092768241-dec231879fc3?w=400&q=80',
  'cold coffee':          'https://images.unsplash.com/photo-1517701604599-bb29b565090c?w=400&q=80',
  'coffee':               'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=400&q=80',
  'lassi':                'https://images.unsplash.com/photo-1626132647523-66f5bf380027?w=400&q=80',
  'lemon juice':          'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=400&q=80',
  'lemon':                'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=400&q=80',
  'mango shake':          'https://images.unsplash.com/photo-1553530666-ba11a7da3888?w=400&q=80',
  'mango':                'https://images.unsplash.com/photo-1553530666-ba11a7da3888?w=400&q=80',
  'pizza':                'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=400&q=80',
  'burger':               'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400&q=80',
  'pasta':                'https://images.unsplash.com/photo-1555949258-eb67b1ef0ceb?w=400&q=80',
  'noodles':              'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=400&q=80',
  'soup':                 'https://images.unsplash.com/photo-1547592166-23ac45744acd?w=400&q=80',
  'salad':                'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400&q=80',
};

const FALLBACK_IMAGE = 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400&q=80';

const getDefaultImage = (name) => {
  const lower = (name || '').toLowerCase().trim();
  if (DEFAULT_FOOD_IMAGES[lower]) return DEFAULT_FOOD_IMAGES[lower];
  for (const [key, url] of Object.entries(DEFAULT_FOOD_IMAGES)) {
    if (lower.includes(key)) return url;
  }
  return FALLBACK_IMAGE;
};

exports.getMenu = async (req, res) => {
  try {
    const { category, available } = req.query;
    const filter = {};
    if (category) filter.category = category;
    if (available === 'true') filter.isAvailable = true;
    const items = await Menu.find(filter).sort({ category: 1, name: 1 });
    res.json({ success: true, items });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

exports.createMenuItem = async (req, res) => {
  try {
    let imageData = '';
    if (req.file) {
      imageData = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
    }
    // If no image uploaded, assign a relevant default image based on item name
    if (!imageData) {
      imageData = getDefaultImage(req.body.name || '');
    }
    const itemData = {
      ...req.body,
      image: imageData,
      currentStock: req.body.currentStock || req.body.maxStock || 50,
    };
    const item = await Menu.create(itemData);
    req.io?.emit('menuUpdate', { type: 'add', item });
    res.status(201).json({ success: true, item });
  } catch (err) { res.status(400).json({ success: false, message: err.message }); }
};

exports.updateMenuItem = async (req, res) => {
  try {
    const updateData = { ...req.body };
    if (req.file) {
      updateData.image = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
    }
    const item = await Menu.findByIdAndUpdate(req.params.id, updateData, { new: true, runValidators: true });
    if (!item) return res.status(404).json({ success: false, message: 'Item not found' });
    // Broadcast full updated item so all connected clients get fresh data
    req.io?.emit('menuUpdate', { type: 'update', item });
    res.json({ success: true, item });
  } catch (err) { res.status(400).json({ success: false, message: err.message }); }
};

exports.deleteMenuItem = async (req, res) => {
  try {
    await Menu.findByIdAndDelete(req.params.id);
    req.io?.emit('menuUpdate', { type: 'delete', itemId: req.params.id });
    res.json({ success: true, message: 'Item deleted' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

module.exports = { ...exports, getDefaultImage };
