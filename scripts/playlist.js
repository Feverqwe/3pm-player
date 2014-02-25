var playlist = function() {
    var dom_cache = {};
    var var_cache = {};
    var settings = undefined;
    var order_index = undefined;
    var _playlist = undefined;
    var numberSort = function(items) {
        return items.sort(function(aa, bb) {
            var a = _playlist[aa].file;
            var b = _playlist[bb].file;
            var c = parseInt(a.name);
            var d = parseInt(b.name);
            if (isNaN(c) && isNaN(d)) {
                return (a.name === b.name) ? 0 : (a.name > b.name) ? 1 : -1;
            } else
            if (isNaN(c)) {
                return 1;
            } else
            if (isNaN(d)) {
                return -1;
            }
            return (c === d) ? 0 : (c > d) ? 1 : -1;
        });
    };
    var textSort = function(items) {
        return items.sort(function(aa, bb) {
            var a = _playlist[aa].file;
            var b = _playlist[bb].file;
            return (a.name === b.name) ? 0 : (a.name > b.name) ? 1 : -1;
        });
    };
    var item_read = function(item) {
        /*
         * Создает обьект элемента для плэйлиста
         */
        var title = '';
        var info = '';
        var pic = 'none';
        var tags = item.tags;
        if (item.tags === undefined) {
            title = item.file.name;
        } else {
            if (tags.title !== undefined && tags.title.length > 0) {
                title = item.tags.title;
            } else {
                title = item.file.name;
            }
            if (tags.album !== undefined && tags.artist !== undefined && tags.album.length > 0 && tags.artist.length > 0) {
                info = tags.artist + ' - ' + tags.album;
            } else
            if (tags.artist !== undefined && tags.artist.length > 0) {
                info = tags.artist;
            } else
            if (tags.album !== undefined && tags.album.length > 0) {
                info = tags.album;
            }
            if (tags.picture !== undefined) {
                pic = tags.picture;
            }
        }
        return {title: title, info: info, pic: pic};
    };
    var add_image = function(id) {
        /*
         * Добавляет картинку как стиль.
         */
        if (typeof id === 'object') {
            var idl = id.length;
            var dom_list = new Array(idl);
            for (var i = 0; i < idl; i++) {
                var url = "images/no-cover.png";
                var item = id[i];
                _send('player', function(window) {
                    if (item !== 'none') {
                        url = window.engine.tags.getCover(item);
                    }
                    dom_list[i] = $('<style>', {'class': 'cover pic_' + item, text: '.pic_' + item + '{background-image:url(' + url + ');}'});
                });
            }
            dom_cache.body.append(dom_list);
            return;
        }
        if (id === 'none') {
            return;
        }
        if ($('style.pic_' + id).length > 0) {
            return;
        }
        _send('player', function(window) {
            var url = window.engine.tags.getCover(id);
            dom_cache.body.append($('<style>', {'class': 'cover pic_' + id, text: '.pic_' + id + '{background-image:url(' + url + ');}'}));
        });
    };
    var writePlaylist = function(obj) {
        /*
         * Выводит плэйлист на страницу.
         */
        order_index = obj.order_index;
        var playlist_ordered = obj.playlist_ordered;
        if (playlist_ordered === undefined) {
            return;
        }
        var playlist_order_len = playlist_ordered.length;
        _playlist = obj.playlist;
        var info = obj.info;
        setInfo(info);
        var dom_list = new Array(playlist_order_len);
        var pic_list = [];
        for (var i = 0; i < playlist_order_len; i++) {
            var track = _playlist[playlist_ordered[i]];
            var tags = item_read(track);
            if (settings.is_winamp) {
                if (tags.info.length > 0) {
                    tags.title = tags.title + ' - ' + tags.info;
                }
                tags.info = '';
                tags.pic = 'none';
            }
            if (pic_list.indexOf(tags.pic) === -1) {
                pic_list.push(tags.pic);
            }
            dom_list[i] = $('<li>', {'data-id': track.id}).append(
                    $('<div>', {'class': 'gr_line'}),
            $('<div>', {'class': 'cover pic_' + tags.pic, title: (track.file.url !== track.file.name) ? track.file.name : ''}),
            $('<span>', {'class': 'name', title: tags.title, text: tags.title}),
            $('<span>', {'class': 'info', title: tags.info, text: tags.info}),
            $('<div>', {'class': 'move', title: _lang.move_item})
                    );
        }
        add_image(pic_list);
        dom_cache.playlist_ul.empty().append(dom_list);
        _send('player', function(window) {
            playlist.selected(window.engine.player.current_id);
        });
    };
    var update_playlist_item = function(id, item) {
        /*
         * Обновляет элемент в плэйлисте
         */
        var itm = dom_cache.playlist_ul.children('li[data-id=' + id + ']');
        if (item.state === "loading") {
            itm.addClass("loading");
        } else {
            itm.removeClass("loading");
        }
        item = item_read(item);
        if (settings.is_winamp) {
            if (item.info.length > 0) {
                item.title = item.title + ' - ' + item.info;
            }
            item.info = '';
            item.pic = 'none';
        }
        add_image(item.pic);
        itm.children('.cover').attr('class', 'cover pic_' + item.pic);
        itm.children('.name').attr('title', item.title).text(item.title);
        itm.children('.info').attr('title', item.info).text(item.info);
    };
    var scrool_to = function(el) {
        /*
         * Скролит до конкретного элемента.
         */
        if (el.offset() === undefined) {
            return;
        }
        dom_cache.playlist.scrollTop(el.offset().top + dom_cache.playlist.scrollTop() - (dom_cache.playlist.height() / 2));
    };
    var makeSelectList = function(arr) {
        /*
         * Создает список выбора плэйлиста
         */
        var content = new Array(arr.length);
        for (var i = 0, item; item = arr[i]; i++) {
            content[i] = $('<li>', {'data-id': item.id, title: item.name, text: item.name}).append( $('<div>', {'class': 'rm_btn t_btn', title: _lang.remove_item}) );
        }
        dom_cache.pl_list.empty().append(content);
    };
    var selectPL = function(playlist) {
        /*
         * Показывает скрываает кнопку отображения скписка плэйлстов.
         */
        if (playlist.length !== 0) {
            makeSelectList(playlist);
            dom_cache.pl_sel_btn.show();
        } else {
            dom_cache.pl_sel_btn.hide();
        }
    };
    var setInfo = function(info) {
        /*
         * Выставляет заголовок плэйлистуы
         */
        if (info === undefined || info.name === undefined) {
            info = {name: _lang.playlist_title};
        }
        dom_cache.title.text(info.name).attr('title', info.name);
        document.title = info.name;
        dom_cache.pl_list.children('li.selected').removeClass("selected");
        if (info.id !== undefined) {
            dom_cache.pl_list.children('li[data-id=' + info.id + ']').addClass("selected");
        }
    };
    var write_language = function() {
        $('.t_btn.mini').attr('title', _lang.mini);
        $('.t_btn.close').attr('title', _lang.close);
        $('.t_btn.playlist_select').attr('title', _lang.playlist_select);
        $('body > div.title').text(_lang.playlist_title);
        $('.btn.shuffle').attr('title', _lang.shuffle);
        $('.btn.loop').attr('title', _lang.loop);
        $('.btn.sort').attr('title', _lang.sort);
        $('.btn.read_tags').attr('title', _lang.read_tags);
        $('div.drop > span').text(_lang.drop_append);
    };
    var inRang = function(value, a, b) {
        return (value >= a && value <= b);
    };
    var checkPin = function() {
        var window_left = window.screenLeft;
        var window_top = window.screenTop;
        var pb = _windows.player.getBounds();
        var pl_l = window_left;
        var pl_t = window_top;
        var dpr = window.devicePixelRatio;
        var pl_r = parseInt(window_left + window.innerWidth * dpr);
        var pl_b = parseInt(window_top + window.innerHeight * dpr);
        var p_b = pb.top + pb.height;
        var p_r = pb.left + pb.width;
        var p_t = pb.top;
        var p_l = pb.left;
        if (inRang(pl_r, p_l - 10, p_l) && inRang(pl_t, p_t, p_b)) {
            settings.pined_playlist = 1;
            settings.pin_position = 3;
        } else
        if (inRang(pl_l, p_r, p_r + 10) && inRang(pl_t, p_t, p_b)) {
            settings.pined_playlist = 1;
            settings.pin_position = 1;
        } else
        if (inRang(pl_r, p_l - 10, p_l) && inRang(pl_b, p_t, p_b)) {
            settings.pined_playlist = 1;
            settings.pin_position = 5;
        } else
        if (inRang(pl_l, p_r, p_r + 10) && inRang(pl_b, p_t, p_b)) {
            settings.pined_playlist = 1;
            settings.pin_position = 6;
        } else
        if (inRang(pl_b, p_t - 10, p_t) && inRang(pl_l, p_l, p_r)) {
            settings.pined_playlist = 1;
            settings.pin_position = 4;
        } else
        if (inRang(pl_t, p_b, p_b + 10) && inRang(pl_l, p_l, p_r)) {
            settings.pined_playlist = 1;
            settings.pin_position = 2;
        } else {
            settings.pined_playlist = 0;
        }
        chrome.storage.local.set({pined_playlist: settings.pined_playlist, pin_position: settings.pin_position});
        if (settings.pined_playlist) {
            _send('player', function(window) {
                window.engine.setPinPosition('playlist', settings.pin_position);
            });
        }
    };
    return {
        preload: function() {
            write_language();
            _send('player', function(window) {
                settings = window._settings;
                playlist.show();
            });
        },
        show: function() {
            dom_cache = {
                body: $('body'),
                drop: $('div.drop'),
                playlist: $('div.playlist'),
                playlist_ul: $('div.playlist ul'),
                shuffle: $('.shuffle.btn'),
                loop: $('.loop.btn'),
                order: $('.sort.btn'),
                pl_list: $('.pl_list_select'),
                title: $('body').children('div.title'),
                pl_sel_btn: $('.playlist_select')
            };
            if (settings.is_winamp) {
                dom_cache.body.addClass('winamp');
                dom_cache.body.append(
                        $('<div>', {'class': 'w_head'}),
                $('<div>', {'class': 'w_left'}),
                $('<div>', {'class': 'w_right'}),
                $('<div>', {'class': 'w_bottom'}),
                $('<div>', {'class': 'w_l_t'}),
                $('<div>', {'class': 'w_r_t'}),
                $('<div>', {'class': 'w_b_l'}),
                $('<div>', {'class': 'w_b_r'})
                        );
            }
            _send('player', function(window) {
                writePlaylist(window.engine.playlist.getPlaylist());
                playlist.setShuffle(window.engine.playlist.shuffle);
                playlist.setLoop(window.engine.playlist.loop);
                window.engine.setHotkeys(document);
                selectPL(window.engine.playlist.getM3UPlaylists());
            });
            $('.close').on('click', function() {
                window.close();
            });
            $('.mini').on('click', function() {
                chrome.app.window.current().minimize();
            });
            dom_cache.playlist_ul.on('click', 'li', function() {
                var id = $(this).attr('data-id');
                _send('player', function(window) {
                    window.engine.player.open(id);
                });
            });
            dom_cache.playlist_ul.sortable({handle: ".move", axis: "y", stop: function() {
                    _send('player', function(window) {
                        var new_order_index = -1;
                        var arr = $.makeArray(dom_cache.playlist_ul.children('li'));
                        var new_playlist_order = [];
                        arr.forEach(function(item) {
                            var id = parseInt($(item).attr('data-id'));
                            new_playlist_order.push(id);
                        });
                        window.engine.playlist.setSortedList(new_playlist_order, new_order_index);
                    });
                }
            });
            dom_cache.shuffle.on('click', function() {
                _send('player', function(window) {
                    window.engine.playlist.setShuffle();
                });
            });
            dom_cache.loop.on('click', function() {
                _send('player', function(window) {
                    window.engine.playlist.setLoop();
                });
            });
            dom_cache.order.on('click', function() {
                _send('player', function(window) {
                    var playlist_order = window.engine.playlist.playlist_order;
                    if (playlist_order[0] === undefined) {
                        return;
                    }
                    var next = order_index + 1;
                    if (next > 2) {
                        if (playlist_order[-1] !== undefined) {
                            next = -1;
                        } else {
                            next = 0;
                        }
                    }
                    if (next === 0 || next === -1) {
                        writePlaylist(window.engine.playlist.setPlaylistOrder(next));
                    } else
                    if (next === 1) {
                        var new_playlist_order = playlist_order[0].slice();
                        var new_order_index = 1;
                        new_playlist_order = textSort(new_playlist_order);
                        writePlaylist(window.engine.playlist.setSortedList(new_playlist_order, new_order_index));
                    } else
                    if (next === 2) {
                        var new_playlist_order = playlist_order[0].slice();
                        var new_order_index = 2;
                        new_playlist_order = numberSort(new_playlist_order);
                        writePlaylist(window.engine.playlist.setSortedList(new_playlist_order, new_order_index));
                    }
                });
            });
            dom_cache.pl_sel_btn.on('click', function() {
                dom_cache.pl_list.toggle();
            });
            $('.read_tags.btn').on('click', function() {
                _send('player', function(window) {
                    window.engine.tags.readAllTags();
                });
            });
            dom_cache.pl_list.on('click', 'li', function(e) {
                e.preventDefault();
                var id = $(this).data('id');
                _send('player', function(window) {
                    window.engine.playlist.selectPlaylist(id);
                });
                $(this).parent().hide();
            });
            dom_cache.pl_list.on('click', 'li > div.rm_btn', function(e) {
                e.stopPropagation();
                var item = $(this).parent();
                var id = item.data('id');
                _send('player', function(window) {
                    window.engine.playlist.rmPlaylist(id);
                });
                var ul = item.parent();
                item.remove();
                if ( ul.children('li').length === 0 ) {
                    dom_cache.pl_sel_btn.hide();
                    ul.hide();
                }
            });
            dom_cache.body.on('drop', function(event) {
                event.preventDefault();
                var entrys = event.originalEvent.dataTransfer.items;
                _send('player', function(window) {
                    if (window.engine.playlist.playlist_info.id === undefined) {
                        window.engine.files.readAnyFiles(entrys);
                        return;
                    }
                    window.engine.files.readAnyFiles(entrys, function(playlists) {
                        var def_index = -1;
                        playlists.forEach(function(list, n) {
                            if (list.isDefault) {
                                def_index = n;
                                window.engine.files.entry2files(list.entrys, function(files){
                                    window.engine.playlist.append(files)
                                });
                            }
                        });
                        if (def_index !== -1) {
                            playlists.splice(def_index, 1);
                        }
                        if ((def_index !== -1 && playlists.length > 1) || (def_index === -1 && playlists.length > 0)) {
                            dom_cache.pl_list.show();
                        }
                        window.engine.playlist.appendPlaylists(playlists);
                    });
                });
            });
            var drag_timeout = undefined;
            dom_cache.body.on('dragover', function(event) {
                event.preventDefault();
                dom_cache.drop.css({"display": "block"});
                clearTimeout(drag_timeout);
                drag_timeout = setTimeout(function() {
                    dom_cache.drop.css({"display": "none"});
                }, 300);
            });
            chrome.app.window.current().onRestored.addListener(function() {
                if (settings.pined_playlist) {
                    _send('player', function(window) {
                        window._focusAll();
                    });
                }
            });
            var bounds_timer;
            var pin_timer;
            var next_step;
            var next_step_pin;
            chrome.app.window.current().onBoundsChanged.addListener(function() {
                if (document.webkitHidden) {
                    return;
                }
                var time = (new Date).getTime();
                if (next_step_pin > time) {
                    return;
                }
                next_step_pin = time + 150;
                clearTimeout(pin_timer);
                pin_timer = setTimeout(function() {
                    checkPin();
                }, 200);
                if (next_step > time) {
                    return;
                }
                if (chrome.app.window.current().isMaximized()) {
                    return;
                }
                next_step = time + 450;
                clearTimeout(bounds_timer);
                bounds_timer = setTimeout(function() {
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
                        chrome.storage.local.set({pl_pos_left: window_left, pl_pos_top: window_top, pl_w: window_width, pl_h: window_height});
                    }
                }, 500);
            });
        },
        setPlaylist: function(a) {
            writePlaylist(a);
        },
        updPlaylistItem: function(id, item) {
            update_playlist_item(id, item);
        },
        selected: function(id) {
            dom_cache.playlist_ul.children('li.selected').removeClass('selected');
            var el = dom_cache.playlist_ul.children('li[data-id=' + id + ']').addClass('selected');
            scrool_to(el);
        },
        setShuffle: function(status) {
            if (status) {
                dom_cache.shuffle.css('background-image', 'url(images/shuffle_on.png)');
            } else {
                dom_cache.shuffle.css('background-image', 'url(images/shuffle_w.png)');
            }
        },
        setLoop: function(status) {
            if (status) {
                dom_cache.loop.css('background-image', 'url(images/loop_on.png)');
            } else {
                dom_cache.loop.css('background-image', 'url(images/loop_w.png)');
            }
        },
        empty: function() {
            $('style.cover').remove();
            dom_cache.playlist_ul.empty();
            setInfo();
        },
        setSelectList: selectPL
    };
}();
$(function() {
    playlist.preload();
});