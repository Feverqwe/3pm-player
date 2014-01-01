var playlist = function() {
    var dom_cache = {};
    var var_cache = {};
    var _lang = undefined;
    var settings = undefined;
    function sendPlayer(callback) {
        /*
         * Функция отправки действий в плеер
         */
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
                var data = "images/no-cover.png";
                var item = id[i];
                sendPlayer(function(window) {
                    if (item !== 'none') {
                        var url = window.engine.getCover(item).data;
                        if (url !== null) {
                            data = url;
                        }
                    }
                    dom_list[i] = $('<style>', {'class': 'cover pic_' + item, text: '.pic_' + item + '{background-image:url(' + data + ');}'});
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
        sendPlayer(function(window) {
            var img = window.engine.getCover(id);
            var data = img.data;
            if (data === null) {
                data = "images/no-cover.png";
            }
            dom_cache.body.append($('<style>', {'class': 'cover pic_' + id, text: '.pic_' + id + '{background-image:url(' + data + ');}'}));
        });
    };
    var write_playlist = function(items) {
        /*
         * Выводит плэйлист на страницу.
         */
        var dom_list = new Array(items.length);
        var pic_list = [];
        for (var i = 0, obj; obj = items[i]; i++) {
            var item = item_read(obj);
            if (settings.is_winamp) {
                if (item.info.length > 0) {
                    item.title = item.title + ' - ' + item.info;
                }
                item.info = '';
                item.pic = 'none';
            }
            if (pic_list.indexOf(item.pic) === -1) {
                pic_list.push(item.pic);
            }
            dom_list[i] = $('<li>', {'data-id': obj.id}).append(
                    $('<div>', {'class': 'gr_line'}),
            $('<div>', {'class': 'cover pic_' + item.pic}),
            $('<span>', {'class': 'name', title: item.title, text: item.title}),
            $('<span>', {'class': 'info', title: item.info, text: item.info}),
            $('<div>', {'class': 'move', title: _lang.move_item})
                    );
        }
        add_image(pic_list);
        dom_cache.playlist_ul.empty().append(dom_list);
        sendPlayer(function(window) {
            window.engine.getCurrent();
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
            content[i] = $('<li>', {title: item.name, 'data-id': item.id, text: item.name});
        }
        dom_cache.pl_list.empty().append(content);
    };
    var selectPL = function(playlist) {
        /*
         * Показывает скрываает кнопку отображения скписка плэйлстов.
         */
        if (playlist !== undefined) {
            makeSelectList(playlist.list);
            $('.playlist_select').show();
        } else {
            $('.playlist_select').hide();
        }
    };
    var setInfo = function(info) {
        /*
         * Выставляет заголовок плэйлистуы
         */
        if (info === undefined) {
            info = {name: _lang.playlist_title};
        }
        dom_cache.title.text(info.name).attr('title', info.name);
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
    };
    return {
        preload: function() {
            sendPlayer(function(window) {
                _lang = window._lang;
                settings = window.engine.getSettings();
                playlist.show();
            });
        },
        show: function() {
            dom_cache = {
                body: $('body'),
                playlist: $('div.playlist'),
                playlist_ul: $('div.playlist ul'),
                shuffle: $('.shuffle.btn'),
                loop: $('.loop.btn'),
                order: $('.sort.btn'),
                pl_list: $('.pl_list_select'),
                title: $('body').children('div.title')
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
            $('.close').on('click', function() {
                save_pos();
                window.close();
            });
            $('.mini').on('click', function() {
                chrome.app.window.current().minimize();
            });
            sendPlayer(function(window) {
                write_playlist(window.engine.getPlaylist());
            });
            write_language();
            dom_cache.playlist_ul.on('click', 'li', function() {
                var id = $(this).attr('data-id');
                sendPlayer(function(window) {
                    window.engine.open_id(id);
                });
            });
            dom_cache.playlist_ul.sortable({handle: ".move", axis: "y", stop: function() {
                    sendPlayer(function(window) {
                        var type = window.engine.getSortedList();
                        var old_sort_list = type[1];
                        var type = -1;
                        var arr = $.makeArray(dom_cache.playlist_ul.children('li'));
                        var new_arr = [];
                        arr.forEach(function(item) {
                            var id = parseInt($(item).attr('data-id'));
                            old_sort_list.forEach(function(old_item) {
                                if (old_item.id === id) {
                                    new_arr.push(old_item);
                                    return 0;
                                }
                            });
                        });
                        window.engine.setSortedList(new_arr, type, 1);
                    });
                }
            });
            dom_cache.shuffle.on('click', function() {
                sendPlayer(function(window) {
                    window.engine.shuffle();
                });
            });
            sendPlayer(function(window) {
                window.engine.shuffle(null);
            });
            dom_cache.loop.on('click', function() {
                sendPlayer(function(window) {
                    window.engine.loop();
                });
            });
            sendPlayer(function(window) {
                window.engine.loop(null);
            });
            dom_cache.order.on('click', function() {
                sendPlayer(function(window) {
                    var type = window.engine.getSortedList();
                    var list_for_sort = type[1];
                    var type = type[0];
                    if (type === 0) {
                        type = 1;
                        list_for_sort.sort(function(a, b) {
                            var c = a.file.name || a.file.url;
                            var d = b.file.name || b.file.url;
                            return (c === d) ? 0 : (c > d) ? 1 : -1;
                        });
                    } else {
                        type = 0;
                        list_for_sort.sort(function(a, b) {
                            var c = a.id;
                            var d = b.id;
                            return (c === d) ? 0 : (c > d) ? 1 : -1;
                        });
                    }
                    window.engine.setSortedList(list_for_sort, type);
                });
            });
            var_cache['resize_timer'] = null;
            window.onresize = function() {
                clearTimeout(var_cache.resize_timer);
                var_cache.resize_timer = setTimeout(function() {
                    var coef = window.devicePixelRatio;
                    var win_w = parseInt(window.innerWidth * coef);
                    var win_h = parseInt(window.innerHeight * coef);
                    chrome.storage.local.set({pl_w: win_w, pl_h: win_h});
                }, 500);
            };
            $(window).trigger('resize');
            var save_pos = function() {
                if (document.webkitHidden) {
                    return;
                }
                var wl = window.screenLeft;
                var wr = window.screenTop;
                if (var_cache['wl'] !== wl || var_cache['wr'] !== wr) {
                    var_cache['wl'] = wl;
                    var_cache['wr'] = wr;
                    chrome.storage.local.set({'pl_pos_left': wl, 'pl_pos_top': wr});
                }
            };
            $('.playlist_select').on('click', function() {
                dom_cache.pl_list.toggle();
            });
            $('.read_tags.btn').on('click', function() {
                sendPlayer(function(window) {
                    window.engine.readAllTags();
                });
            });
            dom_cache.pl_list.on('click', 'li', function() {
                var id = $(this).data('id');
                sendPlayer(function(window) {
                    window.engine.select_playlist(id);
                });
                $(this).parent().hide();
            });
            sendPlayer(function(window) {
                selectPL(window.engine.getM3UPlaylists());
                setInfo(window.engine.getPlaylistInfo());
                window.engine.set_hotkeys(document);
            });
            setInterval(function() {
                save_pos();
                chrome.runtime.getBackgroundPage(function(bg) {
                    bg.wm.hi("playlist", chrome.app.window.current());
                });
            }, 5000);
        },
        setPlaylist: function(items) {
            write_playlist(items);
        },
        setPlaylistInfo: setInfo,
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
        minimize: function() {
            $('.mini').trigger('click');
        },
        setSelectList: selectPL
    };
}();
$(function() {
    playlist.preload();
});