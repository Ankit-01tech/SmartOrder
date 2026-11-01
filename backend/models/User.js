const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    name:      { type: String, required: true, trim: true },
    email:     { type: String, required: true, unique: true, lowercase: true, trim: true },
    password:  { type: String, required: true, minlength: 6 },

    // role is ENFORCED on backend — frontend selection only allowed for 'student'
    // 'kitchen' starts as pending; 'admin' can only be seeded or promoted
    role:      { type: String, enum: ['student', 'kitchen', 'admin'], default: 'student' },

    // Kitchen staff approval workflow
    // student  → always 'approved'
    // kitchen  → starts 'pending', admin approves/rejects
    // admin    → always 'approved' (seeded only)
    accountStatus: {
      type: String,
      enum: ['approved', 'pending', 'rejected'],
      default: 'approved',
    },

    studentId:    { type: String, sparse: true },
    avatar:       { type: String, default: '' },      // base64 or URL
    preferences:  [{ type: String }],
    orderHistory: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Order' }],
    isActive:     { type: Boolean, default: true },
  },
  { timestamps: true }
);

// Hash password before save
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

userSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  return obj;
};

module.exports = mongoose.model('User', userSchema);
