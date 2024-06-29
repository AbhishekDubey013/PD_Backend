const { Configuration, OpenAIApi } = require('openai');
require('dotenv').config();

const configuration = new Configuration({
  apiKey: process.env.SECRET_KEY,
});

const openai = new OpenAIApi(configuration);

module.exports = openai;
