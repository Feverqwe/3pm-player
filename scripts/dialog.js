var dialog = function() {
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
                window.engine.open_url(text.value);
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
        var pl = $('.playlists');
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
    return {
        run: function() {
            $('body').height(window.options.h);
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
        }
    };
}();

$(function() {
    dialog.run();
});