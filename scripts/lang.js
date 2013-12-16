var get_lang = function(language) {
    var lang_arr_en = {
        t: 'en',
        btn_up: 'Up!',
        settings: {
            1: "Language",
            2: 'Pleer',
            3: 'Visualization',
            4: 'Save'
        }
    };
    var lang_arr_ru = {
        t: 'ru',
        btn_up: 'Вверх!',
        settings: {
            1: "Язык / Language",
            2: 'Плеер',
            3: 'Визуализация',
            4: 'Сохранить'
        }
    };
    var lang = language;
    if (lang === undefined) {
        lang = 'en';
        if (chrome.i18n.getMessage("lang") === 'ru') {
            lang = 'ru';
        }
    }
    if (lang === 'ru') {
        return lang_arr_ru;
    } else {
        return lang_arr_en;
    }
};
var _lang = undefined;