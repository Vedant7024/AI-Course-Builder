
const passport = require("passport");
const User = require("../models/User");

// Register a new user
async function register(req, res, next) {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "Name, email and password are required.",
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 8 characters.",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const user = new User({
      name: name.trim(),
      email: normalizedEmail,
    });

    const registeredUser = await User.register(user, password);

    req.login(registeredUser, (error) => {
      if (error) return next(error);

      return res.status(201).json({
        success: true,
        message: "Registration successful.",
        user: {
          id: registeredUser._id,
          name: registeredUser.name,
          email: registeredUser.email,
        },
      });
    });
  } catch (error) {
    if (error.name === "UserExistsError" || error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "An account with this email already exists.",
      });
    }

    next(error);
  }
}

// Login an existing user
function login(req, res, next) {
  if (typeof req.body.email !== "string") {
    return res.status(400).json({
      success: false,
      message: "Valid email is required.",
    });
  }

  // Normalize email in the same way as registration
  req.body.email = req.body.email.trim().toLowerCase();

  passport.authenticate("local", (error, user) => {
    if (error) return next(error);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password.",
      });
    }

    req.login(user, (loginError) => {
      if (loginError) return next(loginError);

      return res.json({
        success: true,
        message: "Login successful.",
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
        },
      });
    });
  })(req, res, next);
}

// Logout
function logout(req, res, next) {
  req.logout((error) => {
    if (error) return next(error);

    req.session.destroy((sessionError) => {
      if (sessionError) return next(sessionError);

      res.clearCookie("course.sid", {
        path: "/",
        httpOnly: true,
        sameSite: "none",
        secure: true,
      });

      return res.json({
        success: true,
        message: "Logout successful.",
      });
    });
  });
}

// Get current logged-in user
function me(req, res) {
  if (!req.isAuthenticated()) {
    return res.status(401).json({
      success: false,
      message: "Please log in first.",
    });
  }

  return res.json({
    success: true,
    user: {
      id: req.user._id,
      name: req.user.name,
      email: req.user.email,
    },
  });
}

module.exports = { register, login, logout, me };
