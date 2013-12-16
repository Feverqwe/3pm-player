var get_lang = function(lang, cb) {
    var lang_arr_en = {
        t: 'en',
        settings: {
            1: "The list of torrents",
            2: "Options",
            3: "Restoring settings",
            4: "Language",
            5: "Lists of torrents",
            6: "Remove",
            7: "Add",
            8: "Torrent trackers",
            9: "Torrent tracker",
            10: "Description",
            11: "On",
            12: "Off",
            13: "Default",
            14: "Advanced settings",
            15: "Show icons torrent trackers in search results",
            16: "Hide torrents without seeders (distributed)",
            17: "Hide column leechers (downloaders)",
            18: "Hide column seeders (distributed)",
            19: "Automatically move to the category when your choice movie/series etc in the main page",
            20: "Enable autoсomplete from Google",
            21: "Do not show teasers\\trailers in search results",
            22: "Add a quick search in the address bar (write \"tms\" then press Tab)",
            23: "Add search in the context menu",
            24: "Show search popup, when you click on extension icon",
            25: "Try define the category of the torrent, if it is not present",
            26: "Show names movie\\series in English",
            27: "Get a description of the search query from Google. (Every request will search in google!)",
            28: "Allow sync favorites list in the cloud",
            29: "Filters the list",
            30: "Seeking complete coincidence phrases (more than 1 phrases may be separated by commas.)",
            31: "Seeking coincidence with one from entered words",
            32: "Seeking coincidence all entered words",
            33: "Consider subcategories",
            34: "Other",
            35: "Receive posters, on the home page via a proxy google (images-pos-opensocial) (experiment)",
            36: "Disable Google-Analytics",
            37: "Backup and restore settings",
            38: "Backup",
            39: "Restore",
            40: "",
            41: "Update",
            42: "",
            43: "Restore",
            44: "Clear settings in the cloud",
            45: "Save all!",
            46: "If possible please",
            47: " make a donation through",
            48: "or",
            49: "Yndex.Money",
            50: "Name",
            51: "There's nothing yet",
            52: "Edit",
            53: "Delete",
            54: "This code has already been added.",
            55: "Loading error!",
            56: "Error",
            57: "Tools",
            58: "Management of user torrent trackers",
            59: "Add the torrent code",
            60: "Create",
            61: "Tracker code",
            62: "Add",
            63: "Edit",
            64: "Close",
            65: "Custom codes torrent trackers posted",
            66: "on this site",
            67: "Highlight the notes in the name of the torrent",
            68: "Save the settings to the cloud",
            69: "Get the settings from the cloud",
            70: "Saved!",
            71: "Show favorites from the site kinopoisk.",
            72: "ID \"category\" from the site kinopoisk (1 - favorites)",
            73: "Action",
            74: "Move the filter panel to the left",
            75: "Hide Top-40 search query",
            76: "Main page",
            77: "Show sections:"
        }
    };
    var lang_arr_ru = {
        t: 'ru',
        settings: {
            1: "Список торрентов",
            2: "Опции",
            3: "Восст. наcтроек",
            4: "Язык / Language",
            5: "Списки торрентов",
            6: "Удалить",
            7: "Добавить",
            8: "Торрент трекеры",
            9: "Торрент трекер",
            10: "Описание",
            11: "Вкл",
            12: "Выкл",
            13: "Станд",
            14: "Дополнительные настройки",
            15: "Показывать иконки торрент-трекеров в выдаче",
            16: "Скрывать раздачи без сидеров (раздающих)",
            17: "Скрыть столбец личеров (скачивающих)",
            18: "Скрыть столбец сидов (раздающих)",
            19: "Автоматически переходить в соотв. категорию при выборе фильма\\сериала итп на главной",
            20: "Включить автозаполнение от Google",
            21: "Не показывать тизеры\\трейлеры в результатах поиска",
            22: "Добавить быстрый поиск в строку адреса (пишем tms потом жмем Tab)",
            23: "Добавить поиск в контекстное меню",
            24: "Показывать поиск при нажатии на иконку расширения",
            25: "Автоматически определить категорию раздачи",
            26: "Отображать имена фильмов\\сериалов на английском",
            27: "Получать описание поискового запроса из Google. (каждый запрос будет искаться в google!)",
            28: "Разрешить синхронизацию списка избранного",
            29: "Фильтрация списка",
            30: "Ищет полное совпадение фразы (более 1 фразы можно разделить запятой)",
            31: "Ищет совпадение с одним из введенных слов",
            32: "Ищет совпадение всех введенных слов",
            33: "Учитывать подкатегории",
            34: "Прочие",
            35: "Получать постеры на главной странице через прокси гугла (images-pos-opensocial)",
            36: "Отключить Google-Analytics",
            37: "Разервное копирование и восстановление настроек",
            38: "Бэкап",
            39: "Восстановление",
            40: "",
            41: "Обновить",
            42: "",
            43: "Восстановить",
            44: "Очистить настройки в облаке",
            45: "Сохранить все!",
            46: "Если возможно, пожалуйста",
            47: ", сделайте пожертвование через",
            48: "или",
            49: "Яндекс.Деньги",
            50: "Название",
            51: "Тут пока ничего нету",
            52: "Изменить",
            53: "Удалить",
            54: "Этот код уже добавлен.",
            55: "Ошибка загрузки!",
            56: "Ошибка",
            57: "Инструменты",
            58: "Управление пользовательскими торрент-трекерами",
            59: "Добавить код торрента",
            60: "Создать",
            61: "Код трекера",
            62: "Добавить",
            63: "Изменить",
            64: "Закрыть",
            65: "Пользовательские коды торрент трекеров выложены",
            66: "на этом сайте",
            67: "Подсвечивать пояснения в названии раздачи",
            68: "Сохранить настройки в облако",
            69: "Получить из облака",
            70: "Сохранено!",
            71: "Показывать избранное с сайта кинопоиска.",
            72: "ID \"категории\" из кинопоиска (1 - избранное)",
            73: "Действие",
            74: "Переместить панель фильтров влево",
            75: "Скрыть Топ-40 поисковых запросов",
            76: "Главная страница",
            77: "Показывать секции:"
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