import { GoogleGenAI, Type } from "@google/genai";

const getClient = () => {
    const apiKey = process.env.API_KEY;
    if (!apiKey) return null;
    return new GoogleGenAI({ apiKey });
};

export const generateSmartReplies = async (
    incomingMessage: string, 
    senderName: string, 
    recipientName: string
): Promise<string[]> => {
    const ai = getClient();
    if (!ai) return [];

    try {
        const prompt = `
            You are a helpful office assistant for an internal chat app.
            User '${senderName}' sent this message: "${incomingMessage}" to '${recipientName}'.
            Generate 3 short, professional, and context-aware quick replies in Italian that '${recipientName}' can send back.
            Strictly return a JSON array of strings.
            Examples: ["Ricevuto, grazie.", "Arrivo subito.", "Sono occupato, ti scrivo dopo."]
        `;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING }
                }
            }
        });

        if (response.text) {
            return JSON.parse(response.text) as string[];
        }
        return [];
    } catch (error) {
        console.error("Gemini Smart Reply Error:", error);
        return [];
    }
};