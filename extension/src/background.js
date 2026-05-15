/* Slipstream service worker — seeds defaults on install. */
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.get(["slip_settings"], (r) => {
    if (!r.slip_settings) {
      chrome.storage.local.set({
        slip_settings: { enabled: true, highlightSmart: true },
      });
    }
  });
});
