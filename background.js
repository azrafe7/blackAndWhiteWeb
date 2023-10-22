"use strict";

let manifest = chrome.runtime.getManifest();
console.log(manifest.name + " v" + manifest.version);

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
    }
  );
});

chrome.runtime.onMessage.addListener(async (msg, sender, sendResponse) => {
  const { event, data } = msg;
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
  }
  else if (event === 'set_badge') {
    let enabled = data;
    console.log(event, data);
    setBadgeText(enabled);
  }
});

chrome.tabs.onActivated.addListener((activeInfo) => {
  setBadgeText(false);
  console.log(activeInfo);
  chrome.tabs.sendMessage(
    activeInfo.tabId,
    {
      event: "check_if_enabled",
      data: null,
    }
  );
});

setBadgeText(false);
