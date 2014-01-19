var options = function() {
    var settings = {};
    var def_settings = {
        next_track_notification: {v: 0, t: 'checkbox'},
        extend_volume_scroll: {v: 0, t: 'checkbox'},
        notifi_buttons: {v: 1, t: 'checkbox'},
        is_winamp: {v: 0, t: 'checkbox'},
        visual_type: {v: '1', t: 'radio'},
        foreign_tracks: {v: 0, t: 'checkbox'},
        preload_vk: {v: 0, t: 'checkbox'},
        preload_db: {v: 0, t: 'checkbox'},
        preload_sc: {v: 0, t: 'checkbox'},
        preload_gd: {v: 0, t: 'checkbox'},
        preload_box: {v: 1, t: 'checkbox'},
        preload_sd: {v: 0, t: 'checkbox'},
        lastfm: {v: 0, t: 'checkbox'},
        lastfm_cover: {v: 1, t: 'checkbox'},
        lastfm_info: {v: 1, t: 'checkbox'},
        webui_port: {v: 9898, t: 'number'},
        webui_interface: {v: 'Any', t: 'text'},
        webui_run_onboot: {v: 0, t: 'checkbox'},
        vk_tag_update: {v: 0, t: 'checkbox'}
    };
    var loadSettings = function(cb) {
        var opt_list = [];
        $.each(def_settings, function(k) {
            opt_list.push(k);
        });
        chrome.storage.local.get(opt_list, function(obj) {
            var settings = {};
            $.each(def_settings, function(k, v) {
                if (obj[k] === undefined) {
                    obj[k] = v.v;
                }
                settings[k] = obj[k];
            });
            cb(settings);
        });
    };
    var getImage = function(url, cb) {
        var xhr = new XMLHttpRequest();
        xhr.open("GET", url, true);
        xhr.responseType = "blob";
        xhr.onload = function() {
            cb(xhr.response);
        };
        xhr.onerror = function() {
            cb();
        };
        xhr.ontimeout = function() {
            cb();
        };
        xhr.timeout = 2000;
        xhr.send(null);
    };
    var write_qrcodes = function(settings) {
        var ipv6_disable = true;
        var port = settings.webui_port;
        var interface_ = settings.webui_interface;
        var body = $('div.QRcodes').empty();
        var interfaces = $('select.interface').empty().on('change', function() {
            $('input[name=webui_interface]').val(this.value);
        });
        interfaces.append($('<option>', {value: 'Any', text: 'Any (0.0.0.0)'}));
        chrome.socket.getNetworkList(function(items) {
            items.forEach(function(item) {
                if (item.address.match(':') !== null) {
                    item.name += ' (IPv6)';
                    if (ipv6_disable) {
                        return 1;
                    }
                }
                var name = item.name + ' (' + item.address + ')';
                interfaces.append($('<option>', {value: item.name, text: name, selected: (interface_ === item.name)}));
            });
            interface_ = interfaces.val();
            items.forEach(function(item) {
                if (interface_ !== 'Any' && item.name !== interface_) {
                    return 1;
                }
                if (ipv6_disable && item.address.indexOf(':') !== -1) {
                    return 1;
                }
                var url = 'http://' + item.address + ':' + port + '/';
                getImage('http://chart.apis.google.com/chart?cht=qr&chs=150x150&chl=' + encodeURIComponent(url) + '&chld=H|0', function(blob) {
                    var image = '';
                    if (blob !== undefined) {
                        image = $('<img>', {src: URL.createObjectURL(blob)});
                    }
                    body.append(
                            $('<div>', {'class': 'qr_item'}).append(
                            $('<div>', {'class': 'qr_name', text: item.name}),
                    $('<div>', {'class': 'qr_url'}).append($('<a>', {text: url, href: url, target: '_blank'})),
                            image
                            ));
                });
            });
        });
    };
    var set_place_holder = function(set) {
        $.each(def_settings, function(k, v) {
            if (v.t === "text" || v.t === "number" || v.t === "password") {
                $('input[name="' + k + '"]').removeAttr("value");
                if (set[k] !== undefined && set[k] != v.v) {
                    $('input[name="' + k + '"]').attr("value", set[k]);
                }
                if (v.v !== null && v.v !== undefined) {
                    $('input[name="' + k + '"]').attr("placeholder", v.v);
                }
            }
            if (v.t === "checkbox") {
                if (set[k] !== undefined) {
                    $('input[name="' + k + '"]').eq(0)[0].checked = (set[k]) ? 1 : 0;
                } else {
                    $('input[name="' + k + '"]').eq(0)[0].checked = (v.v) ? 1 : 0;
                }
            }
            if (v.t === "radio") {
                if (set[k] !== undefined) {
                    $('input[name="' + k + '"][value="' + set[k] + '"]').eq(0)[0].checked = true;
                } else {
                    $('input[name="' + k + '"][value="' + v.v + '"]').eq(0)[0].checked = true;
                }
            }
        });
        write_qrcodes(set);
    };
    var write_language = function(language) {
        if (language === undefined) {
            language = 'en';
            if (chrome.i18n.getMessage("lang") === 'ru') {
                language = 'ru';
            }
        }
        get_lang(language);
        var lang = _lang.settings;
        $('select[name="language"]').val(language);
        $.each(lang, function(k, v) {
            var el = $('[data-lang=' + k + ']');
            if (el.length === 0) {
                console.log('Options not found!', k);
                return true;
            }
            for (var i = 0; i < el.length; i++) {
                var obj = el.eq(i);
                var t = obj.prop("tagName");
                if (t === "A" || t === "LEGEND" || t === "SPAN" || t === "LI" || t === "TH" || t === "TD") {
                    obj.text(v);
                } else
                if (t === "INPUT") {
                    obj.val(v);
                } else {
                    console.log("Unknown option type!", t, v);
                }
            }
        });
        $('div.topbtn').attr('title', _lang['btn_up']);
    };
    var saveAll = function() {
        var onSave = {};
        onSave.lang = $('select[name="language"]').val();
        $.each(def_settings, function(key, value) {
            var val = undefined;
            if (value.t === "text") {
                val = $('input[name="' + key + '"]').val();
                if (val.length <= 0) {
                    val = $('input[name="' + key + '"]').attr('placeholder');
                }
            } else
            if (value.t === "password") {
                val = $('input[name="' + key + '"]').val();
            } else
            if (value.t === "checkbox") {
                val = ($('input[name="' + key + '"]').eq(0)[0].checked) ? 1 : 0;
            } else
            if (value.t === "number") {
                val = $('input[name="' + key + '"]').val();
                if (val.length <= 0) {
                    val = $('input[name="' + key + '"]').attr('placeholder');
                }
                val = parseInt(val);
            } else
            if (value.t === "radio") {
                val = $('input[name="' + key + '"]:checked').val();
            } else {
                return 1;
            }
            onSave[key] = val;
        });
        chrome.storage.local.set(onSave, function() {
            loadSettings(function(stgs) {
                set_place_holder(stgs);
                _send('player', function(window) {
                    window._lang = _lang;
                    window.engine.loadSettings(stgs);
                });
            });
        });
    };
    return {
        begin: function() {
            write_language(window._language);
            //binds
            $('select[name="language"]').on('change', function() {
                write_language($(this).val());
            });
            $('ul.menu').on('click', 'a', function(e) {
                e.preventDefault();
                var page = $(this).data('page');
                if (page === undefined) {
                    return;
                }
                $('ul.menu').find('a.active').removeClass('active');
                $(this).addClass('active');
                $('body').find('div.page.active').removeClass('active');
                $('body').find('div.' + page).addClass('active');
            });
            $('li.save_btn').on('click', function(e) {
                e.preventDefault();
                saveAll();
            });
            $(window).scroll(function() {
                if ($(this).scrollTop() > 100) {
                    $('div.topbtn').fadeIn('fast');
                } else {
                    $('div.topbtn').fadeOut('fast');
                }
            });
            $('div.topbtn').on("click", function(event) {
                event.preventDefault();
                $('body,html').animate({
                    scrollTop: 0
                }, 200);
            });
            //<<<<<<<<<<
            loadSettings(function(sett) {
                settings = sett;
                set_place_holder(sett);
            });
        }
    };
}();
$(function() {
    options.begin();
});