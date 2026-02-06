const Checkin = require('../models/Checkin');

const InitCheckin = async (req, res) => {
    const { numeracao, nameClient, email, idTec } = req.body;
    console.log(req.body);
    try {
        const newCheckin = new Checkin({ tecId: idTec, numeracao: numeracao, nameClient: nameClient, email: email});
        await newCheckin.save();
        res.status(201).json({ message: 'Checkin created successfully', checkin: newCheckin });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

const GetAllCheckins = async (req, res) => {
    try {
        const checkins = await Checkin.find();
        res.status(200).json(checkins);
    }
    catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

const GetCheckinByTecId = async (req, res) => {
    const { tecId } = req.params;

    try {
        const checkins = await Checkin.find({tecId: tecId});
        res.status(200).json(checkins); 
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }

};


module.exports = { InitCheckin, GetAllCheckins, GetCheckinByTecId };