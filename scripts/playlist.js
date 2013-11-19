var _player = null;
var playlist = function() {
    var engine = null;
    var dom_cache = {};
    var var_cache = {};
    var sendPlayer = function(callback) {
        if (_player === null || _player.window === null) {
            chrome.runtime.getBackgroundPage(function(bg) {
                _player = bg.wm.getPlayer();
                if (_player !== null) {
                    callback();
                }
            });
        } else {
            callback();
        }
    };
    var item_read = function(item) {
        var title = '';
        var info = '';
        var pic = 'none';
        var tags = item.tags;
        if (item.tags === null) {
            title = item.file.name;
        } else {
            if ("title" in tags) {
                title = item.tags.title;
            } else {
                title = item.file.name;
            }
            if ("album" in tags && "artist" in tags) {
                info = tags.artist + ' - ' + tags.album;
            } else
            if ("artist" in tags) {
                info = tags.artist;
            } else
            if ("album" in tags) {
                info = tags.album;
            }
            if ("picture" in tags) {
                pic = tags.picture;
            }
        }
        return {title: title, info: info, pic: pic};
    };
    var add_image = function(id) {
        if (id === "none") {
            return;
        }
        if ($('style.pic_' + id).length > 0) {
            return;
        }
        sendPlayer(function() {
            var img = _player.engine.getCover(id);
            var data = img.data;
            if (data === null) {
                data = "images/no-cover.png";
            }
            $('body').remove('style.pic_' + id).append('<style class="cover pic_' + id + '">.pic_' + id + '{background-image:url(' + data + ');}</style>');
        });
    };
    var write_playlist = function(items) {
        dom_cache.playlist_ul.empty();
        var n = 0;
        items.forEach(function(item) {
            item = item_read(item);
            add_image(item.pic);
            dom_cache.playlist_ul.append('<li data-id="' + n + '"><div class="gr_line"></div><div class="cover ' + 'pic_' + item.pic + '"></div><span class="name" title="' + item.title + '">' + item.title + '</span><span class="info" title="' + item.info + '">' + item.info + '</span></li>');
            n++;
        });
        sendPlayer(function() {
            _player.engine.getCurrent();
        });
    };
    var update_playlist_item = function(id, item) {
        var itm = $('li[data-id=' + id + ']');
        item = item_read(item);
        add_image(item.pic);
        itm.children('.cover').attr('class', 'cover pic_' + item.pic);
        itm.children('.name').text(item.title);
        itm.children('.info').text(item.info);
    };
    var scrool_to = function(el) {
        if (el.offset() === undefined) {
            return;
        }
        dom_cache.playlist.scrollTop(el.offset().top + dom_cache.playlist.scrollTop() - 24);
    };
    return {
        show: function() {
            dom_cache = {
                playlist: $('div.playlist'),
                playlist_ul: $('div.playlist ul'),
                shuffle: $('.shuffle.btn'),
                loop: $('.loop.btn')
            };
            $('.close').on('click', function() {
                window.close();
            });
            $('.mini').on('click', function() {
                chrome.app.window.current().minimize();
            });
            sendPlayer(function() {
                if (_player.engine !== null) {
                    write_playlist(_player.engine.getPlaylist());
                }
            });
            dom_cache.playlist_ul.on('click', 'li', function() {
                var id = $(this).attr('data-id');
                sendPlayer(function() {
                    _player.engine.open_id(id);
                });
            });
            dom_cache.shuffle.on('click', function() {
                sendPlayer(function() {
                    _player.engine.shuffle();
                });
            });
            sendPlayer(function() {
                _player.engine.shuffle(null);
            });
            dom_cache.loop.on('click', function() {
                sendPlayer(function() {
                    _player.engine.loop();
                });
            });
            sendPlayer(function() {
                _player.engine.loop(null);
            });
            var_cache['resize_timer'] = null;
            window.onresize = function() {
                dom_cache.playlist.css('height', (window.innerHeight - 49) + "px");
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
            setInterval(save_pos, 1000);
        },
        setPlaylist: function(items) {
            write_playlist(items);
        },
        updPlaylistItem: function(id, item) {
            update_playlist_item(id, item);
        },
        selected: function(id) {
            $('li.selected').removeClass('selected');
            var el = $('li[data-id=' + id + ']').addClass('selected');
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
        },
        minimize: function() {
            $('.mini').trigger('click');
        }
    };
}();
$(function() {
    playlist.show();
});