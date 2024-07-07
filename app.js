const express = require('express');
//const { Client } = require('whatsapp-web.js');
const qrcode = require('qrcode');
const { ethers, JsonRpcProvider } = require('ethers');
const { Configuration, OpenAIApi } = require('openai');
const axios = require('axios');
const MongoClient = require('mongodb').MongoClient;
const bodyParser = require('body-parser');
const cors = require('cors');
require('dotenv').config();
const app = express();
// Ethereum setup
const provider = new JsonRpcProvider(process.env.GOERLI_URL);
const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
const contractAddress = "0xB59f5DD1bC4BF95073C2CFF995b6025BC67b1C1F";
const contractABI = require('./smContract/chai.json');
//const questionnaire = require('./smContract/Subjective.json')
const contract = new ethers.Contract(contractAddress, contractABI, wallet);
const questionsData = require('./whatsappbot/Objective.json');
const pers = require('./whatsappbot/Subjective.json');
// const client = new Client();
let qrCodeImage = null;
const checkFlagInterval = 15000;
app.use(bodyParser.json());
app.use(cors());

const openai = new OpenAIApi(new Configuration({ apiKey: process.env.OPENAI_API_KEY }));
const mongoClient = new MongoClient(process.env.MONGO_URI);

// Endpoint to send OTP
app.post('/send-otp', async (req, res) => {
  const { phoneNumber } = req.body;
  const data = JSON.stringify({
    phoneNumber: phoneNumber,
    otpLength: 6,
    channel: "SMS",
    expiry: 60
  });

  const config = {
    method: 'post',
    headers: {
      'clientId': 'TCHLCA3Y5XIA19FU8PDIZBN50IKFUV2X',
      'clientSecret': 'd691vre5npjt6ie2kqvtgg2pbsrpkouz',
      'Content-Type': 'application/json'
    },
    url: 'https://auth.otpless.app/auth/otp/v1/send',
    data: data
  };

  try {
    const response = await axios.request(config);
    console.log(JSON.stringify(response.data));
    res.json({ success: true, message: 'OTP sent successfully', orderId: response.data.orderId });
  } catch (error) {
    console.error('Error sending OTP:', error);
    res.status(500).json({ success: false, message: 'Failed to send OTP' });
  }
});

// Endpoint to verify OTP
app.post('/verify-otp', async (req, res) => {
  const { phoneNumber, otp, orderId } = req.body;
  console.log(orderId)
  const data = JSON.stringify({
    orderId: orderId,
    otp: otp,
    phoneNumber: phoneNumber
  });

  const config = {
    method: 'post',
    headers: {
      'clientId': 'TCHLCA3Y5XIA19FU8PDIZBN50IKFUV2X',
      'clientSecret': 'd691vre5npjt6ie2kqvtgg2pbsrpkouz',
      'Content-Type': 'application/json'
    },
    url: 'https://auth.otpless.app/auth/otp/v1/verify',
    data: data
  };

  try {
    const response = await axios.request(config);
    console.log(JSON.stringify(response.data));
    if (response.data.isOTPVerified === true) {
      res.json({ success: true, message: 'OTP verified successfully' });
    } else {
      res.status(401).json({ success: false, message: 'OTP verification failed' });
    }
  } catch (error) {
    console.error('Error verifying OTP:', error);
    res.status(500).json({ success: false, message: 'Error verifying OTP' });
  }
});

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

// API endpoint to initiate a blockchain transaction
app.post('/buy-chai', async (req, res) => {
  const { name, data2, phoneNumber, moduleTestName, moduleName } = req.body;
  console.log(moduleName)
  try {
    // Perform blockchain transaction
    const tx = await contract.buyChai(name, data2, {
      value: ethers.parseEther("0.001")
    });
    await tx.wait();


    // function getQuestionsAsString(jsonObject, moduleName) {
    //   // Check if the module exists in the JSON object
    //   if (!jsonObject[moduleName]) {
    //     throw new Error(`No module found with the name ${moduleName}`);
    //   }

    //   // Get the array of questions for the module
    //   const questions = jsonObject[moduleName];

    //   // Convert the array of questions into a comma-separated string
    //   const questionsString = questions.join(', ');

    //   return questionsString;
    // }

    // const questionsString = getQuestionsAsString(questionnaire, moduleName);
    // console.log("Questions for", moduleName, ":", questionsString);

    // // Prepare data for OpenAI
    // const answers = data2.split(', ');
    // let intro = "Questions for" + "\n" + moduleName + "\n" + questionsString + "\n" + "As per" + "\n" + moduleTestName
    // let promptForDiagnosis = "Based on these observations, provide a concise diagnosis(5 lines of COMMENT on what they must be feeling and further action plan should be) with a probability percentage, formatted for easy comprehension by a non-medical user.";
    // let combinedString = intro + "\n" + "response" + data2 + "\n" + promptForDiagnosis;

    // // OpenAI processing
    // const openaiResponse = await openai.createCompletion({
    //   model: 'gpt-3.5-turbo-instruct',
    //   prompt: combinedString,
    //   max_tokens: 200
    // });

    // const analysisResult = openaiResponse.data.choices[0].text;
    // console.log("OpenAI response:", analysisResult);

    // Write result to MongoDB
    await mongoClient.connect();
    const db = mongoClient.db("yourDatabaseName");
    const results = db.collection("results");
    await results.insertOne({ phoneNumber, analysisResult, timestamp: new Date() });

    res.send({ success: true, message: 'Transaction and analysis successful', analysis: analysisResult, transactionId: tx.hash });
  } catch (error) {
    console.error('Error during processing:', error);
    res.status(500).send({ success: false, message: 'Processing failed', error: error.message });
  } finally {
    await mongoClient.close();
  }
});

async function checkFlagAndSendMessage() {
  try {
    console.log("Fetching data from API...");
    const { data } = await axios.get('https://mongodb-ttio.onrender.com/api/auth/pdh', { timeout: 5000 });
    console.log("Data received:", data);

    for (const entry of data) {
      const questions = questionsData[entry.moduleName];
      const question = pers[entry.moduleName];
      console.log("Processing entry:", entry);
      const response = await axios.get(`https://mongodb-ttio.onrender.com/api/auth/adh?PK=${entry.PK}`, { timeout: 5000 });
      console.log("hello", entry)
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

      const updateResponse = await axios.put('https://mongodb-ttio.onrender.com/api/auth/pp', {
        _id: entry._id,
        newFlag: 'N'
      }, { timeout: 5000 });
      console.log("Database update response:", updateResponse.data);

      //await client.sendMessage(formattedPhoneNumber, analysisResult);
      console.log("Message sent to:", formattedPhoneNumber);
      // Write result to MongoDB
      await mongoClient.connect();
      const db = mongoClient.db("yourDatabaseName");
      const results = db.collection("results");
      await results.insertOne({ formattedPhoneNumber, analysisResult, timestamp: new Date() });
    }
  } catch (error) {
    console.error('Error in checkFlagAndSendMessage:', error);
  }
}
// client.on('message', async (message) => {
//   try {
//     const whatsappNumber = message.from;
//     if (!localConversations.has(whatsappNumber)) {
//       const newConversation = { history: [message.body], userName: null, prompt: null };
//       localConversations.set(whatsappNumber, newConversation);

//       await axios.post('https://mongodb-ttio.onrender.com/api/auth/store-sender-info', {
//         whatsappNumber,
//         userName: null,
//         prompt: null,
//       }, {
//         timeout: 5000,
//       });

//       console.log('New user data added to the database');
//     }

//     const result = await runCompletion(whatsappNumber, message.body);
//     await message.reply(result);

//   } catch (error) {
//     console.error("User already exists:", error);
//   }
// });

// app.get('/', (req, res) => {
//   if (qrCodeImage) {
//     res.send(`<img src="${qrCodeImage}" alt="QR Code">`);
//   } else {
//     res.send('QR code image not available');
//   }
// });


// setInterval(syncWithDatabase, syncInterval);
setInterval(checkFlagAndSendMessage, checkFlagInterval);

// Start the server
const server = app.listen(process.env.PORT || 3002, () => {
  console.log(`Server is running on port ${server.address().port}`);
});


