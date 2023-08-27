// const express = require('express');
// const { Client } = require('whatsapp-web.js');
// const qrcode = require('qrcode');
// const { Configuration, OpenAIApi } = require('openai');
// const axios = require('axios');
// require('dotenv').config();

// const app = express();
// const port = process.env.PORT || 3002;

// const client = new Client();
// let qrCodeImage = null;
// const conversations = new Map();

// client.on('qr', (qr) => {
//   qrcode.toDataURL(qr, { errorCorrectionLevel: 'L' }, (err, url) => {
//     if (err) {
//       console.error('QR code generation failed:', err);
//     } else {
//       qrCodeImage = url;
//     }
//   });
// });

// client.on('ready', () => {
//   console.log('Client is ready');
// });

// client.initialize();

// const configuration = new Configuration({
//   apiKey: process.env.SECRET_KEY,
// });
// const openai = new OpenAIApi(configuration);

// // Local map to keep a copy of WhatsApp numbers, names, prompt, and last 5 messages
// const localConversations = new Map();

// async function runCompletion(whatsappNumber, message) {
//   // Get the conversation history and context for the WhatsApp number
//   const conversation = localConversations.get(whatsappNumber) || { history: [], userName: null, prompt: null };

//   // Store the latest message in the history and keep only the last 5 messages
//   conversation.history.push(message);
//   conversation.history = conversation.history.slice(-5);

//   const context = conversation.history.join('\n');

//   const completion = await openai.createCompletion({
//     model: 'text-davinci-003',
//     prompt: context,
//     max_tokens: 200,
//   });

//   return completion.data.choices[0].text;
// }

// client.on('message', (message) => {
//   console.log(message.from, message.body);

//   // Get the WhatsApp number from the message
//   const whatsappNumber = message.from;

//   // Process the message and send the response
//   runCompletion(whatsappNumber, message.body).then((result) => {
//     message.reply(result);
//   });

//   //Check if the user is new and add data to the local copy if necessary
//   if (!localConversations.has(whatsappNumber)) {
//     const newConversation = { history: [message.body], userName: null, prompt: null };
//     localConversations.set(whatsappNumber, newConversation);
    
//     // Add data to the database (you can use your API endpoint for this)
//     axios.post('https://gt-7tqn.onrender.com/api/auth/store-sender-info', {
//       whatsappNumber,
//       userName: null,
//       prompt: null,
//       history: [message.body],
//     }).then(() => {
//       console.log('New user data added to the database');
//     }).catch((error) => {
//       console.error('Error adding new user data to the database:', error.message);
//     });
//   }
// });

// app.get('/', (req, res) => {
//   if (qrCodeImage) {
//     res.send(`<img src="${qrCodeImage}" alt="QR Code">`);
//   } else {
//     res.send('QR code image not available');
//   }
// });

// //Sync local copy with the database every hour
// const syncInterval = 60 * 60 * 1000; // 1 hour
// setInterval(async () => {
//   try {
//     const { data } = await axios.get('https://gt-7tqn.onrender.com/api/auth/getQas');
//     const conversationsFromDB = data;
//     conversationsFromDB.forEach((conversationFromDB) => {
//       const { whatsappNumber, userName, prompt, history } = conversationFromDB;
//       localConversations.set(whatsappNumber, { userName, prompt, history });
//     });
//     console.log('Local copy synced with the database');
//   } catch (error) {
//     console.error('Error syncing local copy with DB:', error.message);
//   }
// }, syncInterval);

// //Start the server and initialize the WhatsApp client
// const server = app.listen(port, () => {
//   console.log(`Server is running on http://localhost:${port}`);
// });

const express = require('express');
const { Client } = require('whatsapp-web.js');
const qrcode = require('qrcode');
const { Configuration, OpenAIApi } = require('openai');
const axios = require('axios');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3002;

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

const localConversations = new Map();

async function runCompletion(whatsappNumber, message) {
  const conversation = localConversations.get(whatsappNumber) || { history: [], userName: null, prompt: null };

  conversation.history.push(message);
  conversation.history = conversation.history.slice(-5);

  const additionalContext = "Your additional context here"; // Define your additional context
  const context = additionalContext + "\n" + conversation.history.join('\n');

  try {
      const completion = await openai.createCompletion({
          model: 'text-davinci-003',
          prompt: context,
          max_tokens: 200,
      });
      return completion.data.choices[0].text;
  } catch (error) {
      console.error('OpenAI API Error:', error.message);
      if (error.response && error.response.status === 429) {
          return 'I am receiving too many requests. Please try again later.';
      }
      return 'Sorry, I am currently facing some issues. Please try again later.';
  }
}

client.on('message', (message) => {
  const whatsappNumber = message.from;

  runCompletion(whatsappNumber, message.body)
      .then((result) => {
          message.reply(result);
      })
      .catch((error) => {
          console.error('Error processing completion:', error.message);
          message.reply('Sorry, I faced an error processing your request.');
      });

  if (!localConversations.has(whatsappNumber)) {
    const newConversation = { history: [message.body], userName: null, prompt: null };
    localConversations.set(whatsappNumber, newConversation);
    
    axios.post('https://gt-7tqn.onrender.com/api/auth/store-sender-info', {
      whatsappNumber,
      userName: null,
      prompt: null
    }).then(() => {
      console.log('New user data added to the database');
    }).catch((error) => {
      console.error('Error adding new user data to the database:', error.message);
    });
  }
});

app.get('/', (req, res) => {
  if (qrCodeImage) {
    res.send(`<img src="${qrCodeImage}" alt="QR Code">`);
  } else {
    res.send('QR code image not available');
  }
});

const syncInterval = 5 * 60 * 1000; // 5 minutes
setInterval(async () => {
  try {
    const { data } = await axios.get('https://gt-7tqn.onrender.com/api/auth/getQas');
    const conversationsFromDB = data;
    conversationsFromDB.forEach((conversationFromDB) => {
      const { whatsappNumber, userName, prompt} = conversationFromDB;
      localConversations.set(whatsappNumber, { userName, prompt});
    });
    console.log('Local copy synced with the database');
  } catch (error) {
    console.error('Error syncing local copy with DB:', error.message);
  }
}, syncInterval);

const server = app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
