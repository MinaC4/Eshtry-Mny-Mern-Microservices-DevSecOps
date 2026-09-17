const express = require('express');
const router = express.Router();
const {categoryFilter,priceFilter, categorypriceFilter} = require("../controllers/filterController")
const {
  validate,
  priceFilterSchema,
  categoryFilterSchema,
  categoryPriceFilterSchema
} = require("../middleware/validateRequest")

router.get("/category/:category", validate(categoryFilterSchema), categoryFilter)
router.get("/price/:price", validate(priceFilterSchema), priceFilter)
router.get("/categoryprice/:category&&:price", validate(categoryPriceFilterSchema), categorypriceFilter)


module.exports = router