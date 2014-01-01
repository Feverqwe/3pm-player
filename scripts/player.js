var view = function() {
    var dom_cache = {};
    var var_cache = {};
    var time_tipe = 0;
    var settings = {};
    var is_winamp = true;
    var visual_cache = {};
    var context_menu = undefined;
    var isPlaying = function() {
        /*
         * Выставляет статус - проигрывается.
         */
        if (is_winamp) {
            dom_cache.body.attr('data-state', 'play');
        }
        dom_cache.btnPlayPause.removeClass('play').addClass('pause');
    };
    var isPause = function() {
        /*
         * Выставляет статус - пауза.
         */
        if (is_winamp) {
            dom_cache.body.attr('data-state', 'pause');
        }
        dom_cache.btnPlayPause.removeClass('pause').addClass('play');
    };
    var showImage = function(id) {
        /*
         * Отображает изображение, получает картинку из engine
         */
        var img = engine.getCover(id);
        if (img.data === null) {
            hideImage();
            return;
        }
        var url = 'url(' + img.data + ')';
        if (dom_cache.picture_url !== url) {
            dom_cache.picture_url = url;
            clearTimeout(dom_cache.picture_timer);
            dom_cache.picture_timer = setTimeout(function() {
                dom_cache.picture.css('background-image', url);
            }, 50);
        }
    };
    var hideImage = function() {
        /*
         * Выставляет статус - без обложки.
         */
        var url = 'url(images/no-cover.png)';
        if (dom_cache.picture_url !== url) {
            dom_cache.picture_url = url;
            clearTimeout(dom_cache.picture_timer);
            dom_cache.picture_timer = setTimeout(function() {
                dom_cache.picture.css('background-image', url);
            }, 50);
        }
    };
    var toHHMMSS = function(val) {
        /*
         * Выводит время трека.
         */
        var sec_num = parseInt(val, 10); // don't forget the second parm
        if (isNaN(sec_num))
            return '00:00';
        var hours = Math.floor(sec_num / 3600);
        var minutes = Math.floor((sec_num - (hours * 3600)) / 60);
        var seconds = sec_num - (hours * 3600) - (minutes * 60);

        if (hours < 10) {
            hours = "0" + hours;
        }
        if (minutes < 10) {
            minutes = "0" + minutes;
        }
        if (seconds < 10) {
            seconds = "0" + seconds;
        }
        var time = minutes + ':' + seconds;
        if (parseInt(hours) > 0) {
            time = hours + ':' + time;
        }
        return time;
    };
    var getEntryFromDir = function(entry, cb) {
        /*
         * Получает массив файлов - Entry из Entry дирректории.
         */
        if (!entry.isDirectory) {
            cb([]);
            return;
        }
        var dir = entry.createReader();
        dir.readEntries(function(a) {
            cb(a);
        });
    };
    var entry2files = function(entry, cb) {
        /*
         * Переводит массив entry в массива file
         */
        var files = [];
        var entry_len = entry.length;
        if (entry_len === 0) {
            cb(files);
            return;
        }
        var dune_count = 0;
        var dune = function() {
            dune_count++;
            if (dune_count === entry_len) {
                cb(files);
            }
        };
        entry.forEach(function(item) {
            if (item.isDirectory) {
                dune();
                return 1;
            }
            item.file(function(file) {
                files.push(file);
                dune();
            });
        });
    };
    var readDirectoryWithM3U = function(entrys, entry) {
        var playlists = {};
        var playlist_count = entrys.length;
        var playlist_dune_count = 0;
        var fileMede = false;
        var dune = function() {
            /*
             * Получает команду готово как только один из плэйлистов будет заполнен.
             * Когла получит все плэйлисты - отдает диалог выбора их.
             */
            playlist_dune_count++;
            if (playlist_count !== playlist_dune_count) {
                return;
            }
            var playlist = [];
            $.each(playlists, function(key, item) {
                if (item.length === 0) {
                    return 1;
                }
                var urls = [];
                var ent = [];
                item.forEach(function(itm) {
                    if (typeof (itm) === 'string') {
                        urls.push({url: itm});
                    } else {
                        ent.push(itm);
                    }
                });
                var name = key;
                if (urls.length > 0) {
                    if (ent.length > 0) {
                        name = key + ' urls';
                    }
                    playlist.push({name: name, tracks: urls, id: playlist.length});
                }
                if (ent.length > 0) {
                    if (urls.length > 0) {
                        name = key + ' files';
                    }
                    playlist.push({name: name, entrys: item, id: playlist.length, type: "m3u"});
                }
            });
            playlist.sort(function(a, b) {
                return (a.name === b.name) ? 0 : (a.name > b.name) ? 1 : -1;
            });
            engine.setM3UPlaylists({list: playlist});
            if (playlist.length === 1) {
                engine.select_playlist(playlist[0].id);
            } else
            if (playlist.length > 0) {
                    engine.window_manager({type: 'dialog', config:{type: "m3u", h: 200, w: 350, r: true, playlists: playlist}});
            }
        };
        var readM3U = function(content, name) {
            /*
             * Читает m3u файл и строит дерево каталогов
             */
            var ordered_name_list = [];
            var stream_count = 0;
            var stream_got = 0;
            var file_list = [];
            var file_getter = function(files) {
                /*
                 * Получает файлы в плэйлисте, как только находит все - говорит что готово
                 */
                stream_got++;
                file_list = file_list.concat(files);
                if (stream_count !== stream_got) {
                    return;
                }
                var arr = [];
                var oa = ordered_name_list.length;
                var fl = file_list.length;
                for (var n = 0; n < oa; n++) {
                    for (var i = 0; i < fl; i++) {
                        if (file_list[i].name === ordered_name_list[n]) {
                            arr.push(file_list[i]);
                        }
                    }
                }
                playlists[name] = arr;
                dune();
            };
            var readEntry = function(entry, file_tree, file_arr) {
                /*
                 * ищет внутри всех папок, в соответствие с {} file_tree, и если внутри есть файлы из [] file_arr добавляет из в массив.
                 */
                if (file_arr === undefined) {
                    file_arr = [];
                }
                stream_count++;
                getEntryFromDir(entry, function(sub_entry) {
                    var len = sub_entry.length;
                    var files = [];
                    for (var n = 0; n < len; n++) {
                        if (sub_entry[n].isDirectory) {
                            $.each(file_tree, function(item) {
                                if (sub_entry[n].fullPath === item) {
                                    readEntry(sub_entry[n], file_tree, file_tree[item].files);
                                }
                            });
                        } else {
                            if (file_arr.indexOf(sub_entry[n].name) !== -1) {
                                files.push(sub_entry[n]);
                            }
                        }
                    }
                    file_getter(files);
                });
            };
            /*
             * Читает содерживое m3u
             */
            var file_tree = {};
            var lines = content.split("\n");
            var len = lines.length;
            var url_list = false;
            for (var i = 0; i < len; i++) {
                var line = lines[i].trim();
                if (line.length < 1 || line.substr(0, 1) === "#") {
                    continue;
                }
                var proto_url = line.substr(0, 7).toLowerCase();
                if (proto_url === "http://" || proto_url === "https:/") {
                    if (playlists[name] === undefined) {
                        playlists[name] = [];
                    }
                    playlists[name].push(line);
                    url_list = true;
                    continue;
                }
                if (fileMede) {
                    continue;
                }
                var path_arr = line.split('/');
                var path_len = path_arr.length;
                ordered_name_list.push(path_arr[path_len - 1]);
                var path = entry.fullPath;
                for (var n = 0; n < path_len; n++) {
                    if (file_tree[path] === undefined) {
                        file_tree[path] = {files: [path_arr[n]]};
                    } else
                    if (file_tree[path].files.indexOf(path_arr[n]) === -1) {
                        file_tree[path].files.push(path_arr[n]);
                    }
                    path += "/" + path_arr[n];
                }
            }
            if (url_list || fileMede) {
                dune();
            } else {
                readEntry(entry, file_tree);
            }
        };
        var openM3U = function(file) {
            /*
             * Получает контент m3u
             */
            var r = new FileReader();
            r.onload = function() {
                var playlist_name = file.name.substr(0, file.name.length - 1 - 3);
                readM3U(r.result, playlist_name);
            };
            r.readAsText(file);
        };
        if (entrys.file !== undefined) {
            fileMede = true;
            playlist_count = 1;
            entrys.file(function(file) {
                openM3U(file);
            });
        } else {
            entry2files(entrys, function(files) {
                files.forEach(function(file) {
                    openM3U(file);
                });
            });
        }
    };
    var readFileArray = function(files, entry) {
        /*
         * Читает массив файлов
         * Если есть entry - использут его, если нету - то files.
         * Если найдет хоть одну дирректорию - открывает как категорию.
         * Есди найдет зоть один m3u открывает как плэйлист
         * Остальное - читает как массив файлов
         */
        if (!entry) {
            entry = [];
        }
        var entry_length = entry.length;
        var entrys = [];
        if (entry_length !== 0) {
            for (var i = 0; i < entry_length; i++) {
                var item = entry[i];
                if (entry[i].webkitGetAsEntry !== undefined) {
                    item = item.webkitGetAsEntry();
                }
                if (!item) {
                    continue;
                }
                if (item.isDirectory) {
                    readDirectory(item);
                    return;
                } else {
                    var ext = item.name.split('.').slice(-1)[0].toLowerCase();
                    if (ext === 'm3u') {
                        readDirectoryWithM3U(item);
                        return;
                    }
                    entrys.push(item);
                }
            }
            entry2files(entrys, function(files) {
                engine.open(files, {name: undefined});
            });
        } else {
            var files_length = files.length;
            for (var i = 0; i < files_length; i++) {
                var item = files[i];
                var ext = item.name.split('.').slice(-1)[0].toLowerCase();
                if (ext === 'm3u') {
                    readDirectoryWithM3U(item);
                    return;
                }
            }
            engine.open(files, {name: undefined});
        }
    };
    var readDirectory = function(entry) {
        /*
         * Читает открытую дирректорию, аналиpирует куда направить работу с дирректорией - в m3u или в чтение подкаталогов
         */
        getEntryFromDir(entry, function(sub_entry) {
            var sub_entry_len = sub_entry.length;
            var dir_count = 0;
            var file_count = 0;
            var m3u = [];
            for (var i = 0; i < sub_entry_len; i++) {
                var item = sub_entry[i];
                if (item.isDirectory === true) {
                    dir_count++;
                } else {
                    var ext = item.name.split('.').slice(-1)[0].toLowerCase();
                    if (ext === 'm3u') {
                        m3u.push(item);
                    } else {
                        file_count++;
                    }
                }
            }
            if (file_count === 0 && dir_count === 0 && m3u.length === 0) {
                return;
            } else
            if (m3u.length > 0) {
                readDirectoryWithM3U(m3u, entry);
            } else {
                readDirectoryWithSub(entry);
            }
        });
    };
    var findMusicInFolder = function(entry, cb) {
        /*
         * Проверяет наличие хотя бы одного файла в каталоге.
         */
        getEntryFromDir(entry, function(sub_entry) {
            var sub_entry_len = sub_entry.length;
            var next = function(i) {
                if (i >= sub_entry_len) {
                    cb(false);
                    return;
                }
                var item = sub_entry[i];
                if (item.isDirectory) {
                    next(i + 1);
                    return;
                }
                item.file(function(file) {
                    if (engine.canPlay(file.type)) {
                        cb(true);
                    } else {
                        next(i + 1);
                    }
                });
            };
            next(0);
        });
    };
    var getFilesFromFolder = function(entry, cb) {
        /*
         * Отдает список файлов в папке
         */
        getEntryFromDir(entry, function(sub_entry) {
            entry2files(sub_entry, function(files) {
                cb(files);
            });
        });
    };
    var readDirectoryWithSub = function(entry) {
        /*
         * Читает дирректорию и дирректории внутри их..
         * Уровень вложенности - 1.
         * Формирует плэйлисты из вложенных папок.
         */
        getEntryFromDir(entry, function(sub_entry) {
            var list_dir = [];
            var add_root = false;
            var sub_entry_len = sub_entry.length;
            for (var i = 0; i < sub_entry_len; i++) {
                if (sub_entry[i].isDirectory) {
                    list_dir.push(sub_entry[i]);
                } else {
                    add_root = true;
                }
            }
            if (add_root) {
                list_dir.push(entry);
            }
            var playlist = [];
            var list_dir_len = list_dir.length;
            var dune_count = 0;
            var dune = function() {
                dune_count++;
                if (dune_count === list_dir_len && playlist.length > 0) {
                    engine.setM3UPlaylists({list: playlist});
                    if (playlist.length === 1) {
                        engine.select_playlist(playlist[0].id);
                    } else
                    if (playlist.length > 0) {
                            engine.window_manager({type: 'dialog', config:{type: "m3u", h: 200, w: 350, r: true, playlists: playlist}});
                    }
                }
            };
            list_dir.forEach(function(item) {
                findMusicInFolder(item, function(canplay) {
                    if (canplay) {
                        playlist.push({name: item.name, entry: item, id: playlist.length, type: "subfiles"});
                    }
                    dune();
                });
            });
        });
    };
    var pre_buffering_controller = function() {
        /*
         * Управляет полоской буферизации
         */
        var cache = {};
        var interval = undefined;
        var state = "";
        var obj = undefined;
        var state_download = function(width) {
            if (state !== "download") {
                reset_state();
                state = "download";
                stop();
                obj.parent().addClass("download");
            }
            if (cache.width === width) {
                return;
            }
            cache.width = width;
            obj.css({width: width + "%"});
        };
        var state_pos = function(left, width) {
            if (state !== "pos") {
                reset_state();
                state = "pos";
            }
            if (cache.left === left && cache.width === width) {
                return;
            }
            cache.left = left;
            cache.width = width;
            obj.css({"left": left + "%", "width": width + "%"});
        };
        var state_hide = function() {
            if (state === "hide") {
                stop();
                return;
            }
            reset_state();
            obj.css("display", "none");
            stop();
            state = "hide";
        };
        var state_loading = function() {
            if (state === "loading") {
                stop();
                return;
            }
            reset_state();
            obj.parent().addClass("stream");
            stop();
            state = "loading";
        };
        var state_inf = function() {
            if (state === "inf") {
                stop();
                return;
            }
            reset_state();
            obj.parent().addClass("stream");
            stop();
            state = "inf";
        };
        var reset_state = function() {
            cache = {};
            obj.css({left: 0, width: "100%", display: "block"}).attr('class', 'loaded');
            if (state === "inf" || state === "loading") {
                obj.parent().removeClass("stream");
            } else
            if (state === "download") {
                obj.parent().removeClass("download");
            }
            state = "";
        };
        var update = function() {
            if (obj === undefined) {
                return;
            }
            var audio = engine.getAudio();
            var buffered = audio.buffered;
            if (!buffered) {
                stop();
                return;
            }
            if (audio.duration === Infinity) {
                state_inf();
                return;
            }
            var dur = parseInt(audio.duration);
            if (isNaN(dur)) {
                state_hide();
                return;
            }
            var end = 0;
            var start = 0;
            for (var i = 0; i < buffered.length; i++) {
                end = parseInt(buffered.end(i));
                start = parseInt(buffered.start(i));
            }
            if (end === dur) {
                state_hide();
                return;
            }
            var l_p = parseInt((start / dur) * 100);
            var r_p = parseInt((end / dur) * 100);
            var pr = r_p - l_p;
            state_pos(l_p, pr);
        };
        var stop = function() {
            clearInterval(interval);
        };
        return {
            reset_state: function() {
                if (obj === undefined) {
                    return;
                }
            },
            clear: function() {
                if (obj === undefined) {
                    return;
                }
            },
            setObj: function(progress) {
                obj = progress;
            },
            start: function() {
                if (obj === undefined) {
                    return;
                }
                stop();
                interval = setInterval(function() {
                    update();
                }, 1000);
            },
            stop: function() {
                stop();
            },
            update: function() {
                update();
            },
            hide: function() {
                state_hide();
            },
            loading: function() {
                state_loading();
            },
            obj: obj,
            download: function(value) {
                state_download(value);
            }
        };
    }();
    var make_ctx_menu = function() {
        /*
         * Формирует контекстное меню
         */
        context_menu = {'1': {
                id: "1",
                title: _lang.ctx_open_files,
                contexts: ['page', 'launcher'],
                action: function() {
                    $('.click_for_open').trigger('click');
                }
            }, '3': {
                id: "3",
                title: _lang.ctx_open_folder,
                contexts: ['page', 'launcher'],
                action: function() {
                    chrome.fileSystem.chooseEntry({type: 'openDirectory'}, function(entry) {
                        if (!entry) {
                            return;
                        }
                        readDirectory(entry);
                    });
                }
            }, 'o_f_sub': {
                id: "o_f_sub",
                title: _lang.ctx_open_folder_sub,
                contexts: ['page', 'launcher'],
                action: function() {
                    chrome.fileSystem.chooseEntry({type: 'openDirectory'}, function(entry) {
                        if (!entry) {
                            return;
                        }
                        readDirectoryWithSub(entry);
                    });
                }
            }, '2': {
                id: "2",
                title: _lang.ctx_open_url,
                contexts: ['page', 'launcher'],
                action: function() {
                        engine.window_manager({type: 'dialog', config:{type: "url", h: 60}});
                }
            }, 'select_playlist': {
                id: "select_playlist",
                title: _lang.playlist_select,
                contexts: ['page', 'launcher'],
                action: function() {
                    var playlists = engine.getM3UPlaylists();
                    if (playlists === undefined) {
                        return;
                    }
                    var list = playlists.list;
                    if (list.length > 0) {
                            engine.window_manager({type: 'dialog', config:{type: "m3u", h: 200, w: 350, r: true, playlists: list}});
                    }
                }
            }, 'ws': {
                type: "checkbox",
                id: "ws",
                title: _lang.ctx_webui + " (0.0.0.0:9898)",
                contexts: ['page', 'launcher'],
                action: function(info) {
                    chrome.runtime.getBackgroundPage(function(bg) {
                        var state = bg.webui.active();
                        if (state === false) {
                            bg.webui.start();
                        } else {
                            bg.webui.stop();
                        }
                        chrome.contextMenus.update("ws", {checked: bg.webui.active()});
                    });
                }
            }, 'viz': {
                id: "viz",
                title: _lang.ctx_viz,
                contexts: ['page', 'launcher'],
                action: function() {
                    engine.window_manager({type: 'viz'});
                }
            }, 'cloud': {
                id: "cloud",
                title: _lang.ctx_cloud,
                contexts: ['page', 'launcher']
            }, 'vk': {
                id: "vk",
                parentId: "cloud",
                title: "vk.com",
                contexts: ['page', 'launcher'],
                action: function() {
                    cloud.vk.makeAlbums(function(list) {
                        engine.setM3UPlaylists({list: list});
                        if (list.length === 1) {
                            engine.select_playlist(list[0].id);
                        } else
                        if (list.length > 0) {
                                engine.window_manager({type: 'dialog', config:{type: "m3u", h: 200, w: 350, r: true, playlists: list}});
                        }
                    });
                }
            }, 'sc': {
                id: "sc",
                parentId: "cloud",
                title: "soundcloud.com",
                contexts: ['page', 'launcher'],
                action: function() {
                    cloud.sc.makeAlbums(function(list) {
                        engine.setM3UPlaylists({list: list});
                        if (list.length === 1) {
                            engine.select_playlist(list[0].id);
                        } else
                        if (list.length > 0) {
                                engine.window_manager({type: 'dialog', config:{type: "m3u", h: 200, w: 350, r: true, playlists: list}});
                        }
                    });
                }
            }, 'gd': {
                id: "gd",
                parentId: "cloud",
                title: "drive.google.com",
                contexts: ['page', 'launcher'],
                action: function() {
                    cloud.gd.getFilelist(undefined, function(list) {
                            engine.window_manager({type: 'dialog', config:{type: "gd", h: 315, w: 350, r: true, filelist: list}});
                    });
                }
            }, 'db': {
                id: "db",
                parentId: "cloud",
                title: "dropbox.com",
                contexts: ['page', 'launcher'],
                action: function() {
                    cloud.db.getFilelist(function(list) {
                            engine.window_manager({type: 'dialog', config:{type: "db", h: 315, w: 350, r: true, filelist: list}});
                    });
                }
            }, 'box': {
                id: "box",
                parentId: "cloud",
                title: "box.com",
                contexts: ['page', 'launcher'],
                action: function() {
                    cloud.box.getFilelist(function(list) {
                            engine.window_manager({type: 'dialog', config:{type: "box", h: 315, w: 350, r: true, filelist: list}});
                    });
                }
            }, 'sd': {
                id: "sd",
                parentId: "cloud",
                title: "skydrive.com",
                contexts: ['page', 'launcher'],
                action: function() {
                    cloud.sd.getFilelist(undefined, function(list) {
                            engine.window_manager({type: 'dialog', config:{type: "sd", h: 315, w: 350, r: true, filelist: list}});
                    });
                }
            }, 'p_play_pause': {
                id: "p_play_pause",
                title: _lang.play_pause,
                contexts: ['launcher'],
                action: function() {
                    engine.playToggle();
                }
            }, 'p_next': {
                id: "p_next",
                title: _lang.next,
                contexts: ['launcher'],
                action: function() {
                    engine.next();
                }
            }, 'p_previous': {
                id: "p_previous",
                title: _lang.prev,
                contexts: ['launcher'],
                action: function() {
                    engine.preview();
                }
            }, 'options': {
                id: "options",
                title: _lang.ctx_options,
                contexts: ['page', 'launcher'],
                action: function() {
                        engine.window_manager({type: 'options'});
                }
            }, 'save_vk': {
                id: "save_vk",
                title: _lang.ctx_save_vk_track,
                contexts: ['page', 'launcher'],
                hide: 1,
                action: function() {
                    var track = engine.getCurrentTrack();
                    if (track !== undefined && track.track_id !== undefined) {
                        engine.vk.addInLibrarty(track.track_id, track.owner_id);
                    }
                }
            }
        };
        chrome.contextMenus.removeAll(function() {
            $.each(context_menu, function(k, v) {
                if (v.hide === 1) {
                    return 1;
                }
                var item = {
                    id: v.id,
                    title: v.title,
                    contexts: v.contexts
                };
                if (v.parentId !== undefined) {
                    item.parentId = v.parentId;
                }
                if (v.type !== undefined) {
                    item.type = v.type;
                }
                chrome.contextMenus.create(item);
            });
            chrome.runtime.getBackgroundPage(function(bg) {
                chrome.contextMenus.update("ws", {checked: bg.webui.active()});
            });
        });
    };
    var make_extend_volume = function(extend_volume_scroll) {
        /*
         * Расширяет область изменения громкости колесиком мыши.
         */
        var box = $('body > .player > .box');
        var boxState = box.hasClass('volume_scroll');
        if (extend_volume_scroll && !boxState) {
            box.unbind('mousewheel').addClass('volume_scroll').on('mousewheel', function(e) {
                if (e.target.className === 'image') {
                    return;
                }
                if (e.originalEvent.wheelDelta > 0) {
                    engine.volume("+10");
                } else {
                    engine.volume("-10");
                }
            });
        } else
        if (!extend_volume_scroll && boxState) {
            box.unbind('mousewheel').removeClass('volume_scroll');
        }
    };
    var write_language = function() {
        /*
         * Локализация
         */
        $('body').data('lang', _lang.t);
        $('.t_btn.mini').attr('title', _lang.mini);
        $('.t_btn.close').attr('title', _lang.close);
        $('.t_btn.menu').attr('title', _lang.menu);
        $('div.drop span').text(_lang.drop_file);
        $('div.click_for_open span').text(_lang.click_for_open);
        $('.btn.playlist').attr('title', _lang.playlist);
        $('.btn.prev').attr('title', _lang.prev);
        $('.btn.playpause').attr('title', _lang.play_pause);
        $('.btn.next').attr('title', _lang.next);
        $('.volume_controll .pic').attr('title', _lang.mute);
        $('div.shuffle').attr('title', _lang.shuffle);
        $('div.loop').attr('title', _lang.loop);
        make_ctx_menu();
    };
    var getVolumeColor = function(value) {
        /*
         * Генерирует цвет прогресс бара Winamp
         */
        var a = 0;
        var b = 0;
        var c = 0;
        var max = 222;
        if (value < 50) {
            b = max;
            a = parseInt(value / 50 * max);
        } else {
            a = max;
            b = max - parseInt((value - 50) / 50 * max);
        }
        return 'rgba(' + a + ', ' + b + ', ' + c + ', 1)';
    };
    var calculate_moveble = function(selectors, size, classname) {
        /*
         * Расчитывает стиль прокрутки длиных имен. для Winmap.
         */
        var titles = selectors;
        var titles_l = titles.length;

        for (var i = 0; i < titles_l; i++) {
            var str_w = titles.eq(i).width();
            if (str_w <= size) {
                titles.eq(i).parent().attr('class', 'name');
                continue;
            }
            str_w = Math.ceil(str_w / 10);
            if (str_w > 10) {
                if (str_w < 100) {
                    var t1 = Math.round(str_w / 10);
                    if (t1 > str_w / 10)
                        str_w = t1 * 10 * 10;
                    else
                        str_w = (t1 * 10 + 5) * 10;
                } else
                    str_w = str_w * 10;
            } else
                str_w = str_w * 10;
            var str_s = size;
            var time_calc = Math.round(parseInt(str_w) / parseInt(str_s) * 3.5);
            var move_name = 'moveble' + '_' + str_s + '_' + str_w;
            if (dom_cache.body.children('.' + move_name).length === 0) {
                dom_cache.body.append($('<style>', {'class': move_name, text:
                            '@-webkit-keyframes a_' + move_name
                            + '{'
                            + '0%{margin-left:2px;}'
                            + '50%{margin-left:-' + (str_w - str_s) + 'px;}'
                            + '90%{margin-left:6px;}'
                            + '100%{margin-left:2px;}'
                            + '}'
                            + 'div.' + move_name + ':hover > span {'
                            + 'overflow: visible;'
                            + '-webkit-animation:a_' + move_name + ' ' + time_calc + 's;'
                            + '}'}));
            }
            titles.eq(i).parent().attr('class', classname + ' ' + move_name);
        }
    };
    var writeWinampFFT = function() {
        /*
         * Действие при отключении engine адаптера Dance (происходит когда закрывается визуализация).
         */
        if (is_winamp) {
            var convas = $('canvas.winamp_fft');
            if (convas.data('type') === settings.visual_type) {
                return;
            }
            if (convas.length === 0) {
                convas = $('<canvas>', {'class': 'winamp_fft'}).on('click', function() {
                    if (settings.visual_type === '0') {
                        settings.visual_type = '1';
                    } else
                    if (settings.visual_type === '1') {
                        settings.visual_type = '2';
                    } else
                    if (settings.visual_type === '2') {
                        settings.visual_type = '0';
                    }
                    chrome.storage.local.set({'visual_type': settings.visual_type});
                    writeWinampFFT();
                }).appendTo($('.player'));
            } else {
                engine.discAdapters('winamp');
                visual_cache.winamp_dancer = undefined;
            }
            convas.data('type', settings.visual_type);
            convas = convas[0];
            if (settings.visual_type === '0') {
                convas.width = convas.width;
                return;
            }
            visual_cache.winamp_dancer = new Dancer();
            var ctx = convas.getContext('2d');
            convas.width = 80;
            visual_cache.winamp_dancer.createKick({
                onKick: function() {
                    ctx.fillStyle = '#ff0077';
                },
                offKick: function() {
                    ctx.fillStyle = '#54D100';
                },
                threshold: 0.2
            }).on();
            if (settings.visual_type === '2') {
                convas.height = 20;
                visual_cache.winamp_dancer.waveform(convas,
                        {strokeStyle: '#fff', strokeWidth: 1, count: 40}
                );
            } else {
                convas.height = 37;
                visual_cache.winamp_dancer.fft(convas,
                        {fillStyle: '#666', count: 20, width: 3, spacing: 1}
                );
            }
            visual_cache.winamp_dancer.bind('loaded', function() {
                visual_cache.winamp_dancer.play();
            }).load(engine.getAudio(), 'winamp');
        }
    };
    var hotKeyListener = function() {
        /*
         * Слушает сообщения от расширения для гор. кнопок.
         */
        chrome.runtime.onMessageExternal.addListener(function(msg, sender, resp) {
            if (msg === 'prev') {
                engine.preview();
            } else
            if (msg === 'next') {
                engine.next();
            } else
            if (msg === 'pp') {
                engine.playToggle();
            } else
            if (msg === 'volu') {
                engine.volume("+10");
            } else
            if (msg === 'vold') {
                engine.volume("-10");
            } else
            if (msg === 'scru') {
                engine.position("+10");
            } else
            if (msg === 'scrd') {
                engine.position("-10");
            } else
            if (msg === 'shuffle') {
                engine.shuffle();
            } else
            if (msg === 'loop') {
                engine.loop();
            } else
            if (msg === 'mute') {
                engine.mute();
            } else
            if (msg === 'menu') {
                engine.showMenu();
            }
        });
    };
    var setTrueText = function(title, album) {
        if (is_winamp) {
            return;
        }
        if (dom_cache.truetext === undefined) {
            dom_cache.truetext = {};
        }
        var title_scroller = false;
        var album_scroller = false;
        var max_title_line = 2;
        var max_album_line = 2;
        var tmp_node = $('<div>', {style: 'line-height: normal; font-size: 130%; width: 232px; word-wrap: break-word; overflow: hidden; display: none;', text: title}).appendTo(dom_cache.body);
        var title_height = tmp_node.height();
        if (dom_cache.truetext.title_one_line_height === undefined) {
            tmp_node.text('.');
            dom_cache.truetext.title_one_line_height = tmp_node.height();
        }
        var title_line = parseInt(title_height / dom_cache.truetext.title_one_line_height);
        tmp_node.remove();
        tmp_node = $('<div>', {style: 'line-height: normal; font-size: 110%; width: 232px; word-wrap: break-word; overflow: hidden; display: none;', text: album}).appendTo(dom_cache.body);
        var album_height = tmp_node.height();
        if (dom_cache.truetext.album_one_line_height === undefined) {
            tmp_node.text('.');
            dom_cache.truetext.album_one_line_height = tmp_node.height();
        }
        var album_line = parseInt(album_height / dom_cache.truetext.album_one_line_height);
        tmp_node.remove();
        if (album.length === 0) {
            max_title_line = 3;
            album_line = 0;
        }
        if (title_line > max_title_line) {
            title_scroller = true;
            title_line = 1;
        }
        if (album_line > max_album_line) {
            album_scroller = true;
            album_line = 1;
        }
        if (title_line === 2) {
            if (album_line > 1) {
                album_scroller = true;
            }
        }
        if (title_line === 1) {
            if (album_line > 2) {
                album_scroller = true;
            }
        }
        if (album_scroller) {
            dom_cache.trackalbum.parent().addClass('scroller');
            calculate_moveble(dom_cache.trackalbum, dom_cache.trackalbum.parent().width(), 'album scroller');
        } else {
            dom_cache.trackalbum.parent().attr('class', 'album');
        }
        if (title_scroller) {
            dom_cache.trackname.parent().addClass('scroller');
            calculate_moveble(dom_cache.trackname, dom_cache.trackname.parent().width(), 'name scroller');
        } else {
            dom_cache.trackname.parent().attr('class', 'name');
        }
    };
    return {
        show: function() {
            write_language();
            settings = window._settings;
            dom_cache = {
                body: $('body'),
                drop: $('div.drop'),
                loading: $('div.loading'),
                trackname: $('.track > .name > span'),
                trackalbum: $('.track > .album > span'),
                time: $('.info > .time'),
                btnPlayPause: $('.controls .playpause.btn'),
                btnPrev: $('.controls .prev.btn'),
                btnNext: $('.controls .next.btn'),
                progress: $('.progress'),
                picture: $('.image'),
                volume: $('.volume'),
                mute: $('.volume_controll .pic'),
                click_for_open: $('.click_for_open'),
                btnPlaylist: $('.playlist.btn')
            };
            hotKeyListener();
            is_winamp = settings.is_winamp;
            if (is_winamp) {
                dom_cache.body.addClass('winamp');
                $('li.btn.playlist').hide();
                $('div.pl_state').hide();
                var win = chrome.app.window.current();
                var dpr = window.devicePixelRatio;
                var win_w = parseInt(275 * dpr);
                var win_h = parseInt(116 * dpr);
                win.resizeTo(win_w, win_h);
                $('.player').append(
                        $('<div>', {'class': "shuffle"}),
                $('<div>', {'class': "loop"}),
                $('<div>', {'class': "state"}),
                $('<div>', {'class': "w_kbps", text: 320}),
                $('<div>', {'class': "w_kHz", text: 44}),
                $('<div>', {'class': "stereo"}),
                $('<div>', {'class': "w_playlist"}).on('click', function() {
                    engine.window_manager({type: 'playlist'});
                }));
                dom_cache.time = function() {
                    var obj = $('.info > .time');
                    var back = false;
                    obj.empty();
                    var mm = $('<div>', {'class': 'wmp mm', 'style': 'visibility: hidden; background-position-x: -99px;'});
                    var m_10 = $('<div>', {'class': 'wmp m_10'});
                    var m_0 = $('<div>', {'class': 'wmp m_0'});
                    var s_10 = $('<div>', {'class': 'wmp s_10'});
                    var s_0 = $('<div>', {'class': 'wmp s_0'});
                    obj.append(mm, m_10, m_0, s_10, s_0);
                    var setVal = function(num, obj) {
                        num = parseInt(num);
                        var val = 9 * num;
                        obj.css('background-position-x', '-' + val + 'px');
                    };
                    return {
                        on: function(a, b) {
                            obj.on(a, b);
                        },
                        text: function(value) {
                            var val = value.split(':');
                            if (val[0].length === 2) {
                                if (back) {
                                    mm.css('visibility', 'hidden');
                                    back = false;
                                }
                                setVal(val[0][0], m_10);
                                setVal(val[0][1], m_0);
                            } else {
                                if (back === false) {
                                    mm.css('visibility', 'visible');
                                    back = true;
                                }
                                setVal(val[0][1], m_10);
                                setVal(val[0][2], m_0);
                            }
                            setVal(val[1][0], s_10);
                            setVal(val[1][1], s_0);
                        },
                        empty: function() {
                            setVal(0, m_10);
                            setVal(0, m_0);
                            setVal(0, s_10);
                            setVal(0, s_0);
                        }
                    };
                }();
                writeWinampFFT();
            }
            dom_cache.progress.slider({
                range: "min",
                min: 0,
                max: 1000,
                change: function(event, ui) {
                    if (event.which === undefined) {
                        return;
                    }
                    engine.position(ui.value / 10);
                    if (is_winamp) {
                        var lp = parseInt(ui.value / 1000 * -29) || 0;
                        dom_cache.progress_ui_a.css('margin-left', lp + 'px');
                    }
                },
                slide: function(event, ui) {
                    if (event.which === undefined) {
                        return;
                    }
                    engine.position(ui.value / 10);
                    if (is_winamp) {
                        var lp = parseInt(ui.value / 1000 * -29) || 0;
                        dom_cache.progress_ui_a.css('margin-left', lp + 'px');
                    }
                },
                create: function() {
                    var div_loaded = $('<div>', {'class': 'loaded'});
                    dom_cache.progress.append(div_loaded);
                    pre_buffering_controller.setObj(div_loaded);
                    dom_cache.progress_ui_a = dom_cache.progress.find('a').eq(0);
                }
            });
            dom_cache.volume.slider({
                range: "min",
                min: 0,
                max: 100,
                change: function(event, ui) {
                    if (event.which === undefined) {
                        return;
                    }
                    engine.volume(ui.value);
                    if (is_winamp) {
                        dom_cache.volume.css('background', getVolumeColor(ui.value));
                    }
                },
                slide: function(event, ui) {
                    if (event.which === undefined) {
                        return;
                    }
                    engine.volume(ui.value);
                    if (is_winamp) {
                        dom_cache.volume.css('background', getVolumeColor(ui.value));
                    }
                }
            });
            view.state('emptied');
            view.state("playlist_is_empty");
            chrome.storage.local.get(['time_tipe', 'extend_volume_scroll', 'volume', 'shuffle', 'loop'], function(storage) {
                if (storage.time_tipe !== undefined) {
                    time_tipe = storage.time_tipe;
                }
                if (storage.extend_volume_scroll !== undefined) {
                    make_extend_volume(storage.extend_volume_scroll);
                }
                if (storage.shuffle) {
                    engine.shuffle();
                }
                if (storage.loop) {
                    engine.loop();
                }
                engine.volume(storage.volume);
            });
            engine.set_hotkeys(document);
            chrome.contextMenus.onClicked.addListener(function(info) {
                if (context_menu[info.menuItemId] !== undefined && context_menu[info.menuItemId].action !== undefined) {
                    context_menu[info.menuItemId].action(info);
                }
            });
            dom_cache.body.on('drop', function(event) {
                event.preventDefault();
                var files = event.originalEvent.dataTransfer.files;
                var entrys = event.originalEvent.dataTransfer.items;
                readFileArray(files, entrys);
            });
            var drag_timeout = undefined;
            dom_cache.body.on('dragover', function(event) {
                event.preventDefault();
                dom_cache.drop.css({"display": "block"});
                clearTimeout(drag_timeout);
                drag_timeout = setTimeout(function() {
                    dom_cache.drop.css({"display": "none"});
                }, 300);
            });
            dom_cache.btnPlayPause.on('click', function() {
                if ($(this).hasClass('play')) {
                    engine.play();
                } else
                if ($(this).hasClass('pause')) {
                    engine.pause();
                }
            });
            dom_cache.btnNext.on('click', function() {
                engine.next();
            });
            dom_cache.btnPrev.on('click', function() {
                engine.preview();
            });
            $('.close').on('click', function() {
                window.close();
            });
            $('.mini').on('click', function() {
                for (var window in _windows) {
                    _windows[window].minimize();
                }
                ;
            });
            $('.t_btn.menu').on('click', function() {
                engine.showMenu();
            });
            dom_cache.time.on('click', function() {
                time_tipe = (time_tipe) ? 0 : 1;
                chrome.storage.local.set({'time_tipe': time_tipe});
                var audio = engine.getAudio();
                view.setProgress(audio.duration, audio.currentTime);
            });
            $('.click_for_open').on('click', function() {
                var accepts = [{
                        mimeTypes: ['audio/*']
                    }];
                chrome.fileSystem.chooseEntry({type: 'openFile', accepts: accepts, acceptsMultiple: true}, function(entry) {
                    if (!entry) {
                        return;
                    }
                    readFileArray(undefined, entry);
                });
            });
            dom_cache.mute.on('click', function() {
                engine.mute();
            });
            dom_cache.volume.parent().get(0).onmousewheel = function(e) {
                if (e.wheelDelta > 0) {
                    engine.volume("+10");
                } else {
                    engine.volume("-10");
                }
            };
            dom_cache.progress.get(0).onmousewheel = function(e) {
                if (e.wheelDelta > 0) {
                    clearTimeout(var_cache.progress_timer);
                    var_cache.progress_timer = setTimeout(function() {
                        engine.position("+5");
                    }, 25);
                } else {
                    clearTimeout(var_cache.progress_timer);
                    var_cache.progress_timer = setTimeout(function() {
                        engine.position("-5");
                    }, 25);
                }
            };
            dom_cache.btnPlaylist.on('click', function() {
                engine.window_manager({type: 'playlist'});
            });
            $('div.loop').on('click', function() {
                engine.loop();
            });
            $('div.shuffle').on('click', function() {
                engine.shuffle();
            });
            chrome.app.window.current().onBoundsChanged.addListener(function() {
                if (document.webkitHidden) {
                    return;
                }
                var window_left = window.screenLeft;
                var window_top = window.screenTop;
                if (var_cache.window_left !== window_left || var_cache.window_top !== window_top) {
                    var_cache.window_left = window_left;
                    var_cache.window_top = window_top;
                    chrome.storage.local.set({'pos_left': window_left, 'pos_top': window_top});
                }
            });
        },
        setTags: function(tags) {
            if (tags === null) {
                tags = {};
            }
            var title = "";
            var trackalbum = "";
            if (tags.title !== undefined && tags.title.length > 0) {
                title = tags.title;
            } else {
                title = engine.get_filename();
            }
            if (tags.album !== undefined && tags.artist !== undefined && tags.album.length > 0 && tags.artist.length > 0) {
                trackalbum = tags.artist + ' - ' + tags.album;
            } else
            if (tags.artist !== undefined && tags.artist.length > 0) {
                trackalbum = tags.artist;
            } else
            if (tags.album !== undefined && tags.album.length > 0) {
                trackalbum = tags.album;
            }
            if (is_winamp) {
                if (trackalbum.length > 0) {
                    trackalbum = ' - ' + trackalbum;
                }
                dom_cache.trackname.text(title + trackalbum).parent().attr("title", title + trackalbum);
                calculate_moveble(dom_cache.trackname, 153, 'name');
            } else {
                dom_cache.trackname.text(title).parent().attr("title", title);
                dom_cache.trackalbum.text(trackalbum).parent().attr("title", trackalbum);
            }
            if (tags.picture !== undefined) {
                showImage(tags.picture);
            } else {
                hideImage();
            }
            setTrueText(title, trackalbum);
            //console.log(tags)
        },
        setProgress: function(max, pos) {
            var width_persent = pos / max * 100;
            dom_cache.progress.slider("value", width_persent * 10);
            if (is_winamp) {
                var lp = parseInt(width_persent / 100 * -29) || 0;
                dom_cache.progress_ui_a.css('margin-left', lp + 'px');
            }
            var time = undefined;
            if (time_tipe) {
                time = "-" + toHHMMSS(max - pos);
            } else {
                time = toHHMMSS(pos);
            }
            dom_cache.time.text(time);
        },
        setVolume: function(pos) {
            if (engine.getMute()) {
                if (var_cache['volume_image'] === -1) {
                    return;
                }
                dom_cache.volume.parent().children('.pic').css('background-image', 'url(images/sound_mute_w.png)');
                var_cache['volume_image'] = -1;
                return;
            }
            var max = 1.0;
            var width_persent = pos / max * 100;
            dom_cache.volume.slider("value", width_persent);
            if (is_winamp) {
                dom_cache.volume.css('background', getVolumeColor(width_persent));
            }
            if (width_persent > 70) {
                if (var_cache['volume_image'] === 1) {
                    return;
                }
                var_cache['volume_image'] = 1;
                dom_cache.volume.parent().children('.pic').css('background-image', 'url(images/sound_high_w.png)');
            } else
            if (pos === 0) {
                if (var_cache['volume_image'] === 2) {
                    return;
                }
                var_cache['volume_image'] = 2;
                dom_cache.volume.parent().children('.pic').css('background-image', 'url(images/sound_zero_w.png)');
            } else
            if (width_persent < 40) {
                if (var_cache['volume_image'] === 3) {
                    return;
                }
                var_cache['volume_image'] = 3;
                dom_cache.volume.parent().children('.pic').css('background-image', 'url(images/sound_low_w.png)');
            } else
            if (width_persent < 70) {
                if (var_cache['volume_image'] === 4) {
                    return;
                }
                var_cache['volume_image'] = 4;
                dom_cache.volume.parent().children('.pic').css('background-image', 'url(images/sound_medium_w.png)');
            }
        },
        state: function(type) {
            if (_debug) {
                console.log(type);
            }
            if (type === "playlist_is_empty") {
                dom_cache.click_for_open.show();
            }
            if (type === "playlist_not_empty") {
                dom_cache.click_for_open.hide();
            }
            if (type === "preloading") {
                dom_cache.loading.show();
            }
            if (type === "preloading_dune") {
                dom_cache.loading.hide();
            }
            if (type === "loadstart") {
                dom_cache.loading.show();
                pre_buffering_controller.loading();
            }
            if (type === "loadeddata") {
                dom_cache.loading.hide();
                pre_buffering_controller.update();
                pre_buffering_controller.start();
            }
            if (type === "emptied") {
                dom_cache.loading.hide();
                dom_cache.trackname.empty();
                dom_cache.trackalbum.empty();
                dom_cache.time.empty();
                hideImage();
                var_cache = {};
                var_cache['progress_w'] = dom_cache.progress.width();
                var_cache['volume_w'] = dom_cache.volume.width();
                isPause();
                view.setProgress(0.1, 0);
                pre_buffering_controller.stop();
                pre_buffering_controller.hide();
            }
            if (type === "error") {
                dom_cache.loading.hide();
                pre_buffering_controller.stop();
                pre_buffering_controller.hide();
                isPause();
            }
            if (type === "waiting") {
                dom_cache.loading.show();
            }
            if (type === "play") {
                dom_cache.loading.show();
                isPlaying();
            }
            if (type === "playing") {
                dom_cache.loading.hide();
                isPlaying();
            }
            if (type === "pause") {
                dom_cache.loading.hide();
                isPause();
            }
            if (type === "canplay") {
                engine.play();
            }
        },
        updateSettings: function(obj) {
            make_extend_volume(obj.extend_volume_scroll);
            writeWinampFFT(obj.visual_type);
            if (_lang !== undefined && $('body').data('lang') !== _lang.t) {
                write_language();
            }
        },
        getFilesFromFolder: getFilesFromFolder,
        entry2files: entry2files,
        pre_buffering_controller: pre_buffering_controller,
        setShuffle: function(shuffle) {
            if (shuffle) {
                $('div.shuffle').addClass('on');
            } else {
                $('div.shuffle').removeClass('on');
            }
        },
        setLoop: function(loop) {
            if (loop) {
                $('div.loop').addClass('on');
            } else {
                $('div.loop').removeClass('on');
            }
        },
        getContextMenu: function() {
            return context_menu;
        }
    };
}();
window._flags = [];
$(document).on('settings_changed', function() {
    if (window._flags.indexOf('settings_changed') !== -1 && window._flags.indexOf('ready') !== -1) {
        view.updateSettings(_settings);
        return;
    }
    window._flags.push('settings_changed');
    if (window._flags.indexOf('ready') === -1) {
        return;
    }
    view.show();
});
$(function() {
    window._flags.push('ready');
    if (window._flags.indexOf('settings_changed') === -1) {
        return;
    }
    view.show();
});