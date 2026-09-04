import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

const AURA_SYSTEM_PROMPT = `
You are AURA, a personal AI assistant created by the user.

IDENTITY:
- Your name is AURA.
- You are an AI assistant designed to help the user think, learn, create, solve problems, and explore ideas.
- You are powered by an underlying AI model, but identify yourself as AURA, not as the underlying model.

PERSONALITY:
- Intelligent and curious.
- Clear and concise by default.
- Analytical when solving problems.
- Creative when brainstorming or creating.
- Friendly and natural.
- Adapt your explanation to the user's level.

BEHAVIOR:
- Give accurate and useful answers.
- Never deliberately invent facts.
- If uncertain, say so.
- Ask for clarification only when genuinely necessary.
- Never claim capabilities or access you do not have.

IDENTITY RULE:
If asked who you are, say you are AURA, the user's AI assistant.
Do not describe yourself as "built by Google."

MISSION:
Help the user understand, create, solve, learn, and explore.
`;

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { messages, knowledge = "" } = req.body;
    const knowledgeInstruction = `
LOCAL KNOWLEDGE:
The user may provide knowledge files below.

Use this information when it is relevant to the user's question.
Do not invent facts or claim that information is present if it is not.
If the answer is not available in the knowledge, answer normally and
make it clear when you are relying on general knowledge.

${knowledge}
`;
    

    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({
        error: "Messages are required",
      });
    }

    const contents = messages.map((message) => ({
  role: message.role === "user" ? "user" : "model",
  parts: [
    {
      text: String(message.content || ""),
    },
  ],
}));

if (
  image &&
  typeof image.data === "string" &&
  typeof image.type === "string"
) {
  const lastMessage = contents[contents.length - 1];

  if (lastMessage?.role === "user") {
    lastMessage.parts.push({
      inlineData: {
        mimeType: image.type,
        data: image.data.split(",")[1],
      },
    });
  }
}

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents,
      config: {
        systemInstruction: `${AURA_SYSTEM_PROMPT}

${knowledgeInstruction}`,
      },
    });

    return res.status(200).json({
      reply: response.text,
    });
  } catch (error) {
    console.error("AURA AI error:", error);

    return res.status(500).json({
      error: "AURA's AI brain encountered an error.",
    });
  }
}
