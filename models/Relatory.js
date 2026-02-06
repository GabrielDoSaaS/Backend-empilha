const mongoose = require('mongoose');

const RelatorySchema = new mongoose.Schema({
    tecId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    checkoutId: { type: mongoose.Schema.Types.ObjectId, ref: 'Checkout', required: true },
    generatedAt: { type: Date, default: Date.now },
    pdf: { type: String, required: true }
});


module.exports = mongoose.model('Relatory', RelatorySchema);