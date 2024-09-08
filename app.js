// const express = require('express');
// const qrcode = require('qrcode');
// const { ethers, JsonRpcProvider } = require('ethers');
// const  OpenAIApi = require('openai');
// const axios = require('axios');
// const MongoClient = require('mongodb').MongoClient;
// const bodyParser = require('body-parser');
// require('dotenv').config();
// const app = express();

// // Ethereum setup
// const provider = new JsonRpcProvider(process.env.GOERLI_URL);
// const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
// const contractAddress = "0xD93f22028D80eAE7bFBB803E2F783038c9D06D48"; // Replace with your Healthcare contract address
// const contractArtifact = require('./smContract/Healthcare.json'); // Replace with the correct ABI for your Healthcare contract
// const contractABI = contractArtifact.abi;
// const contract = new ethers.Contract(contractAddress, contractABI, wallet);

// const questionsData = require('./smContract/Objective.json');
// const pers = require('./smContract/Subjective.json');
// const mongoClient = new MongoClient(process.env.MONGO_URI);

// const checkFlagInterval = 15000;
// app.use(bodyParser.json());
// const cors = require("cors");
// app.use(cors());
// app.use((req, res, next) => {
//   res.setHeader("Access-Control-Allow-Origin", "https://psychdoc.in");
//   res.header(
//     "Access-Control-Allow-Headers",
//     "Origin, X-Requested-With, Content-Type, Accept"
//   );
//   next();
// });
// app.use(express.json());

// const openai = new OpenAIApi({ key: process.env.OPENAI_API_KEY });


// // Function to check condition and trigger actions
// async function checkFlagAndSendMessage() {
//   try {
//     console.log("Fetching data from API...");
//     const { data } = await axios.get('https://mongodb-ttio.onrender.com/api/auth/pdh', { timeout: 5000 });
//     console.log("Data received:", data);

//     for (const entry of data) {
//       const questions = questionsData[entry.moduleName];
//       const question = pers[entry.moduleName];
//       console.log("Processing entry:", entry);
//       const response = await axios.get(`https://mongodb-ttio.onrender.com/api/auth/adh?PK=${entry.PK}`, { timeout: 5000 });
//       console.log("hello", entry)
//       const data1 = response.data;
//       console.log("Data received:", data1);

//       let introduction = `Assessment: ${entry.moduleName}. Key observations gathered from responses are as follows:`;
//       let promptForDiagnosis = "Based on the above observations, please provide a concise diagnostic impression. Include a comment on the probable feelings or psychological states of the individual along with an estimated probability(in numeric percentage) of this diagnosis. Ensure this is formatted in an easy-to-understand manner for someone without a medical background.";
//       let combinedString = `${introduction}\n\n${entry.dataArray.map((response, index) => `${question[index]}: ${response}`).join('\n')}\n\nFurther information based on additional data:\n${data1[0].dataArray.map((response, index) => `${questions[index]}: ${response}`).join('\n')}\n\n${promptForDiagnosis}`;
      
//       console.log("Combined string:", combinedString);

//       const completion = await openai.completions.create({
//         model: 'gpt-3.5-turbo-instruct',
//         prompt: combinedString,
//         max_tokens: 200,
//       });

//       console.log("OpenAI response:", completion.choices[0].text);

//       const analysisResult = completion.choices[0].text;
//       const whatsappNumber = entry.mobileNumber;
//       const formattedPhoneNumber = `91${whatsappNumber}@c.us`;

//       const updateResponse = await axios.put('https://mongodb-ttio.onrender.com/api/auth/pp', {
//         _id: entry._id,
//         newFlag: 'N'
//       }, { timeout: 5000 });
//       console.log("Database update response:", updateResponse.data);

//       // Write result to MongoDB
//       await mongoClient.connect();
//       const db = mongoClient.db("yourDatabaseName");
//       const results = db.collection("results");
//       await results.insertOne({ formattedPhoneNumber, analysisResult, timestamp: new Date() });

//       // ---- Blockchain Transaction ----
//       try {
//         const tx = await contract.BOOK_APPOINTMENT(
//           "2", // Sample patientId
//           "1", // Sample doctorId
//           "09:00", // Sample from time
//           "10:00", // Sample to time
//           "2024-09-09", // Sample appointmentDate
//           "General Checkup", // Sample condition
//           "Looking forward to the consultation", // Sample message
//           "0x9a59721F6BC4ac165ED5D23c06e328dd9AAe257a", // Sample doctor address
//           "Raghu dev", // Sample patient name
//           {
//             value: ethers.parseEther("0.0025") // Appointment fee
//           }
//         );
//         await tx.wait();
//         console.log('Blockchain transaction successful:', tx.hash);
//       } catch (blockchainError) {
//         console.error('Error in blockchain transaction:', blockchainError);
//       }
//     }
//   } catch (error) {
//     console.error('Error in checkFlagAndSendMessage:', error);
//   } finally {
//     await mongoClient.close();
//   }
// }

// // Schedule the condition check to run every 15 seconds
// setInterval(checkFlagAndSendMessage, checkFlagInterval);

// // Start the server
// const server = app.listen(process.env.PORT || 3002, () => {
//   console.log(`Server is running on port ${server.address().port}`);
// });


import React, { useState, useEffect } from "react";
import { SignProtocolClient, SpMode, EvmChains } from "@ethsign/sp-sdk";
import { ethers } from "ethers"; // Import ethers to interact with the blockchain
import { useStateContext } from "../../../Context/index"; // Import context for COMPLETE_APPOINTMENT

const UpdateStatus = ({
  handleClick, // Existing handleClick function
  setUpdateCondition, // Function to close the modal
  conditionUpdate, // Patient's condition object (from parent)
  setConditionUpdate, // Function to update the patient's condition
  item, // Pass the appointment ID from AppointmentList
  contractAddress, // Pass the smart contract address
  contractABI, // Pass the smart contract ABI
}) => {
  const { COMPLETE_APPOINTMENT } = useStateContext(); // Get COMPLETE_APPOINTMENT from context
  const [client, setClient] = useState(null); // State to store SignProtocolClient instance
  const [schemaId] = useState("0x148"); // Use your actual Schema ID
  const [review, setReview] = useState(""); // State for AI response curation
  const [rating, setRating] = useState(""); // State for Rating AI response
  const [error, setError] = useState(""); // State to store errors
  const [attestationCreated, setAttestationCreated] = useState(false); // Track attestation creation
  const [attestationResult, setAttestationResult] = useState(null); // To store and display attestation result

  // Initialize SignProtocolClient only on the client side
  useEffect(() => {
    if (typeof window !== "undefined" && window.ethereum) {
      try {
        const clientInstance = new SignProtocolClient(SpMode.OnChain, {
          chain: EvmChains.Sepolia, // Correctly using Sepolia network
        });
        setClient(clientInstance); // Set the client instance
      } catch (err) {
        console.error("Error initializing SignProtocolClient:", err);
        setError("Failed to initialize the Sign Protocol Client.");
      }
    } else {
      setError("MetaMask or another Ethereum provider is not available.");
    }

    // Retrieve attestation result from localStorage on component mount
    const storedAttestationResult = localStorage.getItem("attestationResult");
    if (storedAttestationResult) {
      setAttestationResult(JSON.parse(storedAttestationResult));
    }
  }, []);

  // Function to handle the attestation creation and update the blockchain
  const handleCreateAttestation = async () => {
    try {
      // Ensure client is initialized
      if (!client) {
        console.error("SignProtocolClient is not initialized.");
        return;
      }

      // Trigger the existing handleClick logic (update condition logic)
      handleClick();

      // Step 1: Create the attestation
      const res = await client.createAttestation({
        schemaId: schemaId,
        data: {
          Review: review, // AI response curation
          Rating: rating, // Rating for the AI response
          Signer: "0x421E4e6b301679fe2B649ed4A6C60aeCBB8DD3a6", // Replace with actual signer address (Doctor's address)
        },
        indexingValue: "0x421E4e6b301679fe2B649ed4A6C60aeCBB8DD3a6".toLowerCase(), // Lowercase signer address
      });

      console.warn("Attestation Created:", res);
      const attestationId = res.id; // Capture the attestation ID
      setAttestationCreated(true); // Set attestation as created

      // Save the attestation result in localStorage
      localStorage.setItem("attestationResult", JSON.stringify(res));
      setAttestationResult(res); // Store the result in state

      // Step 2: Update Blockchain with Attestation ID and Condition
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const signer = provider.getSigner();
      const contract = new ethers.Contract(contractAddress, contractABI, signer);

      const tx = await contract.UPDATE_PATIENT_MEDICAL_HISTORY(
        item.patientId,              // Pass the patient ID
        conditionUpdate.message,     // Pass the updated condition
        attestationId                // Pass the attestation ID
      );
      await tx.wait(); // Wait for the transaction to be mined
      console.log("Blockchain updated with attestation ID and condition.");

      // Step 3: Complete the appointment
      if (item.appointmentID) {
        await COMPLETE_APPOINTMENT(item.appointmentID); // Complete appointment using appointmentID
        console.log(`Appointment ${item.appointmentID} completed successfully.`);
      } else {
        console.log(`No appointment ID`);
      }
    } catch (error) {
      console.error("Error creating attestation or completing appointment:", error);
      setError("Error creating attestation or updating blockchain.");
    }
  };

  return (
    <div className="">
      <div className="modal-dialog modal-dialog-centered">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">Update Patient Condition</h5>
            <button
              className="btn-close"
              onClick={() => setUpdateCondition(false)} // Close the modal
            />
          </div>
          <div className="modal-body">
            {error && <p style={{ color: "red" }}>{error}</p>}
            <div>
              {/* Textarea for Patient Condition */}
              <div className="mb-3">
                <textarea
                  className="form-control"
                  placeholder="Current patient conditions"
                  rows={4}
                  defaultValue={conditionUpdate.message} // Set the default value from conditionUpdate
                  onChange={(e) =>
                    setConditionUpdate({
                      ...conditionUpdate, // Spread the current condition state
                      message: e.target.value, // Update the message field
                    })
                  }
                />
              </div>

              {/* Textarea for AI Response Curation */}
              <div className="mb-3">
                <textarea
                  className="form-control"
                  placeholder="Curate AI response"
                  rows={4}
                  value={review}
                  onChange={(e) => setReview(e.target.value)} // Update AI response curation
                />
              </div>

              {/* Textarea for Rating AI Response */}
              <div className="mb-3">
                <textarea
                  className="form-control"
                  placeholder="Enter rating for AI response"
                  rows={1}
                  value={rating}
                  onChange={(e) => setRating(e.target.value)} // Update rating
                />
              </div>

              {/* Submit Button */}
              <button
                onClick={handleCreateAttestation} // Handle attestation creation and update blockchain
                className="btn btn-success btn-block"
              >
                Update Condition
              </button>

              {/* Confirmation Message for Attestation */}
              {attestationCreated && (
                <p style={{ color: "green", marginTop: "10px" }}>
                  Attestation successfully created.
                </p>
              )}

              {/* Display attestation result if available */}
              {attestationResult && (
                <div>
                  <h3>Attestation Result:</h3>
                  <pre>{JSON.stringify(attestationResult, null, 2)}</pre>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UpdateStatus;
