const productModel = require('../models/productModel');

const categoryFilter  = async (req, res, next) =>{
    try { const filteredProducts = await productModel.find({category: req.params.category})
        res.json({filteredProducts})
    } catch (error) { next(error) }
}

const priceFilter = async (req, res, next) =>{
    try { const filteredProducts = await productModel.find({price: {$lte: req.params.price}})
        res.json(filteredProducts)
    } catch (error) { next(error) }
}

const categorypriceFilter = async (req, res, next) =>{
    try { const filteredProducts = await productModel.find({category: req.params.category, price: {$lte: req.params.price}})
        res.json(filteredProducts)
    } catch (error) { next(error) }
}

module.exports = { categoryFilter, priceFilter, categorypriceFilter }
