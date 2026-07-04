# AI Autocomplete Chrome Extension

AI Autocomplete is a Chrome extension that suggests text as you type in text boxes on any website. It works like autocomplete tools found in modern code editors, but for normal writing. Suggestions appear as gray "ghost text" right after your cursor, and you accept them with a single key press.

The extension uses the Gemini API to generate suggestions. You provide your own Gemini API key, and the extension uses it to ask Gemini to continue your sentence.

## Features

- Works on `textarea` and `input[type="text"]` fields on any website
- Waits 400 milliseconds after you stop typing before asking for a suggestion
- Shows the suggestion as inline gray ghost text, similar to Cursor
- Press Tab to accept the suggestion
- Suggestion disappears automatically when you keep typing
- Works with both left-to-right languages (like English) and right-to-left languages (like Arabic)
- Ignores password fields
- Matches the font, size, and scroll position of the text field
- Simple enable and disable switch in the popup
- Built with plain JavaScript, no build tools and no frameworks

## Folder Structure

```
ai-autocomplete-extension/
  manifest.json        Extension configuration (Manifest V3)
  background.js         Service worker that calls the Gemini API
  content.js             Script that runs on web pages and shows suggestions
  content.css            Styles for the ghost text overlay
  config.example.js     Template for your Gemini API key
  popup.html             Popup window shown when clicking the extension icon
  popup.js                Logic for the popup
  popup.css               Styles for the popup
  icons/                  Extension icons
  README.md               This file
  .gitignore              Files excluded from version control
```

## Installation

1. Download or clone this project folder to your computer.
2. Open Google Chrome and go to `chrome://extensions`.
3. Turn on "Developer mode" using the switch in the top right corner.
4. Click "Load unpacked".
5. Select the `ai-autocomplete-extension` folder.
6. The extension icon should now appear in your Chrome toolbar.

## How to Get a Gemini API Key

1. Go to [Google AI Studio](https://aistudio.google.com/).
2. Sign in with your Google account.
3. Open the API keys section.
4. Create a new API key.
5. Copy the key. You will need it in the next step.

## How to Run

1. In the project folder, find the file `config.example.js`.
2. Make a copy of it and rename the copy to `config.js`.
3. Open `config.js` and replace `YOUR_API_KEY` with your real Gemini API key:

```javascript
const GEMINI_API_KEY = "YOUR_API_KEY";
```

4. Save the file.
5. If the extension is already loaded in Chrome, click the refresh icon on the extension card at `chrome://extensions`.
6. Click the extension icon in the toolbar to open the popup and confirm the API status shows "Connected".
7. Go to any website with a text box and start typing. A gray suggestion should appear after you pause for a moment. Press Tab to accept it.

## How It Works

1. The content script (`content.js`) listens for typing inside `textarea` and `input[type="text"]` fields.
2. After you stop typing for 400 milliseconds, it sends the current text to the background script.
3. The background script (`background.js`) sends the text to the Gemini API and asks it to continue the sentence, returning only the missing part.
4. The content script receives the suggestion and draws it as gray text directly after your cursor, using an overlay element positioned exactly on top of the text field.
5. If you press Tab while a suggestion is visible, the suggestion is inserted into the field and the ghost text is removed.
6. If you keep typing instead, the old suggestion is cleared and the process starts again.
7. Text direction (left-to-right or right-to-left) is detected using `getComputedStyle(element).direction`, so the overlay text flows the same way as the field it sits on top of.

## Technologies

- JavaScript (no TypeScript)
- Chrome Extension Manifest V3
- Gemini API (`generateContent` endpoint)
- Plain HTML and CSS for the popup
- No React, no build tools, no bundlers

## Challenges

- Lining up the ghost text overlay with the real text field required copying font, padding, border, and scroll position exactly, since browsers do not allow colored inline suggestions inside native `input` and `textarea` elements.
- Supporting both left-to-right and right-to-left text meant relying on the browser's own text direction handling instead of manually calculating suggestion position.
- Keeping the code beginner-friendly while still handling debouncing, async API calls, and overlay positioning correctly took some careful trimming of extra features.

## Future Improvements

- Support `contenteditable` elements used by some rich text editors
- Add a way to change the debounce delay from the popup
- Add support for other AI providers
- Add keyboard shortcuts to cycle between multiple suggestions

## License

This project is free to use, modify, and share for educational purposes. No formal license file is included. You are responsible for your own use of the Gemini API and any costs associated with your API key.
