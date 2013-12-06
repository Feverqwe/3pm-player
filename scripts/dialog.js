var dialog = function() {
    var var_cache = {};
    var dom_cache = {};
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
    var createURLform = function() {
        /*
         * Создает форму для ввода URL
         */
        $('.url_dialog').show();
        $('.url_dialog input[name=open_btn]').on('click', function() {
            var text = $(this).parent().children('input[name=url]').get(0);
            sendPlayer(function(window) {
                window.engine.open([{url: text.value}], {name: "URL"});
            });
            window.close();
        });
        $('.url_dialog input[name=url]').on('keyup', function(event) {
            if (event.keyCode === 13) {
                $(this).parent().children('input[name=open_btn]').trigger('click');
            } else
            if (event.keyCode === 27) {
                window.close();
            }
        }).get(0).focus();
    };
    var playlistChiser = function() {
        /*
         * Создает форму выбора m3u файла
         */
        $('.playlist_chiser').show();
        var pl = $('.playlists').children("ul");
        var arr = window.options.playlists;
        arr.forEach(function(item) {
            pl.append('<li class="pl_file" data-id="' + item.id + '"><div class="gr_line"></div><span title="' + item.name + '">' + item.name + '</span></li>');
        });
        $('body').on('click', 'li.pl_file', function() {
            var id = $(this).data("id");
            sendPlayer(function(window) {
                window.view.select_playlist(id);
            });
            window.close();
        });
    };
    var db_writefilelist = function(list) {
        dom_cache.dropbox_button.attr('disabled', 'disabled');
        var fl = dom_cache.dropbox_ul;
        fl.empty();
        if (list.path.length > 1) {
            fl.append('<li class="db_file" data-id="-1"><span title="Go Back">Go Back</span></li>');
        }
        var n = 0;
        list.contents.forEach(function(item) {
            var filename = item.path.split('/').slice(-1)[0];
            var action = '';
            if (item.is_dir) {
                action += '<div class="play" title="Play folder"></div>';
            } else {
                action += '<input name="id' + n + '" type="checkbox"/>';
            }
            fl.append('<li class="db_file" data-id="' + n + '"><span title="' + filename + '">' + filename + '</span>' + action + '</li>');
            n++;
        });
        var_cache.db_list = list;
    };
    var dropboxChoice = function() {
        /*
         * Создает форму выбора папок иди файлов для Dropbox
         */
        dom_cache.dropbox = $('.dropbox_choice');
        dom_cache.dropbox.show();
        dom_cache.dropbox_button = dom_cache.dropbox.find('input[type="button"]').eq(0);
        dom_cache.dropbox_ul = dom_cache.dropbox.find("ul").eq(0);
        db_writefilelist(window.options.filelist);
        dom_cache.dropbox.on('click', 'li.db_file', function(e) {
            if (e.target.nodeName === "INPUT") {
                return;
            }
            var id = parseInt($(this).data("id"));
            var path = undefined;
            var root = undefined;
            if (id === -1) {
                path = var_cache.db_list.path + '/..';
                root = var_cache.db_list.root;
            } else {
                var item = var_cache.db_list.contents[id];
                if (item.is_dir) {
                    path = item.path;
                    root = item.root;
                } else {
                    var ch_box = $(this).children('input');
                    ch_box.get(0).checked = !ch_box.get(0).checked;
                    ch_box.trigger('change');
                    return;
                }
            }
            sendPlayer(function(window) {
                window.engine.db.getFilelist(function(list) {
                    db_writefilelist(list);
                }, root, path);
            });
        });
        dom_cache.dropbox.on('change', 'input[type="checkbox"]', function(e) {
            e.preventDefault();
            e.stopPropagation();
            var checked = this.checked;
            if (checked) {
                $(this).parent().addClass('selected');
            } else {
                $(this).parent().removeClass('selected');
            }
            var count = dom_cache.dropbox.find('input[type="checkbox"]:checked').length;
            if (count > 0) {
                dom_cache.dropbox_button.removeAttr('disabled');
            } else {
                dom_cache.dropbox_button.attr('disabled', 'disabled');
            }
        });
        dom_cache.dropbox.on('click', 'li > .play', function(e) {
            e.preventDefault();
            e.stopPropagation();
            var id = parseInt($(this).parent().data("id"));
            var item = var_cache.db_list.contents[id];
            if (!item.is_dir) {
                return;
            }
            var path = item.path;
            var root = item.root;
            var _window = window;
            sendPlayer(function(window) {
                window.engine.db.getFilelist(function(list) {
                    var pl_name = list.path.split('/').slice(-1)[0] || "Dropbox";
                    var playlist = {name: pl_name, id: 0, type: "db", tracks: []};
                    list.contents.forEach(function(item) {
                        if (item.is_dir) {
                            return 1;
                        }
                        var filename = item.path.split('/').slice(-1)[0];
                        playlist.tracks.push({id: -1, file: {name: filename, url: undefined}, tags: {}, duration: 0, type: "db", root: item.root, path: item.path});
                    });
                    if (playlist.tracks.length === 0) {
                        return;
                    }
                    sendPlayer(function(window) {
                        window.engine.setM3UPlaylists({list: [playlist]});
                        window.view.select_playlist(0);
                    });
                    _window.close();
                }, root, path);
            });
        });
        dom_cache.dropbox_button.on('click', function(e) {
            e.preventDefault();
            var pl_name = var_cache.db_list.path.split('/').slice(-1)[0] || "Dropbox";
            var playlist = {name: pl_name, id: 0, type: "db", tracks: []};
            var items = $.makeArray(dom_cache.dropbox.find('input[type="checkbox"]:checked'));
            items.forEach(function(item) {
                var id = $(item).parent().data('id');
                item = var_cache.db_list.contents[id];
                if (item.is_dir) {
                    return 1;
                }
                var filename = item.path.split('/').slice(-1)[0];
                playlist.tracks.push({id: -1, file: {name: filename, url: undefined}, tags: {}, duration: 0, type: "db", root: item.root, path: item.path});
            });
            if (playlist.tracks.length === 0) {
                return;
            }
            sendPlayer(function(window) {
                window.engine.setM3UPlaylists({list: [playlist]});
                window.view.select_playlist(0);
            });
            window.close();
        });
    };
    return {
        run: function() {
            $('.close').on('click', function() {
                window.close();
            });
            if (window.options === undefined) {
                return;
            }
            if (window.options.type === "url") {
                createURLform();
            }
            if (window.options.type === "m3u") {
                playlistChiser();
            }
            if (window.options.type === "db") {
                dropboxChoice();
            }
        }
    };
}();

$(function() {
    dialog.run();
});