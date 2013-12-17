var viz = function() {
    var audio = undefined;
    var var_cache = {};
    var dom_cache = {};
    var dancerInited = false;
    var _player_window = undefined;
    var _lang = undefined;
    function sendPlayer(callback) {
        /*
         * Функция отправки действий в плеер
         */
        if (_player_window === undefined || _player_window.window === null) {
            chrome.runtime.getBackgroundPage(function(bg) {
                _player_window = bg.wm.getPlayer();
                if (_player_window !== undefined) {
                    callback(_player_window);
                }
            });
        } else {
            callback(_player_window);
        }
    }
    var setTags = function(value) {
        if ("track" in dom_cache === false) {
            return;
        }
        dom_cache.track.empty().append($('<span>', {text: value[0]}), $('<br>'), $('<span>', {text: value[1]}));
    };
    var write_language = function() {
        $('.t_btn.full').attr('title', _lang.full);
        $('.t_btn.mini').attr('title', _lang.mini);
        $('.t_btn.close').attr('title', _lang.close);
    };
    return {
        loadlang: function(cb) {
            sendPlayer(function(window) {
                _lang = window._lang;
                write_language();
                cb();
            });
        },
        preload: function() {
            dom_cache.body = $('body');
            dom_cache.track = $('<div>', {'class': 'track'});
            dom_cache.body.append(dom_cache.track);
            window.onresize = function() {
                clearTimeout(var_cache.resize_timer);
                var_cache.resize_timer = setTimeout(function() {
                    if (document.webkitIsFullScreen) {
                        return;
                    }
                    chrome.storage.local.set({viz_w: window.innerWidth, viz_h: window.innerHeight});
                }, 500);
            };
            $(window).trigger('resize');
            var save_pos = function() {
                if (document.webkitIsFullScreen || document.webkitHidden) {
                    return;
                }
                var wl = window.screenLeft;
                var wr = window.screenTop;
                if (var_cache['wl'] !== wl || var_cache['wr'] !== wr) {
                    var_cache['wl'] = wl;
                    var_cache['wr'] = wr;
                    chrome.storage.local.set({'viz_pos_left': wl, 'viz_pos_top': wr});
                }
            };
            $('.close').on('click', function() {
                save_pos();
                sendPlayer(function(window) {
                    window.engine.discAdapter();
                });
                window.close();
            });
            $('.mini').on('click', function() {
                chrome.app.window.current().minimize();
            });
            $('.full').on('click', function() {
                if (!document.webkitIsFullScreen) {
                    document.documentElement.webkitRequestFullScreen(Element.ALLOW_KEYBOARD_INPUT);
                } else {
                    document.webkitCancelFullScreen();
                }
            });
            setInterval(function() {
                save_pos();
                chrome.runtime.getBackgroundPage(function(bg) {
                    bg.wm.hi("viz", chrome.app.window.current());
                });
            }, 5000);
        },
        run: function() {
            sendPlayer(function(window) {
                audio = window.engine.getAudio();
                setTags(window.engine.getTagBody());
                window.engine.set_hotkeys(document);
            });
        },
        audio_state: function(key, value) {
            if (dancerInited === false && key === "loadedmetadata") {
                if ("loadMusic" in reality) {
                    reality.loadMusic(audio);
                }
                return;
            }
            if (key === "track") {
                setTags(value);
                return;
            }
        },
        getAudio: function() {
            return audio;
        },
        getAdapter: function(cb) {
            sendPlayer(function(window) {
                cb(window.engine.getAdapter());
            });
        },
        dancerInit: function(val) {
            dancerInited = val;
        },
        randomPreset: function() {
            if ("randomPreset" in reality) {
                reality.randomPreset();
            }
        },
        minimize: function() {
            $('.mini').trigger('click');
        },
        GetLang: function() {
            return _lang;
        }
    };
}();
$(function() {
    viz.loadlang(function() {
        viz.preload();
        var aid = "pkjkdmdknbppnobblmffeamifdhjhhma";
        var ext_url = "chrome-extension://" + aid + "/viz/";
        window.reality = (typeof reality === 'undefined' ? {} : reality);
        $.extend(true, reality, {timing: {boot: new Date().getTime()}});
        var add_script = function(path) {
            var script = document.createElement('script');
            script.type = 'text/javascript';
            script.async = false;
            script.src = ext_url + path;
            var s = document.getElementsByTagName('script')[0];
            s.parentNode.insertBefore(script, s);
        };
        $('head').append($('<base>', {href: ext_url}));
        $.ajax({
            url: ext_url + 'ping',
            success: function() {
                viz.run();
                var arr = ["dancer.js", "support.js", "kick.js", "adapterWebkit.js", "lib/fft.js", "plugins/dancer.fft.js", "plugins/dancer.waveform.js", "three.min.js", "boot.js"];
                arr.forEach(function(item) {
                    add_script(item);
                });
            },
            error: function() {
                var msg = 'Need install visualizatitoin extension!';
                var _lang = viz.GetLang();
                msg = _lang.no_viz || msg;
                $('body').append($('<a>', {'class': 'need_addon', target: '_blank', href: 'https://chrome.google.com/webstore/detail/' + aid, text: msg}));
            }
        });
    });
});