const CartModel = require('../models/cartModel');
const axios = require('axios');
const axiosRetry = require('axios-retry').default;
const logger = require('../config/logger');

const PRODUCT_SERVICE_URL = process.env.PRODUCT_SERVICE_URL || 'http://product-service:9000';

// Configure axios-retry: 2 retries with exponential backoff, 3 s timeout per request
// Internal token lets these service-to-service calls bypass the product-service rate
// limiter (which is keyed per source IP and would otherwise be shared by all users).
const axiosInstance = axios.create({
    timeout: 3000,
    headers: process.env.INTERNAL_TOKEN ? { 'x-internal-token': process.env.INTERNAL_TOKEN } : {}
});
axiosRetry(axiosInstance, {
    retries: 2,
    retryDelay: axiosRetry.exponentialDelay,
    retryCondition: (err) =>
        axiosRetry.isNetworkOrIdempotentRequestError(err) ||
        (err.response && err.response.status >= 500),
});

const getCartProducts = async (req, res, next) => {
    try {
        const cartProducts = await CartModel.find({ UserId: req.user.id });
        const cartProductIds = cartProducts.map(cartProduct => cartProduct.ProductId);

        let Products = [];
        let total = 0;

        if (cartProductIds.length > 0) {
            const results = await Promise.all(
                cartProductIds.map(id =>
                    axiosInstance.get(`${PRODUCT_SERVICE_URL}/api/v1/products/${id}`)
                        .then(r => ({ ok: true, data: r.data }))
                        .catch((err) => {
                            logger.error({ err, productId: id }, 'Failed to fetch product from Product service');
                            return { ok: false, id };
                        })
                )
            );
            const failures = results.filter(r => !r.ok).length;
            Products = results.filter(r => r.ok).map(r => r.data);
            Products.forEach(product => {
                total += product.price;
            });
            if (failures > 0) {
                logger.warn({ userId: req.user.id, failures }, 'Cart response incomplete (product-service errors)');
                return res.status(502).json({
                    error: 'UpstreamError',
                    message: 'Could not load some cart items from the product service',
                    failedItems: failures
                });
            }
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
        // Verify product exists (with timeout + retry)
        try {
            await axiosInstance.get(`${PRODUCT_SERVICE_URL}/api/v1/products/${productId}`);
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
