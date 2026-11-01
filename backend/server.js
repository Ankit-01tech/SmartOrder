require('dotenv').config();
const express    = require('express');
const http       = require('http');
const { Server } = require('socket.io');
const cors       = require('cors');
const mongoose   = require('mongoose');

const authRoutes           = require('./routes/auth');
const menuRoutes           = require('./routes/menu');
const orderRoutes          = require('./routes/orders');
const inventoryRoutes      = require('./routes/inventory');
const recommendationRoutes = require('./routes/recommendations');
const adminRoutes          = require('./routes/admin');
const kitchenRoutes        = require('./routes/kitchen');
const paymentRoutes        = require('./routes/payment');
const errorHandler         = require('./middleware/errorHandler');
const { initSocketHandlers } = require('./socket/socketHandlers');

const app    = express();
const server = http.createServer(app);

const allowedOrigins = (process.env.FRONTEND_URL || 'http://localhost:5173')
  .split(',').map(s => s.trim());

const io = new Server(server, {
  cors: { origin: allowedOrigins, methods: ['GET','POST'], credentials: true },
  transports: ['websocket','polling'],
  pingTimeout:  60000,
  pingInterval: 25000,
});

app.use(cors({ origin: allowedOrigins, credentials: true }));
app.use(express.json({ limit: '10mb', verify: (req, _res, buf) => { req.rawBody = buf; } }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use((req, _res, next) => { req.io = io; next(); });

app.use('/api/auth',            authRoutes);
app.use('/api/menu',            menuRoutes);
app.use('/api/orders',          orderRoutes);
app.use('/api/inventory',       inventoryRoutes);
app.use('/api/recommendations', recommendationRoutes);
app.use('/api/admin',           adminRoutes);
app.use('/api/kitchen',         kitchenRoutes);
app.use('/api/payment',         paymentRoutes);

app.get('/health', (_req, res) =>
  res.json({ status: 'ok', uptime: process.uptime(), timestamp: new Date() })
);

app.use((_req, res) => res.status(404).json({ success: false, message: 'Route not found' }));
app.use(errorHandler);

initSocketHandlers(io);

mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('✅  MongoDB connected');
    const PORT = process.env.PORT || 5000;
    server.listen(PORT, () =>
      console.log(`🚀  SmartOrder running → http://localhost:${PORT}`)
    );
  })
  .catch(err => { console.error('❌  MongoDB error:', err.message); process.exit(1); });

module.exports = { app, io };
