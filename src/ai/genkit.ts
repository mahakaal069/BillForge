import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';

const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;

if (!GOOGLE_API_KEY) {
  throw new Error(
    'Please set the GOOGLE_API_KEY environment variable. ' +
    'You can get one from https://makersuite.google.com/app/apikey'
  );
}

interface ChatMessage {
  role: string;
  content: string;
}

const genAI = new GoogleGenerativeAI(GOOGLE_API_KEY);
const model = genAI.getGenerativeModel({
  model: 'gemini-2.0-flash',
  safetySettings: [
    {
      category: HarmCategory.HARM_CATEGORY_HARASSMENT,
      threshold: HarmBlockThreshold.BLOCK_NONE
    },
    {
      category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
      threshold: HarmBlockThreshold.BLOCK_NONE
    },
    {
      category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
      threshold: HarmBlockThreshold.BLOCK_NONE
    },
    {
      category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
      threshold: HarmBlockThreshold.BLOCK_NONE
    }
  ]
});

export const ai = {
  chat: {
    completions: {
      create: async ({ messages, temperature = 0.7, maxTokens }: { messages: ChatMessage[], temperature?: number, maxTokens?: number }) => {
        const chat = model.startChat({
          generationConfig: {
            temperature,
            maxOutputTokens: maxTokens,
          }
        });        // Send all messages in sequence
        let lastResponse;
        for (const msg of messages) {
          lastResponse = await chat.sendMessage(msg.content);
        }

        if (!lastResponse) {
          throw new Error('No response received from the model');
        }

        const result = await lastResponse.response;
        return {
          choices: [{
            message: {
              content: result.text()
            }
          }]
        };
      }
    }
  }
};


