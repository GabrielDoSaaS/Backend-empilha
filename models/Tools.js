const mongoose = require('mongoose');

const ToolsSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    unit: {
        type: String,
    }
}, { timestamps: true });

module.exports = mongoose.model('Tools', ToolsSchema);

