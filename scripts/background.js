var bg = function() {
    var player_window = undefined;
    var check_window_position = function(position) {
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
            var position = check_window_position({
                width: 335,
                height: 116,
                left: storage.pos_left,
                top: storage.pos_top
            });
            chrome.app.window.create('index.html', {
                bounds: position,
                frame: "none",
                resizable: false
            }, function(window) {
                player_window = window;
                var sub_window = window.contentWindow;
                sub_window._language = storage.lang;
                sub_window._windows = {player: window};
                sub_window._settings = {};
                window.onClosed.addListener(function() {
                    var _windows = sub_window._windows;
                    for (var i in _windows) {
                        if (i === 'player') {
                            continue;
                        }
                        _windows[i].contentWindow.close();
                    }
                    delete _windows['player'];
                });
                window.onMinimized.addListener(function() {
                    var _windows = sub_window._windows;
                    for (var window in _windows) {
                        _windows[window].minimize();
                    }
                });
                sub_window._focus_all = function(type) {
                    if (type === undefined) {
                        type = 'player';
                    }
                    var windows = sub_window._windows;
                    for (var i in windows) {
                        if (i === type) {
                            continue;
                        }
                        windows[i].focus();
                    }
                    windows[type].focus();
                };
                sub_window._check_window_position = check_window_position;
                sub_window._send = function(type, cb) {
                    if (sub_window._windows[type] === undefined || sub_window._windows[type].contentWindow.window === null) {
                        return;
                    }
                    cb(sub_window._windows[type].contentWindow);
                };
            });
        });
    };
    return {
        run_player: function() {
            if (player_window === undefined || player_window.contentWindow.window === null) {
                create_player();
            } else {
                player_window.contentWindow._focus_all();
            }
        },
        getPlayerWindow: function() {
            if (player_window !== undefined && player_window.contentWindow.window !== null) {
                return player_window.contentWindow;
            }
        }
    };
}();
chrome.app.runtime.onLaunched.addListener(function() {
    bg.run_player();
});
chrome.runtime.onMessageExternal.addListener(function(msg, sender, resp) {
    if (msg === 'stop') {
        bg.run_player();
    }
});