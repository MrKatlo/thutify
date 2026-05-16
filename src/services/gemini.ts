import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function getTutorAssistance(prompt: string, context?: string) {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        systemInstruction: `You are a helpful assistant for a tutoring center. 
        Your goal is to help tutors prepare course materials and help students understand complex topics.
        Keep your advice concise, practical, and encouraging.
        Context: ${context || 'General tutoring support'}`
      },
    });

    return response.text;
  } catch (error) {
    console.error("Gemini API error:", error);
    return "I'm sorry, I'm having trouble connecting to my brain right now. Please try again later.";
  }
}
