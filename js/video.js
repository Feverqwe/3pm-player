var video = function() {
    var var_cache = {
        panel_show: false,
        panel_timer: undefined,
        volume_timer: undefined
    };
    var dom_cache = {};
    var state = {};
    var timeFormat = function (currentTime) {
        /*
         * Выводит время трека.
         */
        var sec_num = parseInt(currentTime, 10); // don't forget the second parm
        if (isNaN(sec_num))
            return '00:00';
        var hours = Math.floor(sec_num / 3600);
        var minutes = Math.floor((sec_num - (hours * 3600)) / 60);
        var seconds = sec_num - (hours * 3600) - (minutes * 60);

        if (hours < 10) {
            hours = "0" + hours;
        }
        if (minutes < 10) {
            minutes = "0" + minutes;
        }
        if (seconds < 10) {
            seconds = "0" + seconds;
        }
        var time = minutes + ':' + seconds;
        if (parseInt(hours) > 0) {
            time = hours + ':' + time;
        }
        return time;
    };
    var changeTime = function (audio) {
        var time = timeFormat(audio.currentTime);
        if (state.time_text !== time) {
            dom_cache.info_left.text(time);
            state.time_text = time;
        }
    };
    var changeDuration = function (audio) {
        var time = timeFormat(audio.duration);
        dom_cache.info_right.text(time);
    };
    var changeVolume = function(audio) {
        var value = parseInt(audio.volume * 100);
        dom_cache.volume_popup.text(value).show();
        clearTimeout(var_cache.volume_timer);
        var_cache.volume_timer = setTimeout(function() {
            dom_cache.volume_popup.hide();
        }, 1500);
    };
    var gui_update = function() {
        var duration = dom_cache.video.duration;
        var currentTime = dom_cache.video.currentTime;
        var percent = parseInt( currentTime / duration * 1000 );
        if (state.progress_bar !== percent) {
            state.progress_bar = percent;
            dom_cache.progress_bar.slider('value', percent);
        }
        if (state.duration !== duration) {
            changeDuration(dom_cache.video);
            state.duration = duration;
        }
        changeTime(dom_cache.video);
    };
    var show_panels = function() {
        var time = Date.now();
        if (var_cache.show_panel_time > time) {
            return;
        }
        var_cache.show_panel_time = time+500;
        clearTimeout(var_cache.panel_timer);
        if (var_cache.panel_show === false) {
            var_cache.panel_show = true;
            gui_update();
            dom_cache.body.addClass('show');
        }
        var_cache.panel_timer = setTimeout(function() {
            var_cache.panel_show = false;
            dom_cache.body.removeClass('show');
        }, 3000);
    };
    var videoRender = function() {
        dom_cache.body.append(
            $('<div>', {'class': 'top panel'}).append(
                dom_cache.title = $('<div>',{'class':'title'}),
                $('<div>', {'class': 'winResize t_btn', title: chrome.i18n.getMessage("btnResize")}).on('click', function () {
                    var win = chrome.app.window.current();
                    if (document.webkitIsFullScreen || document.webkitHidden || win.isMaximized()) {
                        return;
                    }
                    var vh = dom_cache.video.videoHeight;
                    if (vh === 0) {
                        return;
                    }
                    var vw = dom_cache.video.videoWidth;
                    var wh = window.innerHeight;
                    var ww = window.innerWidth;
                    if (wh - vh < ww - vw ) {
                        ww = (vw * wh) / vh;
                    } else {
                        wh = (vh * ww) / vw;
                    }
                    win.resizeTo( ww, wh );
                }),
                $('<div>', {'class': 'onTop t_btn', title: chrome.i18n.getMessage("btnOnTop") }).on('click', function (e) {
                    e.preventDefault();
                    var appWindow = chrome.app.window.current();
                    if (appWindow.isAlwaysOnTop()) {
                        appWindow.setAlwaysOnTop(false);
                        $(this).removeClass('on');
                    } else {
                        appWindow.setAlwaysOnTop(true);
                        $(this).addClass('on')
                    }
                }),
                dom_cache.btnFullScreen = $('<div>', {'class': 'inFullscreen t_btn', title: chrome.i18n.getMessage("btnFullScreen") }).on('click', function (e) {
                    e.preventDefault();
                    if (document.webkitIsFullScreen) {
                        document.webkitCancelFullScreen();
                    } else {
                        document.documentElement.webkitRequestFullScreen(document.body.ALLOW_KEYBOARD_INPUT);
                    }
                }),
                $('<div>', {'class': 'mini t_btn', title: chrome.i18n.getMessage("btnMinimize") }).on('click', function (e) {
                    e.preventDefault();
                    chrome.app.window.current().minimize();
                }),
                $('<div>', {'class': 'close t_btn', title: chrome.i18n.getMessage("btnClose") }).on('click', function (e) {
                    e.preventDefault();
                    window.close();
                })
            ),
            $('<div>', {'class': 'bottom panel'}).append(
                $('<div>', {'class': 'progress_body'}).append(
                    dom_cache.progress_bar_popup = $('<div>', {'class': 'popup'}),
                    $('<div>', {'class': 'dec_line'}),
                    dom_cache.progress_bar = $('<div>', {'class': 'progress_bar'}).slider({
                        range: "min",
                        min: 0,
                        max: 1000,
                        value: 0,
                        change: function (event, ui) {
                            var lp;
                            if (event.which === undefined) {
                                return;
                            }
                            if (isNaN(ui.value)) {
                                return;
                            }
                            state.progress_bar = ui.value;
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
                            state.progress_bar = ui.value;
                            _send('player', function (window) {
                                window.engine.player.position(ui.value / 10);
                            });
                        }
                    }),
                    dom_cache.info_left = $('<div>', {'class': 'info_left', text: '--:--'}),
                    dom_cache.info_right = $('<div>', {'class': 'info_right', text: '--:--'})
                ),
                $('<div>', {'class': 'controls_body'}).append(
                    $('<div>', {'class': 'controls'}).append(
                        $('<div>', {'class': 'prev', title: chrome.i18n.getMessage("btnPreviousTrack") }).on('click', function(e) {
                            e.preventDefault();
                            _send('player', function(window) {
                                window.engine.playlist.previousTrack();
                            });
                        }),
                        $('<div>', {'class': 'scroll_down', title: chrome.i18n.getMessage("btnScrollDown") }).on('click', function(e) {
                            e.preventDefault();
                            _send('player', function(window) {
                                window.engine.player.position('-10');
                            });
                        }),
                        dom_cache.playpause = $('<div>', {'class': 'playpause paused', title: chrome.i18n.getMessage("btnPlayPause") }).on('click', function(e) {
                            e.preventDefault();
                            _send('player', function(window) {
                                window.engine.player.playToggle();
                            });
                        }),
                        $('<div>', {'class': 'scroll_up', title: chrome.i18n.getMessage("btnScrollUp") }).on('click', function(e) {
                            e.preventDefault();
                            _send('player', function(window) {
                                window.engine.player.position('+10');
                            });
                        }),
                        $('<div>', {'class': 'next', title: chrome.i18n.getMessage("btnNextTrack") }).on('click', function(e) {
                            e.preventDefault();
                            _send('player', function(window) {
                                window.engine.playlist.nextTrack();
                            });
                        })
                    )
                )
            ),
            dom_cache.volume_popup = $('<div>', {'class': 'volume_popup'}),
            dom_cache.video = document.createElement('video')
        );
        var $video = $(dom_cache.video);
        $video.on('pause', function(e) {
            var paused = e.target.paused;
            if (paused) {
                dom_cache.playpause.removeClass('paused');
            } else {
                dom_cache.playpause.addClass('paused');
            }
            chrome.power.releaseKeepAwake();
        }).on('play', function(e) {
            var paused = e.target.paused;
            if (paused) {
                dom_cache.playpause.removeClass('paused');
            } else {
                dom_cache.playpause.addClass('paused');
            }
            chrome.power.requestKeepAwake('display');
        }).on('timeupdate', function(e) {
            if (var_cache.panel_show === false) {
                return;
            }
            var duration = e.target.duration;
            var currentTime = e.target.currentTime;
            var percent = parseInt( currentTime / duration * 1000 );
            if (state.progress_bar !== percent) {
                state.progress_bar = percent;
                dom_cache.progress_bar.slider('value', percent);
            }
            if ( state.duration !== duration ) {
                changeDuration(e.target);
                state.duration = duration;
            }
            changeTime(e.target);
        }).on('volumechange', function(e) {
            if (state.volume !== e.target.volume) {
                state.volume = e.target.volume;
                changeVolume(e.target);
            }
        });
    };
    return {
        show: function() {
            dom_cache.body = $(document.body);
            var_cache.is_winamp = _settings.is_winamp;
            videoRender();
            _config.cb(dom_cache.video);
            dom_cache.body.on('mousemove', '.panel', function(e) {
                show_panels();
            }).on('mouse_panel', '.panel', function(e) {
                show_panels();
            }).on('mouseenter', '.panel', function(e) {
                show_panels();
            });
            show_panels();
            var panels = dom_cache.body.children('.panel');
            panels.get(0).onmousewheel = function (e) {
                _send('player', function(window) {
                    if (e.wheelDelta > 0) {
                        window.engine.player.volume("+10");
                    } else {
                        window.engine.player.volume("-10");
                    }
                });
            };
            panels.get(1).onmousewheel = function (e) {
                _send('player', function(window) {
                    if (e.wheelDelta > 0) {
                        window.engine.player.volume("+10");
                    } else {
                        window.engine.player.volume("-10");
                    }
                });
            };
            dom_cache.progress_bar.on('mousemove', function (e) {
                var time = Date.now();
                if (var_cache.progress_popup_step > time) {
                    return;
                }
                var_cache.progress_popup_step = time + 42;
                var duration = dom_cache.video.duration;
                if (duration === Infinity) {
                    return;
                }
                var persent = e.clientX * 100 / window.innerWidth;
                var sec = duration / 100 * persent;
                if (var_cache.progress_popup_cache !== sec) {
                    var_cache.progress_popup_cache = sec;
                } else {
                    return;
                }
                var text = timeFormat(sec);
                var text_len = text.length;
                if (var_cache.progress_popup_len !== text_len) {
                    var_cache.progress_popup_len = text_len;
                    if (text_len === 5) {
                        dom_cache.progress_bar_popup.css('margin-left', '-15px');
                    } else {
                        dom_cache.progress_bar_popup.css('margin-left', '-24px');
                    }
                }
                dom_cache.progress_bar_popup.text( text );

                if (var_cache.progress_popup_show !== true) {
                    dom_cache.progress_bar_popup.show();
                    var_cache.progress_popup_show = true;
                }
                var left = parseInt(persent * 100) / 100;
                if (var_cache.progress_popup_left !== left) {
                    dom_cache.progress_bar_popup.css('left', left+'%');
                    var_cache.progress_popup_left = left;
                }
                clearTimeout(var_cache.progress_popup_timer);
                var_cache.progress_popup_timer = setTimeout(function() {
                    dom_cache.progress_bar_popup.hide();
                    var_cache.progress_popup_show = false;
                }, 800);
            });
            $(document).on('keydown', function(event) {
                if (event.ctrlKey || event.metaKey) {
                    return;
                }
                if (event.keyCode === 122) {
                    dom_cache.btnFullScreen.trigger('click');
                }
            });
        },
        setTags: function(tags) {
            document.title = tags.title_artist_album;
            dom_cache.title.text(tags.title_artist_album);
        }
    }
}();
$(function() {
    video.show();
});