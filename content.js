// Content script
// Watches text fields, asks the background script for a suggestion,
// and shows the suggestion as gray ghost text

const DEBOUNCE_MS = 400;

let extensionEnabled = true;
let debounceTimer = null;
let activeField = null;
let currentSuggestion = "";
let overlay = null;
let requestId = 0;

// Load the enabled/disabled state
chrome.storage.local.get(["enabled"], (result) => {
  extensionEnabled = result.enabled !== false; // default true
});

// React to the toggle changing in the popup
chrome.storage.onChanged.addListener((changes) => {
  if (changes.enabled) {
    extensionEnabled = changes.enabled.newValue !== false;
    if (!extensionEnabled) {
      clearSuggestion();
    }
  }
});

// Check if the field is something we should autocomplete
function isSupportedField(el) {
  if (!el) return false;
  const tag = el.tagName;

  if (tag === "TEXTAREA") return true;

  if (tag === "INPUT" && el.type === "text") return true;

  return false;
}

// Cursor must be at the end, with nothing selected, to show a suggestion
function isCursorAtEnd(el) {
  return el.selectionStart === el.selectionEnd && el.selectionStart === el.value.length;
}

// Listen for typing on the whole page
document.addEventListener("input", (event) => {
  if (!extensionEnabled) return;

  const el = event.target;
  if (!isSupportedField(el)) return;

  activeField = el;
  clearSuggestion();

  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    if (!isCursorAtEnd(el)) return; // cursor moved, do not request
    requestSuggestion(el);
  }, DEBOUNCE_MS);
});

// Remove the suggestion if the user clicks away or leaves the field
document.addEventListener(
  "blur",
  (event) => {
    if (event.target === activeField) {
      clearTimeout(debounceTimer);
      clearSuggestion();
    }
  },
  true
);

// Hide the suggestion if the cursor moves away from the end, or text gets selected
function handleCursorChange() {
  const el = activeField;
  if (!el) return;
  if (document.activeElement !== el) return;

  if (!isCursorAtEnd(el)) {
    clearTimeout(debounceTimer);
    clearSuggestion();
  }
}

document.addEventListener("click", handleCursorChange);
document.addEventListener("mouseup", handleCursorChange);
document.addEventListener("keyup", handleCursorChange);
document.addEventListener("selectionchange", handleCursorChange);

// Reposition the overlay if the page scrolls or resizes
window.addEventListener("scroll", () => {
  if (overlay && activeField) positionOverlay(activeField, overlay);
}, true);

window.addEventListener("resize", () => {
  if (overlay && activeField) positionOverlay(activeField, overlay);
});

// Accept the suggestion with TAB
document.addEventListener("keydown", (event) => {
  if (event.key !== "Tab") return;
  if (!currentSuggestion || event.target !== activeField) return;

  event.preventDefault();
  acceptSuggestion();
});

// Ask the background script for a suggestion
function requestSuggestion(el) {
  const text = el.value;
  if (!text || text.trim().length === 0) return;

  const thisRequestId = ++requestId;

  chrome.runtime.sendMessage({ action: "getSuggestion", text }, (response) => {
    // Ignore old responses if the user kept typing
    if (thisRequestId !== requestId) return;
    if (!response) return;

    if (response.error) {
      console.warn("AI Autocomplete: " + response.error);
      return;
    }

    if (response.suggestion && el === activeField && isCursorAtEnd(el)) {
      showSuggestion(el, response.suggestion);
    }
  });
}

// Show the gray ghost suggestion after the typed text
function showSuggestion(el, suggestion) {
  currentSuggestion = suggestion;

  if (!overlay) {
    overlay = document.createElement("div");
    overlay.className = "ai-autocomplete-overlay";
    document.body.appendChild(overlay);
  }

  copyStyles(el, overlay);
  positionOverlay(el, overlay);
  updateOverlayContent(el, overlay, suggestion);
}

// Insert the suggestion into the field, keeping undo (Ctrl+Z) working
function acceptSuggestion() {
  if (!activeField || !currentSuggestion) return;

  const el = activeField;
  const suggestion = currentSuggestion;
  const endPos = el.value.length;

  el.focus();
  el.setSelectionRange(endPos, endPos);

  let inserted = false;

  // Preferred: keeps the native undo stack intact
  if (document.execCommand) {
    try {
      inserted = document.execCommand("insertText", false, suggestion);
    } catch (err) {
      inserted = false;
    }
  }

  // Fallback for browsers where execCommand does not work
  if (!inserted) {
    if (typeof el.setRangeText === "function") {
      el.setRangeText(suggestion, endPos, endPos, "end");
    } else {
      el.value = el.value + suggestion;
      el.selectionStart = el.value.length;
      el.selectionEnd = el.value.length;
    }
    el.dispatchEvent(new InputEvent("input", { bubbles: true, data: suggestion, inputType: "insertText" }));
  }

  clearSuggestion();
}

// Remove the ghost text
function clearSuggestion() {
  currentSuggestion = "";
  requestId++; // cancel any pending suggestion request

  if (overlay) {
    overlay.remove();
    overlay = null;
  }
}

// Copy the font and spacing from the field so the overlay text lines up
function copyStyles(el, div) {
  const style = getComputedStyle(el);

  const propsToCopy = [
    "boxSizing",
    "fontFamily",
    "fontSize",
    "fontWeight",
    "fontStyle",
    "lineHeight",
    "letterSpacing",
    "textTransform",
    "textIndent",
    "paddingTop",
    "paddingRight",
    "paddingBottom",
    "paddingLeft",
    "borderTopWidth",
    "borderRightWidth",
    "borderBottomWidth",
    "borderLeftWidth"
  ];

  propsToCopy.forEach((prop) => {
    div.style[prop] = style[prop];
  });

  div.style.direction = style.direction;
  div.style.textAlign = style.textAlign;
  div.style.whiteSpace = el.tagName === "TEXTAREA" ? "pre-wrap" : "pre";
  div.style.wordWrap = "break-word";
}

// Position the overlay exactly on top of the field
function positionOverlay(el, div) {
  const rect = el.getBoundingClientRect();

  div.style.top = window.scrollY + rect.top + "px";
  div.style.left = window.scrollX + rect.left + "px";
  div.style.width = rect.width + "px";
  div.style.height = rect.height + "px";
}

// Fill the overlay with invisible typed text plus the gray suggestion
function updateOverlayContent(el, div, suggestion) {
  const typed = escapeHtml(el.value);
  const ghost = escapeHtml(suggestion);

  div.innerHTML = typed + '<span class="ai-autocomplete-ghost">' + ghost + "</span>";

  div.scrollTop = el.scrollTop;
  div.scrollLeft = el.scrollLeft;
}

// Basic HTML escaping so typed text cannot break the overlay markup
function escapeHtml(text) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
