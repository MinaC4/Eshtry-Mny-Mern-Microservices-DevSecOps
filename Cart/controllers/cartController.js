const CartModel = require('../models/cartModel');
const OrderModel = require('../models/orderModel');
const axios = require('axios');
const axiosRetry = require('axios-retry').default;
const logger = require('../config/logger');

const PRODUCT_SERVICE_URL = process.env.PRODUCT_SERVICE_URL || 'http://product-service:9000';

// Configure axios-retry: 2 retries with exponential backoff, 3 s timeout per request.
// The internal token lets these service-to-service calls bypass the product-service
// rate limiter (keyed per source IP, otherwise shared by every user).
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

// Load the products referenced by a user's cart. Returns how many lookups failed
// so callers can surface an explicit upstream error instead of a silent partial cart.
const loadCartProducts = async (userId) => {
    const cartProducts = await CartModel.find({ UserId: userId });
    const ids = cartProducts.map((cartProduct) => cartProduct.ProductId);

    let products = [];
    let total = 0;
    let failures = 0;

    if (ids.length > 0) {
        const results = await Promise.all(
            ids.map((id) =>
                axiosInstance.get(`${PRODUCT_SERVICE_URL}/api/v1/products/${id}`)
                    .then((r) => ({ ok: true, data: r.data }))
                    .catch((err) => {
                        logger.error({ err, productId: id }, 'Failed to fetch product from Product service');
                        return { ok: false, id };
                    })
            )
        );
        failures = results.filter((r) => !r.ok).length;
        products = results.filter((r) => r.ok).map((r) => r.data);
        products.forEach((product) => { total += product.price; });
    }

    return { products, total, failures };
};

const upstreamError = (res, failures) =>
    res.status(502).json({
        error: 'UpstreamError',
        message: 'Could not load some cart items from the product service',
        failedItems: failures
    });

const getCartProducts = async (req, res, next) => {
    try {
        const { products, total, failures } = await loadCartProducts(req.user.id);
        if (failures > 0) {
            logger.warn({ userId: req.user.id, failures }, 'Cart response incomplete (product-service errors)');
            return upstreamError(res, failures);
        }
        logger.info({ userId: req.user.id, count: products.length }, 'User fetched cart');
        res.json({ Products: products, total });
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

// Checkout persists a real Order (server-generated id) then clears the cart.
// No payment is processed; this is the demo order record.
const checkout = async (req, res, next) => {
    try {
        const { products, total, failures } = await loadCartProducts(req.user.id);
        if (failures > 0) {
            return upstreamError(res, failures);
        }
        if (products.length === 0) {
            return res.status(400).json({ error: 'EmptyCart', message: 'Cart is empty' });
        }

        const order = await OrderModel.create({
            UserId: req.user.id,
            items: products.map((p) => ({ ProductId: p._id, name: p.name, price: p.price })),
            total
        });
        await CartModel.deleteMany({ UserId: req.user.id });

        logger.info({ userId: req.user.id, orderId: order._id, total }, 'Order placed');
        res.status(201).json({
            orderId: order._id,
            items: products.map((p) => ({ _id: p._id, name: p.name, category: p.category, price: p.price })),
            total,
            createdAt: order.createdAt
        });
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
