// background.js
chrome.runtime.onInstalled.addListener(() => {
  console.log("Extension installed!");
});

// Example: Listen for messages from the popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log("Message received in background:", request);
  // Process the message and optionally send a response
  // sendResponse({ status: "Message received" });
  return true; // Indicates that the response will be sent asynchronously
}); 