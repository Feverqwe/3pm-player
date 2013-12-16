var options = function() {
    var def_settings = {
        HideLeech: {"v": 1, "t": "checkbox"},
        HideSeed: {"v": 0, "t": "checkbox"},
        ShowIcons: {"v": 1, "t": "checkbox"},
        SubCategoryFilter: {"v": 0, "t": "checkbox"},
        HideZeroSeed: {"v": 0, "t": "checkbox"},
        AdvFiltration: {"v": 2, "t": "radio"},
        TeaserFilter: {"v": 1, "t": "checkbox"},
        add_in_omnibox: {"v": 1, "t": "checkbox"},
        context_menu: {"v": 1, "t": "checkbox"},
        search_popup: {"v": 1, "t": "checkbox"},
        AutoComplite_opt: {"v": 1, "t": "checkbox"},
        use_english_postername: {"v": 0, "t": "checkbox"},
        google_proxy: {"v": 0, "t": "checkbox"},
        google_analytics: {"v": 0, "t": "checkbox"},
        autoSetCat: {"v": 1, "t": "checkbox"},
        allow_get_description: {"v": 1, "t": "checkbox"},
        allow_favorites_sync: {"v": 0, "t": "checkbox"},
        sub_select_enable: {"v": 1, "t": "checkbox"},
        kinopoisk_category: {"v": 1, "t": "checkbox"},
        kinopoisk_f_id: {"v": 1, "t": "number"},
        filter_panel_to_left: {"v": 0, "t": "checkbox"},
        /*sync_trackers: {"v": 0, "t": "checkbox"},*/
        hideTopSearch: {"v": 0, "t": "checkbox"},
        s_films: {"v": 1, "t": "checkbox"},
        s_top_films: {"v": 1, "t": "checkbox"},
        s_serials: {"v": 1, "t": "checkbox"},
        s_imdb_films: {"v": 0, "t": "checkbox"},
        s_imdb_top_films: {"v": 0, "t": "checkbox"},
        s_imdb_serials: {"v": 0, "t": "checkbox"},
        s_games_n: {"v": 1, "t": "checkbox"},
        s_games: {"v": 1, "t": "checkbox"},
        s_games_a: {"v": 1, "t": "checkbox"}
    };
    var loadSettings = function(cb) {
        var opt_list = [];
        $.each(def_settings, function(k) {
            opt_list.push(k);
        });
        chrome.storage.local.get(opt_list, function(obj) {
            var settings = {};
            $.each(def_settings, function(k, v) {
                settings[k] = obj[k] || v.v;
            });
            cb(settings);
        });
    };
    var settings = {};
    loadSettings(function(stngs) {
        settings = stngs;
    });
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
            chrome.storage.local.get('lang', function(obj) {
                var def = 'en';
                if (chrome.i18n.getMessage("lang") === 'ru') {
                    def = 'ru';
                }
                write_language(obj['lang'] || def);
            });
            return;
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
        onSave['lang'] = $('select[name="language"]').val();
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
            });
        });
    };
    return {
        begin: function() {
            write_language();
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
        }
    };
}();
$(function() {
    options.begin();
});