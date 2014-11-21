engine.wm = function() {
    var _options = {
        createWindow: {
            playlist: {
                width: 260,
                height: 540,
                toggle: 1,
                frame: 'none',
                index: 'playlist.html'
            },
            viz: {
                width: 1280,
                height: 720,
                toggle: 1,
                frame: 'none',
                index: 'viz.html'
            },
            video: {
                width: 720,
                height: 480,
                toggle: 1,
                frame: 'none',
                index: 'video.html'
            },
            menu: {
                width: 250,
                height: 250,
                toggle: 1,
                frame: 'none',
                index: 'dialog.html'
            },
            m3u: {
                height: 400,
                width: 350,
                only: 1,
                frame: 'none',
                index: 'dialog.html'
            },
            url: {
                width: 400,
                height: 60,
                resizable: false,
                frame: 'none',
                index: 'dialog.html',
                only: 1
            },
            filelist: {
                height: 315,
                width: 350,
                frame: 'none',
                index: 'dialog.html',
                only: 1
            },
            options: {
                width: 820,
                height: 600,
                only: 1,
                index: 'options.html'
            },
            rename: {
                width: 400,
                height: 60,
                resizable: false,
                frame: 'none',
                index: 'dialog.html',
                only: 1
            }
        }
    };
    var var_cache = {
        sendToWindow: {}
    };
    chrome.runtime.onMessageExternal.addListener(function (msg) {
        /*
         Слушает глобальные горячие клавишь
         */
        if (msg === 'prev') {
            engine.playlist.previousTrack();
        } else if (msg === 'next') {
            engine.playlist.nextTrack();
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
            engine.context.showMenu();
        } else if (msg === 'oFile') {
            engine.context.menu.openFiles.action();
        } else if (msg === 'oDir') {
            engine.context.menu.openDirectory.action();
        } else if (msg === 'togglePlaylist') {
            engine.wm.createWindow({type: 'playlist'});
        }
    });
    var getWindowSize = function(position, cb) {
        var dpr = 1;
        var width = parseInt(position.width * dpr);
        var height = parseInt(position.height * dpr);
        cb({width: width, height: height});
    };
    var showAllWindowOnFocus = function(id) {
        var appWindows = chrome.app.window.getAll();
        var current = undefined;
        appWindows.forEach(function(sub_appWindow) {
            if (sub_appWindow.isAlwaysOnTop() ||
                sub_appWindow.isMinimized()) {
                return 1;
            }
            if (sub_appWindow.id === id) {
                current = sub_appWindow;
                return 1;
            }
            sub_appWindow.setAlwaysOnTop(true);
            sub_appWindow.setAlwaysOnTop(false);
        });
        if (current === undefined) {
            return;
        }
        current.setAlwaysOnTop(true);
        current.setAlwaysOnTop(false);
    };
    var setPinPosition = function (type, pos) {
        /*
         Выставляет позицию липкого окна type соответственно конфигу
         */
        var appWindow = chrome.app.window.get(type);
        if (appWindow === null || appWindow.isMinimized() || appWindow.isMaximized()) {
            return;
        }
        var pb = chrome.app.window.current().outerBounds;
        var params, plb = appWindow.outerBounds;
        if (pos === 2) {
            params = {left: pb.left, top: pb.top + pb.height, width: pb.width};
        } else if (pos === 1) {
            params = {left: pb.left + pb.width, top: pb.top};
        } else if (pos === 3) {
            params = {left: pb.left - plb.width, top: pb.top};
        } else if (pos === 4) {
            params = {left: pb.left, top: pb.top - plb.height, width: pb.width};
        } else if (pos === 5) {
            params = {left: pb.left - plb.width, top: pb.top + pb.height - plb.height};
        } else if (pos === 6) {
            params = {left: pb.left + pb.width, top: pb.top + pb.height - plb.height};
        }
        appWindow.moveTo(params.left, params.top);
        if (params.width !== undefined) {
            appWindow.resizeTo(params.width);
        }
    };
    var waitWindowClose = function(type, cb) {
        if (type === undefined) {
            return cb();
        }
        var waiting = function() {
            setTimeout(function() {
                var appWindow = chrome.app.window.get(type);
                if (appWindow !== null) {
                    return waiting();
                }
                return cb();
            }, 250);
        };
        waiting();
    };
    var createWindow = function (setup) {
        var type = setup.type;
        var options = _options.createWindow[type];
        var appWindow = null;
        if (options.only || options.toggle) {
            appWindow = chrome.app.window.get(type);
            if (appWindow !== null) {
                appWindow.close();
                if (options.toggle === 1) {
                    return;
                }
            }
        }
        waitWindowClose(appWindow !== null ? type : undefined, function() {
            getWindowSize(options, function(position) {
                if (type === 'm3u') {
                    var len;
                    if (setup.config.collectionList !== undefined) {
                        len = setup.config.collectionList.length;
                    }
                    if (len === 1) {
                        // хак, если кол-во плейлистов - 1 то диалогового окна нету
                        return setup.config.cb(0);
                    }
                }
                chrome.app.window.create(options.index, {
                    bounds: position,
                    frame: options.frame,
                    resizable: options.resizable,
                    id: type
                }, function(appWindow) {
                    if (['menu', 'm3u', 'url', 'playlist', 'viz', 'video'].indexOf(type) !== -1) {
                        appWindow.contentWindow.addEventListener('focus', function() {
                            showAllWindowOnFocus(type);
                        });
                    }
                    if (type === 'playlist') {
                        if (_settings.pineble_playlist === 1 &&_settings.pined_playlist === 1) {
                            setPinPosition('playlist', _settings.pin_position);
                        }
                    } else
                    if (type === 'video') {
                        // stop playing
                        appWindow.onClosed.addListener(function () {
                            var viz_win = chrome.app.window.get('viz');
                            if (viz_win === null) {
                                chrome.power.releaseKeepAwake();
                            }
                            engine.player.closeVideo();
                        });
                    } else if (type === 'viz') {
                        // disconnect adapter
                        appWindow.onClosed.addListener(function () {
                            var vid_win = chrome.app.window.get('video');
                            if (vid_win === null) {
                                chrome.power.releaseKeepAwake();
                            }
                            engine.player.discAdapters('viz');
                        });
                    }
                    if (setup.config !== undefined) {
                        appWindow.contentWindow._config = setup.config;
                    }
                    appWindow.contentWindow._send = sendToWindow;
                    appWindow.contentWindow._settings = _settings;
                    if (['rename'].indexOf(type) === -1) {
                        engine.setHotkeys(appWindow.contentWindow.document);
                    }
                });
            });
        });
    };
    var sendToWindow = window._send = function(type, exist, fail) {
        var appWindow = undefined;
        if ( var_cache.sendToWindow[type] !== undefined
            && var_cache.sendToWindow[type].contentWindow.window !== null ) {
            appWindow = var_cache.sendToWindow[type];
        } else {
            appWindow = chrome.app.window.get(type);
        }
        if (appWindow === null) {
            fail && fail();
            delete var_cache.sendToWindow[type];
        } else {
            exist && exist(appWindow.contentWindow);
            var_cache.sendToWindow[type] = appWindow;
        }
    };
    (function(){
        var appWindow = chrome.app.window.current();
        appWindow.onClosed.addListener(function () {
            var windows = chrome.app.window.getAll();
            windows.forEach(function(appWindow) {
                if (appWindow.id === 'player') {
                    return 1;
                }
                appWindow.close();
            });
        });
        appWindow.contentWindow.addEventListener('focus', function() {
            showAllWindowOnFocus('player');
        });
        chrome.runtime.onMessage.addListener(function(request, sender, sendResponse){
            if (request === 'player_ready') {
                sendResponse('ready');
                engine.wm.onTop();
            }
        });
    })();
    return {
        onTop: function() {
            var windows = chrome.app.window.getAll();
            windows.forEach(function(appWindow) {
                appWindow.focus();
            });
        },
        createWindow: createWindow,
        setPinPosition: setPinPosition
    }
}();