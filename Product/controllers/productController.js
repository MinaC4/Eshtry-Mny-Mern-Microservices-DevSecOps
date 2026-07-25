const productModel = require('../models/productModel');

const getProducts = async (req, res, next) => {
    try {
        const products = await productModel.find();
        res.status(200).json(products);
    } catch (error) {
        next(error);
    }
};

const getProductByName = async (req, res, next) => {
    try {
        const product = await productModel.find({ name: req.params.name });
        res.status(200).json(product);
    } catch (error) {
        next(error);
    }
};

const getProductById = async (req, res, next) => {
    try {
        const productDetails = await productModel.findById(req.params.id);
        res.json(productDetails);
    } catch (error) {
        next(error);
    }
};

const findProduct = async (req, res, next) => {
    try {
        const product = await productModel.findOne({
            $or: [{ name: req.params.idOrName }, { _id: req.params.idOrName }]
        });
        res.status(200).json(product);
    } catch (error) {
        next(error);
    }
};

const createProduct = async (req, res, next) => {
    try {
        const product = await productModel.create(req.body);
        res.status(200).json(product);
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getProducts,
    getProductByName,
    createProduct,
    getProductById,
    findProduct
};