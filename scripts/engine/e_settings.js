chrome.runtime.sendMessage('script_ready');
var engine_settings = function(myEngine) {
    var engine = myEngine;
    var boot = true;
    var settings = window._settings = {
        next_track_notification: 0,
        extend_volume_scroll: 0,
        notifi_buttons: 0,
        is_winamp: 0,
        visual_type: '1',
        foreign_tracks: 0,
        preload_vk: 0,
        preload_db: 0,
        preload_sc: 0,
        preload_gd: 0,
        preload_box: 1,
        preload_sd: 0,
        lastfm: 0,
        lastfm_info: 1,
        lastfm_cover: 1,
        webui_port: 9898,
        webui_interface: 'Any',
        webui_run_onboot: 0,
        vk_tag_update: 0,
        pined_playlist: 0,
        pin_position: 2
    };
    var loadSettings = engine.loadSettings = function (storage) {
        var changes = {};
        for (var key in settings) {
            if (!settings.hasOwnProperty(key)) {
                continue;
            }
            if (storage[key] !== undefined && settings[key] !== storage[key]) {
                settings[key] = storage[key];
                changes[key] = storage[key];
            }
        }
        if (boot) {
            chrome.runtime.sendMessage('settings_ready');
            boot = false;
            return;
        }
        if (changes.is_winamp !== undefined) {
            chrome.runtime.reload();
        }
        if ((changes.webui_port !== undefined || changes.webui_interface !== undefined) && engine.webui.active()) {
            engine.webui.start();
        }
        chrome.runtime.sendMessage({settings: changes});
    };
    var list = [];
    for (var key in settings) {
        if (!settings.hasOwnProperty(key)) {
            continue;
        }
        list.push(key);
    }
    chrome.storage.local.get(list, function (storage) {
        loadSettings(storage);
    });
};
