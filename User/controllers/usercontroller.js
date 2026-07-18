const userModel = require('../models/userModel');
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
require("dotenv").config();

const getUser = async (req, res) => {
    const user = await userModel.findById(req.user.id, { password: 0 });
    res.json(user);
};

const userRegister = async (req, res) => {
    const { email, password } = req.body;

    const foundUser = await userModel.findOne({ email });

    if (foundUser) {
        return res.status(400).json({ message: "user already exists" });
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

    res.json(user._id);
};

const loginUser = async (req, res) => {
    const { email, password } = req.body;

    const user = await userModel.findOne({ email });

    if (user && (await bcrypt.compare(password, user.password))) {

        const accessToken = jwt.sign(
            {
                user: {
                    id: user._id,
                    email: user.email,
                    firstName: user.firstName,
                    lastName: user.lastName,
                    age: user.age,
                    phone: user.phone,
                    gender: user.gender
                }
            },
            process.env.ACCESS_TOKEN,
            { expiresIn: "1h" }
        );

        console.log("✅ Token generated successfully");

        return res.status(200).json({
            token: accessToken,
            user: {
                id: user._id,
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName,
                age: user.age,
                phone: user.phone,
                gender: user.gender
            }
        });

    } else {
        return res.status(401).json({
            message: "Wrong email or password"
        });
    }
};

module.exports = {
    getUser,
    userRegister,
    loginUser
};
