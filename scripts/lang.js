var get_lang = function(language) {
    var lang_arr_en = {
        t: 'en',
        btn_up: 'Up!',
        mini: 'Minimize',
        close: 'Close',
        full: 'Fullscreen',
        drop_file: 'Drop file hear!',
        click_for_open: 'Click for open files',
        playlist: 'Playlist',
        prev: 'Previous',
        play_pause: 'Play / Pause',
        next: 'Next',
        mute: 'Mute',
        shuffle: 'Shuffle',
        loop: 'Loop',
        sort: 'Sort by file name/as is',
        read_tags: 'Read all tags',
        playlist_select: 'Select playlist',
        playlist_title: 'Playlist',
        move_item: 'Move item',
        ctx_open_files: 'Open files',
        ctx_open_folder: 'Open folder',
        ctx_open_folder_sub: 'Open folder with subfolders',
        ctx_open_url: 'Open URL',
        ctx_webui: 'webUI',
        ctx_viz: 'Visualization',
        ctx_cloud: 'Cloud',
        ctx_options: 'Settings',
        ctx_save_vk_track: 'Save current track in VK',
        vk_all: 'My music',
        vk_rec: '[ Suggested music ]',
        vk_pop: '[ Popular music ]',
        no_viz: 'Need install visualizatitoin extension!',
        dialog: {
            back: 'Go Back',
            play_folder: 'Play folder',
            e_url: 'Enter url:',
            e_pl: 'Enter playlist:',
            e_folder: 'Enter folder or files:',
            e_ps: 'Play selected:',
            open: 'Open'
        },
        settings: {
            1: "Language",
            2: 'Pleer',
            3: 'Visualization',
            4: 'Save',
            5: 'Player settings',
            6: 'Display a notification when changing tracks',
            7: 'Extend the range of the volume scrolls'
        }
    };
    var lang_arr_ru = {
        t: 'ru',
        btn_up: 'Вверх!',
        mini: 'Свернуть',
        close: 'Закрыть',
        full: 'Во весь экран',
        drop_file: 'Перетащи файлы сюда!',
        click_for_open: 'Открыть файлы',
        playlist: 'Плейлист',
        prev: 'Предыдущий трек',
        play_pause: 'Воспроизведение / Пауза',
        next: 'Следующий трек',
        mute: 'Приглушить звук',
        shuffle: 'Играть вперемешку',
        loop: 'Повтор списка воспроизведения',
        sort: 'Сортровать по имени файла/как есть',
        read_tags: 'Прочитать теги всех файлов',
        playlist_select: 'Выборать плейлист',
        playlist_title: 'Плейлист',
        move_item: 'Передвинуть',
        ctx_open_files: 'Открыть файлы',
        ctx_open_folder: 'Открыть папку',
        ctx_open_folder_sub: 'Открыть папку с подпапками',
        ctx_open_url: 'Открыть URL',
        ctx_webui: 'Веб-интерфейс',
        ctx_viz: 'Визуализация',
        ctx_cloud: 'Облака',
        ctx_options: 'Настройки',
        ctx_save_vk_track: 'Сохранить текущий трек в VK',
        vk_all: 'Мои аудиозаписи',
        vk_rec: '[ Рекомендации ]',
        vk_pop: '[ Популярное ]',
        no_viz: 'Требуется расширение для визуализации',
        dialog: {
            back: 'Назад',
            play_folder: 'Воспроизвести директорию',
            e_url: 'Введите URL:',
            e_pl: 'Выберите плейлист:',
            e_folder: 'Выберите директорию или файлы:',
            e_ps: 'Воспроизвести отмеченное:',
            open: 'Открыть'
        },
        settings: {
            1: "Язык / Language",
            2: 'Плеер',
            3: 'Визуализация',
            4: 'Сохранить',
            5: 'Настройки плеера',
            6: 'Показывать уведомление при смене трека',
            7: 'Расширить область изменения громкости скроллом'
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