engine.settings = function() {
    /**
     * @namespace chrome.storage.local.get
     * @namespace chrome.storage.local.set
     */
    var ready = false;
    var def_settings = {
        is_winamp: {v: 0, t: 'checkbox'},
        time_format: {v: 0, t: 'hidden'},
        extend_volume_scroll: {v: 1, t: 'checkbox'},
        volume: {v: 100, t: 'hidden'},
        shuffle: {v: 0, t: 'hidden'},
        loop: {v: 0, t: 'hidden'},
        visual_type: {v: '0', t: 'radio', values: ['0', '1', '2']},
        vk_foreign_tracks: {v: 0, t: 'checkbox'},
        vk_tag_update: {v: 0, t: 'checkbox'},
        pineble_playlist: {v: 0, t: 'checkbox'},
        pined_playlist: {v: 0, t: 'hidden'},
        pin_position: {v: 3, t: 'hidden'},
        webui_interface: {v: 'Any', t: 'text'},
        webui_port: {v: 9898, t: 'number'},
        webui_run_onboot: {v: 0, t: 'checkbox'},
        lastfm_scrobble: {v: 0, t: 'checkbox'},
        lastfm_album_info: {v: 1, t: 'checkbox'},
        lastfm_track_info: {v: 1, t: 'checkbox'},
        notifi_enable: {v: 0, t: 'checkbox'},
        notifi_btns: {v: 0, t: 'checkbox'}
    };
    var settings = window._settings = {};
    var onLoad = function (cb) {
        if (ready) {
            return cb && cb();
        }
        var request = [];
        for (var key in def_settings) {
            if (!def_settings.hasOwnProperty(key)) {
                continue;
            }
            settings[key] = def_settings[key].v;
            request.push(key);
        }
        chrome.storage.local.get(request, function(storage) {
            for (var key in def_settings) {
                if (storage[key] === undefined) {
                    continue;
                }
                settings[key] = storage[key];
            }
            ready = true;
            cb && cb();
        });
    };
    var onChange = function(obj) {
        if (obj.is_winamp !== undefined || obj.pineble_playlist !== undefined) {
            return chrome.runtime.reload();
        }
        if (obj.extend_volume_scroll !== undefined ||
            obj.visual_type !== undefined) {
            player.updateSettings(obj);
        }
        if (obj.webui_port !== undefined ||
            obj.webui_interface !== undefined) {
            engine.webui.stop(function() {
                engine.webui.start();
            });
        }
    };
    onLoad(function(){
        if (_settings.webui_run_onboot) {
            engine.webui.start();
        }
    });
    return {
        def_settings: def_settings,
        settings: settings,
        onLoad: onLoad,
        set: function(obj, cb) {
            var has_changes = 0;
            for (var key in obj) {
                if ( settings.hasOwnProperty(key) ) {
                    if (settings[key] !== obj[key]) {
                        settings[key] = obj[key];
                        has_changes = 1;
                    }
                } else {
                    delete obj[key];
                    console.log('Undefined setting! ', key);
                }
            }
            if (has_changes === 0) {
                return cb && cb();
            }
            chrome.storage.local.set(obj, cb);
            onChange(obj);
        }
    }
}();