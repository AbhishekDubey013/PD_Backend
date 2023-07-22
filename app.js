// const {Client} = require("whatsapp-web.js");
// const qrcode = require("qrcode-terminal");
// const {Configuration, OpenAIApi} = require("openai");
// require("dotenv").config();

// const client = new Client();

// client.on('qr',(qr) =>{
//     qrcode.generate(qr,{small:true});
// });

// client.on('ready',() =>{
//     console.log("Client is ready");
// });

// client.initialize();

// const configuration = new Configuration({
//     apiKey : process.env.SECRET_KEY,
// });
// const openai = new OpenAIApi(configuration);

// async function runCompletion(message){
//     const completion = await openai.createCompletion({
//         model:"text-davinci-003",
//         prompt: message,
//         max_tokens: 200,
//     });
//     return completion.data.choices[0].text;
// }

// client.on('message',message => {
//     console.log(message.body);
//     runCompletion(message.body).then(result => message.reply(result));
// })


const express = require('express');
const { Client } = require('whatsapp-web.js');
const qrcode = require('qrcode');
const { Configuration, OpenAIApi } = require('openai');
const redis = require('redis');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3002;

const redisClient = redis.createClient({
  url: process.env.REDIS_URL,
});

const client = new Client();
let qrCodeImage = null;

client.on('qr', (qr) => {
  qrcode.toDataURL(qr, { errorCorrectionLevel: 'L' }, (err, url) => {
    if (err) {
      console.error('QR code generation failed:', err);
    } else {
      qrCodeImage = url;
    }
  });
});

client.on('ready', () => {
  console.log('Client is ready');
});

client.initialize();

const configuration = new Configuration({
  apiKey: process.env.SECRET_KEY,
});
const openai = new OpenAIApi(configuration);

function getLastNMessages(whatsappNumber, n) {
  return new Promise((resolve, reject) => {
    // Get the last n messages from Redis
    redisClient.lrange(whatsappNumber, -n, -1, (err, messages) => {
      if (err) {
        reject(err);
      } else {
        resolve(messages);
      }
    });
  });
}

async function runCompletion(whatsappNumber, messages) {
  // Combine the last 5 messages into a single string
  const context = messages.join('\n');

  const completion = await openai.createCompletion({
    model: 'text-davinci-003',
    prompt: context,
    max_tokens: 200,
  });

  return completion.data.choices[0].text;
}

client.on('message', async (message) => {
  console.log(message.from, message.body);

  // Get the WhatsApp number from the message
  const whatsappNumber = message.from;

  // Store the message in Redis
  redisClient.lpush(whatsappNumber, message.body);

  // Get the last 5 messages from Redis
  const messages = await getLastNMessages(whatsappNumber, 5);

  // Process the messages and send the response
  runCompletion(whatsappNumber, messages).then((result) => {
    message.reply(result);
  });
});

app.get('/', (req, res) => {
  if (qrCodeImage) {
    res.send(`<img src="${qrCodeImage}" alt="QR Code">`);
  } else {
    res.send('QR code image not available');
  }
});

const server = app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
