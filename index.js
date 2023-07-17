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


const { Client } = require("whatsapp-web.js");
const qrcode = require("qrcode-terminal");
const { Configuration, OpenAIApi } = require("openai");
const express = require("express");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

const app = express();
const port = process.env.PORT || 3002;

const client = new Client();

client.on("qr", (qr) => {
  qrcode.generate(qr, { small: true });
});

client.on("ready", () => {
  console.log("Client is ready");
});

client.initialize();

const configuration = new Configuration({
  apiKey: process.env.SECRET_KEY,
});
const openai = new OpenAIApi(configuration);

async function runCompletion(message) {
  const completion = await openai.createCompletion({
    model: "text-davinci-003",
    prompt: message,
    max_tokens: 200,
  });
  return completion.data.choices[0].text;
}

client.on("message", (message) => {
  console.log(message.body);
  runCompletion(message.body).then((result) => message.reply(result));
});

app.get("/", (req, res) => {
  const qrImagePath = path.join(__dirname, "qrCode.png");
  
  qrcode.generate("QR CODE DATA", { small: true }, function (qrError, qrCode) {
    if (qrError) {
      console.error('QR code generation failed:', qrError);
      res.status(500).send('Internal Server Error');
    } else {
      fs.writeFileSync(qrImagePath, qrCode, (fsError) => {
        if (fsError) {
          console.error('Failed to write QR code image:', fsError);
          res.status(500).send('Internal Server Error');
        } else {
          res.sendFile(qrImagePath);
        }
      });
    }
  });
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

//yes