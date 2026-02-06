const User = require('../models/User');

const RegisterUser = async (req, res) => {
    const { name, email, password, role } = req.body;
    console.log('Registrando usuário:', req.body);
    try {
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: 'User already exists' });
        }

        const newUser = new User({ name, email, password, role });
        await newUser.save();

        res.status(201).json({ message: 'User registered successfully' });
    }
    catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

const LoginUser = async (req, res) => {
    const { name, password } = req.body;
    console.log('passou por aqui!')
    console.log('Tentando logar usuário:', name, password);
    try {
        const user = await User.findOne({ name: name });
        if (!user) {
            return res.status(400).json({ message: 'not user' });
        }

        console.log(user);

        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        res.status(200).json({ message: 'Login successful', id: user._id, role: user.role });

    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

module.exports = { RegisterUser, LoginUser };