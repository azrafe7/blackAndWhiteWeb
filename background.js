"use strict";

let manifest = chrome.runtime.getManifest();
console.log(manifest.name + " v" + manifest.version);

const storage = chrome.storage.local;

function setBadgeText(enabled) {
  chrome.action.setBadgeText({text:enabled ? 'on' : ''});
}

// enable picker when clicking the browser action
chrome.action.onClicked.addListener(async (tab) => {
  console.log("[Black&WhiteWeb:BG] toggle");
  chrome.tabs.sendMessage(
    tab.id,
    {
      event: "toggle",
      data: null,
    },
    (response) => {
      let lastError = chrome.runtime.lastError;
      if (lastError) {
        console.warn('Whoops...', lastError.message);
      }
    }
  );
});

chrome.runtime.onMessage.addListener(async (msg, sender, sendResponse) => {
  const { event, data } = msg;
  console.log("[Black&WhiteWeb:BG] onMessage");
  console.log(msg, sender, sendResponse);
  console.log(sender.tab.id);
  if (event === 'request') {
    console.log('send back');
    chrome.tabs.sendMessage(
      sender.tab.id,
      {
        event: "send back",
        data: null,
      }
    );
  } else if (event === 'set_badge') {
    let enabled = data;
    console.log(event, data);
    setBadgeText(enabled);
  } else if (event === 'request_settings') {
    storage.get(null, function (items) {
      chrome.tabs.sendMessage(
        sender.tab.id,
        {
          event: "got_settings",
          data: items,
        }
      );
    });
  }
});

chrome.tabs.onActivated.addListener((activeInfo) => {
  setBadgeText(false);
  console.log("[Black&WhiteWeb:BG] activeInfo", activeInfo);
  chrome.tabs.sendMessage(
    activeInfo.tabId,
    {
      event: "check_if_enabled",
      data: null,
    },
    (response) => {
      let lastError = chrome.runtime.lastError;
      if (lastError) {
        console.warn('Whoops...', lastError.message);
      }
    }
  );
});

setBadgeText(false);
