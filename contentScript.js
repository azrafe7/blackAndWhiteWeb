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

  function toggle(forceEnable) {
    if (forceEnable != null) {
      document.documentElement.classList.toggle('blackAndWhiteWeb', forceEnable);
    } else {
      document.documentElement.classList.toggle('blackAndWhiteWeb');
    }
    checkIfEnabled();
  }

  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    debug.log("[Black&WhiteWeb:CTX] onMessage", msg);
    const { event, data } = msg;

    if (event === "toggle") {
      let forceEnable = data;
      toggle(forceEnable);
    } else if (event === 'got_settings') {
      let settings = data;
      debug.log("[Black&WhiteWeb:CTX] settings", settings);
      if (settings.alwaysOn) {
        toggle(true);
      }
    } else if (event === 'check_if_enabled') {
      checkIfEnabled();
    }
  });
  
  function run() {
    chrome.runtime.sendMessage({
      event: 'request_settings',
      data: null
    });
    checkIfEnabled();
  }
  
  run();
  
})();
