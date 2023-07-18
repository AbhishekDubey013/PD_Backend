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
const qrcode = require('qrcode-terminal');
const { Configuration, OpenAIApi } = require('openai');
require('dotenv').config();

const app = express();
const client = new Client();

client.on('qr', (qr) => {
  qrcode.generate(qr, { small: true });
});

client.on('ready', () => {
  console.log('Client is ready');
});

client.initialize();

const configuration = new Configuration({
  apiKey: process.env.SECRET_KEY,
});
const openai = new OpenAIApi(configuration);

async function runCompletion(message) {
  const completion = await openai.createCompletion({
    model: 'text-davinci-003',
    prompt: message,
    max_tokens: 200,
  });
  return completion.data.choices[0].text;
}

client.on('message', (message) => {
  console.log(message.body);
  runCompletion(message.body).then((result) => message.reply(result));
});

// Serve the QR code on the root URL
app.get('/', (req, res) => {
  res.setHeader('Content-Type', 'text/plain');
  client.on('qr', (qr) => {
    res.send(qr);
  });
});

// Start the server
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
