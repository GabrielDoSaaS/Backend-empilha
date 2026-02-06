const mongoose = require('mongoose');
const bcryptjs = require('bcryptjs');

const UserSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: false,
        unique: true
    },
    password: {
        type: String,
        required: true
    },
    role: {
        type: String,
    }
}, { timestamps: true });

// Remova o 'next' dos parâmetros e das chamadas
UserSchema.pre('save', async function () {
    // Se a senha não foi modificada, apenas retorne (encerra a execução do hook)
    if (!this.isModified('password')) {
        return; 
    }

    const salt = await bcryptjs.genSalt(10);
    this.password = await bcryptjs.hash(this.password, salt);
    // Não precisa chamar next() aqui
});

UserSchema.methods.comparePassword = async function (candidatePassword) {
    return await bcryptjs.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', UserSchema);
