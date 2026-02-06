const Checkin = require('../models/Checkin');

const WorkDescription = async (req, res) => {
    const {id, workDescription, images, videos } = req.body;
    console.log('ii')
    try {
        const checkin = await Checkin.findById(id);
        if (!checkin) {
            return res.status(404).json({ message: 'Checkin not found' });
        } 

        checkin.workDescription = workDescription || checkin.workDescription;
        checkin.images = images || checkin.images;
        checkin.videos = videos || checkin.videos;
        await checkin.save();

        res.status(200).json({ message: 'Work description updated successfully', checkin });
    }
    catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }

};

module.exports = { WorkDescription };