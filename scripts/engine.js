/**
 * @namespace chrome
 * @namespace chrome.storage
 * @namespace chrome.storage.local
 * @namespace chrome.contextMenus
 * @namespace chrome.notifications
 * @namespace chrome.notifications.onButtonClicked.addListener
 * @namespace chrome.notifications.onClicked
 * @namespace chrome.app.window.current.onRestored.addListener
 * @namespace chrome.app.window.current.onClosed
 * @namespace chrome.app.window.current.onMinimized.addListener
 * @namespace chrome.runtime.onMessage
 * @namespace chrome.runtime.onMessageExternal
 * @namespace chrome.runtime.sendMessage
 * @namespace chrome.runtime.getBackgroundPage
 * @namespace URL.revokeObjectURL
 * @namespace URL.createObjectURL
 * @namespace audio.paused
 * @namespace audio.pause
 * @namespace audio.duration
 * @namespace audio.currentTime
 * @namespace audio.play
 * @namespace audio.volume
 * @namespace audio.muted
 * @namespace audio.canPlayType
 * @namespace window.webkitAudioContext
 * @namespace window.devicePixelRatio
 */
(function () {
    window._debug = false;
    var settings;
    var engine = window.engine = {
        resetPlayer: function () {
            /*
             * Функция сброса плеера.
             */
            //останавливает воспроизведение
            engine.player.stop();
            //сбрасывает настройки плэйлиста
            engine.playlist.reset();
            //кэш изображений альбомов
            engine.tags.clearCovers();
            //отправляет команду на очистку плэйлиста
            _send('playlist', function (window) {
                window.playlist.empty();
            });
        },
        getRandomInt: function (min, max) {
            /*
             * Получает случайное число [a,b]
             */
            return Math.floor(Math.random() * (max - min + 1)) + min;
        },
        addInCtxMenu: function (playlist_info) {
            var context_menu = view.getContextMenu();
            ['save_vk', 'save_sc'].forEach(function (type) {
                if (playlist_info.cloud !== undefined && playlist_info.cloud[type] === true) {
                    if (context_menu[type].hide === 0) {
                        return;
                    }
                    var item = {};
                    item.id = context_menu[type].id;
                    item.title = context_menu[type].title;
                    item.contexts = context_menu[type].contexts;
                    chrome.contextMenus.create(item);
                    context_menu[type].hide = 0;
                } else if (context_menu[type].hide === 0) {
                    chrome.contextMenus.remove(type);
                    context_menu[type].hide = 1;
                }
            });
        },
        APIstatus: function () {
            return JSON.stringify(engine.player.status());
        },
        open: function (files, info) {
            if (files.length === 0) {
                return;
            }
            var trackList = engine.playlist.readTrackList(files);
            if (trackList[0].length === 0) {
                return;
            }
            engine.resetPlayer();
            engine.playlist.playlist = trackList[0];
            engine.playlist.playlist_order = trackList[1];
            if (info !== undefined && info.name !== undefined) {
                engine.playlist.playlist_info = info;
            }
            _send('playlist', function (window) {
                window.playlist.setPlaylist(engine.playlist.getPlaylist());
            });
            view.state("playlist_not_empty");
            var id = 0;
            if (engine.playlist.shuffle) {
                id = engine.getRandomInt(0, engine.playlist.playlist.length - 1);
            }
            engine.player.open(id);
            engine.addInCtxMenu(engine.playlist.playlist_info);
        },
        vizRandomPreset: function () {
            _send('viz', function (window) {
                window.viz.randomPreset();
            });
        },
        setHotkeys: function (_document) {
            var progress_keydown_timer;
            $(_document).on('keydown',function (event) {
                if (event.ctrlKey || event.metaKey) {
                    if (event.keyCode === 38) {
                        event.preventDefault();
                        engine.player.volume("+10");
                    } else if (event.keyCode === 40) {
                        event.preventDefault();
                        engine.player.volume("-10");
                    } else if (event.keyCode === 39) {
                        event.preventDefault();
                        clearTimeout(progress_keydown_timer);
                        progress_keydown_timer = setTimeout(function () {
                            engine.player.position("+10");
                        }, 25);
                    } else if (event.keyCode === 37) {
                        event.preventDefault();
                        clearTimeout(progress_keydown_timer);
                        progress_keydown_timer = setTimeout(function () {
                            engine.player.position("-10");
                        }, 25);
                    }
                } else {
                    if (event.keyCode === 32 || event.keyCode === 179) {
                        event.preventDefault();
                        engine.player.playToggle();
                    } else if (event.keyCode === 178) {
                        event.preventDefault();
                        engine.player.pause();
                    } else if (event.keyCode === 86) {
                        event.preventDefault();
                        engine.player.mute();
                    } else if (event.keyCode === 83) {
                        event.preventDefault();
                        engine.playlist.setShuffle();
                    } else if (event.keyCode === 82) {
                        event.preventDefault();
                        engine.playlist.setLoop();
                    } else if (event.keyCode === 113 || event.keyCode === 176) {
                        event.preventDefault();
                        engine.playlist.next();
                    } else if (event.keyCode === 112 || event.keyCode === 177) {
                        event.preventDefault();
                        engine.playlist.preview();
                    } else if (event.keyCode === 78) {
                        event.preventDefault();
                        engine.vizRandomPreset();
                    } else if (event.keyCode === 9) {
                        event.preventDefault();
                        engine.showMenu();
                    }
                }
            });
        },
        showMenu: function () {
            engine.windowManager({type: 'dialog', config: {type: "menu", h: 290, w: 250, r: true, list: view.getContextMenu(), webui_state: engine.webui.active()}});
        },
        setPinPosition: function (type, pos) {
            /*
             Выставляет позицию липкого окна type соответственно конфигу
             */
            /**
             * @namespace _windows.getBounds
             * @namespace _windows.setBounds
             * @namespace _windows.isMaximized
             */
            if (_windows[type] === undefined || _windows[type].contentWindow.window === null || _windows[type].isMinimized() || _windows[type].isMaximized()) { //isFullscreen?
                return;
            }
            var pb = _windows.player.getBounds();
            var params, plb;
            if (pos === 2) {
                params = {left: pb.left, top: pb.top + pb.height, width: pb.width};
            } else if (pos === 1) {
                params = {left: pb.left + pb.width, top: pb.top};
            } else if (pos === 3) {
                plb = _windows[type].getBounds();
                params = {left: pb.left - plb.width, top: pb.top};
            } else if (pos === 4) {
                plb = _windows[type].getBounds();
                params = {left: pb.left, top: pb.top - plb.height, width: pb.width};
            } else if (pos === 5) {
                plb = _windows[type].getBounds();
                params = {left: pb.left - plb.width, top: pb.top + pb.height - plb.height};
            } else if (pos === 6) {
                plb = _windows[type].getBounds();
                params = {left: pb.left + pb.width, top: pb.top + pb.height - plb.height};
            }
            _windows[type].setBounds(params);
        }
    };
    var allReady = function() {
        engine.webui = engine_webui(settings, engine);
        engine.lastfm = engine_lastfm(settings, engine);
        engine.cloud = engine_cloud(settings, engine);
        engine.notification = engine_notification(settings, engine);
        engine.player = engine_player(settings, engine);
        engine.tags = engine_tags(settings, engine);
        engine.playlist = engine_playlist(settings, engine);
        engine.files = engine_files(settings, engine);
        engine.windowManager = engine_wm(settings, engine);
        chrome.runtime.sendMessage('engine_ready');
    };
    chrome.runtime.onMessage.addListener(function (message) {
        if (message === 'settings_ready') {
            settings = window._settings;
            allReady();
        }
    });
    var readyCount = undefined;
    var loadScript = function() {
        var head = document.head;
        readyCount = arguments.length;
        Array.prototype.forEach.call(arguments, function(name) {
            var el = document.createElement('script');
            el.src = 'scripts/engine/' + name + '.js';
            el.type = 'text/javascript';
            head.appendChild(el);
        });
    };
    if ( window.engine_settings === undefined ) {
        chrome.runtime.onMessage.addListener(function (message) {
            if (readyCount === undefined) {
                return;
            }
            if (message === 'script_ready') {
                readyCount--;
                if (readyCount !== 0) {
                    return;
                }
                readyCount = undefined;
                get_lang();
                engine_settings(engine);
            }
        });
        loadScript('e_cloud', 'e_notification', 'e_player', 'e_playlist',
            'e_tags', 'e_wm', 'e_webui', 'e_files', 'e_lastfm', 'e_settings', 'lang');
    } else {
        engine_settings(engine);
    }
})();