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

// Each textarea and the checkbox that activates it, with a human-readable name for warnings.
const optionPairs = [
  { name: 'whitelist',       checkBox: whiteListCheckBox,      textArea: whiteListTextArea,      key: 'whiteList',      enabledKey: 'useWhiteList' },
  { name: 'blacklist',       checkBox: blackListCheckBox,      textArea: blackListTextArea,      key: 'blackList',      enabledKey: 'useBlackList' },
  { name: 'override filter', checkBox: overrideFilterCheckBox, textArea: overrideFilterTextArea, key: 'overrideFilter', enabledKey: 'useOverrideFilter' },
  { name: 'SVG filter',      checkBox: svgFilterCheckBox,      textArea: svgFilterTextArea,      key: 'svgFilter',      enabledKey: 'useSVGFilter' },
];

// Create an (initially hidden) inline warning under each textarea.
// Built here so no HTML changes are needed. Note: loadChanges() is called earlier in the
// file, but its storage callback only runs after the script has finished, so this is defined by then.
for (const p of optionPairs) {
  p.warned = false;
  p.warningEl = document.createElement('div');
  p.warningEl.setAttribute('role', 'alert');
  p.warningEl.style.cssText = 'display:none; color:#b45309; font-size:0.9em; margin:4px 0;';
  p.textArea.insertAdjacentElement('afterend', p.warningEl);

  // Editing the textarea or toggling its checkbox makes the warning obsolete.
  p.textArea.addEventListener('input', () => clearWarning(p));
  p.checkBox.addEventListener('change', () => clearWarning(p));
}

// Add a small "Use placeholder text" button to the top right of every textarea
// that has a placeholder. Each textarea is wrapped in a relatively-positioned container
// so the button can sit on top of it. (Done after the warnings above are inserted, so those
// stay below the wrapper, not inside it.)
document.querySelectorAll('textarea[placeholder]').forEach(function (textArea) {
  // Placeholders often start with an "e.g.:" header line; it's a hint, not content, so drop it.
  const placeholder = textArea.getAttribute('placeholder').replace(/^\s*e\.g\.:?[ \t]*\r?\n/i, '');
  if (!placeholder.trim()) return;

  const wrapper = document.createElement('div');
  wrapper.style.cssText = 'position:relative; display:inline-block; max-width:100%;';
  textArea.parentNode.insertBefore(wrapper, textArea);
  wrapper.appendChild(textArea);
  textArea.style.verticalAlign = 'top'; // avoids the small gap inline textareas leave underneath

  const button = document.createElement('button');
  button.type = 'button'; // never submit a surrounding form
  button.textContent = 'Use placeholder text';
  button.title = placeholder;
  button.style.cssText =
    'position:absolute; right:2px; top:0px; padding:1px 6px; font-size:0.75em; opacity:0.8; cursor:pointer;';
  wrapper.appendChild(button);

  button.addEventListener('click', function () {
    const current = textArea.value;
    textArea.value = placeholder;
    const matchingCheckBox = optionPairs.find((entry) => entry.textArea == textArea).checkBox;
    matchingCheckBox.checked = true;
    // if svgFilter, also append to css override
    if (textArea == svgFilterTextArea) {
      overrideFilterCheckBox.checked = true;
      let cssFilter = overrideFilterTextArea.value.replace(/\n*url\(#my-filter\)/g, '');
      overrideFilterTextArea.value = cssFilter.trim() + '\nurl\(#my-filter)';
    }
    // Programmatic changes don't fire events, so dispatch 'input' to update the
    // unsaved-changes indicator and clear any inline warning for this textarea.
    textArea.dispatchEvent(new Event('input', { bubbles: true }));
    textArea.focus();
  });
});

function showWarning(p) {
  p.warned = true;
  p.warningEl.textContent =
    `You changed the ${p.name} text, but its checkbox is not ticked, so it will be saved ` +
    `but have NO effect. Tick the checkbox, or click Save again to save anyway.`;
  p.warningEl.style.display = 'block';
  p.checkBox.style.outline = '2px solid #d97706'; // highlight the checkbox that needs ticking
}

function clearWarning(p) {
  p.warned = false;
  p.warningEl.style.display = 'none';
  p.checkBox.style.outline = '';
}

function clearAllWarnings() {
  optionPairs.forEach(clearWarning);
  clearAlwaysOnWarning();
}

// Inline warning under the "always on" checkbox, for when a whitelist/blacklist is enabled
// but "always on" itself is not.
const alwaysOnWarning = {
  warned: false,
  el: document.createElement('div'),
};
alwaysOnWarning.el.setAttribute('role', 'alert');
alwaysOnWarning.el.style.cssText = 'display:none; color:#b45309; font-size:0.9em; margin:4px 0;';
alwaysOnCheckBox.parentElement.querySelector('label').insertAdjacentElement('afterend', alwaysOnWarning.el);

// The warning becomes obsolete if the user touches any of the three checkboxes involved.
[alwaysOnCheckBox, whiteListCheckBox, blackListCheckBox].forEach(cb =>
  cb.addEventListener('change', clearAlwaysOnWarning));

// Names of the enabled lists if "always on" is off, otherwise an empty array.
function listsWithoutAlwaysOn(state) {
  if (state.alwaysOn) return [];
  const names = [];
  if (state.useWhiteList) names.push('whitelist');
  if (state.useBlackList) names.push('blacklist');
  return names;
}

function showAlwaysOnWarning(names) {
  alwaysOnWarning.warned = true;
  alwaysOnWarning.el.textContent =
    `The ${names.join(' and ')} ${names.length > 1 ? 'are' : 'is'} enabled, but "always ON" is not ticked. ` +
    `Tick it, or click Save again to save anyway.`;
  alwaysOnWarning.el.style.display = 'block';
  alwaysOnCheckBox.style.outline = '2px solid #d97706';
}

function clearAlwaysOnWarning() {
  alwaysOnWarning.warned = false;
  alwaysOnWarning.el.style.display = 'none';
  alwaysOnCheckBox.style.outline = '';
}

// Find textareas that were edited since the last save/load (and are not empty)
// whose checkbox is still off, meaning the edit would have no effect.
// Content that was already saved with its checkbox off is intentional, so it is not flagged.
function findDisabledEdits(state) {
  const saved = JSON.parse(savedSnapshot);
  return optionPairs.filter(p =>
    !state[p.enabledKey] &&
    JSON.stringify(state[p.key]) !== JSON.stringify(saved[p.key]) &&
    p.textArea.value.trim() !== ''
  );
}

async function saveChanges() {
  const state = getFormState();

  // First Save click with an edited-but-disabled textarea: show inline warnings and stop.
  // If the user clicks Save again without touching those fields, the warning has already
  // been seen (p.warned), so we go ahead and save anyway.
  const disabledEdits = findDisabledEdits(state);
  const alwaysOnNames = listsWithoutAlwaysOn(state);
  const hasUnseenWarning =
    disabledEdits.some(p => !p.warned) ||
    (alwaysOnNames.length > 0 && !alwaysOnWarning.warned);
  if (hasUnseenWarning) {
    disabledEdits.forEach(showWarning);
    if (alwaysOnNames.length > 0) showAlwaysOnWarning(alwaysOnNames);
    // take the user straight to the checkbox they probably forgot
    (alwaysOnNames.length > 0 ? alwaysOnCheckBox : disabledEdits[0].checkBox).focus();
    message('Not saved yet: see the warning(s) on the page. Click Save again to save anyway.');
    return;
  }

  await storage.set(state);
  // Show the user what was actually saved (trimmed, blank lines removed).
  whiteListTextArea.value = state.whiteList.join('\n');
  blackListTextArea.value = state.blackList.join('\n');
  // Only update the snapshot after the write succeeded; if set() throws,
  // the form stays marked as unsaved.
  savedSnapshot = JSON.stringify(state);
  clearAllWarnings();
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
    clearAllWarnings();
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
  clearAllWarnings(); // everything is empty/unchecked now, so no warning applies
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
