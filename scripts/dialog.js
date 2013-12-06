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
        var fl = dom_cache.dropbox_ul;
        fl.empty();
        if (list.path.length > 1) {
            fl.append('<li class="db_file" data-id="-1"><span title="Go Back">Go Back</span></li>');
        }
        var n = 0;
        list.contents.forEach(function(item) {
            fl.append('<li class="db_file" data-id="' + n + '"><span title="' + item.path + '">' + item.path + '</span></li>');
            n++;
        });
        dom_cache.db_list = list;
    };
    var dropboxChoice = function() {
        /*
         * Создает форму выбора папок иди файлов для DropBox
         */
        dom_cache.dropbox = $('.dropbox_choice');
        dom_cache.dropbox.show();
        dom_cache.dropbox_ul = dom_cache.dropbox.find("ul").eq(0);
        db_writefilelist(window.options.filelist);
        dom_cache.dropbox.on('click', 'li.db_file', function() {
            var id = parseInt($(this).data("id"));
            var path = undefined;
            var root = undefined;
            if (id === -1) {
                path = dom_cache.db_list.path + '/..';
                root = dom_cache.db_list.root + '/..';
            } else {
                var item = dom_cache.db_list.contents[id];
                if (item.is_dir) {
                    path = item.path;
                    root = item.root;
                } else {
                    console.log(item);
                    return;
                }
            }
            sendPlayer(function(window) {
                window.engine.db.getFilelist(function(list) {
                    db_writefilelist(list);
                }, root, path);
            });
            // window.close();
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