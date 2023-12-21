const axios = require('axios');

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

module.exports = {
  syncWithDatabase,
  checkFlagAndSendMessage
};
