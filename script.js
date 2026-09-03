const chat = document.getElementById("chat");
const input = document.getElementById("input");
const welcome = document.getElementById("welcome");

const newChatButton = document.getElementById("newChatButton");
const clearMemoryButton = document.getElementById("clearMemoryButton");

const STORAGE_KEY = "aura_conversation";
let messages = loadMessages();
let isGenerating = false;

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

function escapeHTML(text) {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function formatMarkdown(text) {
  let html = escapeHTML(text);

  html = html.replace(
    /```([\s\S]*?)```/g,
    '<pre class="code-block"><code>$1</code></pre>'
  );

  html = html.replace(
    /`([^`\n]+)`/g,
    '<code class="inline-code">$1</code>'
  );

  html = html.replace(/^### (.*)$/gm, "<h4>$1</h4>");
  html = html.replace(/^## (.*)$/gm, "<h3>$1</h3>");
  html = html.replace(/^# (.*)$/gm, "<h2>$1</h2>");

  html = html.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");

  html = html.replace(
    /(?<!\*)\*([^*\n]+)\*(?!\*)/g,
    "<em>$1</em>"
  );

  html = html.replace(
    /^(?:[-*] .*(?:\n|$))+/gm,
    (block) => {
      const items = block
        .trim()
        .split("\n")
        .map((line) => line.replace(/^[-*] /, "").trim())
        .map((item) => `<li>${item}</li>`)
        .join("");

      return `<ul>${items}</ul>`;
    }
  );

  html = html.replace(
    /^(?:\d+\. .*(?:\n|$))+/gm,
    (block) => {
      const items = block
        .trim()
        .split("\n")
        .map((line) => line.replace(/^\d+\. /, "").trim())
        .map((item) => `<li>${item}</li>`)
        .join("");

      return `<ol>${items}</ol>`;
    }
  );

  html = html.replace(/\n/g, "<br>");
  html = html.replace(/(<\/(?:h2|h3|h4|ul|ol|pre)>)<br>/g, "$1");
  html = html.replace(/<br>(<(?:h2|h3|h4|ul|ol|pre)>)/g, "$1");

  return html;
}

function createMessageElement(message) {
  const messageElement = document.createElement("div");

  messageElement.className =
    message.role === "user"
      ? "message user"
      : "message ai";

  if (message.role === "model") {
    const responseContent = document.createElement("div");
    responseContent.className = "response-content";
    responseContent.innerHTML = formatMarkdown(message.content);

    const actions = document.createElement("div");
    actions.className = "message-actions";

    const copyButton = document.createElement("button");
    copyButton.className = "copy-button";
    copyButton.textContent = "Copy";

    copyButton.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(message.content);
        copyButton.textContent = "Copied ✓";

        setTimeout(() => {
          copyButton.textContent = "Copy";
        }, 1500);
      } catch (error) {
        console.error("Copy failed:", error);
        copyButton.textContent = "Copy failed";
      }
    });

    actions.appendChild(copyButton);

    messageElement.appendChild(responseContent);
    messageElement.appendChild(actions);
  } else {
    messageElement.textContent = message.content;
  }

  return messageElement;
}

function renderMessages() {
  chat.innerHTML = "";

  welcome.style.display =
    messages.length > 0 ? "none" : "block";

  messages.forEach((message) => {
    chat.appendChild(createMessageElement(message));
  });

  chat.scrollTop = chat.scrollHeight;
}

function createThinkingElement() {
  const thinking = document.createElement("div");

  thinking.className = "message ai thinking-message";

  thinking.innerHTML = `
    <span>AURA is thinking</span>
    <span class="thinking-dots">
      <span></span>
      <span></span>
      <span></span>
    </span>
  `;

  return thinking;
}

function createTypingElement() {
  const messageElement = document.createElement("div");
  messageElement.className = "message ai";

  const responseContent = document.createElement("div");
  responseContent.className = "response-content";

  messageElement.appendChild(responseContent);

  return {
    messageElement,
    responseContent,
  };
}

function delay(milliseconds) {
  return new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });
}

async function typeResponse(element, text) {
  let currentText = "";

  for (let index = 0; index < text.length; index++) {
    currentText += text[index];

    element.innerHTML = formatMarkdown(currentText);

    chat.scrollTop = chat.scrollHeight;

    // Faster typing for long responses
    const typingDelay = text.length > 500 ? 4 : 12;

    await delay(typingDelay);
  }
}

async function requestAURA() {
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

  return data.reply || "I didn't receive a response.";
}

async function generateResponse() {
  if (isGenerating) return;

  isGenerating = true;
  input.disabled = true;

  const thinkingElement = createThinkingElement();
  chat.appendChild(thinkingElement);
  chat.scrollTop = chat.scrollHeight;

  try {
    const reply = await requestAURA();

    thinkingElement.remove();

    const typing = createTypingElement();
    chat.appendChild(typing.messageElement);

    await typeResponse(typing.responseContent, reply);

    messages.push({
      role: "model",
      content: reply,
    });

    saveMessages();

    // Add Copy button after typing finishes
    const actions = document.createElement("div");
    actions.className = "message-actions";

    const copyButton = document.createElement("button");
    copyButton.className = "copy-button";
    copyButton.textContent = "Copy";

    copyButton.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(reply);
        copyButton.textContent = "Copied ✓";

        setTimeout(() => {
          copyButton.textContent = "Copy";
        }, 1500);
      } catch (error) {
        copyButton.textContent = "Copy failed";
      }
    });

    actions.appendChild(copyButton);
    typing.messageElement.appendChild(actions);

    // Add Regenerate button
    const regenerateButton = document.createElement("button");
    regenerateButton.className = "copy-button";
    regenerateButton.textContent = "Regenerate";

    regenerateButton.addEventListener("click", regenerateLastResponse);

    actions.appendChild(regenerateButton);

  } catch (error) {
    console.error("AURA error:", error);

    thinkingElement.remove();

    const errorElement = document.createElement("div");
    errorElement.className = "message ai";
    errorElement.textContent =
      "Sorry, AURA couldn't connect to her AI brain.";

    chat.appendChild(errorElement);
  }

  isGenerating = false;
  input.disabled = false;
  input.focus();
  chat.scrollTop = chat.scrollHeight;
}

async function sendMessage() {
  const text = input.value.trim();

  if (!text || isGenerating) return;

  welcome.style.display = "none";

  messages.push({
    role: "user",
    content: text,
  });

  saveMessages();
  renderMessages();

  input.value = "";

  await generateResponse();
}

async function regenerateLastResponse() {
  if (isGenerating) return;

  const lastMessage = messages[messages.length - 1];

  if (!lastMessage || lastMessage.role !== "model") {
    return;
  }

  // Remove the previous AI response
  messages.pop();
  saveMessages();
  renderMessages();

  await generateResponse();
}

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

input.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    sendMessage();
  }
});

renderMessages();
