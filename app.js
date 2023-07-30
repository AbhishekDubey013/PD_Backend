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

// async function runCompletion(whatsappNumber, message) {
//   // Get the conversation history and context for the WhatsApp number
//   const conversation = conversations.get(whatsappNumber) || { history: [], context: '' };
  
//   // Store the latest message in the history and keep only the last 5 messages
//   conversation.history.push(message);
//   conversation.history = conversation.history.slice(-5);
  
//   const context = conversation.history.join('\n');

//   const completion = await openai.createCompletion({
//     model: 'text-davinci-003',
//     prompt: context,
//     max_tokens: 200,
//   });

//   // Update the conversation context for the WhatsApp number
//   conversation.context = completion.data.choices[0].text;
//   conversations.set(whatsappNumber, conversation);

//   // Send the chat data to the Redis service
//   try {
//     await axios.post('https://gt-7tqn.onrender.com/store-chat-data', {
//       whatsappNumber,
//       conversation,
//     });
//   } catch (error) {
//     console.error('Error sending chat data to Redis:', error.message);
//   }

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
// });

// app.get('/', (req, res) => {
//   if (qrCodeImage) {
//     res.send(`<img src="${qrCodeImage}" alt="QR Code">`);
//   } else {
//     res.send('QR code image not available');
//   }
// });

// const server = app.listen(port, () => {
//   console.log(`Server is running on http://localhost:${port}`);
// });


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

// async function runCompletion(whatsappNumber, message) {
//   // Get the conversation history and context for the WhatsApp number
//   const conversation = conversations.get(whatsappNumber) || { history: [], context: '' };

//   // Store the latest message in the history and keep only the last 5 messages
//   conversation.history.push(message);
//   conversation.history = conversation.history.slice(-5);

//   const context = conversation.history.join('\n');

//   const completion = await openai.createCompletion({
//     model: 'text-davinci-003',
//     prompt: context,
//     max_tokens: 200,
//   });

//   try {
//     const userName = "jkjk"; // Initialize userName to null
//     await axios.post('https://gt-7tqn.onrender.com/api/auth/store-sender-info', {
//       whatsappNumber,
//       userName,
//       conversation: conversation.history,
//     });
//   } catch (error) {
//     console.error('Error sending chat data to DB service:', error.message);
//   }

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
// });

// app.get('/', (req, res) => {
//   if (qrCodeImage) {
//     res.send(`<img src="${qrCodeImage}" alt="QR Code">`);
//   } else {
//     res.send('QR code image not available');
//   }
// });

// const server = app.listen(port, () => {
//   console.log(`Server is running on http://localhost:${port}`);
// });



//-----------------------------------------------------------------

const express = require('express');
const { Client } = require('whatsapp-web.js');
const qrcode = require('qrcode');
const { Configuration, OpenAIApi } = require('openai');
require('dotenv').config();
const axios = require('axios');

const app = express();
const port = process.env.PORT || 3002;

const client = new Client();
let qrCodeImage = null;
const conversations = new Map();

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

// Local map to keep a copy of WhatsApp numbers, names, and last 5 messages
const localConversations = new Map();

// Create a new API endpoint to receive messages
app.post('/receive-message', express.json(), (req, res) => {
  const { whatsappNumber, userName, message } = req.body;

  // Get the conversation for the WhatsApp number or initialize a new one
  const conversation = localConversations.get(whatsappNumber) || { history: [], userName: null };

  // Store the latest message in the history and keep only the last 5 messages
  conversation.history.push(message);
  conversation.history = conversation.history.slice(-5);

  // Update the conversation in the local map
  localConversations.set(whatsappNumber, { ...conversation, userName });

  res.sendStatus(200);
});

async function runCompletion(whatsappNumber, message) {
  // Get the conversation history and context for the WhatsApp number
  const conversation = localConversations.get(whatsappNumber) || { history: [], userName: null };

  // Store the latest message in the history and keep only the last 5 messages
  conversation.history.push(message);
  conversation.history = conversation.history.slice(-5);

  const context = conversation.history.join('\n');

  const completion = await openai.createCompletion({
    model: 'text-davinci-003',
    prompt: context,
    max_tokens: 200,
  });

  return completion.data.choices[0].text;
}

client.on('message', (message) => {
  console.log(message.from, message.body);

  // Get the WhatsApp number from the message
  const whatsappNumber = message.from;

  // Process the message and send the response
  runCompletion(whatsappNumber, message.body).then((result) => {
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

// Sync local copy with the database every hour
const syncInterval = 60 * 60 * 1000; // 1 hour
setInterval(async () => {
  try {
    for (const [whatsappNumber, conversation] of localConversations) {
      const { userName, history } = conversation;
      await axios.post('https://gt-7tqn.onrender.com/api/auth/store-sender-info', {
        whatsappNumber,
        userName,
        conversation: history,
      });
    }
    console.log('Local copy synced with the database');
  } catch (error) {
    console.error('Error syncing local copy with DB:', error.message);
  }
}, syncInterval);

// Start the server and initialize the WhatsApp client
const server = app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
