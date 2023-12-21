const openai = require('../config/openai');
const { localConversations } = require('../models/conversation');

async function runCompletion(whatsappNumber, message) {
  // Your logic
  const conversation = localConversations.get(whatsappNumber) || { history: [], userName: null, prompt: null };
  const context = message;
  const completion = await openai.createCompletion({ model: 'text-davinci-003', prompt: context, max_tokens: 200 });
  
  // Update localConversations Map
  conversation.history.push(message);
  conversation.history = conversation.history.slice(-5);
  localConversations.set(whatsappNumber, conversation);

  return completion.data.choices[0].text;
}

module.exports = {
  runCompletion,
};
