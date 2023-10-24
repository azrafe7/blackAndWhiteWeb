"use strict";

let manifest = chrome.runtime.getManifest();
console.log(manifest.name + " v" + manifest.version);

// store options in the "local" storage area
const storage = chrome.storage.local;

// get the DOM controls
const resetButton = document.querySelector('button.reset');
const submitButton = document.querySelector('button.submit');
const versionSpan = document.querySelector('#version');
versionSpan.innerText = "v" + manifest.version;
const alwaysOnCheckBox = document.querySelector('#always_on');
const animateCheckBox = document.querySelector('#animate');

// load options that may have previously been saved.
loadChanges();

submitButton.addEventListener('click', saveChanges);
resetButton.addEventListener('click', reset);

async function saveChanges() {
  const alwaysOn = alwaysOnCheckBox.checked;
  const animate = animateCheckBox.checked;
  await storage.set({ 
    alwaysOn: alwaysOn,
    animate: animate,
  });
  message('Settings saved... Reload pages for changes to take effect!');
}

function loadChanges() {
  storage.get(['alwaysOn', 'animate'], function (items) {
    alwaysOnCheckBox.checked = items.alwaysOn;
    animateCheckBox.checked = items.animate;
    message('Settings loaded!');
  });
}

async function reset() {
  await storage.remove('alwaysOn');
  message('Settings reset (but NOT saved)!');
  alwaysOnCheckBox.checked = false;
  animateCheckBox.checked = false;
}

let messageClearTimer;
function message(msg) {
  clearTimeout(messageClearTimer);
  const message = document.querySelector('.message');
  message.innerText = msg;
  messageClearTimer = setTimeout(function () {
    message.innerText = '';
  }, 3000);
}
