const chat = document.getElementById("chat");
const input = document.getElementById("input");
const welcome = document.getElementById("welcome");

const messages = [];

async function sendMessage() {
  const text = input.value.trim();

  if (!text) return;

  welcome.style.display = "none";

  // Save user's message
  messages.push({
    role: "user",
    content: text,
  });

  // Show user's message
  const userMessage = document.createElement("div");
  userMessage.className = "message user";
  userMessage.textContent = text;
  chat.appendChild(userMessage);

  input.value = "";
  input.disabled = true;

  // Show thinking state
  const aiMessage = document.createElement("div");
  aiMessage.className = "message ai";
  aiMessage.textContent = "Thinking...";
  chat.appendChild(aiMessage);

  try {
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messages: messages,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Something went wrong");
    }

    const reply = data.reply || "I didn't receive a response.";

    // Save AURA's response
    messages.push({
      role: "model",
      content: reply,
    });

    aiMessage.textContent = reply;
  } catch (error) {
    console.error("AURA error:", error);

    // Remove the failed user message from memory
    messages.pop();

    aiMessage.textContent =
      "Sorry, AURA couldn't connect to her AI brain.";
  }

  input.disabled = false;
  input.focus();

  chat.scrollTop = chat.scrollHeight;
}

input.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    sendMessage();
  }
});
