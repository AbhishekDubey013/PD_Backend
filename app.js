const express = require('express');
const { Client } = require('whatsapp-web.js');
const qrcode = require('qrcode');
const PDFDocument = require('pdfkit');
const { Readable } = require('stream');
const { Configuration, OpenAIApi } = require('openai');
const axios = require('axios');
require('dotenv').config();
const syncInterval = 10000; // 10 seconds
const checkFlagInterval = 15000; // 15 seconds
const app = express();
const port = process.env.PORT || 3002;
const client = new Client();
let qrCodeImage = null;
const questionsData = require('./whatsappbot/Objective.json');
const pers = require('./whatsappbot/Subjective.json');
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

// async function syncWithDatabase() {
//   try {
//     const { data } = await axios.get('https://gt-7tqn.onrender.com/api/auth/getQas', {
//       timeout: 5000,
//     });
//     data.forEach(({ whatsappNumber, userName, prompt, history }) => {
//       localConversations.set(whatsappNumber, { userName, prompt, history });
//     });
//     console.log('Local copy synced with the database');
//   } catch (error) {
//     console.error('Error syncing local copy with DB:', error);
//   }
// }

// const localConversations = new Map();

// syncWithDatabase().catch(err => {
//   console.error('Initial sync failed:', err);
// });


async function checkFlagAndSendMessage() {
  try {
    console.log("Fetching data from API...");
    const { data } = await axios.get('https://gt-7tqn.onrender.com/api/auth/pdh', { timeout: 5000 });
    console.log("Data received:", data);

    for (const entry of data) {
      const questions = questionsData[entry.moduleName];
      const question = pers[entry.moduleName];
      console.log("Processing entry:", entry);
      const response = await axios.get(`https://gt-7tqn.onrender.com/api/auth/adh?PK=${entry.PK}`, { timeout: 5000 });
      console.log("hello",entry)
      const data1 = response.data;
      console.log("Data received:", data1);
      let introduction = `Assessment: ${entry.moduleName}. Key observations: `;
      let promptForDiagnosis = "Based on these observations, provide a concise diagnosis(2 lines of COMMENT on what they should do) with a probability percentage, formatted for easy comprehension by a non-medical user.";
      let combinedString = introduction + "\n\n" + entry.dataArray.map((response, index) => `${question[index]}: ${response}`).join('\n') + "\n" + data1[0].dataArray.map((response, index) => `${questions[index]}: ${response}`).join('\n') + promptForDiagnosis;      

      console.log("Combined string:", combinedString);
      
      const completion = await openai.createCompletion({
        model: 'gpt-3.5-turbo-instruct',
        prompt: combinedString,
        max_tokens: 200,
      });

      console.log("OpenAI response:", completion.data.choices[0].text);
      
      const analysisResult = completion.data.choices[0].text;
      const whatsappNumber = entry.mobileNumber;
      const formattedPhoneNumber = `91${whatsappNumber}@c.us`;
      
      const updateResponse = await axios.put('https://gt-7tqn.onrender.com/api/auth/pp', {
        _id: entry._id,
        newFlag: 'N'
      }, { timeout: 5000 });
      console.log("Database update response:", updateResponse.data);

      await client.sendMessage(formattedPhoneNumber, analysisResult);
      console.log("Message sent to:", formattedPhoneNumber);
    }
  } catch (error) {
    console.error('Error in checkFlagAndSendMessage:', error);
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


// setInterval(syncWithDatabase, syncInterval);
setInterval(checkFlagAndSendMessage, checkFlagInterval);


const server = app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});


