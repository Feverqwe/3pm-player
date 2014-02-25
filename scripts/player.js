/**
 * @namespace chrome.fileSystem.chooseEntry
 * @namespace chrome.contextMenus.removeAll
 * @namespace document.webkitHidden
 * @namespace chrome.app.window.current.onBoundsChanged
 */
window.view = function () {
    var dom_cache = {};
    var var_cache = {};
    var time_tipe = 0;
    var settings = {};
    var is_winamp = false;
    var visual_cache = {};
    var context_menu = undefined;
    var isPlaying = function () {
        /*
         * Выставляет статус - проигрывается.
         */
        if (is_winamp) {
            dom_cache.body.attr('data-state', 'play');
        }
        dom_cache.btnPlayPause.removeClass('play').addClass('pause');
    };
    var isPause = function () {
        /*
         * Выставляет статус - пауза.
         */
        if (is_winamp) {
            dom_cache.body.attr('data-state', 'pause');
        }
        dom_cache.btnPlayPause.removeClass('pause').addClass('play');
    };
    var showImage = function (id) {
        /*
         * Отображает изображение, получает картинку из engine
         */
        var url = engine.tags.getCover(id);
        var img_url = 'url(' + url + ')';
        if (dom_cache.picture_url !== url) {
            dom_cache.picture_url = url;
            clearTimeout(dom_cache.picture_timer);
            dom_cache.picture_timer = setTimeout(function () {
                dom_cache.picture.css('background-image', img_url);
            }, 50);
        }
    };
    var hideImage = function () {
        /*
         * Выставляет статус - без обложки.
         */
        var url = 'images/no-cover.png';
        var img_url = 'url(' + url + ')';
        if (dom_cache.picture_url !== url) {
            dom_cache.picture_url = url;
            clearTimeout(dom_cache.picture_timer);
            dom_cache.picture_timer = setTimeout(function () {
                dom_cache.picture.css('background-image', img_url);
            }, 50);
        }
    };
    var toHHMMSS = function (val) {
        /*
         * Выводит время трека.
         */
        var sec_num = parseInt(val, 10); // don't forget the second parm
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
    var preBufferingController = function () {
        /*
         * Управляет полоской буферизации
         */
        var cache = {};
        var interval = undefined;
        var state = "";
        var obj = undefined;
        var state_download = function (width) {
            if (state !== "download") {
                reset_state();
                state = "download";
                stop();
                obj.parent().addClass("download");
            }
            if (cache.width === width) {
                return;
            }
            cache.width = width;
            obj.css({width: width + "%"});
        };
        var state_pos = function (left, width) {
            if (state !== "pos") {
                reset_state();
                state = "pos";
            }
            if (cache.left === left && cache.width === width) {
                return;
            }
            cache.left = left;
            cache.width = width;
            obj.css({"left": left + "%", "width": width + "%"});
        };
        var state_hide = function () {
            if (state === "hide") {
                stop();
                return;
            }
            reset_state();
            obj.css("display", "none");
            stop();
            state = "hide";
        };
        var state_loading = function () {
            if (state === "loading") {
                stop();
                return;
            }
            reset_state();
            obj.parent().addClass("stream");
            stop();
            state = "loading";
        };
        var state_inf = function () {
            if (state === "inf") {
                stop();
                return;
            }
            reset_state();
            obj.parent().addClass("stream");
            stop();
            state = "inf";
        };
        var reset_state = function () {
            cache = {};
            obj.css({left: 0, width: "100%", display: "block"}).attr('class', 'loaded');
            if (state === "inf" || state === "loading") {
                obj.parent().removeClass("stream");
            } else if (state === "download") {
                obj.parent().removeClass("download");
            }
            state = "";
        };
        var update = function () {
            if (obj === undefined) {
                return;
            }
            var audio = engine.player.getAudio();
            var buffered = audio.buffered;
            if (!buffered) {
                stop();
                return;
            }
            if (audio.duration === Infinity) {
                state_inf();
                return;
            }
            var dur = parseInt(audio.duration);
            if (isNaN(dur)) {
                state_hide();
                return;
            }
            var end = 0;
            var start = 0;
            for (var i = 0; i < buffered.length; i++) {
                end = parseInt(buffered.end(i));
                start = parseInt(buffered.start(i));
            }
            if (end === dur) {
                state_hide();
                return;
            }
            var l_p = parseInt((start / dur) * 100);
            var r_p = parseInt((end / dur) * 100);
            var pr = r_p - l_p;
            state_pos(l_p, pr);
        };
        var stop = function () {
            clearInterval(interval);
        };
        return {
            clear: function () {
                if (obj === undefined) {
                    return;
                }
            },
            setObj: function (progress) {
                obj = progress;
            },
            start: function () {
                if (obj === undefined) {
                    return;
                }
                stop();
                interval = setInterval(function () {
                    update();
                }, 1000);
            },
            stop: function () {
                stop();
            },
            update: function () {
                update();
            },
            hide: function () {
                state_hide();
            },
            loading: function () {
                state_loading();
            },
            obj: obj,
            download: function (value) {
                state_download(value);
            }
        };
    }();
    var makeCtxMenu = function () {
        /*
         * Формирует контекстное меню
         */
        context_menu = {
            openFiles: {
                title: _lang.ctx_open_files,
                contexts: ['page', 'launcher'],
                action: function () {
                    $('.click_for_open').trigger('click');
                }
            },
            openDirectory: {
                title: _lang.ctx_open_folder,
                contexts: ['page', 'launcher'],
                action: function () {
                    chrome.fileSystem.chooseEntry({type: 'openDirectory'}, function (entry) {
                        if (!entry) {
                            return;
                        }
                        engine.files.readDirectory(entry);
                    });
                }
            },
            openFolderWithSubfolders: {
                title: _lang.ctx_open_folder_sub,
                contexts: ['page', 'launcher'],
                action: function () {
                    chrome.fileSystem.chooseEntry({type: 'openDirectory'}, function (entry) {
                        if (!entry) {
                            return;
                        }
                        engine.files.readDirectoryWithSub(entry);
                    });
                }
            },
            openURL: {
                title: _lang.ctx_open_url,
                contexts: ['page', 'launcher'],
                action: function () {
                    engine.windowManager({type: 'dialog', config: {type: "url", h: 60}});
                }
            },
            selectPlaylist: {
                title: _lang.playlist_select,
                contexts: ['page', 'launcher'],
                action: function () {
                    var playlists = engine.playlist.getM3UPlaylists();
                    if (playlists.length > 0) {
                        engine.windowManager({type: 'dialog', config: {type: "m3u", h: 200, w: 350, r: true, playlists: playlists}});
                    }
                }
            },
            webUI: {
                type: "checkbox",
                title: _lang.ctx_webui,
                contexts: ['page', 'launcher'],
                action: function () {
                    var state = engine.webui.active();
                    if (state === false) {
                        engine.webui.start();
                    } else {
                        engine.webui.stop();
                    }
                }
            },
            viz: {
                title: _lang.ctx_viz,
                contexts: ['page', 'launcher'],
                action: function () {
                    engine.windowManager({type: 'viz'});
                }
            },
            cloud: {
                title: _lang.ctx_cloud,
                contexts: ['page', 'launcher']
            },
            vk: {
                parentId: "cloud",
                title: "vk.com",
                contexts: ['page', 'launcher'],
                action: function () {
                    engine.cloud.vk.makeAlbums(function (list) {
                        engine.playlist.setM3UPlaylists(list);
                        if (list.length === 1) {
                            engine.playlist.selectPlaylist(list[0].id);
                        } else if (list.length > 0) {
                            engine.windowManager({type: 'dialog', config: {type: "m3u", h: 200, w: 350, r: true, playlists: list}});
                        }
                    });
                }
            },
            sc: {
                parentId: "cloud",
                title: "soundcloud.com",
                contexts: ['page', 'launcher'],
                action: function () {
                    engine.cloud.sc.makeAlbums(function (list) {
                        engine.playlist.setM3UPlaylists(list);
                        if (list.length === 1) {
                            engine.playlist.selectPlaylist(list[0].id);
                        } else if (list.length > 0) {
                            engine.windowManager({type: 'dialog', config: {type: "m3u", h: 200, w: 350, r: true, playlists: list}});
                        }
                    });
                }
            },
            gd: {
                parentId: "cloud",
                title: "drive.google.com",
                contexts: ['page', 'launcher'],
                action: function () {
                    engine.cloud.gd.getFilelist(undefined, function (list) {
                        engine.windowManager({type: 'dialog', config: {type: "gd", h: 315, w: 350, r: true, filelist: list}});
                    });
                }
            },
            db: {
                parentId: "cloud",
                title: "dropbox.com",
                contexts: ['page', 'launcher'],
                action: function () {
                    engine.cloud.db.getFilelist(function (list) {
                        engine.windowManager({type: 'dialog', config: {type: "db", h: 315, w: 350, r: true, filelist: list}});
                    });
                }
            },
            box: {
                parentId: "cloud",
                title: "box.com",
                contexts: ['page', 'launcher'],
                action: function () {
                    engine.cloud.box.getFilelist(function (list) {
                        engine.windowManager({type: 'dialog', config: {type: "box", h: 315, w: 350, r: true, filelist: list}});
                    });
                }
            },
            sd: {
                parentId: "cloud",
                title: "skydrive.com",
                contexts: ['page', 'launcher'],
                action: function () {
                    engine.cloud.sd.getFilelist(undefined, function (list) {
                        engine.windowManager({type: 'dialog', config: {type: "sd", h: 315, w: 350, r: true, filelist: list}});
                    });
                }
            },
            p_play_pause: {
                title: _lang.play_pause,
                contexts: ['launcher'],
                action: function () {
                    engine.player.playToggle();
                }
            },
            p_next: {
                title: _lang.next,
                contexts: ['launcher'],
                action: function () {
                    engine.playlist.next();
                }
            },
            p_previous: {
                title: _lang.prev,
                contexts: ['launcher'],
                action: function () {
                    engine.playlist.preview();
                }
            },
            options: {
                title: _lang.ctx_options,
                contexts: ['page', 'launcher'],
                action: function () {
                    engine.windowManager({type: 'options'});
                }
            },
            save_vk: {
                title: _lang.ctx_save_vk_track,
                contexts: ['page', 'launcher'],
                hide: 1,
                action: function () {
                    var track = engine.playlist.getCurrentTrack();
                    if (track !== undefined && track.cloud.track_id !== undefined) {
                        engine.cloud.vk.addInLibrarty(track.cloud.track_id, track.cloud.owner_id);
                    }
                }
            },
            save_sc: {
                title: _lang.ctx_save_sc_track,
                contexts: ['page', 'launcher'],
                hide: 1,
                action: function () {
                    var track = engine.playlist.getCurrentTrack();
                    if (track !== undefined && track.cloud.track_id !== undefined) {
                        engine.cloud.sc.addInFavorite(track.cloud.track_id);
                    }
                }
            }
        };
        for (var key in context_menu) {
            if (!context_menu.hasOwnProperty(key)) {
                continue;
            }
            context_menu[key].id = key;
        }
        chrome.contextMenus.removeAll(function () {
            $.each(context_menu, function (k, v) {
                if (v.hide === 1) {
                    return 1;
                }
                var item = {
                    id: v.id,
                    title: v.title,
                    contexts: v.contexts
                };
                if (v.parentId !== undefined) {
                    item.parentId = v.parentId;
                }
                if (v.type !== undefined) {
                    item.type = v.type;
                }
                chrome.contextMenus.create(item);
            });
            chrome.contextMenus.update("webUI", {checked: engine.webui.active()});
        });
    };
    var make_extend_volume = function (extend_volume_scroll) {
        /*
         * Расширяет область изменения громкости колесиком мыши.
         */
        var box = $('body > .player > .box');
        var boxState = box.hasClass('volume_scroll');
        if (extend_volume_scroll && !boxState) {
            box.unbind('mousewheel').addClass('volume_scroll').on('mousewheel', function (e) {
                if (e.target.className === 'image') {
                    return;
                }
                if (e.originalEvent.wheelDelta > 0) {
                    engine.player.volume("+10");
                } else {
                    engine.player.volume("-10");
                }
            });
        } else if (!extend_volume_scroll && boxState) {
            box.unbind('mousewheel').removeClass('volume_scroll');
        }
    };
    var write_language = function () {
        /*
         * Локализация
         */
        $('.t_btn.mini').attr('title', _lang.mini);
        $('.t_btn.close').attr('title', _lang.close);
        $('.t_btn.menu').attr('title', _lang.menu);
        $('div.drop span').text(_lang.drop_file);
        $('div.click_for_open span').text(_lang.click_for_open);
        $('.btn.playlist').attr('title', _lang.playlist);
        $('.btn.prev').attr('title', _lang.prev);
        $('.btn.playpause').attr('title', _lang.play_pause);
        $('.btn.next').attr('title', _lang.next);
        $('.volume_controll .pic').attr('title', _lang.mute);
        $('div.shuffle').attr('title', _lang.shuffle);
        $('div.loop').attr('title', _lang.loop);
        makeCtxMenu();
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
    var writeWinampFFT = function () {
        /*
         * Действие при отключении engine адаптера Dance (происходит когда закрывается визуализация).
         */
        if (is_winamp) {
            var convas = $('canvas.winamp_fft');
            if (convas.data('type') === settings.visual_type) {
                var adapter = engine.player.getAdapter();
                if (adapter.proc_list.winamp !== undefined) {
                    return;
                }
            }
            if (convas.length === 0) {
                convas = $('<canvas>', {'class': 'winamp_fft'}).on('click',function () {
                    if (settings.visual_type === '0') {
                        settings.visual_type = '1';
                    } else if (settings.visual_type === '1') {
                        settings.visual_type = '2';
                    } else if (settings.visual_type === '2') {
                        settings.visual_type = '0';
                    }
                    chrome.storage.local.set({'visual_type': settings.visual_type});
                    writeWinampFFT();
                }).appendTo($('.player'));
            } else {
                engine.player.discAdapters('winamp');
                visual_cache.winamp_dancer = undefined;
            }
            convas.data('type', settings.visual_type);
            convas = convas[0];
            if (settings.visual_type === '0') {
                convas.width = convas.width;
                return;
            }
            visual_cache.winamp_dancer = new Dancer();
            var ctx = convas.getContext('2d');
            convas.width = 80;
            visual_cache.winamp_dancer.createKick({
                onKick: function () {
                    ctx.fillStyle = '#ff0077';
                },
                offKick: function () {
                    ctx.fillStyle = '#54D100';
                },
                threshold: 0.2
            }).on();
            if (settings.visual_type === '2') {
                convas.height = 20;
                visual_cache.winamp_dancer.waveform(convas,
                    {strokeStyle: '#fff', strokeWidth: 1, count: 40}
                );
            } else {
                convas.height = 37;
                visual_cache.winamp_dancer.fft(convas,
                    {fillStyle: '#666', count: 20, width: 3, spacing: 1}
                );
            }
            visual_cache.winamp_dancer.bind('loaded',function () {
                visual_cache.winamp_dancer.play();
            }).load(engine.player.getAudio(), 'winamp');
        }
    };
    var setTrueText = function (title, album) {
        if (is_winamp) {
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
    return {
        show : function () {
            write_language();
            settings = window._settings;
            $('body').removeClass('loading');
            window.onfocus = function () {
                if (dom_cache.focusing_all && dom_cache.focus_state === false) {
                    dom_cache.focusing_all = false;
                    dom_cache.focus_state = true;
                    return;
                }
                if (dom_cache.focusing_all) {
                    //protect!
                    dom_cache.disable_focusing_all = true;
                    dom_cache.focusing_all = false;
                    console.log('Focusing disabled!');
                }
                if (dom_cache.focus_state) {
                    return;
                }
                dom_cache.focus_state = true;
                if (!dom_cache.disable_focusing_all) {
                    dom_cache.focusing_all = true;
                    window._showAll(undefined, function () {
                        dom_cache.focusing_all = false;
                    });
                }
            };
            window.onblur = function () {
                dom_cache.focus_state = false;
            };
            dom_cache = {
                body: $('body'),
                drop: $('div.drop'),
                loading: $('div.loading'),
                trackname: $('.track > .name > span'),
                trackalbum: $('.track > .album > span'),
                time: $('.info > .time'),
                btnPlayPause: $('.controls .playpause.btn'),
                btnPrev: $('.controls .prev.btn'),
                btnNext: $('.controls .next.btn'),
                progress: $('.progress'),
                picture: $('.image'),
                volume: $('.volume'),
                mute: $('.volume_controll .pic'),
                click_for_open: $('.click_for_open'),
                btnPlaylist: $('.playlist.btn')
            };
            is_winamp = settings.is_winamp;
            if (is_winamp) {
                dom_cache.body.addClass('winamp');
                $('li.btn.playlist').hide();
                $('div.pl_state').hide();
                var win = chrome.app.window.current();
                var dpr = window.devicePixelRatio;
                var win_w = parseInt(275 * dpr);
                var win_h = parseInt(116 * dpr);
                /**
                 * @namespace win.resizeTo
                 */
                win.resizeTo(win_w, win_h);
                $('.player').append(
                    $('<div>', {'class': "shuffle"}),
                    $('<div>', {'class': "loop"}),
                    $('<div>', {'class': "state"}),
                    $('<div>', {'class': "w_kbps", text: 320}),
                    $('<div>', {'class': "w_kHz", text: 44}),
                    $('<div>', {'class': "stereo"}),
                    $('<div>', {'class': "w_playlist"}).on('click', function () {
                        engine.windowManager({type: 'playlist'});
                    }));
                dom_cache.time = function () {
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
            }
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
                    engine.player.position(ui.value / 10);
                    if (is_winamp) {
                        var lp = parseInt(ui.value / 1000 * -29) || 0;
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
                    engine.player.position(ui.value / 10);
                    if (is_winamp) {
                        var lp = parseInt(ui.value / 1000 * -29) || 0;
                        dom_cache.progress_ui_a.css('margin-left', lp + 'px');
                    }
                },
                create: function () {
                    var div_loaded = $('<div>', {'class': 'loaded'});
                    dom_cache.progress.append(div_loaded);
                    preBufferingController.setObj(div_loaded);
                    dom_cache.progress_ui_a = dom_cache.progress.find('a').eq(0);
                }
            });
            dom_cache.volume.slider({
                range: "min",
                min: 0,
                max: 100,
                change: function (event, ui) {
                    if (event.which === undefined) {
                        return;
                    }
                    if (isNaN(ui.value)) {
                        return;
                    }
                    engine.player.volume(ui.value);
                    if (is_winamp) {
                        dom_cache.volume.css('background', getVolumeColor(ui.value));
                    }
                },
                slide: function (event, ui) {
                    if (event.which === undefined) {
                        return;
                    }
                    if (isNaN(ui.value)) {
                        return;
                    }
                    engine.player.volume(ui.value);
                    if (is_winamp) {
                        dom_cache.volume.css('background', getVolumeColor(ui.value));
                    }
                }
            });
            view.state('emptied');
            view.state("playlist_is_empty");
            chrome.storage.local.get(['time_tipe', 'extend_volume_scroll', 'volume', 'shuffle', 'loop'], function (storage) {
                if (storage.time_tipe !== undefined) {
                    time_tipe = storage.time_tipe;
                }
                if (storage.extend_volume_scroll !== undefined) {
                    make_extend_volume(storage.extend_volume_scroll);
                }
                if (storage.shuffle) {
                    engine.playlist.setShuffle();
                }
                if (storage.loop) {
                    engine.playlist.setLoop();
                }
                engine.player.volume(storage.volume);
            });
            engine.setHotkeys(document);
            /**
             * @namespace info.menuItemId
             */
            chrome.contextMenus.onClicked.addListener(function (info) {
                if (context_menu[info.menuItemId] !== undefined && context_menu[info.menuItemId].action !== undefined) {
                    context_menu[info.menuItemId].action(info);
                }
            });
            dom_cache.body.on('drop', function (event) {
                event.preventDefault();
                /**
                 * @namespace event.originalEvent.dataTransfer
                 * @namespace event.originalEvent.dataTransfer.files
                 */
                var entrys = event.originalEvent.dataTransfer.items;
                engine.files.readAnyFiles(entrys);
            });
            var drag_timeout = undefined;
            dom_cache.body.on('dragover', function (event) {
                event.preventDefault();
                dom_cache.drop.css({"display": "block"});
                clearTimeout(drag_timeout);
                drag_timeout = setTimeout(function () {
                    dom_cache.drop.css({"display": "none"});
                }, 300);
            });
            dom_cache.btnPlayPause.on('click', function () {
                if ($(this).hasClass('play')) {
                    engine.player.play();
                } else if ($(this).hasClass('pause')) {
                    engine.player.pause();
                }
            });
            dom_cache.btnNext.on('click', function () {
                engine.playlist.next();
            });
            dom_cache.btnPrev.on('click', function () {
                engine.playlist.preview();
            });
            $('.close').on('click', function () {
                window.close();
            });
            $('.mini').on('click', function () {
                chrome.app.window.current().minimize();
            });
            $('.t_btn.menu').on('click', function () {
                engine.showMenu();
            });
            dom_cache.time.on('click', function () {
                time_tipe = (time_tipe) ? 0 : 1;
                chrome.storage.local.set({'time_tipe': time_tipe});
                var audio = engine.player.getAudio();
                view.setProgress(audio.duration, audio.currentTime);
            });
            $('.click_for_open').on('click', function () {
                var accepts = [
                    {
                        mimeTypes: ['audio/*', 'video/*']
                    }
                ];
                chrome.fileSystem.chooseEntry({type: 'openFile', accepts: accepts, acceptsMultiple: true}, function (entry) {
                    if (!entry) {
                        return;
                    }
                    engine.files.readAnyFiles(entry);
                });
            });
            dom_cache.mute.on('click', function () {
                engine.player.mute();
            });
            dom_cache.volume.parent().get(0).onmousewheel = function (e) {
                if (e.wheelDelta > 0) {
                    engine.player.volume("+10");
                } else {
                    engine.player.volume("-10");
                }
            };
            dom_cache.progress.get(0).onmousewheel = function (e) {
                if (e.wheelDelta > 0) {
                    clearTimeout(var_cache.progress_timer);
                    var_cache.progress_timer = setTimeout(function () {
                        engine.player.position("+5");
                    }, 25);
                } else {
                    clearTimeout(var_cache.progress_timer);
                    var_cache.progress_timer = setTimeout(function () {
                        engine.player.position("-5");
                    }, 25);
                }
            };
            dom_cache.btnPlaylist.on('click', function () {
                engine.windowManager({type: 'playlist'});
            });
            $('div.loop').on('click', function () {
                engine.playlist.setLoop();
            });
            $('div.shuffle').on('click', function () {
                engine.playlist.setShuffle();
            });
            var bounds_timer;
            var next_step;
            chrome.app.window.current().onBoundsChanged.addListener(function () {
                if (document.webkitHidden) {
                    return;
                }
                if (settings.pined_playlist) {
                    engine.setPinPosition('playlist', settings.pin_position);
                }
                var time = (new Date).getTime();
                if (next_step > time) {
                    return;
                }
                next_step = time + 450;
                clearTimeout(bounds_timer);
                bounds_timer = setTimeout(function () {
                    var window_left = window.screenLeft;
                    var window_top = window.screenTop;
                    if (var_cache.window_left !== window_left || var_cache.window_top !== window_top) {
                        var_cache.window_left = window_left;
                        var_cache.window_top = window_top;
                        chrome.storage.local.set({'pos_left': window_left, 'pos_top': window_top});
                    }
                }, 500);
            });
        },
        setTags : function (tb) {
            var trackalbum = '';
            if (tb.aa !== undefined) {
                trackalbum = ' - ' + tb.aa;
            }
            if (is_winamp) {
                dom_cache.trackname.text(tb.title + trackalbum).parent().attr("title", tb.title + trackalbum);
                calculateMoveble(dom_cache.trackname, 153, 'name');
            } else {
                dom_cache.trackname.text(tb.title).parent().attr("title", tb.title);
                dom_cache.trackalbum.text(tb.aa || '').parent().attr("title", tb.aa || '');
            }
            document.title = tb.title + trackalbum;
            if (tb.picture !== undefined) {
                showImage(tb.picture);
            } else {
                hideImage();
            }
            setTrueText(tb.title, tb.aa || '');
            //console.log(tags)
        },
        setProgress : function (max, pos) {
            var width_persent = pos / max * 100;
            dom_cache.progress.slider("value", width_persent * 10);
            if (is_winamp) {
                var lp = parseInt(width_persent / 100 * -29) || 0;
                dom_cache.progress_ui_a.css('margin-left', lp + 'px');
            }
            var time = undefined;
            if (time_tipe) {
                time = "-" + toHHMMSS(max - pos);
            } else {
                time = toHHMMSS(pos);
            }
            if (time === dom_cache.time_cache) {
                return;
            }
            dom_cache.time_cache = time;
            dom_cache.time.text(time);
        },
        setVolume : function (pos) {
            if (engine.player.getMute()) {
                if (var_cache.volume_image === -1) {
                    return;
                }
                dom_cache.volume.parent().children('.pic').attr('class', 'pic mute');
                var_cache.volume_image = -1;
                return;
            }
            var max = 1.0;
            var width_persent = pos / max * 100;
            dom_cache.volume.slider("value", width_persent);
            if (is_winamp) {
                dom_cache.volume.css('background', getVolumeColor(width_persent));
            }
            if (width_persent > 70) {
                if (var_cache.volume_image === 1) {
                    return;
                }
                var_cache.volume_image = 1;
                dom_cache.volume.parent().children('.pic').attr('class', 'pic high');
            } else if (pos === 0) {
                if (var_cache.volume_image === 2) {
                    return;
                }
                var_cache.volume_image = 2;
                dom_cache.volume.parent().children('.pic').attr('class', 'pic zero');
            } else if (width_persent < 40) {
                if (var_cache.volume_image === 3) {
                    return;
                }
                var_cache.volume_image = 3;
                dom_cache.volume.parent().children('.pic').attr('class', 'pic low');
            } else if (width_persent < 70) {
                if (var_cache.volume_image === 4) {
                    return;
                }
                var_cache.volume_image = 4;
                dom_cache.volume.parent().children('.pic').attr('class', 'pic medium');
            }
        },
        state : function (type) {
            if (_debug) {
                console.log(type);
            }
            if (type === "playlist_is_empty") {
                dom_cache.click_for_open.show();
            }
            if (type === "playlist_not_empty") {
                dom_cache.click_for_open.hide();
            }
            if (type === "preloading") {
                dom_cache.loading.show();
            }
            if (type === "preloading_dune") {
                dom_cache.loading.hide();
            }
            if (type === "loadstart") {
                dom_cache.loading.show();
                preBufferingController.loading();
            }
            if (type === "loadeddata") {
                dom_cache.loading.hide();
                preBufferingController.update();
                preBufferingController.start();
            }
            if (type === "emptied") {
                dom_cache.loading.hide();
                dom_cache.trackname.empty();
                dom_cache.trackalbum.empty();
                dom_cache.time.empty();
                hideImage();
                var_cache = {};
                var_cache.progress_w = dom_cache.progress.width();
                var_cache.volume_w = dom_cache.volume.width();
                isPause();
                view.setProgress(0.1, 0);
                preBufferingController.stop();
                preBufferingController.hide();
            }
            if (type === "error") {
                dom_cache.loading.hide();
                preBufferingController.stop();
                preBufferingController.hide();
                isPause();
            }
            if (type === "waiting") {
                dom_cache.loading.show();
            }
            if (type === "play") {
                dom_cache.loading.show();
                isPlaying();
            }
            if (type === "playing") {
                dom_cache.loading.hide();
                isPlaying();
            }
            if (type === "pause") {
                dom_cache.loading.hide();
                isPause();
            }
            if (type === "canplay") {
                engine.player.play();
            }
        },
        updateSettings : function (changes) {
            if (changes.extend_volume_scroll !== undefined) {
                make_extend_volume(changes.extend_volume_scroll);
            }
            if (changes.visual_type !== undefined) {
                writeWinampFFT();
            }
            if (_lang.t !== window._language) {
                window._language = _lang.t;
                write_language();
            }
        },
        preBufferingController : preBufferingController,
        setShuffle : function (shuffle) {
            if (shuffle) {
                $('div.shuffle').addClass('on');
            } else {
                $('div.shuffle').removeClass('on');
            }
        },
        setLoop : function (loop) {
            if (loop) {
                $('div.loop').addClass('on');
            } else {
                $('div.loop').removeClass('on');
            }
        },
        getContextMenu : function () {
            return context_menu;
        },
        toHHMMSS : toHHMMSS
    };
}();
(function () {
    var settings_ready = false;
    var dom_ready = false;
    chrome.runtime.onMessage.addListener(function (msg) {
        if (msg.settings !== undefined) {
            view.updateSettings(msg.settings);
        } else if (msg === 'settings_ready') {
            settings_ready = true;
            if (dom_ready) {
                view.show();
                settings_ready = undefined;
                dom_ready = undefined;
            }
        }
    });
    $(function () {
        dom_ready = true;
        if (settings_ready) {
            view.show();
            settings_ready = undefined;
            dom_ready = undefined;
        }
    });
})();