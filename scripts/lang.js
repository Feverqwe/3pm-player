var get_lang = function(lang, cb) {
    var lang_arr_en = {
        t: 'en',
        settings: {
            1: "Language"
        }
    };
    var lang_arr_ru = {
        t: 'ru',
        settings: {
            1: "Язык / Language"
        }
    };
    if (lang !== undefined) {
        if (lang === 'ru') {
            return lang_arr_ru;
        } else {
            return lang_arr_en;
        }
    } else {
        chrome.storage.local.get('lang', function(obj) {
            var lang = obj['lang'];
            if (lang === undefined) {
                lang = 'en';
                if (chrome.i18n.getMessage("lang") === 'ru') {
                    lang = 'ru';
                }
            }
            if (lang === 'ru') {
                cb(lang_arr_ru);
            } else {
                cb(lang_arr_en);
            }
        });
    }
};
var _lang = {};
get_lang(undefined, function(obj) {
    _lang = obj;
});
window.onload = function() {
    if ("options" in window === false) {
        get_lang = undefined;
    }
};