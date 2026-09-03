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

/*
  Escape HTML before applying formatting.
  This prevents AI responses from inserting unwanted HTML.
*/
function escapeHTML(text) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function formatMarkdown(text) {
  let html = escapeHTML(String(text));

  // Code blocks
  html = html.replace(
    /```([\s\S]*?)```/g,
    '<pre class="code-block"><code>$1</code></pre>'
  );

  // Inline code
  html = html.replace(
    /`([^`\n]+)`/g,
    '<code class="inline-code">$1</code>'
  );

  // Headings
  html = html.replace(
    /^### (.*)$/gm,
    "<h4>$1</h4>"
  );

  html = html.replace(
    /^## (.*)$/gm,
    "<h3>$1</h3>"
  );

  html = html.replace(
    /^# (.*)$/gm,
    "<h2>$1</h2>"
  );

  // Bold and italic
  html = html.replace(
    /\*\*(.*?)\*\*/g,
    "<strong>$1</strong>"
  );

  html = html.replace(
    /(?<!\*)\*([^*\n]+)\*(?!\*)/g,
    "<em>$1</em>"
  );

  // Unordered lists
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

  // Ordered lists
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

  // Paragraph line breaks
  html = html.replace(/\n/g, "<br>");

  // Avoid excessive breaks around block elements
  html = html.replace(/(<\/(?:h2|h3|h4|ul|ol|pre)>)<br>/g, "$1");
  html = html.replace(/<br>(<(?:h2|h3|h4|ul|ol|pre)>)/g, "$1");

  return html;
}

function createMessageElement(message, index) {
  const messageElement = document.createElement("div");

  messageElement.className =
    message.role === "user"
      ? "message user"
      : "message ai";

  if (message.role === "model") {
    const responseContent = document.createElement("div");
    responseContent.className = "response-content";
    responseContent.innerHTML = formatMarkdown(message.content);

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

    messageElement.appendChild(responseContent);
    messageElement.appendChild(copyButton);
  } else {
    messageElement.textContent = message.content;
  }

  return messageElement;
}

function renderMessages() {
  chat.innerHTML = "";

  if (messages.length > 0) {
    welcome.style.display = "none";
  } else {
    welcome.style.display = "block";
  }

  messages.forEach((message, index) => {
    chat.appendChild(createMessageElement(message, index));
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

    // Replace thinking state with formatted response
    aiMessage.remove();
    chat.appendChild(createMessageElement({
      role: "model",
      content: reply,
    }));

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
