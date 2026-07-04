// Popup script
// Shows the enable/disable switch and the API key status

const toggle = document.getElementById("enabledToggle");
const statusEl = document.getElementById("apiStatus");

// Load the saved enabled state
chrome.storage.local.get(["enabled"], (result) => {
  toggle.checked = result.enabled !== false; // default true
});

// Save the new state when the user flips the switch
toggle.addEventListener("change", () => {
  chrome.storage.local.set({ enabled: toggle.checked });
});

// Ask the background script if the Gemini API key is set
chrome.runtime.sendMessage({ action: "getStatus" }, (response) => {
  if (!response) {
    statusEl.textContent = "Unknown";
    return;
  }

  if (response.apiKeyAvailable) {
    statusEl.textContent = "Connected";
    statusEl.classList.add("ok");
  } else {
    statusEl.textContent = "No API key";
    statusEl.classList.add("error");
  }
});
