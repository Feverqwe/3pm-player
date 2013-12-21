var options = function() {
    var def_settings = {
        next_track_notification: {"v": 0, "t": "checkbox"},
        extend_volume_scroll: {"v": 0, "t": "checkbox"},
        notifi_buttons: {"v": 1, "t": "checkbox"},
        is_winamp: {"v": 0, "t": "checkbox"}
    };
    function sendPlayer(callback) {
        /*
         * Функция отправки действий в плеер
         */
        if (window._player === undefined || window._player.window === null) {
            chrome.runtime.getBackgroundPage(function(bg) {
                window._player = bg.wm.getPlayer();
                if (window._player !== undefined) {
                    callback(window._player);
                }
            });
        } else {
            callback(window._player);
        }
    }
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
    var set_place_holder = function(settings) {
        $.each(def_settings, function(k, v) {
            var set = settings;
            if (v.t === "text" || v.t === "number" || v.t === "password") {
                $('input[name="' + k + '"]').removeAttr("value");
                if (k in set && set[k] != v.v) {
                    $('input[name="' + k + '"]').attr("value", set[k]);
                }
                if (v.v !== null && v.v !== undefined) {
                    $('input[name="' + k + '"]').attr("placeholder", v.v);
                }
            }
            if (v.t === "checkbox") {
                if (k in set) {
                    $('input[name="' + k + '"]').eq(0)[0].checked = (set[k]) ? 1 : 0;
                } else {
                    $('input[name="' + k + '"]').eq(0)[0].checked = (v.v) ? 1 : 0;
                }
            }
            if (v.t === "radio") {
                if (k in set) {
                    $('input[name="' + k + '"][value="' + set[k] + '"]').eq(0)[0].checked = true;
                } else {
                    $('input[name="' + k + '"][value="' + v.v + '"]').eq(0)[0].checked = true;
                }
            }
        });
    };
    var write_language = function(language) {
        if (language === undefined) {
            language = 'en';
            if (chrome.i18n.getMessage("lang") === 'ru') {
                language = 'ru';
            }
        }
        _lang = get_lang(language);
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
                sendPlayer(function(window) {
                    window._lang = get_lang(onSave.lang);
                    window.engine.updateSettings(stgs);
                });
            });
        });
    };
    return {
        begin: function() {
            sendPlayer(function(window) {
                _lang = window._lang;
                write_language(_lang.t);
            });
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