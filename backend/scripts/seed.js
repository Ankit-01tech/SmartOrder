require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');
const User     = require('../models/User');
const Menu     = require('../models/Menu');
const KitchenStatus = require('../models/KitchenStatus');
const PaymentConfig = require('../models/PaymentConfig');

const { getDefaultImage } = require('../controllers/menuController');

const USERS = [
  { name:'Arjun Sharma',  email:'student@demo.com',  password:'demo1234', role:'student', accountStatus:'approved', studentId:'CS2024001' },
  { name:'Priya Mehta',   email:'student2@demo.com', password:'demo1234', role:'student', accountStatus:'approved', studentId:'CS2024002' },
  { name:'Raj Kumar',     email:'kitchen@demo.com',  password:'demo1234', role:'kitchen', accountStatus:'approved' },
  { name:'Admin User',    email:'admin@demo.com',    password:'demo1234', role:'admin',   accountStatus:'approved' },
];

const MENU = [
  { name:'Masala Dosa',       emoji:'🫓', price:45,  prepTime:8,  category:'Breakfast', calories:280, maxStock:25, currentStock:20, rating:4.5 },
  { name:'Idli Sambar',       emoji:'🍲', price:30,  prepTime:5,  category:'Breakfast', calories:190, maxStock:20, currentStock:14, rating:4.3 },
  { name:'Bread Omelette',    emoji:'🍳', price:35,  prepTime:3,  category:'Breakfast', calories:210, maxStock:20, currentStock:18, rating:4.2 },
  { name:'Aloo Paratha',      emoji:'🫓', price:40,  prepTime:7,  category:'Breakfast', calories:320, maxStock:15, currentStock:10, rating:4.1 },
  { name:'Poha',              emoji:'🍚', price:25,  prepTime:5,  category:'Breakfast', calories:200, maxStock:20, currentStock:16, rating:4.0 },
  { name:'Upma',              emoji:'🥣', price:25,  prepTime:6,  category:'Breakfast', calories:220, maxStock:15, currentStock:12, rating:3.9 },
  { name:'Veg Biryani',       emoji:'🍛', price:80,  prepTime:12, category:'Lunch',     calories:420, maxStock:20, currentStock:15, rating:4.7, todayOrderCount:47 },
  { name:'Paneer Butter Masala',emoji:'🧆',price:90, prepTime:15, category:'Lunch',     calories:380, maxStock:15, currentStock:10, rating:4.6 },
  { name:'Veg Fried Rice',    emoji:'🍚', price:70,  prepTime:10, category:'Lunch',     calories:350, maxStock:20, currentStock:12, rating:4.3 },
  { name:'Thali Set',         emoji:'🍱', price:65,  prepTime:10, category:'Lunch',     calories:650, maxStock:15, currentStock:8,  rating:4.4, isSpecial:true },
  { name:'Dal Tadka + Rice',  emoji:'🍛', price:55,  prepTime:8,  category:'Lunch',     calories:400, maxStock:20, currentStock:14, rating:4.2 },
  { name:'Chana Masala',      emoji:'🫘', price:60,  prepTime:8,  category:'Lunch',     calories:320, maxStock:15, currentStock:9,  rating:4.1 },
  { name:'Veg Pulao',         emoji:'🍚', price:65,  prepTime:10, category:'Lunch',     calories:370, maxStock:15, currentStock:11, rating:4.0 },
  { name:'Samosa (2 pcs)',    emoji:'🫔', price:20,  prepTime:2,  category:'Snacks',    calories:160, maxStock:50, currentStock:30, rating:4.5, todayOrderCount:62 },
  { name:'Veg Puff',          emoji:'🥐', price:18,  prepTime:2,  category:'Snacks',    calories:140, maxStock:40, currentStock:22, rating:4.2 },
  { name:'Bread Pakora',      emoji:'🍞', price:25,  prepTime:3,  category:'Snacks',    calories:210, maxStock:30, currentStock:18, rating:4.0 },
  { name:'Fruit Bowl',        emoji:'🍇', price:50,  prepTime:2,  category:'Snacks',    calories:140, maxStock:15, currentStock:10, rating:4.4 },
  { name:'Veg Sandwich',      emoji:'🥪', price:40,  prepTime:4,  category:'Snacks',    calories:250, maxStock:20, currentStock:14, rating:4.1 },
  { name:'Dhokla',            emoji:'🟨', price:30,  prepTime:2,  category:'Snacks',    calories:170, maxStock:25, currentStock:16, rating:4.3 },
  { name:'Chai',              emoji:'☕', price:15,  prepTime:2,  category:'Beverages', calories:60,  maxStock:100,currentStock:80, rating:4.6, todayOrderCount:89 },
  { name:'Coffee',            emoji:'☕', price:20,  prepTime:3,  category:'Beverages', calories:70,  maxStock:60, currentStock:45, rating:4.4 },
  { name:'Cold Coffee',       emoji:'🥤', price:40,  prepTime:3,  category:'Beverages', calories:180, maxStock:40, currentStock:25, rating:4.5, todayOrderCount:29 },
  { name:'Lassi',             emoji:'🥛', price:30,  prepTime:2,  category:'Beverages', calories:150, maxStock:30, currentStock:20, rating:4.3 },
  { name:'Lemon Juice',       emoji:'🍋', price:25,  prepTime:2,  category:'Beverages', calories:50,  maxStock:30, currentStock:18, rating:4.2 },
  { name:'Mango Shake',       emoji:'🥭', price:45,  prepTime:3,  category:'Beverages', calories:210, maxStock:25, currentStock:12, rating:4.6 },
];

async function seed() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅  Connected to MongoDB');

    await Promise.all([User.deleteMany({}), Menu.deleteMany({})]);
    console.log('🗑️   Cleared users & menu');

    const hashedUsers = await Promise.all(
      USERS.map(async u => ({ ...u, password: await bcrypt.hash(u.password, 12) }))
    );
    const users = await User.insertMany(hashedUsers);
    console.log(`👤  Seeded ${users.length} users`);

    // Seed kitchen status (online)
    await KitchenStatus.deleteMany({});
    await KitchenStatus.create({ isOnline: true });
    console.log('🍳  Kitchen status: online');

    // Seed payment config
    await PaymentConfig.deleteMany({});
    await PaymentConfig.create({
      upiId: 'canteen@paytm',
      contactName: 'College Canteen',
      instructions: 'Pay the exact amount via UPI and enter your transaction ID (UTR) to confirm order.',
    });
    console.log('💳  Payment config seeded');

    // Seed menu with correct default images
    const menuItems = await Menu.insertMany(MENU.map(m => ({
      ...m,
      description: `Fresh ${m.name} made daily`,
      tags: [m.category.toLowerCase()],
      isAvailable: (m.currentStock || 0) > 0,
      lowStockThreshold: 5,
      image: getDefaultImage(m.name),
    })));
    console.log(`🍽️   Seeded ${menuItems.length} menu items with correct images`);

    console.log('\n🚀  Seed complete! Demo credentials:');
    USERS.forEach(u => console.log(`   ${u.role.padEnd(8)} — ${u.email}  /  ${u.password}`));

    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('❌  Seed failed:', err);
    process.exit(1);
  }
}

seed();
