const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

/**
 * User Schema
 * Each user gets a unique sessionToken (UUID) used for multi-tenant cart isolation.
 * sessionToken acts as a lightweight API key — no JWT overhead for this microservice scope.
 */
const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: [true, 'Username is required'],
      unique: true,
      trim: true,
      minlength: [3, 'Username must be at least 3 characters'],
      maxlength: [30, 'Username must not exceed 30 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address'],
    },
    sessionToken: {
      type: String,
      default: uuidv4,
      unique: true,
      index: true, // Fast lookup on every authenticated request
    },
  },
  {
    timestamps: true, // Adds createdAt and updatedAt automatically
  }
);

module.exports = mongoose.model('User', userSchema);
