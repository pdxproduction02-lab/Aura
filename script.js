const chat = document.getElementById("chat");
const input = document.getElementById("input");
const welcome = document.getElementById("welcome");

async function sendMessage() {
  const text = input.value.trim();

  if (!text) return;

  welcome.style.display = "none";

  // Show user's message
  const userMessage = document.createElement("div");
  userMessage.className = "message user";
  userMessage.textContent = text;
  chat.appendChild(userMessage);

  input.value = "";

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
        message: text,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Something went wrong");
    }

    aiMessage.textContent = data.reply || "I didn't receive a response.";
  } catch (error) {
    console.error(error);
    aiMessage.textContent =
      "Sorry, AURA couldn't connect to her AI brain.";
  }

  chat.scrollTop = chat.scrollHeight;
}

input.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    sendMessage();
  }
});
