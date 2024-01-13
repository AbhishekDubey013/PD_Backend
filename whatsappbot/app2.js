const { Configuration, OpenAIApi } = require('openai');

async function testOpenAIKey() {
    const configuration = new Configuration({
        apiKey: process.env.SECRET_KEY, // Ensure your API key is stored in the SECRET_KEY environment variable
    });

    const openai = new OpenAIApi(configuration);

    try {
        const response = await openai.createCompletion({
            model: "text-davinci-003", // Replace with your desired model
            prompt: "Translate the following English text to French: 'Hello, world!'", // Sample prompt
            max_tokens: 60,
        });

        console.log("API Response:", response.data.choices[0].text);
    } catch (error) {
        console.error("Error:", error);
    }
}

testOpenAIKey();
