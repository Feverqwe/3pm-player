var wm1 = function() {
    var windows = {};
    var screen = [window.screen.width, window.screen.height];
    var dpr = window.devicePixelRatio;
    if (dpr === undefined) {
        dpr = 1;
    }
    var win_top_left_pos = function(l, t) {
        if (l === undefined || l > screen[0]) {
            l = 30;
        }
        if (t === undefined || t > screen[1] - 30) {
            t = 30;
        }
        if (l < 0) {
            l = 0;
        }
        if (t < 0) {
            t = 0;
        }
        return [l, t];
    };
    var win_w_h_pos = function(w, h) {
        if (w !== undefined && (w < 50 || w > screen[0])) {
            w = undefined;
        }
        if (h !== undefined && (h < 50 || h > screen[1])) {
            h = undefined;
        }
        return [w, h];
    };
    var create_player_window = function() {
        var create_window = function(p_l, p_t, lang) {
            chrome.app.window.create('index.html', {
                bounds: {
                    width: parseInt(335 * dpr),
                    height: parseInt(116 * dpr),
                    left: p_l,
                    top: p_t
                },
                frame: "none",
                resizable: false
            }, function(win) {
                windows.player = win;
                win.contentWindow.language = lang;
            });
        };
        chrome.storage.local.get(['pos_left', 'pos_top', 'lang'], function(storage) {
            var lt = win_top_left_pos(storage.pos_left, storage.pos_top);
            create_window(lt[0], lt[1], storage.lang);
        });
    };
    var create_playlist_window = function() {
        var create_window = function(p_l, p_t, pl_w, pl_h) {
            chrome.app.window.create('playlist.html', {
                bounds: {
                    width: pl_w || parseInt(335 * dpr),
                    height: pl_h || parseInt(400 * dpr),
                    left: p_l,
                    top: p_t
                },
                frame: "none"
            }, function(win) {
                win.contentWindow._player = windows.player.contentWindow.window || undefined;
                windows.playlist = win;
            });
        };
        chrome.storage.local.get(['pl_pos_left', 'pl_pos_top', 'pl_w', 'pl_h'], function(storage) {
            var lt = win_top_left_pos(storage.pl_pos_left, storage.pl_pos_top);
            var wh = win_w_h_pos(storage.pl_w, storage.pl_h);
            create_window(lt[0], lt[1], wh[0], wh[1]);
        });
    };
    var create_viz_window = function() {
        var create_window = function(p_l, p_t, pl_w, pl_h) {
            chrome.app.window.create('viz.html', {
                bounds: {
                    width: pl_w || parseInt(1024 * dpr),
                    height: pl_h || parseInt(768 * dpr),
                    left: p_l,
                    top: p_t
                },
                frame: "none"
            }, function(win) {
                win.contentWindow._player = windows.player.contentWindow.window || undefined;
                windows.viz = win;
            });
        };
        chrome.storage.local.get(['viz_pos_left', 'viz_pos_top', 'viz_w', 'viz_h'], function(storage) {
            var lt = win_top_left_pos(storage.viz_pos_left, storage.viz_pos_top);
            var wh = win_w_h_pos(storage.viz_w, storage.viz_h);
            create_window(lt[0], lt[1], wh[0], wh[1]);
        });
    };
    var create_dialog_window = function(options) {
        if (windows.dialog !== undefined) {
            if (windows.dialog.contentWindow.window === null) {
                delete windows.dialog;
            } else {
                windows.dialog.contentWindow.close();
            }
        }
        options.w = options.w || 400;
        options.h = options.h || 120;
        var w = options.w;
        var h = options.h;
        w = parseInt(w * dpr);
        h = parseInt(h * dpr);
        var create_window = function(p_l, p_t) {
            chrome.app.window.create('dialog.html', {
                bounds: {
                    width: w,
                    height: h,
                    left: p_l,
                    top: p_t
                },
                frame: "none",
                resizable: options.r || false
            }, function(win) {
                win.contentWindow._player = windows.player.contentWindow.window || undefined;
                win.contentWindow.options = options;
                windows.dialog = win;
            });
        };
        var lt = win_top_left_pos(screen[0] / 2 - parseInt(w / 2), screen[1] / 2 - parseInt(h / 2));
        create_window(lt[0], lt[1]);
    };
    var create_option_window = function() {
        if (windows.option !== undefined) {
            if (windows.option.contentWindow.window === null) {
                delete windows.option;
            } else {
                windows.option.contentWindow.close();
            }
        }
        w = 820;
        h = 600;
        var w = w;
        var h = h;
        w = parseInt(w * dpr);
        h = parseInt(h * dpr);
        var create_window = function(p_l, p_t) {
            chrome.app.window.create('options.html', {
                bounds: {
                    width: w,
                    height: h,
                    left: p_l,
                    top: p_t
                },
                frame: "chrome",
                resizable: true
            }, function(win) {
                win.contentWindow._player = windows.player.contentWindow.window || undefined;
                windows.option = win;
            });
        };
        var lt = win_top_left_pos(screen[0] / 2 - parseInt(w / 2), screen[1] / 2 - parseInt(h / 2));
        create_window(lt[0], lt[1]);
    };
    var check = function() {
        var player_off = true;
        if (windows.player !== undefined) {
            if (windows.player.contentWindow.window === null) {
                delete windows.player;
            } else {
                player_off = false;
            }
        }
        if (windows.playlist !== undefined) {
            if (player_off) {
                windows.playlist.contentWindow.close();
            }
            if (windows.playlist.contentWindow.window === null) {
                delete windows.playlist;
            }
        }
        if (windows.viz !== undefined) {
            if (player_off) {
                windows.viz.contentWindow.close();
            }
            if (windows.viz.contentWindow.window === null) {
                delete windows.viz;
            }
        }
        return 1;
    };
    return {
        run_player: function() {
            if (check() && windows.player === undefined) {
                create_player_window();
            } else {
                if (windows.viz !== undefined) {
                    windows.viz.focus();
                }
                if (windows.playlist !== undefined) {
                    windows.playlist.focus();
                }
                windows.player.focus();
            }
        },
        toggle_playlist: function() {
            if (check() && windows.playlist !== undefined) {
                windows.playlist.contentWindow.close();
            } else {
                create_playlist_window();
            }
        },
        getPlayer: function() {
            return (check() && windows.player !== undefined) ? windows.player.contentWindow.window : undefined;
        },
        getPlaylist: function() {
            return (check() && windows.playlist !== undefined) ? windows.playlist.contentWindow.window : undefined;
        },
        getViz: function() {
            return (check() && windows.viz !== undefined) ? windows.viz.contentWindow.window : undefined;
        },
        showViz: function() {
            if (check() && windows.viz !== undefined) {
                windows.viz.contentWindow.close();
            } else {
                create_viz_window();
            }
        },
        showDialog: function(options) {
            if (options.type === 'm3u') {
                var len = 3;
                if (options.playlists !== undefined) {
                    len = options.playlists.length;
                }
                if (len === 0) {
                    len = 1;
                }
                if (len > 8) {
                    len = 8;
                }
                options.h = len * 52 + 43;
            } else
            if (options.type === 'menu') {
                var len = 14;
                if (options.list !== undefined) {
                    len = 0;
                    for (var index in options.list) {
                        var item = options.list[index];
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
                options.h = len * 19 + 40;
            }
            create_dialog_window(options);
        },
        showOptions: function() {
            create_option_window();
        },
        ws: web_socket,
        hi: function(type, win) {
            if (windows[type] === undefined) {
                windows[type] = win;
            }
        }
    };
};
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
                sub_window._focus_all = function() {
                    var windows = sub_window._windows;
                    for (var i in windows) {
                        if (i === 'player') {
                            continue;
                        }
                        windows[i].focus();
                    }
                    windows['player'].focus();
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