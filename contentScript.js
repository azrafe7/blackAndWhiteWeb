"use strict";

(async () => {

  const CSS_FILTER = '--blackAndWhiteWeb-filter';
  const CSS_INVISIBLE = '--blackAndWhiteWeb-invisible';
  const CSS_HIDE = '--blackAndWhiteWeb-hide';
  const CSS_TRANSITION_IN = '--blackAndWhiteWeb-filter-transition-in';
  const CSS_TRANSITION_OUT = '--blackAndWhiteWeb-filter-transition-out';

  const DEBUG = true;
  let debug = {
    log: DEBUG ? console.log.bind(console) : () => {} // log or NO_OP
  }

  let manifest = chrome.runtime.getManifest();
  console.log(manifest.name + " v" + manifest.version);

  let settings = {};
  let firstRun = true;
  debug.log("[Black&WhiteWeb:CTX] invisible HTML!");
  document.documentElement.classList.toggle(CSS_INVISIBLE, true);

  function checkIfEnabled() {
    let enabled = document.documentElement.classList.contains(CSS_FILTER);
    if (settings?.animate) {
      let transitionClass = enabled ? CSS_TRANSITION_IN : CSS_TRANSITION_OUT;
      debug.log("[Black&WhiteWeb:CTX] transitionClass", transitionClass, settings, { firstRun: firstRun });
      if (!firstRun || (firstRun && !settings?.alwaysOn)) {
        document.documentElement.classList.toggle(CSS_TRANSITION_IN, enabled);
      } else {
        firstRun = false;
      }
      document.documentElement.classList.toggle(CSS_TRANSITION_OUT, !enabled);
    }
    chrome.runtime.sendMessage({
      event: 'set_badge',
      data: enabled
    });
  }

  function toggle(forceEnable) {
    if (forceEnable != null) {
      document.documentElement.classList.toggle(CSS_FILTER, forceEnable);
    } else {
      document.documentElement.classList.toggle(CSS_FILTER);
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
      debug.log("[Black&WhiteWeb:CTX] visible HTML!");
      document.documentElement.classList.toggle(CSS_INVISIBLE, false);
      settings = data;
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
