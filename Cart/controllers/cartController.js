const CartModel = require('../models/cartModel');
const axios = require('axios');

const PRODUCT_SERVICE_URL = process.env.PRODUCT_SERVICE_URL || 'http://product-service:9000';

const getCartProducts = async (req, res) => {
    const cartProducts = await CartModel.find({ UserId: req.user.id });
    const cartProductIds = cartProducts.map(cartProduct => cartProduct.ProductId);

    let Products = [];
    let total = 0;

    if (cartProductIds.length > 0) {
        const results = await Promise.all(
            cartProductIds.map(id =>
                axios.get(`${PRODUCT_SERVICE_URL}/products/${id}`).then(r => r.data).catch((err) => { console.error(`Failed to fetch product ${id} from Product service:`, err.message); return null; })
            )
        );
        Products = results.filter(p => p !== null);
        Products.forEach(product => {
            total += product.price;
        });
    }

    res.json({ Products, total });
};

const addCartProduct = async (req, res) => {
    const cartProduct = await CartModel.create(
        {
            UserId: req.user.id,
            ProductId: req.params.productid
        }
    );
    res.json(cartProduct);
};

const deleteCartProduct = async (req, res) => {
    const cartProduct = await CartModel.findOneAndDelete(
        {
            UserId: req.user.id,
            ProductId: req.params.productid
        }
    );
    res.json(cartProduct);
};

const checkout = async (req, res) => {
    const cartProducts = await CartModel.deleteMany({ UserId: req.user.id });
    res.json({ cartProducts });
};

module.exports = {
    getCartProducts,
    addCartProduct,
    deleteCartProduct,
    checkout
};
