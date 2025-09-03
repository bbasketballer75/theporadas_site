import axios from 'axios';

const OLLAMA_BASE_URL = 'http://localhost:11434/api';

export const generateCaption = async (imageDescription: string): Promise<string> => {
  try {
    const response = await axios.post(`${OLLAMA_BASE_URL}/generate`, {
      model: 'llama2:7b',
      prompt: `Generate a romantic caption for a wedding photo: ${imageDescription}`,
      stream: false,
    });
    return response.data.response;
  } catch (error) {
    console.error('Error generating caption:', error);
    return 'A beautiful moment captured.';
  }
};
