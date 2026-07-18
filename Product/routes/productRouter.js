const express = require('express');
const productController = require('../controllers/productController');
const validateToken = require('../middleware/tokenValidationMiddleware');
const router = express.Router();

router.get('/', productController.getProducts);

router.get('/:idOrName', productController.findProduct);

router.post('/', validateToken, productController.createProduct);

module.exports = router;
