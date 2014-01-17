$(function() {
    var timeout = 3000;
    var timer = undefined;
    var starTimer = function() {
        clearTimeout(timer);
        timer = setTimeout(function() {
            chrome.notifications.clear('current_track', function() {
            });
        }, timeout);
    };
    var getOpt = function() {
        var tb = engine.getTagBody();
        var opt = {
            type: 'basic',
            title: tb.title,
            message: '',
            iconUrl: 'images/no-cover.png'
        };
        if (tb.aa !== undefined) {
            opt.message = tb.aa;
        }
        if (tb.picture !== undefined) {
            opt.iconUrl = engine.getCover(tb.picture);
        }
        return opt;
    };
    var update = function() {
        chrome.notifications.getAll(function(obj) {
            if (obj.current_track === undefined) {
                return;
            }
            var opt = getOpt();
            chrome.notifications.update('current_track', opt, function(obj) {
            });
        });
    };
    var show = function() {
        var opt = getOpt();
        if (_settings.notifi_buttons) {
            opt.buttons = [
                {title: _lang.next, iconUrl: 'images/playback_next.png'},
                {title: _lang.prev, iconUrl: 'images/playback_prev.png'}
            ];
        }
        //отображаем уведомление о воспроизведении
        chrome.notifications.getAll(function(obj) {
            if (obj.current_track !== undefined) {
                starTimer();
                update();
                return;
            }
            chrome.notifications.create('current_track', opt, function(obj) {
                starTimer();
            });
        });
    };
    chrome.notifications.onButtonClicked.addListener(function(a, b) {
        if (a !== 'current_track') {
            return;
        }
        clearTimeout(timer);
        chrome.notifications.clear('current_track', function(obj) {
        });
        if (b === 1) {
            player.preview();
        } else {
            player.next();
        }
    });
    chrome.notifications.onClicked.addListener(function(a, b) {
        clearTimeout(timer);
        chrome.notifications.clear('current_track', function(obj) {
            window._focusAll();
        });
    });
    chrome.runtime.onMessage.addListener(function(msg, sender, resp) {
        msg = msg.notification;
        if (msg === undefined)
            return;
        if (msg === 'show') {
            show();
        }
        if (msg === 'update') {
            update();
        }
    });
});