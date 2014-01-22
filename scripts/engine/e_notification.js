var engine_notification = function (mySettings,myEngine) {
    window.engine_notification = undefined;
    var settings = mySettings;
    var engine = myEngine;
    var e_notification = function () {
        var timeout = 3000;
        var timer = undefined;
        var starTimer = function () {
            clearTimeout(timer);
            timer = setTimeout(function () {
                chrome.notifications.clear('current_track', function () {
                });
            }, timeout);
        };
        var getOpt = function () {
            var tb = engine.tags.getTagBody();
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
                opt.iconUrl = engine.tags.getCover(tb.picture);
            }
            return opt;
        };
        chrome.notifications.onButtonClicked.addListener(function (a, b) {
            if (a !== 'current_track') {
                return;
            }
            clearTimeout(timer);
            chrome.notifications.clear('current_track', function (obj) {
            });
            if (b === 1) {
                engine.playlist.preview();
            } else {
                engine.playlist.next();
            }
        });
        chrome.notifications.onClicked.addListener(function () {
            clearTimeout(timer);
            chrome.notifications.clear('current_track', function () {
                window._focusAll();
            });
        });
        var show = function () {
            var opt = getOpt();
            if (settings.notifi_buttons) {
                opt.buttons = [
                    {title: _lang.next, iconUrl: 'images/playback_next.png'},
                    {title: _lang.prev, iconUrl: 'images/playback_prev.png'}
                ];
            }
            //отображаем уведомление о воспроизведении
            chrome.notifications.getAll(function (obj) {
                /**
                 * @namespace obj.current_track
                 */
                if (obj.current_track !== undefined) {
                    starTimer();
                    update();
                    return;
                }
                chrome.notifications.create('current_track', opt, function () {
                    starTimer();
                });
            });
        };
        var update = function () {
            chrome.notifications.getAll(function (obj) {
                if (obj.current_track === undefined) {
                    return;
                }
                var opt = getOpt();
                chrome.notifications.update('current_track', opt, function () {
                });
            });
        };
        return {
            show: show,
            update: update
        };
    }();
    return e_notification;
};