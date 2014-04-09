(function() {
    var launchDataStore = undefined;
    var checkWindowPosition = function(position) {
        var screen_width = screen.width,
                screen_height = screen.height,
                dpr = window.devicePixelRatio;
        position.width = parseInt(position.width * dpr);
        position.height = parseInt(position.height * dpr);
        if (position.left === undefined) {
            position.left = parseInt(screen_width / 2 - position.width / 2);
        }
        if (position.top === undefined) {
            position.top = parseInt(screen_height / 2 - position.height / 2);
        }
        if (position.left < 0) {
            position.left = 0;
        }
        if (position.top < 0) {
            position.top = 0;
        }
        if (screen_width < position.left + position.width) {
            position.left = screen_width - position.width;
        }
        if (screen_height < position.top + position.height) {
            position.top = screen_height - position.height;
        }
        return {width: position.width, height: position.height, left: position.left, top: position.top};
    };
    var create_player = function() {
        chrome.storage.local.get(['pos_left', 'pos_top', 'lang'], function(storage) {
            var position = checkWindowPosition({
                width: 335,
                height: 116,
                left: storage.pos_left,
                top: storage.pos_top
            });
            /**
             * @namespace chrome.app.window.create
             */
            chrome.app.window.create('index.html', {
                bounds: position,
                frame: "none",
                resizable: false
            }, function(window) {
                var sub_window = window.contentWindow;
                sub_window._language = storage.lang;
                sub_window._windows = {player: window};
                sub_window._settings = {};
                sub_window._launchData = launchDataStore;
                launchDataStore = undefined;
            });
        });
    };
    var run_player = function() {
        chrome.runtime.sendMessage('_player_', function(res) {
            if (res === undefined) {
                create_player();
                return;
            }
            var windows = chrome.app.window.getAll();
            windows.forEach(function(win) {
                var sub_window = win.contentWindow;
                if (sub_window.engine !== undefined) {
                    sub_window._launchData = launchDataStore;
                    chrome.runtime.sendMessage('_check_launchData_');
                    launchDataStore = undefined;
                }
            });
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