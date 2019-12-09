//https://stackoverflow.com/questions/11431337/sending-message-to-chrome-extension-from-a-web-page
window.addEventListener("message", function(event) {
    // We only accept messages from ourselves
    if (event.source != window)
        return;

    if (event.data.type && (event.data.type == "FROM_PAGE")) {
        chrome.runtime.sendMessage("phicehfclmfgkellhdcegnkibnnjaifl", event.data.data);
    }
});