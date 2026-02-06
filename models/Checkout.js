const mongoose = require('mongoose');

const CheckoutSchema = new mongoose.Schema({
    checkinId: {
        type: String,
        required: true
    },
    tecId: {
        type: String,
        required: true
    },
    nameClient: {
        type: String,
        required: true
    },
    date: {
        type: Date,
        default: Date.now
    },
    images: {
        type: Array,
        default: []
    },
    videos: {
        type: Array,
        default: []
    },
    assinatura: {
        type: String,
        required: true
    },
    hourCheckout: {
        type: String,
        default: () => new Date().toLocaleTimeString('pt-BR')
    },
    insumes: {
        type: Array,
        default: []
    },
    pdf: {
        type: String
    }
});

module.exports = mongoose.model('Checkout', CheckoutSchema);