var video = function() {
    var var_cache = {};
    var dom_cache = {};
    var write_language = function() {
        $('.t_btn.full').attr('title', _lang.full);
        $('.t_btn.mini').attr('title', _lang.mini);
        $('.t_btn.close').attr('title', _lang.close);
    };
    var setTags = function(tb) {
        if (dom_cache.track === undefined) {
            return;
        }
        dom_cache.track.empty().append($('<span>', {text: tb.title + ((tb.aa !== undefined)?' - '+tb.aa:'')}));
    };
    return {
        run: function () {
            dom_cache.control_panels = $('.mouse_panel');
            write_language();
            $('.close').on('click', function() {
                window.close();
            });
            $('.mini').on('click', function() {
                chrome.app.window.current().minimize();
            });
            $('.full').on('click', function() {
                if (!document.webkitIsFullScreen) {
                    document.documentElement.webkitRequestFullScreen();
                } else {
                    document.webkitCancelFullScreen();
                }
            });
            var mouse_move_timer;
            var mouse_step;
            dom_cache.control_panels.on('mousemove', function() {
                var time = (new Date).getTime();
                if (mouse_step > time) {
                    return;
                }
                dom_cache.control_panels.addClass('show');
                mouse_step = time + 1000;
                clearTimeout(mouse_move_timer);
                mouse_move_timer = setTimeout(function() {
                    dom_cache.control_panels.removeClass('show');
                }, 3000);
            });
            dom_cache.control_panels.on('mouseup', function() {
                dom_cache.control_panels.trigger('mousemove');
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
                        chrome.storage.local.set({video_pos_left: window_left, video_pos_top: window_top, video_w: window_width, video_h: window_height});
                    }
                }, 500);
            });
            dom_cache.btnPlayPause = $('.controls .playpause.btn');
            dom_cache.btnPrev = $('.controls .prev.btn');
            dom_cache.btnNext = $('.controls .next.btn');
            dom_cache.btnScrolllUp = $('.controls .scroll_up.btn');
            dom_cache.btnScrolllDown = $('.controls .scroll_down.btn');
            dom_cache.track = $('.top_panel > .track');
            dom_cache.video = $('video')[0];
            $(dom_cache.video).on('play', function () {
                dom_cache.btnPlayPause.removeClass('play').addClass('pause');
                chrome.power.requestKeepAwake('display');
            });
            $(dom_cache.video).on('pause', function () {
                dom_cache.btnPlayPause.removeClass('pause').addClass('play');
                chrome.power.releaseKeepAwake();
            });
            dom_cache.btnPlayPause.on('click', function () {
                _send('player', function (window) {
                    window.engine.player.playToggle();
                });
            });
            dom_cache.btnPrev.on('click', function () {
                _send('player', function (window) {
                    window.engine.playlist.preview();
                });
            });
            dom_cache.btnNext.on('click', function () {
                _send('player', function (window) {
                    window.engine.playlist.next();
                });
            });
            dom_cache.btnScrolllUp.on('click', function () {
                _send('player', function (window) {
                    window.engine.player.position('+10');
                });
            });
            dom_cache.btnScrolllDown.on('click', function () {
                _send('player', function (window) {
                    window.engine.player.position('-10');
                });
            });
            _send('player', function(window) {
                window.engine.setHotkeys(document);
            });
            if (window.options === undefined) {
                return;
            }
            _send('player', function(window) {
                window.engine.player.switchMedia(dom_cache.video);
            });
            dom_cache.video.src = options.src;
        },
        getVideo: function() {
            return dom_cache.video;
        },
        audio_state: function (key, value) {
            if (key === "track") {
                setTags(value);
            }
        }
    };
}();
$(function() {
    video.run();
});