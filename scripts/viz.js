var viz = function() {
    var audio = undefined;
    var var_cache = {};
    var dom_cache = {};
    var dancerInited = false;
    var setTags = function(tb) {
        if (dom_cache.track === undefined) {
            return;
        }
        dom_cache.track.empty().append($('<span>', {text: tb.title}), $('<br>'), $('<span>', {text: tb.aa || ''}));
    };
    var write_language = function() {
        $('.t_btn.full').attr('title', _lang.full);
        $('.t_btn.mini').attr('title', _lang.mini);
        $('.t_btn.close').attr('title', _lang.close);
    };
    return {
        preload: function() {
            write_language();
            dom_cache.body = $('body');
            dom_cache.track = $('<div>', {'class': 'track'});
            dom_cache.body.append(dom_cache.track);
            $('.close').on('click', function() {
                window.close();
            });
            $('.mini').on('click', function() {
                chrome.app.window.current().minimize();
            });
            $('.full').on('click', function() {
                /**
                 * @namespace document.webkitIsFullScreen
                 * @namespace document.documentElement.webkitRequestFullScreen
                 * @namespace document.webkitCancelFullScreen
                 */
                if (!document.webkitIsFullScreen) {
                    document.documentElement.webkitRequestFullScreen(document.body.ALLOW_KEYBOARD_INPUT);
                } else {
                    document.webkitCancelFullScreen();
                }
            });
            $(document).on('keydown', function(event) {
                if (event.ctrlKey || event.metaKey) {
                    return;
                }
                if (event.keyCode === 122) {
                    $('.full').trigger('click');
                }
            });
            var bounds_timer;
            var next_step;
            chrome.app.window.current().onBoundsChanged.addListener(function() {
                var time = (new Date).getTime();
                if (next_step > time) {
                    return;
                }
                next_step = time + 450;
                clearTimeout(bounds_timer);
                bounds_timer = setTimeout(function() {
                    if (document.webkitIsFullScreen || document.webkitHidden || chrome.app.window.current().isMaximized()) {
                        return;
                    }
                    var window_left = window.screenLeft;
                    var window_top = window.screenTop;
                    var window_width = window.innerWidth;
                    var window_height = window.innerHeight;
                    if (var_cache.window_left !== window_left || var_cache.window_top !== window_top
                            || var_cache.window_width !== window_width || var_cache.window_height !== window_height) {
                        var_cache.window_left = window_left;
                        var_cache.window_top = window_top;
                        var_cache.window_height = window_height;
                        var_cache.window_width = window_width;
                        chrome.storage.local.set({viz_pos_left: window_left, viz_pos_top: window_top, viz_w: window_width, viz_h: window_height});
                    }
                }, 500);
            });
        },
        run: function() {
            chrome.power.requestKeepAwake('display');
            _send('player', function(window) {
                audio = window.engine.player.getAudio();
                setTags(window.engine.tags.getTagBody());
                window.engine.setHotkeys(document);
            });
        },
        audio_state: function(key, value) {
            if (dancerInited === false && key === "loadedmetadata") {
                if (reality.loadMusic !== undefined) {
                    reality.loadMusic(audio);
                }
                return;
            }
            if (key === "track") {
                setTags(value);
            }
        },
        getAudio: function() {
            return audio;
        },
        getAdapter: function(cb) {
            _send('player', function(window) {
                cb(window.engine.player.getAdapter());
            });
        },
        dancerInit: function(val) {
            dancerInited = val;
        },
        randomPreset: function() {
            if (reality.randomPreset !== undefined) {
                reality.randomPreset();
            }
        },
        waitThree: function(url) {
            if (window.THREE === undefined) {
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
    if (window.reality === undefined) {
        window.reality = {};
    }
    $.extend(true, reality, {timing: {boot: new Date().getTime()}});
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
            var msg = _lang.no_viz;
            $('body').append($('<a>', {'class': 'need_addon', target: '_blank', href: 'https://chrome.google.com/webstore/detail/' + aid, text: msg}));
        }
    });
});