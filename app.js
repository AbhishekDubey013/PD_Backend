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

client.on('qr', async (qr) => {
  try {
    qrCodeImage = await qrcode.toDataURL(qr, { errorCorrectionLevel: 'L' });
  } catch (err) {
    console.error('QR code generation failed:', err);
  }
});

client.on('ready', () => {
  console.log('Client is ready');
});

client.initialize();

const configuration = new Configuration({
  apiKey: process.env.SECRET_KEY,
});
const openai = new OpenAIApi(configuration);

async function syncWithDatabase() {
  try {
    const { data } = await axios.get('https://gt-7tqn.onrender.com/api/auth/getQas', {
      timeout: 5000,
    });
    data.forEach(({ whatsappNumber, userName, prompt, history }) => {
      localConversations.set(whatsappNumber, { userName, prompt, history });
    });
    console.log('Local copy synced with the database');
  } catch (error) {
    console.error('Error syncing local copy with DB:', error);
  }
}

const localConversations = new Map();

syncWithDatabase().catch(err => {
  console.error('Initial sync failed:', err);
});


async function checkFlagAndSendMessage() {
  try {
    // Fetch data from database
    const { data } = await axios.get('https://gt-7tqn.onrender.com/api/auth/adh', {
      timeout: 5000,
    });
    console.log(data);
    // Loop through each entry to check the flag
    for (const entry of data) {
        const whatsappNumber = entry.mobileNumber;
        const formattedPhoneNumber = `91${whatsappNumber}@c.us`;
        console.log(entry.mobileNumber)


        // Update the flag in the database to 'N'
        await axios.put('https://gt-7tqn.onrender.com/api/auth/up', {
          _id: entry._id,
          newFlag: 'N'
        }, {
          timeout: 5000,
        });

        // Send the WhatsApp message
        await client.sendMessage(formattedPhoneNumber, 'Your data has been saved successfully!');
    }
  } catch (error) {
    console.error('Error in checkFlagAndSendMessage:', error);
  }
}


async function runCompletion(whatsappNumber, message) {
  try {
    let conversation = localConversations.get(whatsappNumber) || { history: [], userName: null, prompt: null };

    if (!Array.isArray(conversation.history)) {
      conversation.history = [];
      conversation.history.push(message);
    }

    const context = `about user, use this background to frame your response for a user: ${conversation.prompt}\n Chat history, last 5 chat messages for you to get context: ${conversation.history.join('\n')}\nlatest user message, latest message by user to which you are suppose to respond by also considering about user and chat history: ${message}`;
    const completion = await openai.createCompletion({
      model: 'text-davinci-003',
      prompt: context,
      max_tokens: 200,
    });

    conversation.history.push(message);
    conversation.history = conversation.history.slice(-5);
    localConversations.set(whatsappNumber, conversation);

    return completion.data.choices[0].text;

  } catch (err) {
    console.error("Error in runCompletion:", err);
    throw err;
  }
}

client.on('message', async (message) => {
  try {
    const whatsappNumber = message.from;
    if (!localConversations.has(whatsappNumber)) {
      const newConversation = { history: [message.body], userName: null, prompt: null };
      localConversations.set(whatsappNumber, newConversation);

      await axios.post('https://gt-7tqn.onrender.com/api/auth/store-sender-info', {
        whatsappNumber,
        userName: null,
        prompt: null,
      }, {
        timeout: 5000,
      });

      console.log('New user data added to the database');
    }

    const result = await runCompletion(whatsappNumber, message.body);
    await message.reply(result);

  } catch (error) {
    console.error("User already exists:", error);
  }
});

app.get('/', (req, res) => {
  if (qrCodeImage) {
    res.send(`<img src="${qrCodeImage}" alt="QR Code">`);
  } else {
    res.send('QR code image not available');
  }
});


setInterval(syncWithDatabase, syncInterval);
setInterval(checkFlagAndSendMessage, checkFlagInterval);


const server = app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});

