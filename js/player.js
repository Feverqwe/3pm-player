/**
 * @namespace chrome.fileSystem.chooseEntry
 * @namespace chrome.contextMenus.removeAll
 * @namespace document.webkitHidden
 * @namespace chrome.app.window.current.onBoundsChanged
 */
window.player = function () {
    var dom_cache = {};
    var var_cache = {
        // кэш стиля иконки звука
        valume_style: undefined,
        // таймер при скролле мыши над прогресс баром
        progress_timer: undefined,
        // таймер при drag & drop
        drop_timer: undefined,
        // визуализация для winmap
        winamp_dancer: undefined,
        // состояние скина
        is_winamp: false,
        // кэш состояния empty
        player_is_empty: true,
        change_cover_timer: undefined
    };
    var state = {
        paused: true,
        muted: false,
        volume: 100,
        time_format: 0,
        preload: undefined,
        progress_bar: 0,
        time_text: '00:00',
        duration: undefined,
        loading: false,
        waiting: false,
        error: false,
        download: undefined,
        picture: undefined,
        empty: true
    };
    var changePlayState = function () {
        var $this = dom_cache.playpause;
        if (state.paused) {
            $this.removeClass('paused');
            if (var_cache.is_winamp) {
                dom_cache.body.attr('data-state', 'pause');
            }
        } else {
            $this.addClass('paused');
            if (var_cache.is_winamp) {
                dom_cache.body.attr('data-state', 'play');
            }
        }
    };
    var setImage = function (id) {
        if (state.picture === id) {
            return;
        }
        state.picture = id;
        clearTimeout(var_cache.change_cover_timer);
        if (id === undefined) {
            var_cache.change_cover_timer = setTimeout(function() {
                dom_cache.picture.css('background-image', '');
            }, 250);
            return;
        }
        var url = engine.tags.cover[id].url;
        dom_cache.picture.css('background-image', 'url(' + url + ')');
    };
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
    var make_extend_volume = function (extend_volume_scroll) {
        /*
         * Расширяет область изменения громкости колесиком мыши.
         */
        var boxState = dom_cache.player_box.hasClass('volume_scroll');
        if (!extend_volume_scroll === !boxState) {
            return;
        }
        if (extend_volume_scroll) {
            dom_cache.player_box.unbind('mousewheel').addClass('volume_scroll').on('mousewheel', function (e) {
                if (e.target.className === 'image') {
                    return;
                }
                if (e.originalEvent.wheelDelta > 0) {
                    engine.player.volume("+10");
                } else {
                    engine.player.volume("-10");
                }
            });
        } else {
            dom_cache.player_box.unbind('mousewheel').removeClass('volume_scroll');
        }
    };
    var calculateMoveble = function (titles, size, classname) {
        /*
         * Расчитывает стиль прокрутки длиных имен. для Winmap.
         */
        var titles_l = titles.length;

        for (var i = 0; i < titles_l; i++) {
            var str_w = titles.eq(i).width();
            if (str_w <= size) {
                titles.eq(i).parent().attr('class', classname);
                continue;
            }
            str_w = Math.ceil(str_w / 10);
            if (str_w > 10) {
                if (str_w < 100) {
                    var t1 = Math.round(str_w / 10);
                    if (t1 > str_w / 10)
                        str_w = t1 * 10 * 10;
                    else
                        str_w = (t1 * 10 + 5) * 10;
                } else
                    str_w = str_w * 10;
            } else
                str_w = str_w * 10;
            var time_calc = Math.round(parseInt(str_w) / parseInt(size) * 3.5);
            var move_name = 'moveble' + '_' + size + '_' + str_w;
            if (dom_cache.body.children('.' + move_name).length === 0) {
                dom_cache.body.append($('<style>', {'class': move_name, text: '@-webkit-keyframes a_' + move_name
                    + '{'
                    + '0%{margin-left:2px;}'
                    + '50%{margin-left:-' + (str_w - size) + 'px;}'
                    + '90%{margin-left:6px;}'
                    + '100%{margin-left:2px;}'
                    + '}'
                    + 'div.' + move_name + ':hover > span {'
                    + 'overflow: visible;'
                    + '-webkit-animation:a_' + move_name + ' ' + time_calc + 's;'
                    + '}'}));
            }
            titles.eq(i).parent().attr('class', classname + ' ' + move_name);
        }
    };
    var setTrueText = function (title, album) {
        if (var_cache.is_winamp) {
            return;
        }
        if (dom_cache.truetext === undefined) {
            dom_cache.truetext = {};
        }
        var title_scroller = false;
        var album_scroller = false;
        var max_title_line = 2;
        var max_album_line = 2;
        var tmp_node = $('<div>', {style: 'line-height: normal; font-size: 130%; width: 232px; word-wrap: break-word; overflow: hidden; display: none;', text: title}).appendTo(dom_cache.body);
        var title_height = tmp_node.height();
        if (dom_cache.truetext.title_one_line_height === undefined) {
            tmp_node.text('.');
            dom_cache.truetext.title_one_line_height = tmp_node.height();
        }
        var title_line = parseInt(title_height / dom_cache.truetext.title_one_line_height);
        tmp_node.remove();
        tmp_node = $('<div>', {style: 'line-height: normal; font-size: 110%; width: 232px; word-wrap: break-word; overflow: hidden; display: none;', text: album}).appendTo(dom_cache.body);
        var album_height = tmp_node.height();
        if (dom_cache.truetext.album_one_line_height === undefined) {
            tmp_node.text('.');
            dom_cache.truetext.album_one_line_height = tmp_node.height();
        }
        var album_line = parseInt(album_height / dom_cache.truetext.album_one_line_height);
        tmp_node.remove();
        if (album.length === 0) {
            max_title_line = 3;
            album_line = 0;
        }
        if (title_line > max_title_line) {
            title_scroller = true;
            title_line = 1;
        }
        if (album_line > max_album_line) {
            album_scroller = true;
            album_line = 1;
        }
        if (title_line === 2) {
            if (album_line > 1) {
                album_scroller = true;
            }
        }
        if (title_line === 1) {
            if (album_line > 2) {
                album_scroller = true;
            }
        }
        if (album_scroller) {
            dom_cache.trackalbum.parent().addClass('scroller');
            calculateMoveble(dom_cache.trackalbum, dom_cache.trackalbum.parent().width(), 'album scroller');
        } else {
            dom_cache.trackalbum.parent().attr('class', 'album');
        }
        if (title_scroller) {
            dom_cache.trackname.parent().addClass('scroller');
            calculateMoveble(dom_cache.trackname, dom_cache.trackname.parent().width(), 'name scroller');
        } else {
            dom_cache.trackname.parent().attr('class', 'name');
        }
    };
    var volume2style = function (value) {
        if (value > 70) {
            return 'v100';
        }
        if (value > 40) {
            return 'v50';
        }
        if (value > 0) {
            return 'v10';
        }
        return 'v0';
    };
    var changeMuteIcon = function () {
        var $this = dom_cache.volume_icon;
        if (state.muted) {
            $this.addClass('muted');
        } else {
            $this.removeClass('muted');
        }
    };
    var changeVolumeIcon = function (value) {
        var style = volume2style(value);
        if (var_cache.valume_style === style) {
            return;
        }
        var_cache.valume_style = style;
        dom_cache.volume_icon.removeClass('v0 v10 v50 v100').addClass( style );
    };
    var changeLoadingStyle = function () {
        if (state.loading) {
            dom_cache.progress_bar.addClass('loading');
        } else {
            dom_cache.progress_bar.removeClass('loading');
        }
    };
    var changeProgressBarMode = function () {
        if (state.duration === Infinity) {
            dom_cache.progress_bar.addClass('stream');
        } else {
            dom_cache.progress_bar.removeClass('stream');
        }
    };
    var changeStateIcon = function (audio) {
        if (state.waiting) {
            dom_cache.stateIcon.addClass('waiting');
        } else {
            dom_cache.stateIcon.removeClass('waiting');
        }
        if (state.error && audio) {
            dom_cache.stateIcon.removeClass('waiting').addClass('error');
            var error_code = audio.error;
            if (error_code !== null) {
                var title;
                if (error_code.code === 1) {
                    title = 'MEDIA_ERR_ABORTED';
                } else
                if (error_code.code === 2) {
                    title = 'MEDIA_ERR_NETWORK';
                } else
                if (error_code.code === 3) {
                    title = 'MEDIA_ERR_DECODE';
                } else
                if (error_code.code === 4) {
                    title = 'MEDIA_ERR_SRC_NOT_SUPPORTED';
                }
                dom_cache.stateIcon.attr('title', title);
            }
        } else {
            dom_cache.stateIcon.removeClass('error');
            dom_cache.stateIcon.removeAttr('title');
        }
    };
    var changeEmptyState = function() {
        if (var_cache.player_is_empty === state.empty) {
            return;
        }
        if (state.empty) {
            dom_cache.selectFile_layer.show();
        } else {
            dom_cache.selectFile_layer.hide();
        }
        var_cache.player_is_empty = state.empty;
    };
    var playerRender = function() {
        dom_cache.body.addClass(var_cache.is_winamp?'winamp':undefined).append(
            $('<div>', {'class': 'menu t_btn', title: chrome.i18n.getMessage("btnMenu") }).on('click', function (e) {
                e.preventDefault();
                engine.context.showMenu();
            }),
            dom_cache.drop_layer = $('<div>', {'class': 'drop layer'}).append(
                $('<span>', {text: chrome.i18n.getMessage("onDropText") })
            ),
            dom_cache.selectFile_layer = $('<div>', {'class': 'selectFile layer'}).append(
                $('<span>', {text: chrome.i18n.getMessage("click_for_open") })
            ).on('click', function () {
                    engine.context.menu.openFiles.action();
                }),
            $('<div>', {'class': 'player'}).append(
                dom_cache.player_box = $('<div>', {'class': 'box'}).append(
                    dom_cache.picture = $('<div>', {'class': 'image'+((state.picture === undefined)?' empty':'') }),
                    $('<div>', {'class': 'image_box'}),
                    $('<div>', {'class': 'track'}).append(
                        $('<div>', {'class': 'name'}).append(
                            dom_cache.trackname = $('<span>')
                        ),
                        $('<div>', {'class': 'album'}).append(
                            dom_cache.trackalbum = $('<span>')
                        )
                    )
                ),
                $('<div>', {'class': 'info'}).append(
                    dom_cache.currentTime = $('<span>', {'class': 'time', text: '00:00'}).on('click', function () {
                        state.time_format = (state.time_format === 1) ? 0 : 1;
                        engine.settings.set({'time_format': state.time_format});
                        changeTime( engine.player.getMedia() );
                    }),
                    $('<div>', {'class': 'pl_state'}).append(
                        dom_cache.shuffle = $('<div>', {'class': 's_btn shuffle'+( (_settings.shuffle === 1)?' on':'' ), title: chrome.i18n.getMessage("btnShuffle") }).on('click', function () {
                            engine.playlist.setShuffle();
                        }),
                        dom_cache.loop = $('<div>', {'class': 's_btn loop'+( (_settings.loop === 1)?' on':'' ), title: chrome.i18n.getMessage("btnLoop") }).on('click', function () {
                            engine.playlist.setLoop();
                        })
                    )
                ),
                dom_cache.progress_bar = $('<div>', {'class': 'progress_bar'}).slider({
                    range: "min",
                    min: 0,
                    max: 1000,
                    value: state.progress_bar,
                    change: function (event, ui) {
                        var lp;
                        if (event.which === undefined) {
                            if (var_cache.is_winamp) {
                                lp = parseInt(ui.value / 1000 * -29) || 0;
                                dom_cache.progress_ui_a.css('margin-left', lp + 'px');
                            }
                            return;
                        }
                        if (isNaN(ui.value)) {
                            return;
                        }
                        state.progress_bar = ui.value;
                        engine.player.position(ui.value / 10);
                        if (var_cache.is_winamp) {
                            lp = parseInt(ui.value / 1000 * -29) || 0;
                            dom_cache.progress_ui_a.css('margin-left', lp + 'px');
                        }
                    },
                    slide: function (event, ui) {
                        if (event.which === undefined) {
                            return;
                        }
                        if (isNaN(ui.value)) {
                            return;
                        }
                        state.progress_bar = ui.value;
                        engine.player.position(ui.value / 10);
                        if (var_cache.is_winamp) {
                            var lp = parseInt(ui.value / 1000 * -29) || 0;
                            dom_cache.progress_ui_a.css('margin-left', lp + 'px');
                        }
                    },
                    create: function () {
                        var $this = $(this);
                        dom_cache.preloadBar = $('<div>', {'class': 'preloadBar'});
                        dom_cache.downloadBar = $('<div>', {'class': 'downloadBar'});
                        $this.append(dom_cache.preloadBar, dom_cache.downloadBar);
                        // preBufferingController.setObj(div_loaded);
                        dom_cache.progress_ui_a = $this.children('a');
                        if (var_cache.is_winamp) {
                            dom_cache.progress_ui_a.css('margin-left', '0px');
                        }
                    }
                }).on('mousewheel', function ($e) {
                    var e = $e.originalEvent;
                    clearTimeout(var_cache.progress_timer);
                    var_cache.progress_timer = setTimeout(function () {
                        if (e.wheelDelta > 0) {
                            engine.player.position("+5");
                        } else {
                            engine.player.position("-5");
                        }
                    }, 25);
                }),
                $('<div>', {'class': 'controls'}).append(
                    $('<div>', {'class': 'btn playlist', title: chrome.i18n.getMessage("playlist") }).on('click', function (e) {
                        e.preventDefault();
                        engine.wm.createWindow({type: 'playlist'});
                    }),
                    $('<div>', {'class': 'btn prev', title: chrome.i18n.getMessage("btnPreviousTrack") }).on('click', function (e) {
                        e.preventDefault();
                        engine.playlist.previousTrack();
                    }),
                    dom_cache.playpause = $('<div>', {'class': 'btn playpause', title: chrome.i18n.getMessage("btnPlayPause") }).append(
                        dom_cache.stateIcon = $('<div>', {'class': 'stateIcon'})
                    ).on('click', function (e) {
                            e.preventDefault();
                            if (state.paused) {
                                engine.player.play();
                            } else {
                                engine.player.pause();
                            }
                        }),
                    $('<div>', {'class': 'btn next', title: chrome.i18n.getMessage("btnNextTrack") }).on('click', function (e) {
                        e.preventDefault();
                        engine.playlist.nextTrack();
                    }),
                    dom_cache.volume_icon = $('<div>', {'class': 'btn volume_icon', title: chrome.i18n.getMessage("btnMute") }).on('click', function (e) {
                        e.preventDefault();
                        engine.player.mute(!state.muted);
                    }),
                    $('<div>', {'class': 'volume_container'}).append(
                        dom_cache.volumeBar = $('<div>', {'class': 'volume_bar'}).slider({
                            range: "min",
                            min: 0,
                            max: 100,
                            value: state.volume,
                            change: function (event, ui) {
                                if (event.which === undefined) {
                                    if (var_cache.is_winamp) {
                                        dom_cache.volumeBar.css('background', getVolumeColor(ui.value));
                                    }
                                    return;
                                }
                                if (isNaN(ui.value)) {
                                    return;
                                }
                                state.volume = ui.value;
                                changeVolumeIcon( ui.value );
                                engine.player.volume(ui.value);
                                if (var_cache.is_winamp) {
                                    dom_cache.volumeBar.css('background', getVolumeColor(ui.value));
                                }
                            },
                            slide: function (event, ui) {
                                if (event.which === undefined) {
                                    return;
                                }
                                if (isNaN(ui.value)) {
                                    return;
                                }
                                state.volume = ui.value;
                                changeVolumeIcon( ui.value );
                                engine.player.volume(ui.value);
                                if (var_cache.is_winamp) {
                                    dom_cache.volumeBar.css('background', getVolumeColor(ui.value));
                                }
                            },
                            create: function () {
                                if (var_cache.is_winamp) {
                                    $this = $(this);
                                    $this.css('background', getVolumeColor(state.volume));
                                }
                            }
                        })
                    ).on('mousewheel', function ($e) {
                            var e = $e.originalEvent;
                            if (e.wheelDelta > 0) {
                                engine.player.volume("+10");
                            } else {
                                engine.player.volume("-10");
                            }
                        })
                )
            )
        );
        dom_cache.body.on('drop', function (e) {
            /**
             * @namespace e.originalEvent.dataTransfer
             * @namespace e.originalEvent.dataTransfer.files
             */
            e.preventDefault();
            dom_cache.drop_layer.addClass('dropped');
            var entryList = e.originalEvent.dataTransfer.items;
            engine.files.readDropFiles(entryList, function(collections) {
                if (collections === undefined) {
                    return;
                }
                engine.wm.createWindow({type: 'm3u', config: {type: 'm3u', collectionList: collections, join: 1, cb: function(index) {
                    engine.playlist.emptyPlaylist(function(){
                        engine.playlist.appendPlaylist(collections, function() {
                            engine.playlist.selectPlaylist(collections[index].id);
                        });
                    });
                }}});
            });
        }).on('dragover', function (e) {
            e.preventDefault();
            dom_cache.drop_layer.css({"display": "block"});
            clearTimeout(var_cache.drop_timer);
            var_cache.drop_timer = setTimeout(function () {
                dom_cache.drop_layer.css({"display": "none"});
                dom_cache.drop_layer.removeClass('dropped');
            }, 300);
        });
    };
    var clearPreloadBars = function () {
        if (state.preload === undefined) {
            return;
        }
        state.preload.forEach(function(item) {
            item.node.remove();
        });
        state.preload = undefined;
        dom_cache.preloadBar.css('display', 'none');
    };
    var updateDownloadBar = function (percent) {
        if (state.download === percent) {
            return;
        }
        if (percent === undefined) {
            state.download = percent;
            dom_cache.progress_bar.removeClass('download');
            dom_cache.downloadBar.hide();
            return;
        }
        dom_cache.downloadBar.css({'width': percent+'%'});
        if (state.download === undefined) {
            dom_cache.progress_bar.addClass('download');
            dom_cache.downloadBar.show();
        }
        state.download = percent;
    };
    var updatePreloadBar = function (audio) {
        var i;
        if (audio === undefined) {
            clearPreloadBars();
            return;
        }
        var duration = audio.duration;
        if (duration === Infinity) {
            return;
        }
        var buffered = audio.buffered;
        if (!buffered) {
            return;
        }
        var ranges = [];
        var ranges_len = buffered.length;
        if (ranges_len === 0) {
            clearPreloadBars();
            return;
        }
        for (i = 0; i < ranges_len; i++) {
            var left = parseInt((buffered.start(i) / duration) * 100);
            var right = parseInt((buffered.end(i) / duration) * 100);
            var width = right - left;
            if (isNaN(width)) {
                continue;
            }
            if (left + width >= 99) {
                continue;
            }
            ranges.push([left, width]);
        }
        ranges_len = ranges.length;
        if (ranges_len === 1 && ranges[0][1] === 100) {
            clearPreloadBars();
            return;
        }
        if (state.preload === undefined) {
            state.preload = [];
            dom_cache.preloadBar.css('display', 'block');
        }
        var preload_len = state.preload.length;
        if (preload_len > ranges_len) {
            var rm_list = state.preload.splice(ranges_len, preload_len - ranges_len);
            rm_list.forEach(function(item) {
                item.node.remove();
            });
        }
        for (i = 0; i < ranges_len; i++) {
            if (state.preload[i] === undefined) {
                state.preload[i] = {};
                state.preload[i].node = $('<div>').appendTo(dom_cache.preloadBar);
            }
            if (state.preload[i].left === ranges[i][0] && state.preload[i].width === ranges[i][1] ) {
                continue;
            }
            state.preload[i].left = ranges[i][0];
            state.preload[i].width = ranges[i][1];
            state.preload[i].node.css({'left': ranges[i][0]+'%', width: ranges[i][1]+'%'});
        }
    };
    var changeTime = function (audio) {
        var time;
        if (state.time_format) {
            time = "-" + timeFormat(audio.duration - audio.currentTime);
        } else {
            time = timeFormat(audio.currentTime);
        }
        if (state.time_text !== time) {
            dom_cache.currentTime.text(time);
            state.time_text = time;
        }
    };
    var onPlayer = {
        onVolumeChange: function (e) {
            if (state.muted !== e.target.muted) {
                state.muted = e.target.muted;
                changeMuteIcon();
            }
            if (state.volume !== e.target.volume * 100) {
                state.volume = e.target.volume * 100;
                changeVolumeIcon( state.volume );
                dom_cache.volumeBar.slider('value', state.volume);
            }
        },
        onPlay: function (e) {
            if (state.paused !== e.target.paused) {
                state.paused = false;
                changePlayState();
            }
        },
        onPause: function (e) {
            if (state.paused !== e.target.paused) {
                state.paused = true;
                changePlayState();
            }
            if (state.waiting) {
                state.waiting = false;
                changeStateIcon();
            }
        },
        onWaiting: function (e) {
            if (!state.waiting) {
                state.waiting = true;
                changeStateIcon();
            }
        },
        onPlaying: function (e) {
            if (state.waiting) {
                state.waiting = false;
                changeStateIcon();
            }
        },
        onTimeUpdate: function (e) {
            var duration = e.target.duration;
            var currentTime = e.target.currentTime;
            var percent = parseInt( currentTime / duration * 1000 );
            if (state.progress_bar !== percent) {
                state.progress_bar = percent;
                dom_cache.progress_bar.slider('value', percent);
            }
            if ( state.duration !== duration ) {
                state.duration = duration;
                changeProgressBarMode();
            }
            changeTime(e.target);
        },
        onDurationChange: function (e) {
            var duration = e.target.duration;
            if ( state.duration !== duration ) {
                state.duration = duration;
                changeProgressBarMode();
            }
        },
        onStalled: function (e) {
            updatePreloadBar();
        },
        onError: function (e) {
            if (state.waiting) {
                state.waiting = false;
                changeStateIcon();
            }
            if (!state.error) {
                state.error = true;
                if (e.target.currentSrc.length === 0 || e.target.src.split(':')[0] === "chrome-extension") {
                    state.error = false;
                }
                changeStateIcon(e.target);
            }
            state.duration = 0;
            changeProgressBarMode();
            if (!state.paused) {
                state.paused = true;
                changePlayState();
            }
            // TODO: Добавить паузу
        },
        onEmptied: function (e) {
            if (e.target === undefined) {
                e = {target: e};
            }
            updatePreloadBar();
            setImage();
            if (state.waiting) {
                state.waiting = false;
                changeStateIcon();
            }
            state.duration = 0;
            changeProgressBarMode();
        },
        onLoadStart: function (e) {
            if (state.error) {
                state.error = false;
                changeStateIcon(e.target);
            }
            if (!state.waiting) {
                state.waiting = true;
                changeStateIcon();
            }
            if (state.download !== undefined) {
                updateDownloadBar(undefined);
            }
            updatePreloadBar(e.target);
            var duration = Infinity;
            if ( state.duration !== duration ) {
                state.duration = duration;
                changeProgressBarMode();
            }
            state.paused = e.target.paused;
            changePlayState();
        },
        onLoadedMetaData: function (e) {

        },
        onCanPlay: function (e) {

        },
        onCanPlayThrough: function (e) {

        },
        onLoadedData: function (e) {
            if (state.waiting) {
                state.waiting = false;
                changeStateIcon();
            }
            var duration = e.target.duration;
            if ( state.duration !== duration ) {
                state.duration = duration;
                changeProgressBarMode();
            }
            engine.player.play();
        },
        onEnded: function (e) {

        },
        onRateChange: function (e) {

        },
        onSeeking: function (e) {
            if (!state.waiting) {
                state.waiting = true;
                changeStateIcon();
            }
        },
        onSeeked: function (e) {
            if (state.waiting) {
                state.waiting = false;
                changeStateIcon();
            }
        },
        onProgress: function (e) {
            if (e.target.duration === e.target.currentTime) {
                // хак для определния потока
                state.duration = Infinity;
                changeProgressBarMode();
            }
            updatePreloadBar(e.target);
        },
        onSuspend: function (e) {

        },
        onAbort: function (e) {
            if (state.paused !== e.target.paused) {
                state.paused = e.target.paused;
                changePlayState();
            }
            updatePreloadBar(e.target);
        },
        onDownload: function (percent) {
            if (state.waiting) {
                state.waiting = false;
                changeStateIcon();
            }
            updateDownloadBar(percent)
        },
        onSwitchMedia: function (audio) {
            var duration = 0;
            if ( state.duration !== duration ) {
                state.duration = duration;
                changeProgressBarMode();
            }
            if (state.error) {
                state.error = false;
                changeStateIcon(audio);
            }
            if (state.paused !== audio.paused) {
                state.paused = true;
                changePlayState();
            }
            var percent = 0;
            if (state.progress_bar !== percent) {
                state.progress_bar = percent;
                dom_cache.progress_bar.slider('value', percent);
            }
            changeTime(audio);
        }
    };
    var writeWinampFFT = function () {
        /*
         * Действие при отключении engine адаптера Dance (происходит когда закрывается визуализация).
         */
        if (!var_cache.is_winamp) {
            return;
        }
        var convas = $('canvas.winamp_fft');
        if (convas.data('type') === _settings.visual_type) {
            var adapter = engine.player.getAdapter();
            if (adapter.proc_list.winamp !== undefined) {
                return;
            }
        }
        if (convas.length === 0) {
            convas = $('<canvas>', {'class': 'winamp_fft'}).on('click',function () {
                var type = parseInt(_settings.visual_type) + 1;
                if (type > 2) {
                    type = 0;
                }
                type += '';
                engine.settings.set({visual_type: type});
            }).appendTo($('.player'));
        } else {
            engine.player.discAdapters('winamp');
            var_cache.winamp_dancer = undefined;
        }
        convas.data('type', _settings.visual_type);
        convas = convas[0];
        if (_settings.visual_type === '0') {
            convas.width = convas.width;
            return;
        }
        var_cache.winamp_dancer = new Dancer();
        var ctx = convas.getContext('2d');
        convas.width = 80;
        var_cache.winamp_dancer.createKick({
            onKick: function () {
                ctx.fillStyle = '#ff0077';
            },
            offKick: function () {
                ctx.fillStyle = '#54D100';
            },
            threshold: 0.2
        }).on();
        if (_settings.visual_type === '2') {
            convas.height = 20;
            var_cache.winamp_dancer.waveform(convas,
                {strokeStyle: '#fff', strokeWidth: 1, count: 40}
            );
        } else {
            convas.height = 37;
            var_cache.winamp_dancer.fft(convas,
                {fillStyle: '#666', count: 20, width: 3, spacing: 1}
            );
        }
        var_cache.winamp_dancer.bind('loaded',function () {
            var_cache.winamp_dancer.play();
        }).load(engine.player.getMedia(), 'winamp');
    };
    var setWinampWindow = function() {
        dom_cache.body.addClass('winamp');
        var appWindow = chrome.app.window.current();
        var dpr = window.devicePixelRatio;
        var win_w = parseInt(275 * dpr);
        var win_h = parseInt(116 * dpr);
        dom_cache.shuffle.removeClass('s_btn');
        dom_cache.loop.removeClass('s_btn');
        changePlayState();
        /**
         * @namespace win.resizeTo
         */
        appWindow.resizeTo(win_w, win_h);
        $('.player').append(
            $('<div>', {'class': "state"}),
            $('<div>', {'class': "w_kbps", text: 320}),
            $('<div>', {'class': "w_kHz", text: 44}),
            $('<div>', {'class': "stereo"}),
            $('<div>', {'class': "w_playlist"}).on('click', function () {
                engine.wm.createWindow({type: 'playlist'});
            }));
        dom_cache.currentTime = function () {
            var obj = $('.info > .time');
            var back = false;
            obj.empty();
            var mm = $('<div>', {'class': 'wmp mm', 'style': 'visibility: hidden; background-position-x: -99px;'});
            var m_10 = $('<div>', {'class': 'wmp m_10'});
            var m_0 = $('<div>', {'class': 'wmp m_0'});
            var s_10 = $('<div>', {'class': 'wmp s_10'});
            var s_0 = $('<div>', {'class': 'wmp s_0'});
            obj.append(mm, m_10, m_0, s_10, s_0);
            var setVal = function (num, obj) {
                num = parseInt(num);
                var val = 9 * num;
                obj.css('background-position-x', '-' + val + 'px');
            };
            return {
                on: function (a, b) {
                    obj.on(a, b);
                },
                text: function (value) {
                    var val = value.split(':');
                    if (val[0].length === 2) {
                        if (back) {
                            mm.css('visibility', 'hidden');
                            back = false;
                        }
                        setVal(val[0][0], m_10);
                        setVal(val[0][1], m_0);
                    } else {
                        if (back === false) {
                            mm.css('visibility', 'visible');
                            back = true;
                        }
                        setVal(val[0][1], m_10);
                        setVal(val[0][2], m_0);
                    }
                    setVal(val[1][0], s_10);
                    setVal(val[1][1], s_0);
                },
                empty: function () {
                    setVal(0, m_10);
                    setVal(0, m_0);
                    setVal(0, s_10);
                    setVal(0, s_0);
                }
            };
        }();
        writeWinampFFT();
    };
    var getVolumeColor = function (value) {
        /*
         * Генерирует цвет прогресс бара Winamp
         */
        var a = 0;
        var b = 0;
        var c = 0;
        var max = 222;
        if (value < 50) {
            b = max;
            a = parseInt(value / 50 * max);
        } else {
            a = max;
            b = max - parseInt((value - 50) / 50 * max);
        }
        return 'rgba(' + a + ', ' + b + ', ' + c + ', 1)';
    };
    var checkLaunchData = function() {
        if (window._launchData === undefined) {
            return;
        }
        if (window._launchData.items !== undefined) {
            var entryList = [];
            window._launchData.items.forEach(function (item) {
                entryList.push(item.entry);
            });
            engine.files.readAnyFiles(entryList, function(collections) {
                if (collections === undefined) {
                    return;
                }
                engine.wm.createWindow({type: 'm3u', config: {type: 'm3u', collectionList: collections, join: 1, cb: function(index) {
                    engine.playlist.emptyPlaylist(function(){
                        engine.playlist.appendPlaylist(collections, function() {
                            engine.playlist.selectPlaylist(collections[index].id);
                        });
                    });
                }}});
            });
        } else
        if (window._launchData.url !== undefined) {
            engine.context.menu.openURL.action(window._launchData.url);
        }
        window._launchData = undefined;
    };
    chrome.runtime.onMessage.addListener(function (message) {
        if (message === '_check_launchData_') {
            checkLaunchData();
        }
    });
    return {
        boot: function () {
            // отображение основных кнопок
            dom_cache.body = $(document.body);
            dom_cache.body.append(
                $('<div>', {'class': 'mini t_btn', title: chrome.i18n.getMessage("btnMinimize") }).on('click', function (e) {
                    e.preventDefault();
                    chrome.app.window.current().minimize();
                }),
                $('<div>', {'class': 'close t_btn', title: chrome.i18n.getMessage("btnClose") }).on('click', function (e) {
                    e.preventDefault();
                    window.close();
                })
            );
            // загрузка всех настроек перед тем, как начать отображение плеера
            engine.settings.onLoad(function () {
                state.time_format = _settings.time_format;
                state.volume = _settings.volume;
                var_cache.is_winamp = _settings.is_winamp;
                $(function() {
                    player.show();
                });
            });

            if (_settings.pineble_playlist === 1) {
                chrome.app.window.current().onBoundsChanged.addListener(function () {
                    if (document.webkitHidden) {
                        return;
                    }
                    if (_settings.pined_playlist === 1) {
                        engine.wm.setPinPosition('playlist', _settings.pin_position);
                    }
                });
            }
        },
        show : function () {
            /**
             * @namespace chrome.i18n.getMessage
             * @namespace info.menuItemId
             */
            playerRender();
            engine.setHotkeys(document);
            if (var_cache.is_winamp) {
                setWinampWindow();
            }
            make_extend_volume(_settings.extend_volume_scroll);
            //TODO: вернуть shuffle и loop
            engine.playlist.setShuffle(_settings.shuffle);
            engine.playlist.setLoop(_settings.loop);

            changeVolumeIcon(state.volume);
            engine.player.volume(state.volume);

            checkLaunchData();
        },
        setTags : function (tags) {
            state.empty = false;
            changeEmptyState();
            if (var_cache.is_winamp) {
                dom_cache.trackname.text(tags.title_artist_album).parent().attr("title", tags.title_artist_album);
                calculateMoveble(dom_cache.trackname, 153, 'name');
            } else {
                dom_cache.trackname.text(tags.title).parent().attr("title", tags.title);
                dom_cache.trackalbum.text(tags.artist_album || '').parent().attr("title", tags.artist_album || '');
            }
            document.title = tags.title_artist_album;
            setImage(tags.cover);
            setTrueText(tags.title, tags.artist_album || '');
            //console.log(tags)
        },
        updateSettings : function (changes) {
            if (changes.extend_volume_scroll !== undefined) {
                make_extend_volume(changes.extend_volume_scroll);
            }
            if (changes.visual_type !== undefined) {
                writeWinampFFT();
            }
        },
        setShuffle : function (shuffle) {
            if (shuffle) {
                dom_cache.shuffle.addClass('on');
            } else {
                dom_cache.shuffle.removeClass('on');
            }
        },
        setLoop : function (loop) {
            if (loop) {
                dom_cache.loop.addClass('on');
            } else {
                dom_cache.loop.removeClass('on');
            }
        },
        timeFormat : timeFormat,
        state : function (type) {
            if (_debug) {
                console.log(type);
            }
            if (type === "preloading") {
                state.waiting = true;
                changeStateIcon();
            }
            if (type === "preloading_dune") {
                state.waiting = false;
                changeStateIcon();
            }
        },
        on: onPlayer
    };
}();