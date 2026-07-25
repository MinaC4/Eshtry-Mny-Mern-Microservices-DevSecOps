const express = require('express');
const productController = require('../controllers/productController');
const validateToken = require('../../User/middleware/tokenValidationMiddleware');
const { validate, createProductSchema } = require('../middleware/validateRequest');
const router = express.Router();

router.get('/', productController.getProducts);

router.get('/:idOrName', productController.findProduct);

router.post('/', validateToken, validate(createProductSchema), productController.createProduct);

module.exports = router;
