const express = require('express');
const productController = require('../controllers/productController');
const validateToken = require('../middleware/tokenValidationMiddleware');
const requireRole = require('../middleware/requireRole');
const { validate, createProductSchema } = require('../middleware/validateRequest');
const router = express.Router();

router.get('/', productController.getProducts);

router.get('/:idOrName', productController.findProduct);

router.post('/', validateToken, requireRole('admin'), validate(createProductSchema), productController.createProduct);

module.exports = router;
