var engine_wm = function(mySettings,myEngine) {
    window.engine_wm = undefined;
    var settings = mySettings;
    var engine = myEngine;
    var e_wm = function () {
        /*
         Все что связано с окнами и их взаимодействием
         */
        chrome.runtime.onMessageExternal.addListener(function (msg) {
            /*
             Слушает глобальные горячие клавишь
             */
            if (msg === 'prev') {
                engine.playlist.preview();
            } else if (msg === 'next') {
                engine.playlist.next();
            } else if (msg === 'pp') {
                engine.player.playToggle();
            } else if (msg === 'volu') {
                engine.player.volume("+10");
            } else if (msg === 'vold') {
                engine.player.volume("-10");
            } else if (msg === 'scru') {
                engine.player.position("+10");
            } else if (msg === 'scrd') {
                engine.player.position("-10");
            } else if (msg === 'shuffle') {
                engine.playlist.setShuffle();
            } else if (msg === 'loop') {
                engine.playlist.setLoop();
            } else if (msg === 'mute') {
                engine.player.mute();
            } else if (msg === 'menu') {
                engine.showMenu();
            }
        });
        /**
         * @namespace window.contentWindow
         * @namespace window.onClosed
         */
        window._focusAll = function (type) {
            if (type === undefined) {
                type = 'player';
            }
            var _windows = window._windows;
            for (var i in _windows) {
                if (!_windows.hasOwnProperty(i)) {
                    continue;
                }
                if (i === type) {
                    continue;
                }
                _windows[i].focus();
            }
            _windows[type].focus();
        };
        window._showAll = function (type, oncancel) {
            if (type === undefined) {
                type = 'player';
            }
            var _windows = window._windows;
            var n = 0;
            for (var i in _windows) {
                if (!_windows.hasOwnProperty(i)) {
                    continue;
                }
                /**
                 * @namespace _windows.isMinimized
                 */
                if (i === type || _windows[i].isMinimized()) {
                    continue;
                }
                _windows[i].focus();
                n++;
            }
            if (n === 0) {
                oncancel();
                return;
            }
            _windows[type].focus();
        };
        window._send = function (type, cb) {
            var _windows = window._windows;
            if (_windows[type] === undefined || _windows[type].contentWindow.window === null) {
                return;
            }
            cb(_windows[type].contentWindow);
        };
        chrome.runtime.onMessage.addListener(function (msg, sender, sendResponse) {
            if (msg === '_player_') {
                sendResponse('ok');
                window._focusAll();
            } else if (msg === '_player_window_') {
                chrome.runtime.getBackgroundPage(function (bg) {
                    bg.player_window = window;
                    sendResponse('ok');
                });
            }
        });
        chrome.app.window.current().onClosed.addListener(function () {
            var _windows = window._windows;
            for (var i in _windows) {
                if (!_windows.hasOwnProperty(i)) {
                    continue;
                }
                if (i === 'player') {
                    continue;
                }
                _windows[i].contentWindow.close();
            }
            delete _windows['player'];
        });
        chrome.app.window.current().onMinimized.addListener(function () {
            /**
             * @namespace window._windows
             * @namespace _windows.minimize
             */
            var _windows = window._windows;
            for (var i in _windows) {
                if (!_windows.hasOwnProperty(i)) {
                    continue;
                }
                _windows[i].minimize();
            }
        });
        chrome.app.window.current().onRestored.addListener(function () {
            window._focusAll();
        });
        var checkWindowPosition = function (position) {
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
        var create_window = function (options, url, args, oncreate) {
            if ((options.toggle || options.only) && _windows[options.type] !== undefined && _windows[options.type].contentWindow.window !== null) {
                _windows[options.type].contentWindow.window.close();
                if (options.only === undefined) {
                    return;
                }
            }
            chrome.app.window.create(url, args, oncreate);
        };
        return function (options) {
            var position;
            if (options.type === 'playlist') {
                options.toggle = true;
                chrome.storage.local.get(['pl_pos_left', 'pl_pos_top', 'pl_w', 'pl_h'], function (storage) {
                    position = checkWindowPosition({
                        width: storage.pl_w || 335,
                        height: storage.pl_h || 400,
                        left: storage.pl_pos_left,
                        top: storage.pl_pos_top
                    });
                    create_window(options, 'playlist.html', {
                        bounds: position,
                        frame: "none"
                    }, function (window) {
                        _windows[options.type] = window;
                        if (settings.pined_playlist) {
                            engine.setPinPosition(options.type, settings.pin_position);
                        }
                        window.onClosed.addListener(function () {
                            delete _windows[options.type];
                        });
                        window.contentWindow._windows = _windows;
                        window.contentWindow._lang = _lang;
                        window.contentWindow._send = _send;
                    });
                });
            } else if (options.type === 'viz') {
                options.toggle = true;
                chrome.storage.local.get(['viz_pos_left', 'viz_pos_top', 'viz_w', 'viz_h'], function (storage) {
                    position = checkWindowPosition({
                        width: storage.viz_w || 1024,
                        height: storage.viz_h || 768,
                        left: storage.viz_pos_left,
                        top: storage.viz_pos_top
                    });
                    create_window(options, 'viz.html', {
                        bounds: position,
                        frame: "none"
                    }, function (window) {
                        _windows[options.type] = window;
                        window.onClosed.addListener(function () {
                            delete _windows[options.type];
                            engine.player.discAdapters('viz');
                            if (_windows.video === undefined || _windows.video.contentWindow.window === null) {
                                chrome.power.releaseKeepAwake();
                            }
                        });
                        window.contentWindow._lang = _lang;
                        window.contentWindow._send = _send;
                    });
                });
            } else if (options.type === 'video') {
                options.toggle = true;
                chrome.storage.local.get(['video_pos_left', 'video_pos_top', 'video_w', 'video_h'], function (storage) {
                    position = checkWindowPosition({
                        width: storage.video_w || 720,
                        height: storage.video_h || 480,
                        left: storage.video_pos_left,
                        top: storage.video_pos_top
                    });
                    create_window(options, 'video.html', {
                        bounds: position,
                        frame: "none"
                    }, function (window) {
                        _windows[options.type] = window;
                        window.onClosed.addListener(function () {
                            delete _windows[options.type];
                            chrome.power.releaseKeepAwake();
                            if (engine.player.mode === 'video') {
                                view.state('emptied');
                                engine.player.switchMedia();
                            }
                        });
                        window.contentWindow._lang = _lang;
                        window.contentWindow._send = _send;
                        window.contentWindow.options = options.config;
                    });
                });
            } else if (options.type === 'dialog') {
                options.only = true;
                /**
                 * @namespace options.config
                 * @type {number|w|.config.w|THREE.Vector4.w|THREE.Quaternion.w}
                 */
                options.config.w = options.config.w || 400;
                options.config.h = options.config.h || 120;
                if (options.config.type === 'm3u') {
                    var len = 3;
                    if (options.config.playlists !== undefined) {
                        len = options.config.playlists.length;
                    }
                    if (len === 0) {
                        len = 1;
                    }
                    if (len > 8) {
                        len = 8;
                    }
                    options.config.h = len * 52 + 43;
                } else if (options.config.type === 'menu') {
                    delete options.only;
                    options.toggle = true;
                    var len = 14;
                    if (options.config.list !== undefined) {
                        len = 0;
                        for (var index in options.config.list) {
                            /**
                             * @namespace options.config.list.hasOwnProperty
                             */
                            if (!options.config.list.hasOwnProperty(index)) {
                                continue;
                            }
                            var item = options.config.list[index];
                            if (item.hide) {
                                continue;
                            }
                            if (item.action === undefined) {
                                continue;
                            }
                            if (item.contexts.indexOf('page') === -1) {
                                continue;
                            }
                            len++;
                        }
                    }
                    if (len === 0) {
                        len = 1;
                    }
                    if (len > 20) {
                        len = 14;
                    }
                    options.config.h = len * 19 + 40;
                }
                position = checkWindowPosition({
                    width: options.config.w,
                    height: options.config.h,
                    left: undefined,
                    top: undefined
                });
                create_window(options, 'dialog.html', {
                    bounds: position,
                    frame: "none",
                    resizable: options.config.r || false
                }, function (window) {
                    _windows[options.type] = window;
                    window.onClosed.addListener(function () {
                        delete _windows[options.type];
                    });
                    window.contentWindow._lang = _lang;
                    window.contentWindow.options = options.config;
                    window.contentWindow._send = _send;
                });
            } else if (options.type === 'options') {
                options.only = true;
                position = checkWindowPosition({
                    width: 820,
                    height: 600,
                    left: undefined,
                    top: undefined
                });
                create_window(options, 'options.html', {
                    bounds: position,
                    frame: "chrome",
                    resizable: true
                }, function (window) {
                    _windows[options.type] = window;
                    window.onClosed.addListener(function () {
                        delete _windows[options.type];
                    });
                    window.contentWindow._language = _language;
                    window.contentWindow._send = _send;
                });
            }
        };
    }();
    return e_wm;
};