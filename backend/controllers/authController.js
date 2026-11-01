const jwt  = require('jsonwebtoken');
const User = require('../models/User');

const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });

/* ── REGISTER ── */
exports.register = async (req, res) => {
  try {
    const { name, email, password, role: requestedRole = 'student', studentId } = req.body;

    if (!name || !email || !password)
      return res.status(400).json({ success: false, message: 'All fields required' });

    const existing = await User.findOne({ email });
    if (existing) return res.status(400).json({ success: false, message: 'Email already registered' });

    // SECURITY: Backend enforces allowed roles from public registration
    // Only 'student' and 'kitchen' are allowed from the public form.
    // 'admin' cannot be self-registered.
    let role = 'student';
    let accountStatus = 'approved';

    if (requestedRole === 'kitchen') {
      role = 'kitchen';
      accountStatus = 'pending';   // Kitchen must wait for admin approval
    } else if (requestedRole === 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Admin accounts cannot be self-registered. Contact your system administrator.',
      });
    }

    const user = await User.create({ name, email, password, role, accountStatus, studentId });

    // If kitchen pending, do NOT issue token — they can't log in yet
    if (role === 'kitchen' && accountStatus === 'pending') {
      // Notify admin via socket if connected
      req.io?.to('admin').emit('kitchenRegistrationRequest', {
        user: { _id: user._id, name: user.name, email: user.email, createdAt: user.createdAt },
      });
      return res.status(201).json({
        success: true,
        pending: true,
        message: 'Kitchen staff registration submitted. Awaiting admin approval.',
      });
    }

    const token = signToken(user._id);
    res.status(201).json({ success: true, token, user });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/* ── LOGIN ── */
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password)
      return res.status(400).json({ success: false, message: 'Email and password required' });

    const user = await User.findOne({ email }).select('+password');
    if (!user || !(await user.comparePassword(password)))
      return res.status(401).json({ success: false, message: 'Invalid credentials' });

    if (!user.isActive)
      return res.status(403).json({ success: false, message: 'Account has been disabled' });

    // Block pending/rejected kitchen accounts from logging in
    if (user.role === 'kitchen' && user.accountStatus === 'pending')
      return res.status(403).json({
        success: false,
        message: 'Your kitchen staff application is pending admin approval.',
      });

    if (user.role === 'kitchen' && user.accountStatus === 'rejected')
      return res.status(403).json({
        success: false,
        message: 'Your kitchen staff application was rejected. Contact admin.',
      });

    const token = signToken(user._id);
    user.password = undefined;

    res.json({ success: true, token, user });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/* ── GET ME ── */
exports.getMe = async (req, res) => {
  res.json({ success: true, user: req.user });
};

/* ── UPDATE PROFILE (name, studentId, avatar) ── */
exports.updateProfile = async (req, res) => {
  try {
    const { name, studentId } = req.body;
    const updateData = {};
    if (name) updateData.name = name;
    if (studentId !== undefined) updateData.studentId = studentId;

    // Avatar upload
    if (req.file) {
      updateData.avatar = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
    }

    const user = await User.findByIdAndUpdate(req.user._id, updateData, { new: true });
    res.json({ success: true, user });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
