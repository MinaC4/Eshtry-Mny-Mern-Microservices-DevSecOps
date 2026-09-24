const mongoose = require('mongoose');

const orderItemSchema = mongoose.Schema({
    ProductId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    name: { type: String, required: true },
    price: { type: Number, required: true, min: 0 }
}, { _id: false });

const orderSchema = mongoose.Schema({
    UserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    items: { type: [orderItemSchema], default: [] },
    total: { type: Number, required: true, min: 0 }
}, {
    timestamps: true
});

orderSchema.index({ UserId: 1, createdAt: -1 });

module.exports = mongoose.model('Order', orderSchema);
