(function() {
    var launchDataStore = undefined;
    var checkWindowPosition = function(position) {
        var dpr = window.devicePixelRatio;
        position.width = parseInt(position.width * dpr);
        position.height = parseInt(position.height * dpr);
        return {width: position.width, height: position.height};
    };
    var create_player = function() {
        var position = checkWindowPosition({
            width: 335,
            height: 116
        });
        /**
         * @namespace chrome.app.window.create
         */
        chrome.app.window.create('player.html', {
            bounds: position,
            frame: "none",
            resizable: false,
            id: 'player'
        }, function(appWindow) {
            if (appWindow.innerBounds.height !== position.height
                || appWindow.innerBounds.width !== position.width) {
                appWindow.resizeTo(position.width, position.height);
            }
            appWindow.contentWindow._launchData = launchDataStore;
            launchDataStore = undefined;
        });
    };
    var run_player = function() {
        chrome.runtime.sendMessage('player_ready', function(rsp) {
            if (rsp === undefined) {
                create_player();
            } else {
                var appWindow = chrome.app.window.get('player');
                appWindow.contentWindow._launchData = launchDataStore;
                chrome.runtime.sendMessage('_check_launchData_');
                launchDataStore = undefined;
            }
        });
    };
    /**
     * @namespace chrome.app.runtime.onLaunched
     */
    chrome.app.runtime.onLaunched.addListener(function(launchData) {
        launchDataStore = launchData;
        run_player();
    });
    chrome.runtime.onMessageExternal.addListener(function(msg) {
        if (msg === 'stop') {
            run_player();
        }
    });
})();