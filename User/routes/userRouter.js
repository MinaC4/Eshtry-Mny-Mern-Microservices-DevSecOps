const express = require("express");
const rateLimit = require('express-rate-limit');
const router = express.Router();
const validateToken = require("../middleware/tokenValidationMiddleware");
const { validate, registerSchema, loginSchema } = require("../middleware/validateRequest");

const {getUser, userRegister, loginUser} = require("../controllers/usercontroller");

// Strict limiter applied only to auth endpoints (login & register)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'TooManyRequests', message: 'Too many login attempts, please try again later' }
});

router.route("/").post(authLimiter, validate(registerSchema), userRegister);

router.route("/").get(validateToken, getUser);

router.route("/login").post(authLimiter, validate(loginSchema), loginUser);

module.exports = router;
