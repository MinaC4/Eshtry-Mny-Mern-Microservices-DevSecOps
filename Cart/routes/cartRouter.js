const express = require("express");
const {getCartProducts, addCartProduct, deleteCartProduct, checkout} = require("../controllers/cartController");
const validateToken = require('../../User/middleware/tokenValidationMiddleware');
const { validate, addCartSchema } = require('../middleware/validateRequest');

const router = express.Router();

// ────── TEST ROUTE (بدون token) ──────
router.get("/test", (req, res) => {
    res.json({ message: "✅ Cart route is WORKING! (test route - no token needed)" });
});

// الـ routes الأصلية
router.get("/", validateToken, getCartProducts);
router.post("/:productid", validateToken, validate(addCartSchema), addCartProduct);
router.delete("/checkout", validateToken, checkout);
router.delete("/:productid", validateToken, deleteCartProduct);

module.exports = router;
