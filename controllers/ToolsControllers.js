const Tools = require('../models/Tools');

const CreateTool = async (req, res) => {
    const  { name, unit } = req.body;

    const newTool = new Tools({ name, unit });
    try {
        await newTool.save();
        res.status(201).json({ message: 'Tool added successfully', tool: newTool });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }


}

const GetTools = async (req, res) => {
    try {
        const tools = await Tools.find();
        res.status(200).json(tools);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

const DeleteTool = async (req, res) => {
    const { id } = req.params;
    try {
        const deletedTool = await Tools.findByIdAndDelete(id);
        if (!deletedTool) {
            return res.status(404).json({ message: 'Tool not found' });
        }

        res.status(200).json({ message: 'Tool deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

module.exports = { CreateTool, GetTools, DeleteTool };