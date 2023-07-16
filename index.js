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
require("dotenv").config();

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

async function runCompletion(lastMessage, userMessage, prompt) {
  const messagePrompt = `${lastMessage}\nUser: ${userMessage}`;
  const fullPrompt = `${prompt}\n${messagePrompt}`;
  const completion = await openai.createCompletion({
    model: "text-davinci-003",
    prompt: fullPrompt,
    max_tokens: 200,
  });
  return completion.data.choices[0].text;
}

let lastMessage = ""; // Variable to store the last message
const initialPrompt = "ask user name first and then carryon, whatever user enter will be his name don't ask again";

client.on("message", (message) => {
  console.log(message.body);

  const userMessage = message.body;

  runCompletion(initialPrompt,lastMessage, userMessage).then((result) => {
    message.reply(result);
    lastMessage = userMessage; // Update the last message with the current message
  });
});
