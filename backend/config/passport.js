
const passport = require("passport");
const User = require("../models/User");

// Use email as the login username
passport.use(User.createStrategy());

// Store user ID in session
passport.serializeUser(User.serializeUser());

// Retrieve user from database using stored ID
passport.deserializeUser(User.deserializeUser());

module.exports = passport;
