"use strict";

let manifest = chrome.runtime.getManifest();
console.log(manifest.name + " v" + manifest.version);

// store options in the "local" storage area
const storage = chrome.storage.local;

// get the DOM controls
const resetButton = document.querySelector('button.reset');
const submitButton = document.querySelector('button.submit');
const reloadButton = document.querySelector('button.reload');
const versionSpan = document.querySelector('#version');
versionSpan.innerText = "v" + manifest.version;

const alwaysOnCheckBox = document.querySelector('#always_on');
const animateCheckBox = document.querySelector('#animate');
const whiteListCheckBox = document.querySelector('#whitelist');
const whiteListTextArea = document.querySelector('#whitelist-textarea');
const blackListCheckBox = document.querySelector('#blacklist');
const blackListTextArea = document.querySelector('#blacklist-textarea');
const overrideFilterCheckBox = document.querySelector('#override-filter');
const overrideFilterTextArea = document.querySelector('#override-filter-textarea');

// load options that may have previously been saved.
loadChanges();

submitButton.addEventListener('click', saveChanges);
resetButton.addEventListener('click', reset);
reloadButton.addEventListener('click', loadChanges);

async function saveChanges() {
  const alwaysOn = alwaysOnCheckBox.checked;
  const animate = animateCheckBox.checked;
  const useWhiteList = whiteListCheckBox.checked;
  const whiteList = whiteListTextArea.value.split('\n');
  const useBlackList = blackListCheckBox.checked;
  const blackList = blackListTextArea.value.split('\n');
  const useOverrideFilter = overrideFilterCheckBox.checked;
  const overrideFilter = overrideFilterTextArea.value.trim();
  await storage.set({ 
    alwaysOn: alwaysOn,
    animate: animate,
    useWhiteList: useWhiteList,
    whiteList: whiteList,
    useBlackList: useBlackList,
    blackList: blackList,
    useOverrideFilter: useOverrideFilter,
    overrideFilter: overrideFilter,
  });
  message('Settings saved... Reload pages for changes to take effect!');
}

function loadChanges() {
  storage.get(null, function (items) {
    alwaysOnCheckBox.checked = items?.alwaysOn ?? false;
    animateCheckBox.checked = items?.animate ?? false;
    whiteListCheckBox.checked = items?.useWhiteList ?? false;
    const whiteList = items?.whiteList ?? [];
    whiteListTextArea.value = whiteList.join('\n');
    blackListCheckBox.checked = items?.useBlackList ?? false;
    const blackList = items?.blackList ?? [];
    blackListTextArea.value = blackList.join('\n');
    overrideFilterCheckBox.checked = items?.useOverrideFilter ?? false;
    const overrideFilter = items?.overrideFilter ?? '';
    overrideFilterTextArea.value = overrideFilter.trim();
    message('Settings loaded!');
  });
}

async function reset() {
  // await storage.remove('alwaysOn');
  message('Settings reset (but NOT saved)!');
  alwaysOnCheckBox.checked = false;
  animateCheckBox.checked = false;
  whiteListCheckBox.checked = false;
  whiteListTextArea.value = '';
  blackListCheckBox.checked = false;
  blackListTextArea.value = '';
  overrideFilterCheckBox.checked = false;
  overrideFilterTextArea.value = '';
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
