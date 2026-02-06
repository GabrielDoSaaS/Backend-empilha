const mongoose = require('mongoose');


const connectToDB = async () => {
  try {
    await mongoose.connect('mongodb+srv://gabrield3vsilva_db_user:ZrGessK0zrbZxQKA@cluster0.hnlxavs.mongodb.net/');
    console.log('Connected to MongoDB');
  } catch (error) {
    console.error('Error connecting to MongoDB:', error);
  }
};

module.exports = connectToDB;