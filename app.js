const express = require('express');
const qrcode = require('qrcode');
const { ethers, JsonRpcProvider } = require('ethers');
const  OpenAIApi = require('openai');
const axios = require('axios');
const MongoClient = require('mongodb').MongoClient;
const bodyParser = require('body-parser');
require('dotenv').config();
const app = express();

// Ethereum setup
const provider = new JsonRpcProvider(process.env.GOERLI_URL);
const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
const contractAddress = "0xB4726F977c1a46b571194161808cfF8f73980b02"; // Replace with your Healthcare contract address
const contractArtifact = require('./smContract/Healthcare.json'); // Replace with the correct ABI for your Healthcare contract
const contractABI = contractArtifact.abi;
const contract = new ethers.Contract(contractAddress, contractABI, wallet);

const questionsData = require('./smContract/Objective.json');
const pers = require('./smContract/Subjective.json');
const mongoClient = new MongoClient(process.env.MONGO_URI);

const checkFlagInterval = 15000;
app.use(bodyParser.json());
const cors = require("cors");
app.use(cors());
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "https://psychdoc.in");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept"
  );
  next();
});
app.use(express.json());

const openai = new OpenAIApi({ key: process.env.OPENAI_API_KEY });


// Function to check condition and trigger actions
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

      let introduction = `Assessment: ${entry.moduleName}. Key observations gathered from responses are as follows:`;
      let promptForDiagnosis = "Based on the above observations, please provide a concise diagnostic impression. Include a comment on the probable feelings or psychological states of the individual along with an estimated probability(in numeric percentage) of this diagnosis. Ensure this is formatted in an easy-to-understand manner for someone without a medical background.";
      let combinedString = `${introduction}\n\n${entry.dataArray.map((response, index) => `${question[index]}: ${response}`).join('\n')}\n\nFurther information based on additional data:\n${data1[0].dataArray.map((response, index) => `${questions[index]}: ${response}`).join('\n')}\n\n${promptForDiagnosis}`;
      
      console.log("Combined string:", combinedString);

      const completion = await openai.createCompletion({
        model: 'gpt-3.5-turbo-instruct',
        prompt: combinedString,
        max_tokens: 200,
      });

      console.log("OpenAI response:", completion.choices[0].text);

      const analysisResult = completion.choices[0].text;
      const whatsappNumber = entry.mobileNumber;
      const formattedPhoneNumber = `91${whatsappNumber}@c.us`;

      const updateResponse = await axios.put('https://mongodb-ttio.onrender.com/api/auth/pp', {
        _id: entry._id,
        newFlag: 'N'
      }, { timeout: 5000 });
      console.log("Database update response:", updateResponse.data);

      // Write result to MongoDB
      await mongoClient.connect();
      const db = mongoClient.db("yourDatabaseName");
      const results = db.collection("results");
      await results.insertOne({ formattedPhoneNumber, analysisResult, timestamp: new Date() });

      // ---- Blockchain Transaction ----
      try {
        const tx = await contract.BOOK_APPOINTMENT(
          "P-01", // Sample patientId
          "D-001", // Sample doctorId
          "09:00", // Sample from time
          "10:00", // Sample to time
          "2024-09-08", // Sample appointmentDate
          "General Checkup", // Sample condition
          "Looking forward to the consultation", // Sample message
          "0x9a59721F6BC4ac165ED5D23c06e328dd9AAe257a", // Sample doctor address
          "Renuka ier", // Sample patient name
          {
            value: ethers.utils.parseEther("0.0025") // Appointment fee
          }
        );
        await tx.wait();
        console.log('Blockchain transaction successful:', tx.hash);
      } catch (blockchainError) {
        console.error('Error in blockchain transaction:', blockchainError);
      }
    }
  } catch (error) {
    console.error('Error in checkFlagAndSendMessage:', error);
  } finally {
    await mongoClient.close();
  }
}

// Schedule the condition check to run every 15 seconds
setInterval(checkFlagAndSendMessage, checkFlagInterval);

// Start the server
const server = app.listen(process.env.PORT || 3002, () => {
  console.log(`Server is running on port ${server.address().port}`);
});
