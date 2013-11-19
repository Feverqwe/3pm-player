_player = null;
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
var createURLform = function() {
    $('.url_dialog').show();
    $('.url_dialog input[name=open_btn]').on('click', function() {
        var text = $(this).parent().children('input[name=url]').get(0);
        sendPlayer(function() {
            _player.engine.open_url(text.value);
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
    $('.playlist_chiser').show();
    var pl = $('.playlists');
    var arr = JSON.parse(JSON.stringify(window.options.playlists));
    arr.sort();
    arr.forEach(function(item) {
        var name = item.substr(0, item.length - 4);
        pl.append('<li class="pl_file" data-name="' + item + '"><div class="gr_line"></div><span>' + name + '</span></li>');
    });
    $('body').on('click', 'li.pl_file', function() {
        var name = $(this).data("name");
        sendPlayer(function() {
            _player.view.select_playlist(name);
        });
        window.close();
    });
};
$(function() {
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
});