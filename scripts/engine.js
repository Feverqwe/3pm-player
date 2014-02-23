var _debug = false;
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
var run_engine = function () {
    window.run_engine = undefined;
    //options
    var boot = true;
    var settings = window._settings = {
        next_track_notification: 0,
        extend_volume_scroll: 0,
        notifi_buttons: 0,
        is_winamp: 0,
        visual_type: '1',
        foreign_tracks: 0,
        preload_vk: 0,
        preload_db: 0,
        preload_sc: 0,
        preload_gd: 1,
        preload_box: 1,
        preload_sd: 0,
        lastfm: 0,
        lastfm_info: 1,
        lastfm_cover: 1,
        webui_port: 9898,
        webui_interface: 'Any',
        webui_run_onboot: 0,
        vk_tag_update: 0,
        pined_playlist: 0,
        pin_position: 2
    };
    var engine = window.engine = {
        loadSettings: function (obj) {
            var changes = {};
            for (var key in settings) {
                if (!settings.hasOwnProperty(key)) {
                    continue;
                }
                if (obj[key] !== undefined && settings[key] !== obj[key]) {
                    settings[key] = obj[key];
                    changes[key] = obj[key];
                }
            }
            if (boot) {
                chrome.runtime.sendMessage('settings_ready');
                boot = false;
                return;
            }
            if (changes.is_winamp !== undefined) {
                chrome.runtime.reload();
            }
            if ((changes.webui_port !== undefined || changes.webui_interface !== undefined) && engine.webui.active()) {
                engine.webui.start();
            }
            chrome.runtime.sendMessage({settings: changes});
        },
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
    engine.webui = engine_webui(settings, engine);
    engine.lastfm = engine_lastfm(settings, engine);
    engine.cloud = engine_cloud(settings, engine);
    engine.notification = engine_notification(settings, engine);
    engine.player = engine_player(settings, engine);
    engine.tags = engine_tags(settings, engine);
    engine.playlist = engine_playlist(settings, engine);
    engine.files = engine_files(settings, engine);
    engine.windowManager = engine_wm(settings, engine);
    var list = [];
    for (var key in settings) {
        if (!settings.hasOwnProperty(key)) {
            continue;
        }
        list.push(key);
    }
    chrome.storage.local.get(list, function (obj) {
        engine.loadSettings(obj);
    });
};
(function () {
    var loading_timer = 10;
    var check_count = 0;
    var engine_modules = ['e_cloud', 'e_notification', 'e_player', 'e_playlist',
        'e_tags', 'e_wm', 'e_webui', 'e_files', 'e_lastfm'];
    var engine_loading = function () {
        var dune = true;
        engine_modules.forEach(function (name) {
            if (window['engin' + name] === undefined) {
                dune = false;
                return 0;
            }
        });
        if (!dune) {
            if (check_count < 10) {
                check_count++;
            } else if (check_count === 10) {
                loading_timer = 1000;
            }
            setTimeout(function () {
                engine_loading();
            }, loading_timer);
        } else {
            run_engine();
        }
    };
    if (!window.minimize_mode) {
        var s = document.getElementsByTagName('script')[0];
        engine_modules.forEach(function (src) {
            var script = document.createElement('script');
            script.type = 'text/javascript';
            script.async = true;
            script.src = 'scripts/engine/' + src + '.js';
            s.parentNode.insertBefore(script, s);
        });
    }
    engine_loading();
})();