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

const client = new Client();
let qrCodeImage = null;
const conversations = new Map();

// Connect to Redis using the connection details from render.com
const redisClient = redis.createClient({
  host: process.env.REDIS_HOST,
  port: process.env.REDIS_PORT,
  password: process.env.REDIS_PASSWORD,
});

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

async function runCompletion(whatsappNumber, message) {
  // Get the conversation history and context for the WhatsApp number from Redis
  redisClient.get(whatsappNumber, (err, serializedConversation) => {
    let conversation = serializedConversation ? JSON.parse(serializedConversation) : { history: '', context: '' };
    const prompt = conversation.context + '\n' + message;

    openai.createCompletion({
      model: 'text-davinci-003',
      prompt,
      max_tokens: 200,
    }).then((completion) => {
      // Update the conversation history and context for the WhatsApp number
      conversation.history += '\n' + message;
      conversation.context = completion.data.choices[0].text;

      // Store the updated conversation in Redis
      redisClient.set(whatsappNumber, JSON.stringify(conversation));

      // Send the completion response
      client.sendMessage(whatsappNumber, completion.data.choices[0].text);
    }).catch((error) => {
      console.error('OpenAI completion failed:', error);
    });
  });
}

client.on('message', (message) => {
  console.log(message.from, message.body);

  // Get the WhatsApp number from the message
  const whatsappNumber = message.from;

  // Process the message and send the response
  runCompletion(whatsappNumber, message.body);
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



