"use strict";

(async () => {

  const DEBUG = false;
  let debug = {
    log: DEBUG ? console.log.bind(console) : () => {} // log or NO_OP
  }

  let manifest = chrome.runtime.getManifest();
  console.log(manifest.name + " v" + manifest.version);

  function checkIfEnabled() {
    let enabled = document.documentElement.classList.contains('blackAndWhiteWeb');
    chrome.runtime.sendMessage({
      event: 'set_badge',
      data: enabled
    });
  }

  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    debug.log("[Black&WhiteWeb:CTX]", msg);
    const { event, data } = msg;

    if (event === "toggle") {
      document.documentElement.classList.toggle('blackAndWhiteWeb');
      checkIfEnabled();
    } else if (event === 'check_if_enabled') {
      checkIfEnabled();
    }
  });
  
  checkIfEnabled();
  
})();
