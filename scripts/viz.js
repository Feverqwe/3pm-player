var viz = function() {
    var audio = undefined;
    var var_cache = {};
    var dom_cache = {};
    var dancerInited = false;
    var _lang = undefined;
    function sendPlayer(callback) {
        /*
         * Функция отправки действий в плеер
         */
        if (window === null) {
            return;
        }
        if (window._player === undefined || window._player.window === null) {
            chrome.runtime.getBackgroundPage(function(bg) {
                window._player = bg.wm.getPlayer();
                if (window._player !== undefined) {
                    callback(window._player);
                }
            });
        } else {
            callback(window._player);
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
                    var coef = window.devicePixelRatio;
                    var win_w = parseInt(window.innerWidth * coef);
                    var win_h = parseInt(window.innerHeight * coef);
                    chrome.storage.local.set({viz_w: win_w, viz_h: win_h});
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
                reality.music.audioAdapter.die();
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
        },
        noViz: function(aid) {
            var msg = _lang.no_viz;
            $('body').append($('<a>', {'class': 'need_addon', target: '_blank', href: 'https://chrome.google.com/webstore/detail/' + aid, text: msg}));
        },
        waitThree: function(url) {
            if ('THREE' in window === false) {
                setTimeout(function() {
                    viz.waitThree(url);
                }, 100);
            } else {
                $('head').append($('<script>', {src: url}));
            }
        }
    };
}();
$(function() {
    window.reality = (typeof reality === 'undefined' ? {} : reality);
    $.extend(true, reality, {timing: {boot: new Date().getTime()}});
    viz.loadlang(function() {
        viz.preload();
        var aid = "pkjkdmdknbppnobblmffeamifdhjhhma";
        var ext_url = "chrome-extension://" + aid + "/viz/";
        $('head').append($('<base>', {href: ext_url}));
        $.ajax({
            url: ext_url + 'ping',
            success: function() {
                viz.run();
                var arr = ["storage.js", "three.min.js"];
                arr.forEach(function(item) {
                    $('head').append($('<script>', {src: ext_url + item}));
                });
                viz.waitThree(ext_url + "boot.js");
            },
            error: function() {
                viz.noViz(aid);
            }
        });
    });
});