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
$(function() {
    $('body').height(window.options.h);
    $('.close').on('click', function() {
        chrome.runtime.getBackgroundPage(function(bg) {
            bg.wm.getPlaylist().close();
        });
        window.close();
    });
    if (window.options === undefined) {
        return;
    }
    if (window.options.type === "url") {
        createURLform();
    }
});