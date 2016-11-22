chrome.app.runtime.onLaunched.addListener(function () {

    var options = {
        frame: 'chrome',
        minWidth: 1024,
        minHeight: 595,
        width: 1024,
        height: 595
    };

    chrome.app.window.create('index.html', options);
});


