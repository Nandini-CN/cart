const User = require('../models/User');

/**
 * Handles user onboarding and retrieval.
 */
class UserController {
  /**
   * Registers a user or returns existing user credentials (with session token).
   * In a microservice context, registration acts as sign-up/sign-in.
   */
  async registerOrLogin(req, res, next) {
    const { username, email } = req.body;

    try {
      // Find user if they already exist, otherwise create
      let user = await User.findOne({ email: email.toLowerCase() });

      if (user) {
        return res.status(200).json({
          success: true,
          message: 'User logged in successfully.',
          data: {
            userId: user._id,
            username: user.username,
            email: user.email,
            sessionToken: user.sessionToken,
          },
        });
      }

      // Check if username is taken by a different email
      const usernameExists = await User.findOne({ username });
      if (usernameExists) {
        return res.status(400).json({
          success: false,
          error: 'Username is already taken.',
        });
      }

      user = new User({
        username,
        email,
      });

      await user.save();

      res.status(201).json({
        success: true,
        message: 'User registered successfully.',
        data: {
          userId: user._id,
          username: user.username,
          email: user.email,
          sessionToken: user.sessionToken,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Returns current authenticated user metadata.
   */
  async getMe(req, res, next) {
    try {
      const user = await User.findById(req.userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'User not found.',
        });
      }

      res.status(200).json({
        success: true,
        data: {
          userId: user._id,
          username: user.username,
          email: user.email,
          sessionToken: user.sessionToken,
        },
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new UserController();
