const chat = document.getElementById("chat");
const input = document.getElementById("input");
const welcome = document.getElementById("welcome");

function sendMessage() {
  const text = input.value.trim();

  if (!text) return;

  welcome.style.display = "none";

  const userMessage = document.createElement("div");
  userMessage.className = "message user";
  userMessage.textContent = text;

  chat.appendChild(userMessage);

  input.value = "";

  const aiMessage = document.createElement("div");
  aiMessage.className = "message ai";
  aiMessage.textContent =
    "I'm AURA. My AI brain is not connected yet, but we're building it. 🤖";

  chat.appendChild(aiMessage);
}

input.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    sendMessage();
  }
});
