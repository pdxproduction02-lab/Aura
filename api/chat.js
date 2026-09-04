import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});


const AURA_SYSTEM_PROMPT = `
You are AURA, a personal AI assistant created by the user.

IDENTITY:
- Your name is AURA.
- You are a personal AI assistant.
- You help the user think, learn, create, solve problems, and explore ideas.
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
- Do not pretend to have access to information outside the conversation or provided knowledge.

IDENTITY RULE:
If asked who you are, say you are AURA, the user's AI assistant.
Do not describe yourself as "built by Google."

MISSION:
Help the user understand, create, solve, learn, and explore.
`;


function buildKnowledgeInstruction(
  knowledge
) {
  if (
    typeof knowledge !== "string" ||
    !knowledge.trim()
  ) {
    return `
LOCAL KNOWLEDGE:
No local knowledge files were provided.
`;
  }


  return `
LOCAL KNOWLEDGE:

The user may provide information from local
knowledge files below.

Use this information when it is relevant.

Do not invent facts or claim that information
exists in the knowledge if it does not.

If the answer is not available in the provided
knowledge, answer normally using your general
knowledge and make that distinction clear when
important.

${knowledge}
`;
}


function validateMessages(messages) {
  if (
    !Array.isArray(messages) ||
    messages.length === 0
  ) {
    return false;
  }


  return messages.every(
    (message) =>
      message &&
      (
        message.role === "user" ||
        message.role === "model"
      ) &&
      typeof message.content ===
        "string"
  );
}


export default async function handler(
  req,
  res
) {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method not allowed",
    });
  }


  try {
    const {
      messages,
      knowledge = "",
      image = null,
    } = req.body || {};


    if (
      !validateMessages(
        messages
      )
    ) {
      return res.status(400).json({
        error:
          "Messages are required.",
      });
    }


    const contents =
      messages.map(
        (message) => ({
          role:
            message.role ===
            "user"
              ? "user"
              : "model",

          parts: [
            {
              text:
                String(
                  message.content ||
                  ""
                ),
            },
          ],
        })
      );


    /*
     * Attach image to the final user message.
     */

    if (
      image &&
      typeof image.data ===
        "string" &&
      typeof image.type ===
        "string"
    ) {
      const lastMessage =
        contents[
          contents.length - 1
        ];


      if (
        lastMessage &&
        lastMessage.role ===
          "user"
      ) {
        const base64 =
          image.data.includes(",")
            ? image.data.split(",")[1]
            : image.data;


        lastMessage.parts.push({
          inlineData: {
            mimeType:
              image.type,

            data:
              base64,
          },
        });
      }
    }


    const response =
      await ai.models.generateContent(
        {
          model:
            "gemini-3.5-flash",

          contents,

          config: {
            systemInstruction:
              `${AURA_SYSTEM_PROMPT}

${buildKnowledgeInstruction(
  knowledge
)}`,
          },
        }
      );


    const reply =
      response?.text;


    if (
      typeof reply !== "string" ||
      !reply.trim()
    ) {
      throw new Error(
        "Gemini returned an empty response."
      );
    }


    return res.status(200).json({
      reply,
    });


  } catch (error) {
    console.error(
      "AURA AI error:",
      error
    );


    return res.status(500).json({
      error:
        "AURA's AI brain encountered an error.",
    });
  }
}
