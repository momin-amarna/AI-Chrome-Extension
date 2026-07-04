// Background service worker
// Talks to the Gemini API and keeps the extension enabled/disabled state

// Try to load the API key from config.js
let apiKeyAvailable = false;

try {
  importScripts("config.js");
  if (typeof GEMINI_API_KEY !== "undefined" && GEMINI_API_KEY && GEMINI_API_KEY !== "YOUR_API_KEY") {
    apiKeyAvailable = true;
  }
} catch (err) {
  // config.js does not exist yet
  console.warn("config.js not found. Copy config.example.js to config.js and add your Gemini API key.");
}

const GEMINI_MODEL = "gemini-flash-latest";
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

// Ask Gemini to continue the given text
async function getCompletion(text) {
  if (!apiKeyAvailable) {
    throw new Error("Missing Gemini API key. Add it in config.js.");
  }

  const prompt =
    "Continue the following text naturally, as if the user kept typing. " +
    "Reply with ONLY the missing continuation. " +
    "Do not repeat the given text. Do not add quotes or explanations. " +
    "Keep it short, one sentence or less.\n\n" +
    "Text: " + text;

  const response = await fetch(GEMINI_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": GEMINI_API_KEY
    },
    body: JSON.stringify({
      contents: [
        {
          parts: [{ text: prompt }]
        }
      ]
    })
  });

  if (!response.ok) {
    throw new Error("Gemini API request failed with status " + response.status);
  }

  const data = await response.json();
  const suggestion = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";

  return suggestion.trim();
}

// Listen for messages from the content script and popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "getSuggestion") {
    getCompletion(message.text)
      .then((suggestion) => sendResponse({ suggestion }))
      .catch((err) => sendResponse({ error: err.message }));
    return true; // keep the message channel open for async response
  }

  if (message.action === "getStatus") {
    sendResponse({ apiKeyAvailable });
    return true;
  }
});
