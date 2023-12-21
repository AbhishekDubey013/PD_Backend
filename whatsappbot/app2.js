const express = require('express');
const routes = require('./routes');
const { clientInitialize } = require('./controllers/whatsappController');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3002;

clientInitialize();

app.use('/', routes);

const server = app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
