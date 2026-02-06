require('dotenv').config();

const express = require('express');
const cors = require('cors');
const routes = require('./routes/routes');
const connectToDB = require('./db/connectToDB');

connectToDB();
const app = express();

app.use(cors());
app.use(express.json({ limit: '100mb' }));
app.use('/api', routes);

app.listen(3000, () => {
  console.log('Server is running on port 3000');
});
