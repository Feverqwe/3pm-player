var video = function() {
    var var_cache = {};
    var write_language = function() {
        $('.t_btn.full').attr('title', _lang.full);
        $('.t_btn.mini').attr('title', _lang.mini);
        $('.t_btn.close').attr('title', _lang.close);
    };
    return {
        run: function () {
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
            var_cache.video = $('video')[0];
            _send('player', function(window) {
                window.engine.setHotkeys(document);
            });
            if (window.options === undefined) {
                return;
            }
            _send('player', function(window) {
                window.engine.player.switchMedia(var_cache.video);
            });
            var_cache.video.src = options.src;
        },
        getVideo: function() {
            return var_cache.video;
        }
    };
}();
$(function() {
    video.run();
});