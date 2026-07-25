const CartModel = require('../models/cartModel');
const axios = require('axios');
const logger = require('../config/logger');

const PRODUCT_SERVICE_URL = process.env.PRODUCT_SERVICE_URL || 'http://product-service:9000';

const getCartProducts = async (req, res, next) => {
    try {
        const cartProducts = await CartModel.find({ UserId: req.user.id });
        const cartProductIds = cartProducts.map(cartProduct => cartProduct.ProductId);

        let Products = [];
        let total = 0;

        if (cartProductIds.length > 0) {
            const results = await Promise.all(
                cartProductIds.map(id =>
                    axios.get(`${PRODUCT_SERVICE_URL}/api/v1/products/${id}`).then(r => r.data).catch((err) => {
                        logger.error({ err, productId: id }, 'Failed to fetch product from Product service');
                        return null;
                    })
                )
            );
            Products = results.filter(p => p !== null);
            Products.forEach(product => {
                total += product.price;
            });
        }

        logger.info({ userId: req.user.id, count: Products.length }, 'User fetched cart');
        res.json({ Products, total });
    } catch (err) {
        next(err);
    }
};

const addCartProduct = async (req, res, next) => {
    const productId = req.params.productid;

    try {
        // Verify product exists
        try {
            await axios.get(`${PRODUCT_SERVICE_URL}/api/v1/products/${productId}`);
        } catch (err) {
            if (err.response?.status === 404) {
                return res.status(404).json({ error: 'NotFound', message: 'Product not found' });
            }
            throw err;
        }

        const cartProduct = await CartModel.create({
            UserId: req.user.id,
            ProductId: productId
        });
        logger.info({ userId: req.user.id, productId }, 'Product added to cart');
        res.json(cartProduct);
    } catch (err) {
        // Handle duplicate key error
        if (err.code === 11000) {
            return res.status(409).json({ error: 'Conflict', message: 'Product already in cart' });
        }
        next(err);
    }
};

const deleteCartProduct = async (req, res, next) => {
    try {
        const cartProduct = await CartModel.findOneAndDelete(
            {
                UserId: req.user.id,
                ProductId: req.params.productid
            }
        );
        if (!cartProduct) {
            return res.status(404).json({ error: 'NotFound', message: 'Cart item not found' });
        }
        logger.info({ userId: req.user.id, productId: req.params.productid }, 'Product removed from cart');
        res.json(cartProduct);
    } catch (err) {
        next(err);
    }
};

const checkout = async (req, res, next) => {
    try {
        const cartProducts = await CartModel.deleteMany({ UserId: req.user.id });
        logger.info({ userId: req.user.id, deleted: cartProducts.deletedCount }, 'Cart checkout completed');
        res.json({ message: 'Checkout completed', deletedCount: cartProducts.deletedCount });
    } catch (err) {
        next(err);
    }
};

module.exports = {
    getCartProducts,
    addCartProduct,
    deleteCartProduct,
    checkout
};
