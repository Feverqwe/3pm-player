var video = function() {
    var uiIsShow = true;
    var var_cache = {};
    var dom_cache = {};
    var write_language = function() {
        $('.t_btn.full').attr('title', _lang.full);
        $('.t_btn.mini').attr('title', _lang.mini);
        $('.t_btn.close').attr('title', _lang.close);
        $('.btn.prev').attr('title', _lang.prev);
        $('.btn.playpause').attr('title', _lang.play_pause);
        $('.btn.next').attr('title', _lang.next);
        $('.btn.scroll_up').attr('title', _lang.scroll_up);
        $('.btn.scroll_down').attr('title', _lang.scroll_down);
    };
    var showVolume = function (volume) {
        var value = parseInt(volume * 100);
        dom_cache.volume_value.text(value).show();
        clearTimeout(var_cache.volume_show_timer);
        var_cache.volume_show_timer = setTimeout(function() {
            dom_cache.volume_value.hide();
        }, 1500);
    };
    var setTags = function(tb) {
        if (dom_cache.track === undefined) {
            return;
        }
        dom_cache.track.empty().append($('<span>', {text: tb.title + ((tb.aa !== undefined)?' - '+tb.aa:'')}));
    };
    var infoLeft = function (currentTime) {
        if (var_cache.infoLeft === currentTime) {
            return;
        }
        var_cache.infoLeft = currentTime;
        _send('player', function (window) {
            dom_cache.info_left.text(window.view.toHHMMSS(currentTime));
        });
    };
    var infoRight = function (duration) {
        if (var_cache.infoRight === duration) {
            return;
        }
        var_cache.infoRight = duration;
        _send('player', function (window) {
            dom_cache.info_right.text(window.view.toHHMMSS(duration));
        });
    };
    var updateUi = function () {
        var pos = dom_cache.video.currentTime;
        var max = dom_cache.video.duration;
        var width_persent = pos / max * 100;
        dom_cache.progress.slider("value", width_persent * 10);
        infoLeft(pos);
        infoRight(max);
    };
    var show_panels = function(force) {
        if (force) {
            var_cache.bad_bump = 0;
            var_cache.panel_hide = false;
        }
        if (var_cache.panel_hide === true) {
            if (var_cache.bad_bump > 1) {
                var_cache.bad_bump = 0;
                var_cache.panel_hide = false;
            } else {
                var_cache.bad_bump++;
                return;
            }
        }
        var time = (new Date).getTime();
        if (var_cache.mouse_step > time) {
            return;
        }
        if (!uiIsShow) {
            updateUi();
            uiIsShow = true;
            dom_cache.control_panels.addClass('show');
        }
        var_cache.mouse_step = time + 1000;
        clearTimeout(var_cache.mouse_move_timer);
        var_cache.mouse_move_timer = setTimeout(function() {
            var_cache.bad_bump = 0;
            var_cache.panel_hide = true;
            dom_cache.control_panels.removeClass('show');
            uiIsShow = false;
        }, 3000);
    };
    return {
        run: function () {
            dom_cache.control_panels = $('.mouse_panel');
            dom_cache.bottom_panel = $('.bottom_panel');
            dom_cache.top_panel = $('.top_panel');
            dom_cache.volume_value = $('.volume_value');
            var_cache.bad_bump = 0;
            write_language();
            $('.close').on('click', function() {
                window.close();
            });
            $('.mini').on('click', function() {
                chrome.app.window.current().minimize();
            });
            $('.full').on('click', function() {
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
            $('body').on('mousemove', '.mouse_panel', function () {
                show_panels();
            });
            $('body').on('mouseup', '.mouse_panel', function () {
                show_panels(1);
            });
            $('body').on('mouseenter', '.mouse_panel', function () {
                show_panels(1);
            });
            show_panels();
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
            dom_cache.track = $('.top_panel .track');
            dom_cache.progress_body = $('.bottom_panel .progress_body');
            dom_cache.progress = dom_cache.progress_body.children('.progress');
            dom_cache.info_left = dom_cache.progress_body.children('.info_left');
            dom_cache.info_right = dom_cache.progress_body.children('.info_right');
            dom_cache.progress_popup = $('.progress_popup');
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
            var popup_timer;
            var popup_step;
            dom_cache.progress.on('mousemove', function (e) {
                var time = (new Date).getTime();
                if (popup_step > time) {
                    return;
                }
                popup_step = time + 42;
                var duration = dom_cache.video.duration;
                if (duration === Infinity) {
                    return;
                }
                var persent = e.clientX * 100 / window.innerWidth;
                var sec = duration / 100 * persent;
                if (var_cache.popup_cache !== sec) {
                    var_cache.popup_cache = sec;
                } else {
                    return;
                }
                _send('player', function (window) {
                    var text = window.view.toHHMMSS(sec);
                    var text_len = text.length;
                    if (dom_cache.progress_popup_len !== text_len) {
                        dom_cache.progress_popup_len = text_len;
                        if (text_len === 5) {
                            dom_cache.progress_popup.css('margin-left', '-15px');
                        } else {
                            dom_cache.progress_popup.css('margin-left', '-24px');
                        }
                    }
                    dom_cache.progress_popup.text( text );
                });
                if (var_cache.popup_show !== true) {
                    dom_cache.progress_popup.show();
                    var_cache.popup_show = true;
                }
                var left = parseInt(persent * 100) / 100;
                if (var_cache.popup_left !== left) {
                    dom_cache.progress_popup.css('left', left+'%');
                    var_cache.popup_left = left;
                }
                clearTimeout(popup_timer);
                popup_timer = setTimeout(function() {
                    dom_cache.progress_popup.hide();
                    var_cache.popup_show = false;
                }, 800);
            });
            dom_cache.progress.slider({
                range: "min",
                min: 0,
                max: 1000,
                change: function (event, ui) {
                    if (event.which === undefined) {
                        return;
                    }
                    if (isNaN(ui.value)) {
                        return;
                    }
                    _send('player', function (window) {
                        window.engine.player.position(ui.value / 10);
                    });
                },
                slide: function (event, ui) {
                    if (event.which === undefined) {
                        return;
                    }
                    if (isNaN(ui.value)) {
                        return;
                    }
                    _send('player', function (window) {
                        window.engine.player.position(ui.value / 10);
                    });
                }
            });
            $(dom_cache.video).on('timeupdate', function () {
                if (uiIsShow) {
                    var pos = this.currentTime;
                    var max = this.duration;
                    var width_persent = pos / max * 100;
                    dom_cache.progress.slider("value", width_persent * 10);
                    infoLeft(pos);
                    infoRight(max);
                }
            });
            $(dom_cache.video).on('volumechange', function () {
                showVolume(this.volume);
            });
            dom_cache.control_panels.get(0).onmousewheel = function (e) {
                _send('player', function(window) {
                    if (e.wheelDelta > 0) {
                        window.engine.player.volume("+10");
                    } else {
                        window.engine.player.volume("-10");
                    }
                });
            };
            dom_cache.control_panels.get(1).onmousewheel = function (e) {
                _send('player', function(window) {
                    if (e.wheelDelta > 0) {
                        window.engine.player.volume("+10");
                    } else {
                        window.engine.player.volume("-10");
                    }
                });
            };
            //===================================
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