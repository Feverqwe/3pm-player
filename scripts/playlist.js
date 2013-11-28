var playlist = function() {
    var dom_cache = {};
    var var_cache = {};
    var _player_window = undefined;
    function sendPlayer(callback) {
        /*
         * Функция отправки действий в плеер
         */
        if (_player_window === undefined || _player_window.window === null) {
            chrome.runtime.getBackgroundPage(function(bg) {
                _player_window = bg.wm.getPlayer();
                if (_player_window !== undefined) {
                    callback(_player_window);
                }
            });
        } else {
            callback(_player_window);
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
            if ("title" in tags && tags.title.length > 0) {
                title = item.tags.title;
            } else {
                title = item.file.name;
            }
            if ("album" in tags && "artist" in tags && tags.album.length > 0 && tags.artist.length > 0) {
                info = tags.artist + ' - ' + tags.album;
            } else
            if ("artist" in tags && tags.artist.length > 0) {
                info = tags.artist;
            } else
            if ("album" in tags && tags.album.length > 0) {
                info = tags.album;
            }
            if ("picture" in tags) {
                pic = tags.picture;
            }
        }
        return {title: title, info: info, pic: pic};
    };
    var add_image = function(id) {
        /*
         * Добавляет картинку как стиль.
         */
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
            $('body').remove('style.pic_' + id).append('<style class="cover pic_' + id + '">.pic_' + id + '{background-image:url(' + data + ');}</style>');
        });
    };
    var write_playlist = function(items) {
        /*
         * Выводит плэйлист на страницу.
         */
        dom_cache.playlist_ul.empty();
        var n = 0;
        items.forEach(function(obj) {
            var item = item_read(obj);
            add_image(item.pic);
            dom_cache.playlist_ul.append('<li data-id="' + obj.id + '"><div class="gr_line"></div><div class="cover ' + 'pic_' + item.pic + '"></div><span class="name" title="' + item.title + '">' + item.title + '</span><span class="info" title="' + item.info + '">' + item.info + '</span></li>');
            n++;
        });
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
        add_image(item.pic);
        itm.children('.cover').attr('class', 'cover pic_' + item.pic);
        itm.children('.name').text(item.title);
        itm.children('.info').text(item.info);
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
        var content = '';
        arr.forEach(function(item) {
            content += '<li title="' + item.name + '" data-id="' + item.id + '">' + item.name + '</li>';
        });
        dom_cache.pl_list.html(content);
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
            info = {name: "Playlist"};
        }
        dom_cache.title.text(info.name).attr('title', info.name);
        dom_cache.pl_list.children('li.selected').removeClass("selected");
        if ("id" in info) {
            dom_cache.pl_list.children('li[data-id=' + info.id + ']').addClass("selected");
        }
    };
    return {
        show: function() {
            dom_cache = {
                playlist: $('div.playlist'),
                playlist_ul: $('div.playlist ul'),
                shuffle: $('.shuffle.btn'),
                loop: $('.loop.btn'),
                order: $('.sort.btn'),
                pl_list: $('.pl_list_select'),
                title: $('body').children('div.title')
            };
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
            dom_cache.playlist_ul.on('click', 'li', function() {
                var id = $(this).attr('data-id');
                sendPlayer(function(window) {
                    window.engine.open_id(id);
                });
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
                    chrome.storage.local.set({pl_w: window.innerWidth, pl_h: window.innerHeight});
                }, 500);
            };
            $(window).trigger('resize');
            var save_pos = function() {
                var wl = window.screenLeft;
                var wr = window.screenTop;
                if (var_cache['wl'] !== wl || var_cache['wr'] !== wr) {
                    var_cache['wl'] = wl;
                    var_cache['wr'] = wr;
                    chrome.storage.local.set({'pl_pos_left': wl, 'pl_pos_top': wr});
                }
            };
            $('div.playlist_select').on('click', function() {
                dom_cache.pl_list.toggle();
            });
            dom_cache.pl_list.on('click', 'li', function() {
                var id = $(this).data('id');
                sendPlayer(function(window) {
                    window.view.select_playlist(id);
                });
                $(this).parent().hide();
            });
            sendPlayer(function(window) {
                selectPL(window.engine.getM3UPlaylists());
                setInfo(window.engine.getPlaylistInfo());
            });
            $(document).keydown(function(event) {
                if ('keyCode' in event === false) {
                    return;
                }
                if (event.keyCode === 32) {
                    event.preventDefault();
                    sendPlayer(function(window) {
                        window.engine.playToggle();
                    });
                } else
                if (event.keyCode === 118 || event.keyCode === 86) {
                    event.preventDefault();
                    sendPlayer(function(window) {
                        window.engine.mute();
                    });
                } else
                if (event.keyCode === 115 || event.keyCode === 83) {
                    event.preventDefault();
                    sendPlayer(function(window) {
                        window.engine.shuffle();
                    });
                } else
                if (event.keyCode === 114 || event.keyCode === 82) {
                    event.preventDefault();
                    sendPlayer(function(window) {
                        window.engine.loop();
                    });
                } else
                if (event.keyCode === 113) {
                    event.preventDefault();
                    sendPlayer(function(window) {
                        window.engine.next();
                    });
                } else
                if (event.keyCode === 112) {
                    event.preventDefault();
                    sendPlayer(function(window) {
                        window.engine.preview();
                    });
                } else
                if (event.ctrlKey) {
                    if (event.keyCode === 38) {
                        event.preventDefault();
                        sendPlayer(function(window) {
                            window.engine.volume("+10");
                        });
                    } else
                    if (event.keyCode === 40) {
                        event.preventDefault();
                        sendPlayer(function(window) {
                            window.engine.volume("-10");
                        });
                    } else
                    if (event.keyCode === 39) {
                        event.preventDefault();
                        clearTimeout(var_cache.progress_keydown_timer);
                        var_cache.progress_keydown_timer = setTimeout(function() {
                            sendPlayer(function(window) {
                                window.engine.position("+10");
                            });
                        }, 25);
                    } else
                    if (event.keyCode === 37) {
                        event.preventDefault();
                        clearTimeout(var_cache.progress_keydown_timer);
                        var_cache.progress_keydown_timer = setTimeout(function() {
                            sendPlayer(function(window) {
                                window.engine.position("-10");
                            });
                        }, 25);
                    }
                }
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
    playlist.show();
});