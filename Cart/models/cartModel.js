const mongoose = require("mongoose");

const cartSchema = mongoose.Schema(
{
    UserId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    ProductId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
        required: true
    }
},
{
    timestamps: true
}
);

// منع الإدخال المكرر لنفس المنتج في سلة المستخدم
cartSchema.index({ UserId: 1, ProductId: 1 }, { unique: true });

module.exports = mongoose.model("Cart", cartSchema);
