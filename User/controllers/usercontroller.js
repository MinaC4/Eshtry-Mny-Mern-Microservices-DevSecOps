const userModel = require('../models/userModel');
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const logger = require('../config/logger');
require("dotenv").config();

const getUser = async (req, res, next) => {
    try {
        const user = await userModel.findById(req.user.id, { password: 0 });
        logger.info({ userId: req.user.id }, 'User profile fetched');
        res.json(user);
    } catch (err) {
        next(err);
    }
};

const userRegister = async (req, res, next) => {
    try {
        const { email, password } = req.body;

        const foundUser = await userModel.findOne({ email });

        if (foundUser) {
            return res.status(400).json({ error: 'Conflict', message: "user already exists" });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const user = await userModel.create({
            email,
            password: hashedPassword,
            firstName: req.body.firstName,
            lastName: req.body.lastName,
            age: req.body.age,
            phone: req.body.phone,
            gender: req.body.gender
        });

        logger.info({ userId: user._id, email }, 'User registered successfully');
        res.status(201).json({ id: user._id });
    } catch (err) {
        next(err);
    }
};

const loginUser = async (req, res, next) => {
    try {
        const { email, password } = req.body;

        const user = await userModel.findOne({ email });

        if (user && (await bcrypt.compare(password, user.password))) {
            const accessToken = jwt.sign(
                { user: { id: user._id, role: user.role } },
                process.env.ACCESS_TOKEN,
                { expiresIn: "1h" }
            );

            logger.info({ userId: user._id, email }, 'User logged in successfully');
            res.cookie('token', accessToken, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'strict',
                maxAge: 3600000
            });
            return res.status(200).json({
                user: { id: user._id, email: user.email, firstName: user.firstName, lastName: user.lastName }
            });
        } else {
            return res.status(401).json({
                error: 'Unauthorized',
                message: "Wrong email or password"
            });
        }
    } catch (err) {
        next(err);
    }
};

module.exports = {
    getUser,
    userRegister,
    loginUser
};
