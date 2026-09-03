const chat = document.getElementById("chat");
const input = document.getElementById("input");
const welcome = document.getElementById("welcome");
const newChatButton = document.getElementById("newChatButton");
const clearMemoryButton = document.getElementById("clearMemoryButton");
const STORAGE_KEY = "aura_conversation";
let messages = loadMessages();

function loadMessages() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch (error) {
    console.error("Could not load conversation:", error);
    return [];
  }
}

function saveMessages() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
}

function renderMessages() {
  chat.innerHTML = "";

  if (messages.length > 0) {
    welcome.style.display = "none";
  } else {
    welcome.style.display = "block";
  }

  messages.forEach((message) => {
    const messageElement = document.createElement("div");

    messageElement.className =
      message.role === "user"
        ? "message user"
        : "message ai";

    messageElement.textContent = message.content;
    chat.appendChild(messageElement);
  });

  chat.scrollTop = chat.scrollHeight;
}

async function sendMessage() {
  const text = input.value.trim();

  if (!text) return;

  welcome.style.display = "none";

  messages.push({
    role: "user",
    content: text,
  });

  saveMessages();
  renderMessages();

  input.value = "";
  input.disabled = true;

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

    messages.push({
      role: "model",
      content: reply,
    });

    saveMessages();

    aiMessage.textContent = reply;
  } catch (error) {
    console.error("AURA error:", error);

    messages.pop();
    saveMessages();

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

renderMessages();
newChatButton.addEventListener("click", () => {
  if (messages.length === 0) return;

  const confirmed = confirm(
    "Start a new conversation? Your current conversation will remain saved."
  );

  if (!confirmed) return;

  messages.length = 0;
  renderMessages();
  input.focus();
});

clearMemoryButton.addEventListener("click", () => {
  const confirmed = confirm(
    "Clear AURA's saved conversation from this browser?"
  );

  if (!confirmed) return;

  messages.length = 0;
  localStorage.removeItem(STORAGE_KEY);

  renderMessages();
  input.focus();
});
