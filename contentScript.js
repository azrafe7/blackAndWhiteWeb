"use strict";

(async () => {

  const CSS_FILTER = '--blackAndWhiteWeb-filter';
  const CSS_INVISIBLE = '--blackAndWhiteWeb-invisible';
  const CSS_TRANSITION_IN = '--blackAndWhiteWeb-filter-transition-in';
  const CSS_TRANSITION_OUT = '--blackAndWhiteWeb-filter-transition-out';

  const DEBUG = false;
  let debug = {
    log: DEBUG ? console.log.bind(console) : () => {} // log or NO_OP
  }

  let manifest = chrome.runtime.getManifest();
  console.log(manifest.name + " v" + manifest.version);

  let firstRun = true;
  debug.log("[Black&WhiteWeb:CTX] invisible HTML!");
  document.documentElement.classList.toggle(CSS_INVISIBLE, true);
  
  const storage = chrome.storage.local;
  let settings = await storage.get(null);
  applySettings(settings);

  let observer = null;

  const INVISIBLE_TIMEOUT = 5000;
  // restore visibility if settings is not populated within INVISIBLE_TIMEOUT
  setTimeout(() => {
    let settingsLoaded = settings && Object.keys(settings).length > 0;
    debug.log("[Black&WhiteWeb:CTX] settingsLoaded:", settingsLoaded);
    if (!settingsLoaded) {
      debug.log("[Black&WhiteWeb:CTX] timed out (" + INVISIBLE_TIMEOUT + "ms): restore HTML visibility!");
      document.documentElement.classList.toggle(CSS_INVISIBLE, false);
    }
  }, INVISIBLE_TIMEOUT);

  function checkIfEnabled(options) {
    let enabled = document.documentElement.classList.contains(CSS_FILTER);
    chrome.runtime.sendMessage({
      event: 'set_badge',
      data: enabled
    });
    if (settings?.animate && !(options?.skipAnimate)) {
      let transitionClass = enabled ? CSS_TRANSITION_IN : CSS_TRANSITION_OUT;
      debug.log("[Black&WhiteWeb:CTX] transitionClass", transitionClass, settings, { firstRun: firstRun });
      if (!firstRun || (firstRun && !(settings?.alwaysOn))) {
        document.documentElement.classList.toggle(CSS_TRANSITION_IN, enabled);
        document.documentElement.classList.toggle(CSS_TRANSITION_OUT, !enabled);
      } else {
        firstRun = false;
        debug.log("[Black&WhiteWeb:CTX] set firstRun to", { firstRun: firstRun });
        document.documentElement.classList.toggle(CSS_TRANSITION_OUT, !enabled);
      }
    }
    
    return enabled;
  }

  function toggle(forceEnable, options) {
    if (forceEnable != null) {
      document.documentElement.classList.toggle(CSS_FILTER, forceEnable);
    } else {
      document.documentElement.classList.toggle(CSS_FILTER);
    }
    checkIfEnabled(options);
  }

  function mustEnableFor(tabUrl) {
    let mustEnable = true;
    // check blackList
    if (settings.useBlackList) {
      mustEnable = true;
      for (let blackListUrl of settings.blackList) {
        blackListUrl = blackListUrl.trim();
        if (blackListUrl.length > 0 && tabUrl.indexOf(blackListUrl) >= 0) {
          debug.log(`[Black&WhiteWeb:CTX] in blackList (matched '${blackListUrl}')`)
          mustEnable = false;
          break;
        }
      }
    }
    // check whiteList
    if (settings.useWhiteList) {
      mustEnable = false;
      for (let whiteListUrl of settings.whiteList) {
        whiteListUrl = whiteListUrl.trim();
        if (whiteListUrl.length > 0 && tabUrl.indexOf(whiteListUrl) >= 0) {
          debug.log(`[Black&WhiteWeb:CTX] in whiteList (matched '${whiteListUrl}')`)
          mustEnable = true;
          break;
        }
      }
    }
    return mustEnable;
  }

  function applySettings(settings) {
    debug.log("[Black&WhiteWeb:CTX] visible HTML!");
    document.documentElement.classList.toggle(CSS_INVISIBLE, false);
    debug.log("[Black&WhiteWeb:CTX] settings", settings);
    if (settings.alwaysOn) {
      let mustEnable = mustEnableFor(window.location.href);
      toggle(mustEnable, { skipAnimate: true });
    }
  }

  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    debug.log("[Black&WhiteWeb:CTX] onMessage", msg);
    const { event, data } = msg;

    if (event === "toggle") {
      let forceEnable = data;
      observer.disconnect();
      toggle(forceEnable);
      observer.observe(document.documentElement, { attributes: true });
    } else if (event === 'got_settings') {
      settings = data;
      applySettings(settings);
    } else if (event === 'check_if_enabled') {
      checkIfEnabled();
    }
  });
  
  function mutationCallback(mutationsList) {
    for (let mutation of mutationsList) {
      if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
        const isEnabled = checkIfEnabled({ skipAnimate: true });
        const mustEnable = mustEnableFor(window.location.href);
        debug.log("[Black&WhiteWeb:CTX] classList ", Array.from(document.documentElement.classList), isEnabled, mustEnable);
        if (isEnabled != mustEnable) {
          debug.log("[Black&WhiteWeb:CTX] re-apply on class mutation", mutation);
          applySettings(settings);
        }
      }
    }
  }

  function run() {
    /*chrome.runtime.sendMessage({
      event: 'request_settings',
      data: null
    });*/
    // checkIfEnabled({ skipAnimate: true });
    observer = new MutationObserver(mutationCallback);
    observer.observe(document.documentElement, { attributes: true });
  }
  
  run();
  
})();
