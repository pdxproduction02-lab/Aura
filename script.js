"use strict";

/* =========================================================
   AURA — FRONTEND APPLICATION
   ========================================================= */

/* -----------------------------
   DOM
----------------------------- */

const chat = document.getElementById("chat");
const input = document.getElementById("input");
const sendButton = document.getElementById("sendButton");
const welcome = document.getElementById("welcome");

const newChatButton =
  document.getElementById("newChatButton");

const clearMemoryButton =
  document.getElementById("clearMemoryButton");

const conversationList =
  document.getElementById("conversationList");

const historyPanel =
  document.querySelector(".history-panel");

const openHistoryButton =
  document.getElementById("openHistoryButton");

const closeHistoryButton =
  document.getElementById("closeHistoryButton");

const settingsButton =
  document.getElementById("settingsButton");

const settingsModal =
  document.getElementById("settingsModal");

const closeSettingsButton =
  document.getElementById("closeSettingsButton");

const settingsClearButton =
  document.getElementById("settingsClearButton");

const exportButton =
  document.getElementById("exportButton");

const importInput =
  document.getElementById("importInput");

const conversationCount =
  document.getElementById("conversationCount");

const storageSize =
  document.getElementById("storageSize");

const knowledgeInput =
  document.getElementById("knowledgeInput");

const knowledgeList =
  document.getElementById("knowledgeList");

const imageInput =
  document.getElementById("imageInput");

const imagePreview =
  document.getElementById("imagePreview");


/* -----------------------------
   STORAGE
----------------------------- */

const STORAGE_KEY = "aura_conversations";
const OLD_STORAGE_KEY = "aura_conversation";
const KNOWLEDGE_STORAGE_KEY = "aura_knowledge_v1";

const APP_VERSION = "0.5.0";


/* -----------------------------
   STATE
----------------------------- */

let conversations = loadConversations();
let knowledgeFiles = loadKnowledge();

let activeConversationId = null;

let selectedImage = null;

let isGenerating = false;


/* =========================================================
   UTILITIES
   ========================================================= */

function createId() {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random()
    .toString(36)
    .slice(2)}`;
}


function delay(milliseconds) {
  return new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });
}


function safeParse(value, fallback) {
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}


function escapeHTML(text) {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}


/* =========================================================
   CONVERSATIONS
   ========================================================= */

function createConversation() {
  const now = Date.now();

  return {
    id: createId(),
    title: "New Conversation",
    messages: [],
    createdAt: now,
    updatedAt: now,
  };
}


function normalizeMessage(message) {
  if (!message || typeof message !== "object") {
    return null;
  }

  const role =
    message.role === "user"
      ? "user"
      : message.role === "model"
        ? "model"
        : null;

  if (!role) {
    return null;
  }

  return {
    role,
    content: String(message.content || ""),
  };
}


function normalizeConversation(conversation) {
  if (!conversation || typeof conversation !== "object") {
    return null;
  }

  if (typeof conversation.id !== "string") {
    return null;
  }

  if (!Array.isArray(conversation.messages)) {
    return null;
  }

  const messages = conversation.messages
    .map(normalizeMessage)
    .filter(Boolean);

  const createdAt =
    Number(conversation.createdAt) || Date.now();

  const updatedAt =
    Number(conversation.updatedAt) || createdAt;

  return {
    id: conversation.id,
    title:
      typeof conversation.title === "string"
        ? conversation.title
        : getConversationTitle(messages),

    messages,

    createdAt,
    updatedAt,
  };
}


function loadConversations() {
  try {
    const saved =
      localStorage.getItem(STORAGE_KEY);

    if (saved) {
      const parsed = safeParse(saved, []);

      if (Array.isArray(parsed)) {
        return parsed
          .map(normalizeConversation)
          .filter(Boolean);
      }
    }


    /* Legacy migration */

    const oldMessages =
      localStorage.getItem(OLD_STORAGE_KEY);

    if (oldMessages) {
      const parsed =
        safeParse(oldMessages, []);

      if (
        Array.isArray(parsed) &&
        parsed.length > 0
      ) {
        const conversation =
          createConversation();

        conversation.messages = parsed
          .map(normalizeMessage)
          .filter(Boolean);

        conversation.title =
          getConversationTitle(
            conversation.messages
          );

        return [conversation];
      }
    }

    return [];
  } catch (error) {
    console.error(
      "AURA: Could not load conversations.",
      error
    );

    return [];
  }
}


function saveConversations() {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(conversations)
    );

    updateMemoryStats();
  } catch (error) {
    console.error(
      "AURA: Could not save conversations.",
      error
    );

    alert(
      "AURA couldn't save your conversation. Your browser storage may be full."
    );
  }
}


function getActiveConversation() {
  return conversations.find(
    (conversation) =>
      conversation.id === activeConversationId
  );
}


function getConversationTitle(messages) {
  const firstUserMessage =
    messages.find(
      (message) => message.role === "user"
    );

  if (!firstUserMessage) {
    return "New Conversation";
  }

  const title =
    String(firstUserMessage.content || "")
      .replace(/\s+/g, " ")
      .trim();

  if (!title) {
    return "New Conversation";
  }

  return title.length > 40
    ? `${title.slice(0, 40)}…`
    : title;
}


/* =========================================================
   MEMORY STATS
   ========================================================= */

function updateMemoryStats() {
  if (conversationCount) {
    conversationCount.textContent =
      conversations.length;
  }

  const conversationData =
    localStorage.getItem(STORAGE_KEY) || "";

  const knowledgeData =
    localStorage.getItem(
      KNOWLEDGE_STORAGE_KEY
    ) || "";

  const totalBytes =
    new Blob([
      conversationData,
      knowledgeData,
    ]).size;

  if (!storageSize) {
    return;
  }

  if (totalBytes < 1024) {
    storageSize.textContent =
      `${totalBytes} bytes`;
    return;
  }

  storageSize.textContent =
    `${(totalBytes / 1024).toFixed(1)} KB`;
}


/* =========================================================
   KNOWLEDGE SYSTEM
   ========================================================= */

function loadKnowledge() {
  try {
    const saved =
      localStorage.getItem(
        KNOWLEDGE_STORAGE_KEY
      );

    if (!saved) {
      return [];
    }

    const parsed = safeParse(saved, []);

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter(
      (file) =>
        file &&
        typeof file.id === "string" &&
        typeof file.name === "string" &&
        typeof file.content === "string"
    );
  } catch (error) {
    console.error(
      "AURA: Could not load knowledge.",
      error
    );

    return [];
  }
}


function saveKnowledge() {
  try {
    localStorage.setItem(
      KNOWLEDGE_STORAGE_KEY,
      JSON.stringify(knowledgeFiles)
    );

    updateMemoryStats();
  } catch (error) {
    console.error(
      "AURA: Could not save knowledge.",
      error
    );

    alert(
      "AURA couldn't save this knowledge file. It may be too large."
    );
  }
}


function getKnowledgeContext() {
  if (
    !Array.isArray(knowledgeFiles) ||
    knowledgeFiles.length === 0
  ) {
    return "";
  }

  return knowledgeFiles
    .map(
      (file) =>
        `FILE: ${file.name}\n${file.content}`
    )
    .join("\n\n--------------------\n\n");
}


function renderKnowledgeList() {
  knowledgeList.innerHTML = "";

  if (knowledgeFiles.length === 0) {
    const empty =
      document.createElement("div");

    empty.className = "knowledge-empty";

    empty.textContent =
      "No knowledge files added yet.";

    knowledgeList.appendChild(empty);

    return;
  }


  knowledgeFiles.forEach((file) => {
    const item =
      document.createElement("div");

    item.className = "knowledge-item";


    const name =
      document.createElement("span");

    name.className = "knowledge-name";

    name.textContent = file.name;


    const removeButton =
      document.createElement("button");

    removeButton.type = "button";
    removeButton.className =
      "knowledge-remove";

    removeButton.textContent = "×";
    removeButton.title =
      `Remove ${file.name}`;

    removeButton.addEventListener(
      "click",
      () => {
        removeKnowledge(file.id);
      }
    );


    item.appendChild(name);
    item.appendChild(removeButton);

    knowledgeList.appendChild(item);
  });
}


function addKnowledgeFile(file) {
  if (!file) {
    return;
  }

  if (
    file.type &&
    file.type !== "text/plain" &&
    !file.name.toLowerCase().endsWith(".txt")
  ) {
    alert(
      "AURA currently supports .txt knowledge files."
    );

    return;
  }

  if (file.size > 500 * 1024) {
    alert(
      "Please keep knowledge files below 500 KB."
    );

    return;
  }


  const reader =
    new FileReader();

  reader.onload = () => {
    const content =
      String(reader.result || "").trim();

    if (!content) {
      alert(
        "This knowledge file is empty."
      );

      return;
    }


    const existing =
      knowledgeFiles.find(
        (item) => item.name === file.name
      );

    const knowledgeObject = {
      id:
        existing?.id || createId(),

      name: file.name,

      content,

      updatedAt: Date.now(),
    };


    if (existing) {
      knowledgeFiles =
        knowledgeFiles.map(
          (item) =>
            item.id === existing.id
              ? knowledgeObject
              : item
        );
    } else {
      knowledgeFiles.push(
        knowledgeObject
      );
    }


    saveKnowledge();
    renderKnowledgeList();
  };


  reader.onerror = () => {
    alert(
      "AURA couldn't read that file."
    );
  };


  reader.readAsText(file);
}


function removeKnowledge(id) {
  const file =
    knowledgeFiles.find(
      (item) => item.id === id
    );

  if (!file) {
    return;
  }

  const confirmed =
    confirm(
      `Remove "${file.name}" from AURA's knowledge?`
    );

  if (!confirmed) {
    return;
  }

  knowledgeFiles =
    knowledgeFiles.filter(
      (item) => item.id !== id
    );

  saveKnowledge();
  renderKnowledgeList();
}


/* =========================================================
   MARKDOWN
   ========================================================= */

function formatMarkdown(text) {
  let html =
    escapeHTML(text);


  /* Code blocks */

  html = html.replace(
    /```(?:([a-zA-Z0-9_-]+)\n)?([\s\S]*?)```/g,
    (_, language, code) => {
      const languageLabel =
        language
          ? `<span class="code-language">${escapeHTML(language)}</span>`
          : "";

      return `
        <pre class="code-block">
          ${languageLabel}
          <code>${code.trim()}</code>
        </pre>
      `;
    }
  );


  /* Inline code */

  html = html.replace(
    /`([^`\n]+)`/g,
    '<code class="inline-code">$1</code>'
  );


  /* Headings */

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


  /* Bold */

  html = html.replace(
    /\*\*(.*?)\*\*/g,
    "<strong>$1</strong>"
  );


  /* Italic */

  html = html.replace(
    /(?<!\*)\*([^*\n]+)\*(?!\*)/g,
    "<em>$1</em>"
  );


  /* Unordered lists */

  html = html.replace(
    /^(?:[-*] .*(?:\n|$))+/gm,
    (block) => {
      const items =
        block
          .trim()
          .split("\n")
          .map(
            (line) =>
              line
                .replace(/^[-*]\s+/, "")
                .trim()
          )
          .filter(Boolean)
          .map(
            (item) =>
              `<li>${item}</li>`
          )
          .join("");

      return `<ul>${items}</ul>`;
    }
  );


  /* Ordered lists */

  html = html.replace(
    /^(?:\d+\.\s+.*(?:\n|$))+/gm,
    (block) => {
      const items =
        block
          .trim()
          .split("\n")
          .map(
            (line) =>
              line
                .replace(/^\d+\.\s+/, "")
                .trim()
          )
          .filter(Boolean)
          .map(
            (item) =>
              `<li>${item}</li>`
          )
          .join("");

      return `<ol>${items}</ol>`;
    }
  );


  /* Links */

  html = html.replace(
    /(https?:\/\/[^\s<]+)/g,
    '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>'
  );


  /* New lines */

  html =
    html.replace(/\n/g, "<br>");


  html =
    html.replace(
      /(<\/(?:h2|h3|h4|ul|ol|pre)>)<br>/g,
      "$1"
    );

  html =
    html.replace(
      /<br>(<(?:h2|h3|h4|ul|ol|pre)>)/g,
      "$1"
    );


  return html;
}


/* =========================================================
   MESSAGE UI
   ========================================================= */

function createCopyButton(content) {
  const button =
    document.createElement("button");

  button.type = "button";
  button.className =
    "copy-button";

  button.textContent =
    "Copy";


  button.addEventListener(
    "click",
    async () => {
      try {
        await navigator.clipboard.writeText(
          content
        );

        button.textContent =
          "Copied ✓";

        setTimeout(() => {
          button.textContent =
            "Copy";
        }, 1500);
      } catch {
        button.textContent =
          "Copy failed";

        setTimeout(() => {
          button.textContent =
            "Copy";
        }, 1500);
      }
    }
  );


  return button;
}


function createMessageElement(message) {
  const messageElement =
    document.createElement("div");

  messageElement.className =
    message.role === "user"
      ? "message user"
      : "message ai";


  if (message.role === "model") {
    const responseContent =
      document.createElement("div");

    responseContent.className =
      "response-content";

    responseContent.innerHTML =
      formatMarkdown(
        message.content
      );


    const actions =
      document.createElement("div");

    actions.className =
      "message-actions";


    actions.appendChild(
      createCopyButton(
        message.content
      )
    );


    messageElement.appendChild(
      responseContent
    );

    messageElement.appendChild(
      actions
    );

  } else {
    messageElement.textContent =
      message.content;
  }


  return messageElement;
}


function renderMessages() {
  chat.innerHTML = "";

  const conversation =
    getActiveConversation();

  const messages =
    conversation?.messages || [];


  welcome.style.display =
    messages.length > 0
      ? "none"
      : "";


  messages.forEach(
    (message) => {
      chat.appendChild(
        createMessageElement(
          message
        )
      );
    }
  );


  scrollChatToBottom();
}


function scrollChatToBottom() {
  requestAnimationFrame(() => {
    chat.scrollTop =
      chat.scrollHeight;
  });
}


/* =========================================================
   CONVERSATION LIST
   ========================================================= */

function renderConversationList() {
  conversationList.innerHTML = "";


  if (conversations.length === 0) {
    const empty =
      document.createElement("div");

    empty.className =
      "history-empty";

    empty.textContent =
      "Your conversations will appear here.";

    conversationList.appendChild(
      empty
    );

    return;
  }


  const sorted =
    [...conversations].sort(
      (a, b) =>
        b.updatedAt -
        a.updatedAt
    );


  sorted.forEach(
    (conversation) => {
      const item =
        document.createElement("div");

      item.className =
        "conversation-item";


      if (
        conversation.id ===
        activeConversationId
      ) {
        item.classList.add(
          "active"
        );
      }


      const title =
        document.createElement("span");

      title.className =
        "conversation-title";

      title.textContent =
        conversation.title;


      const deleteButton =
        document.createElement("button");

      deleteButton.type = "button";

      deleteButton.className =
        "delete-conversation";

      deleteButton.textContent =
        "×";

      deleteButton.title =
        "Delete conversation";


      deleteButton.addEventListener(
        "click",
        (event) => {
          event.stopPropagation();

          deleteConversation(
            conversation.id
          );
        }
      );


      item.appendChild(title);
      item.appendChild(
        deleteButton
      );


      item.addEventListener(
        "click",
        () => {
          switchConversation(
            conversation.id
          );
        }
      );


      conversationList.appendChild(
        item
      );
    }
  );
}


/* =========================================================
   CONVERSATION ACTIONS
   ========================================================= */

function startNewConversation() {
  if (isGenerating) {
    return;
  }


  const conversation =
    createConversation();


  conversations.push(
    conversation
  );

  activeConversationId =
    conversation.id;


  saveConversations();

  renderConversationList();
  renderMessages();

  closeHistory();

  input.focus();
}


function switchConversation(id) {
  if (isGenerating) {
    return;
  }


  const exists =
    conversations.some(
      (conversation) =>
        conversation.id === id
    );

  if (!exists) {
    return;
  }


  activeConversationId =
    id;


  renderConversationList();
  renderMessages();

  closeHistory();

  input.focus();
}


function deleteConversation(id) {
  const conversation =
    conversations.find(
      (item) =>
        item.id === id
    );

  if (!conversation) {
    return;
  }


  const confirmed =
    confirm(
      `Delete "${conversation.title}"?`
    );

  if (!confirmed) {
    return;
  }


  conversations =
    conversations.filter(
      (item) =>
        item.id !== id
    );


  if (
    activeConversationId === id
  ) {
    const latest =
      [...conversations].sort(
        (a, b) =>
          b.updatedAt -
          a.updatedAt
      )[0];

    activeConversationId =
      latest?.id || null;
  }


  saveConversations();

  renderConversationList();
  renderMessages();
}


/* =========================================================
   THINKING / TYPING
   ========================================================= */

function createThinkingElement() {
  const thinking =
    document.createElement("div");

  thinking.className =
    "message ai thinking-message";

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
  const messageElement =
    document.createElement("div");

  messageElement.className =
    "message ai";
