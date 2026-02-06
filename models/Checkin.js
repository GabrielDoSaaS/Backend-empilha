const mongoose = require('mongoose');

const CheckinSchema = new mongoose.Schema({
    tecId: {
        type: String,
        required: true
    },
    numeracao: {
        type: String,
        required: true
    },
    nameClient: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: false
    },
    workDescription: {
        type: String,
    },
    images: {
        type: Array,
        default: []
    },
    videos: {
        type: Array,
        default: []
    },
    date: {
        type: Date,
        default: Date.now
    },
    hourCheckin: {
        type: String,
        default: () => new Date().toLocaleTimeString('pt-BR')
    }
});

module.exports = mongoose.model('Checkin', CheckinSchema);