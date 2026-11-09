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
const svgFilterCheckBox = document.querySelector('#svg-filter');
const svgFilterTextArea = document.querySelector('#svg-filter-textarea');

// Snapshot (as a JSON string) of the form as it was last saved or loaded.
// Comparing the current form against this tells us if there are unsaved changes.
let savedSnapshot = null;

// Turn a textarea's content into a clean list: one entry per line,
// surrounding whitespace removed, blank lines dropped.
function parseList(text) {
  return text.split('\n').map(line => line.trim()).filter(line => line !== '');
}

// Read the current state of every control into a plain object.
// Used both for saving and for detecting unsaved changes, so the two can never disagree.
function getFormState() {
  return {
    alwaysOn: alwaysOnCheckBox.checked,
    animate: animateCheckBox.checked,
    useWhiteList: whiteListCheckBox.checked,
    whiteList: parseList(whiteListTextArea.value),
    useBlackList: blackListCheckBox.checked,
    blackList: parseList(blackListTextArea.value),
    useOverrideFilter: overrideFilterCheckBox.checked,
    overrideFilter: overrideFilterTextArea.value.trim(),
    useSVGFilter: svgFilterCheckBox.checked,
    svgFilter: svgFilterTextArea.value.trim(),
  };
}

function hasUnsavedChanges() {
  // savedSnapshot is null until the initial load finishes; don't warn before that.
  return savedSnapshot !== null && JSON.stringify(getFormState()) !== savedSnapshot;
}

// Show a "*" in the tab title while there are unsaved changes.
function updateDirtyIndicator() {
  const base = document.title.replace(/^\* /, '');
  document.title = hasUnsavedChanges() ? '* ' + base : base;
}

// Any edit to any control re-evaluates the dirty state
// ('input' covers typing, 'change' covers checkboxes).
document.addEventListener('input', updateDirtyIndicator);
document.addEventListener('change', updateDirtyIndicator);

// Warn when leaving the page (closing the tab, navigating away, refreshing)
// with unsaved changes. Browsers ignore custom text and show their own generic prompt.
window.addEventListener('beforeunload', function (event) {
  if (hasUnsavedChanges()) {
    event.preventDefault();
    event.returnValue = ''; // required by Chrome to trigger the prompt
  }
});

// load options that may have previously been saved.
loadChanges();

submitButton.addEventListener('click', saveChanges);
resetButton.addEventListener('click', reset);
reloadButton.addEventListener('click', onReloadClick);

async function saveChanges() {
  const state = getFormState();
  await storage.set(state);
  // Show the user what was actually saved (trimmed, blank lines removed).
  whiteListTextArea.value = state.whiteList.join('\n');
  blackListTextArea.value = state.blackList.join('\n');
  // Only update the snapshot after the write succeeded; if set() throws,
  // the form stays marked as unsaved.
  savedSnapshot = JSON.stringify(state);
  updateDirtyIndicator();
  message('Settings saved... Reload pages for changes to take effect!');
}

// "Reload" throws away whatever is in the form, so confirm first if there are edits.
function onReloadClick() {
  if (hasUnsavedChanges() &&
      !confirm('You have unsaved changes. Reload the saved settings and discard them?')) {
    return;
  }
  loadChanges();
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
    svgFilterCheckBox.checked = items?.useSVGFilter ?? false;
    const svgFilter = items?.svgFilter ?? '';
    svgFilterTextArea.value = svgFilter.trim();

    // Take the snapshot from the controls (not from `items`) so that any
    // normalization above (trim, join/split) doesn't cause false "dirty" results.
    savedSnapshot = JSON.stringify(getFormState());
    updateDirtyIndicator();
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
  svgFilterCheckBox.checked = false;
  svgFilterTextArea.value = '';
  // Programmatic changes don't fire input/change events, so refresh manually.
  // Reset is not saved, so this correctly counts as an unsaved change.
  updateDirtyIndicator();
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
