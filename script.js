const chat = document.getElementById("chat");
const input = document.getElementById("input");
const welcome = document.getElementById("welcome");

const newChatButton = document.getElementById("newChatButton");
const clearMemoryButton = document.getElementById("clearMemoryButton");

const conversationList = document.getElementById("conversationList");
const historyPanel = document.querySelector(".history-panel");
const openHistoryButton = document.getElementById("openHistoryButton");
const closeHistoryButton = document.getElementById("closeHistoryButton");
const settingsButton = document.getElementById("settingsButton");
const settingsModal = document.getElementById("settingsModal");
const closeSettingsButton = document.getElementById("closeSettingsButton");
const settingsClearButton = document.getElementById("settingsClearButton");
const exportButton = document.getElementById("exportButton");
const importInput = document.getElementById("importInput");

const conversationCount = document.getElementById("conversationCount");
const storageSize = document.getElementById("storageSize");
const STORAGE_KEY = "aura_conversations";
const OLD_STORAGE_KEY = "aura_conversation";

let conversations = loadConversations();
let activeConversationId = null;
let isGenerating = false;

function createId() {
  return crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random()}`;
}

function createConversation() {
  return {
    id: createId(),
    title: "New Conversation",
    messages: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

function loadConversations() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);

    if (saved) {
      const parsed = JSON.parse(saved);

      if (Array.isArray(parsed)) {
        return parsed;
      }
    }

    // Migrate the previous single-chat memory
    const oldMessages = localStorage.getItem(OLD_STORAGE_KEY);

    if (oldMessages) {
      const messages = JSON.parse(oldMessages);

      if (Array.isArray(messages) && messages.length > 0) {
        const migrated = createConversation();
        migrated.messages = messages;
        migrated.title = getConversationTitle(messages);

        return [migrated];
      }
    }

    return [];
  } catch (error) {
    console.error("Could not load conversations:", error);
    return [];
  }
}

function saveConversations() {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(conversations)
  );

  updateMemoryStats();
}
function updateMemoryStats() {
  conversationCount.textContent = conversations.length;

  const savedData = localStorage.getItem(STORAGE_KEY) || "";
  const sizeInKB = new Blob([savedData]).size / 1024;

  storageSize.textContent =
    sizeInKB < 1
      ? `${Math.round(sizeInKB * 1024)} bytes`
      : `${sizeInKB.toFixed(1)} KB`;
}

function openSettings() {
  updateMemoryStats();

  settingsModal.classList.add("open");
  settingsModal.setAttribute("aria-hidden", "false");
}

function closeSettings() {
  settingsModal.classList.remove("open");
  settingsModal.setAttribute("aria-hidden", "true");
}

function exportConversations() {
  const backup = {
    app: "AURA",
    version: "0.4.4",
    exportedAt: new Date().toISOString(),
    conversations: conversations,
  };

  const blob = new Blob(
    [JSON.stringify(backup, null, 2)],
    { type: "application/json" }
  );

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = `aura-conversations-${Date.now()}.json`;
  link.click();

  URL.revokeObjectURL(url);
}

function importConversations(file) {
  const reader = new FileReader();

  reader.onload = () => {
    try {
      const backup = JSON.parse(reader.result);

      if (
        !backup ||
        !Array.isArray(backup.conversations)
      ) {
        throw new Error("Invalid backup format");
      }

      const validConversations = backup.conversations.filter(
        (conversation) =>
          conversation &&
          typeof conversation.id === "string" &&
          Array.isArray(conversation.messages)
      );

      if (validConversations.length === 0) {
        throw new Error("No valid conversations found");
      }

      const confirmed = confirm(
        "Importing will replace your current local conversations. Continue?"
      );

      if (!confirmed) return;

      conversations = validConversations;
      saveConversations();

      activeConversationId = conversations[0]?.id || null;

      renderConversationList();
      renderMessages();
      updateMemoryStats();

      alert("Conversations imported successfully.");
    } catch (error) {
      console.error("Import failed:", error);
      alert("This file is not a valid AURA backup.");
    }
  };

  reader.readAsText(file);
}

function getActiveConversation() {
  return conversations.find(
    (conversation) =>
      conversation.id === activeConversationId
  );
}

function getConversationTitle(messages) {
  const firstUserMessage = messages.find(
    (message) => message.role === "user"
  );

  if (!firstUserMessage) {
    return "New Conversation";
  }

  const title = firstUserMessage.content
    .replace(/\s+/g, " ")
    .trim();

  return title.length > 32
    ? `${title.slice(0, 32)}…`
    : title;
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

  html = html.replace(
    /\*\*(.*?)\*\*/g,
    "<strong>$1</strong>"
  );

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

  const conversation = getActiveConversation();
  const messages = conversation ? conversation.messages : [];

  welcome.style.display =
    messages.length > 0 ? "none" : "block";

  messages.forEach((message) => {
    chat.appendChild(createMessageElement(message));
  });

  chat.scrollTop = chat.scrollHeight;
}

function renderConversationList() {
  conversationList.innerHTML = "";

  if (conversations.length === 0) {
    conversationList.innerHTML = `
      <div class="history-empty">
        Your conversations will appear here.
      </div>
    `;
    return;
  }

  const sortedConversations = [...conversations].sort(
    (a, b) => b.updatedAt - a.updatedAt
  );

  sortedConversations.forEach((conversation) => {
    const item = document.createElement("div");
    item.className = "conversation-item";

    if (conversation.id === activeConversationId) {
      item.classList.add("active");
    }

    const title = document.createElement("span");
    title.className = "conversation-title";
    title.textContent = conversation.title;

    const deleteButton = document.createElement("button");
    deleteButton.className = "delete-conversation";
    deleteButton.textContent = "×";
    deleteButton.title = "Delete conversation";

    deleteButton.addEventListener("click", (event) => {
      event.stopPropagation();
      deleteConversation(conversation.id);
    });

    item.appendChild(title);
    item.appendChild(deleteButton);

    item.addEventListener("click", () => {
      switchConversation(conversation.id);
    });

    conversationList.appendChild(item);
  });
}

function startNewConversation() {
  const conversation = createConversation();

  conversations.push(conversation);
  activeConversationId = conversation.id;

  saveConversations();
  renderConversationList();
  renderMessages();

  input.focus();
}

function switchConversation(id) {
  if (isGenerating) return;

  activeConversationId = id;

  renderConversationList();
  renderMessages();

  historyPanel.classList.remove("open");
  input.focus();
}

function deleteConversation(id) {
  const conversation = conversations.find(
    (item) => item.id === id
  );

  if (!conversation) return;

  const confirmed = confirm(
    `Delete "${conversation.title}"?`
  );

  if (!confirmed) return;

  conversations = conversations.filter(
    (item) => item.id !== id
  );

  if (activeConversationId === id) {
    activeConversationId = null;

    if (conversations.length > 0) {
      const latest = [...conversations].sort(
        (a, b) => b.updatedAt - a.updatedAt
      )[0];

      activeConversationId = latest.id;
    }
  }

  saveConversations();
  renderConversationList();
  renderMessages();
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

    const typingDelay = text.length > 500 ? 4 : 12;

    await delay(typingDelay);
  }
}

async function requestAURA() {
  const conversation = getActiveConversation();

  const response = await fetch("/api/chat", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messages: conversation.messages,
      knowledge: getKnowledgeContext(),
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

  const conversation = getActiveConversation();

  if (!conversation) return;

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

    conversation.messages.push({
      role: "model",
      content: reply,
    });

    conversation.updatedAt = Date.now();

    saveConversations();
    renderConversationList();

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

    const regenerateButton = document.createElement("button");
    regenerateButton.className = "copy-button";
    regenerateButton.textContent = "Regenerate";

    regenerateButton.addEventListener(
      "click",
      regenerateLastResponse
    );

    actions.appendChild(copyButton);
    actions.appendChild(regenerateButton);

    typing.messageElement.appendChild(actions);

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

  let conversation = getActiveConversation();

  if (!conversation) {
    startNewConversation();
    conversation = getActiveConversation();
  }

  conversation.messages.push({
    role: "user",
    content: text,
  });

  conversation.title = getConversationTitle(
    conversation.messages
  );

  conversation.updatedAt = Date.now();

  saveConversations();
  renderConversationList();
  renderMessages();

  input.value = "";

  await generateResponse();
}

async function regenerateLastResponse() {
  if (isGenerating) return;

  const conversation = getActiveConversation();

  if (!conversation) return;

  const lastMessage =
    conversation.messages[conversation.messages.length - 1];

  if (!lastMessage || lastMessage.role !== "model") {
    return;
  }

  conversation.messages.pop();

  saveConversations();
  renderMessages();

  await generateResponse();
}

newChatButton.addEventListener("click", () => {
  if (isGenerating) return;

  startNewConversation();
});

clearMemoryButton.addEventListener("click", () => {
  const confirmed = confirm(
    "Delete ALL saved conversations from this browser?"
  );

  if (!confirmed) return;

  conversations = [];
  activeConversationId = null;

  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(OLD_STORAGE_KEY);

  renderConversationList();
  renderMessages();
  input.focus();
});

openHistoryButton.addEventListener("click", () => {
  historyPanel.classList.add("open");
});

closeHistoryButton.addEventListener("click", () => {
  historyPanel.classList.remove("open");
});

input.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    sendMessage();
  }
});

if (conversations.length > 0) {
  const latest = [...conversations].sort(
    (a, b) => b.updatedAt - a.updatedAt
  )[0];

  activeConversationId = latest.id;
}

renderConversationList();
renderMessages();
settingsButton.addEventListener("click", openSettings);

closeSettingsButton.addEventListener("click", closeSettings);

settingsModal.addEventListener("click", (event) => {
  if (event.target === settingsModal) {
    closeSettings();
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    closeSettings();
  }
});

exportButton.addEventListener("click", exportConversations);

importInput.addEventListener("change", (event) => {
  const file = event.target.files[0];

  if (file) {
    importConversations(file);
  }

  importInput.value = "";
});

settingsClearButton.addEventListener("click", () => {
  const confirmed = confirm(
    "Delete ALL conversations permanently from this browser?"
  );

  if (!confirmed) return;

  conversations = [];
  activeConversationId = null;

  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(OLD_STORAGE_KEY);

  renderConversationList();
  renderMessages();
  updateMemoryStats();
  closeSettings();
  input.focus();
});
