engine.notification = function() {
    var var_cache = {};
    var timeout = 3000;
    var timer = undefined;
    var type = "currentTrack";
    var starTimer = function () {
        clearTimeout(timer);
        timer = setTimeout(function () {
            chrome.notifications.clear(type, function () {});
        }, timeout);
    };
    var getOptions = function (track) {
        var tags = engine.tags.readTags(track);
        var options = {
            type: 'basic',
            title: tags.title,
            message: tags.artist_album || '',
            iconUrl: 'img/no-cover.png'
        };
        if (track.cover !== undefined) {
            options.iconUrl = engine.tags.cover[track.cover].url;
        }
        return options;
    };
    chrome.notifications.onButtonClicked.addListener(function (id, btnIndex) {
        if (id !== type) {
            return;
        }
        clearTimeout(timer);
        chrome.notifications.clear(type, function () {});
        if (btnIndex === 1) {
            engine.playlist.previousTrack();
        } else {
            engine.playlist.nextTrack();
        }
    });
    chrome.notifications.onClicked.addListener(function () {
        clearTimeout(timer);
        chrome.notifications.clear(type, function () {
            engine.wm.onTop();
        });
    });
    var show = function (track) {
        if (_settings.notifi_enable === 0) {
            return;
        }
        var options = getOptions(track);
        if (_settings.notifi_btns) {
            options.buttons = [
                {title: chrome.i18n.getMessage('btnNextTrack'), iconUrl: 'img/playback_next.png'},
                {title: chrome.i18n.getMessage('btnPreviousTrack'), iconUrl: 'img/playback_prev.png'}
            ];
        }
        //отображаем уведомление о воспроизведении
        chrome.notifications.getAll(function (obj) {
            /**
             * @namespace obj.current_track
             */
            if (obj[type] !== undefined) {
                starTimer();
                chrome.notifications.update(type, options, function () {});
                return;
            }
            chrome.notifications.create(type, options, function () {
                starTimer();
            });
        });
    };
    return {
        show: show,
        updateInfo: function(track) {
            chrome.notifications.getAll(function (obj) {
                if (obj[type] !== undefined) {
                    show(track);
                }
            });
        }
    };
}();