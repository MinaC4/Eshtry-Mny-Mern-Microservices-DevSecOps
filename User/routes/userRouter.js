const express = require("express");
const router = express.Router();
const validateToken = require("../middleware/tokenValidationMiddleware");
const { validate, registerSchema, loginSchema } = require("../middleware/validateRequest");

const {getUser, getUsers, userRegister, loginUser} = require("../controllers/usercontroller");

router.route("/").post(validate(registerSchema), userRegister);

router.route("/").get(validateToken, getUser);

router.route("/login").post(validate(loginSchema), loginUser);

module.exports = router;
