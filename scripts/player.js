var view = function() {
    var dom_cache = {};
    var var_cache = {};
    var time_tipe = 0;
    var settings = {};
    var isPlaying = function() {
        /*
         * Выставляет статус - проигрывается.
         */
        dom_cache.btnPlayPause.removeClass('play').addClass('pause');
    };
    var isPause = function() {
        /*
         * Выставляет статус - пауза.
         */
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
        dom_cache.picture.attr('data-id', id).get(0).src = img.data;
    };
    var hideImage = function() {
        /*
         * Выставляет статус - без обложки.
         */
        dom_cache.picture.get(0).src = "images/no-cover.png";
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
        if ("isDirectory" in entry === false || entry.isDirectory === false) {
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
    var readPlaylist = function(entry, file, cb) {
        /*
         * Читает m3u файл
         */
        var stream_count = 0;
        var stream_got = 0;
        var file_list = [];
        var ordered_name_list = [];
        var url_list = [];
        var file_getter = function(files) {
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
            entry2files(arr, function(files) {
                var url_list_len = url_list.length;
                for (var i = 0; i < url_list_len; i++) {
                    files.push({url: url_list[i]});
                }
                cb(files);
            });
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
        var readM3U = function(content) {
            /*
             * Читает m3u файл и строит дерево
             */
            var file_tree = {};
            var lines = content.split("\n");
            var len = lines.length;
            for (var i = 0; i < len; i++) {
                var line = lines[i].trim();
                if (line.length < 1 || line.substr(0, 1) === "#") {
                    continue;
                }
                var proto_url = line.substr(0, 7).toLowerCase();
                if (proto_url === "http://" || proto_url === "https:/") {
                    url_list.push(line);
                    continue;
                }
                var path_arr = line.split('/');
                var path_len = path_arr.length;
                ordered_name_list.push(path_arr[path_len - 1]);
                var path = entry.fullPath;
                for (var n = 0; n < path_len; n++) {
                    if (path in file_tree === false) {
                        file_tree[path] = {files: [path_arr[n]]};
                    } else
                    if (file_tree[path].files.indexOf(path_arr[n]) === -1) {
                        file_tree[path].files.push(path_arr[n]);
                    }
                    path += "/" + path_arr[n];
                }
            }
            readEntry(entry, file_tree);
        };
        var r = new FileReader();
        r.onload = function(e) {
            readM3U("" + r.result);
        };
        r.readAsText(file);
    };
    var readFileArray = function(files, entry) {
        var m3u = undefined;
        var fl = files.length;
        var pl_name = ("isDirectory" in entry && entry.isDirectory) ? entry.name : undefined;
        for (var n = 0; n < fl; n++) {
            var filename = files[n].name;
            var ext = filename.split('.').slice(-1)[0].toLowerCase();
            if (ext !== "m3u") {
                continue;
            }
            var sname = filename.substr(0, filename.length - 1 - ext.length);
            if (m3u === undefined) {
                m3u = {entry: entry, data: [files[n]], list: [{name: sname, id: 0}]};
            } else {
                m3u.data.push(files[n]);
                var id = m3u.list.length;
                m3u.list.push({name: sname, id: id});
            }
        }
        engine.open(files, {name: pl_name});
        if (m3u !== undefined) {
            m3u.list.sort(function(a, b) {
                return (a.name === b.name) ? 0 : (a.name > b.name) ? 1 : -1;
            });
            engine.setM3UPlaylists(m3u);
            chrome.runtime.getBackgroundPage(function(bg) {
                bg.wm.showDialog({type: "m3u", h: 200, w: 350, r: true, playlists: m3u.list});
            });
        }
    };
    var readDirectory = function(entry) {
        /*
         * Читает открытую дирректорию, получает массив m3u файлов, и воспроизводит файлы внутри.
         */
        getEntryFromDir(entry, function(sub_entry) {
            var sub_entry_len = sub_entry.length;
            var dir_count = 0;
            var file_count = 0;
            for (var i = 0; i < sub_entry_len; i++) {
                var item = sub_entry[i];
                if ("isDirectory" in item && item.isDirectory) {
                    dir_count++;
                } else {
                    file_count++;
                }
            }
            if (file_count === 0 && dir_count === 0) {
                return;
            } else
            if (file_count === 0 && dir_count > 0) {
                readDirectoryWithSub(entry);
            } else {
                entry2files(sub_entry, function(files) {
                    readFileArray(files, entry);
                });
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
                    var lists = {list: playlist};
                    engine.setM3UPlaylists(lists);
                    chrome.runtime.getBackgroundPage(function(bg) {
                        bg.wm.showDialog({type: "m3u", h: 200, w: 350, r: true, playlists: lists.list});
                    });
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
            }
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
    var write_language = function() {
        $('body').data('lang', _lang.t);
        $('.t_btn.mini').attr('title', _lang.mini);
        $('.t_btn.close').attr('title', _lang.close);
        $('div.drop span').text(_lang.drop_file);
        $('div.click_for_open span').text(_lang.click_for_open);
        $('.btn.playlist').attr('title', _lang.playlist);
        $('.btn.prev').attr('title', _lang.prev);
        $('.btn.playpause').attr('title', _lang.play_pause);
        $('.btn.next').attr('title', _lang.next);
        $('.volume_controll .pic').attr('title', _lang.mute);
    };
    return {
        show: function() {
            settings = engine.getSettings();
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
                picture: $('.image > img'),
                volume: $('.volume'),
                mute: $('.volume_controll .pic'),
                click_for_open: $('.click_for_open'),
                btnPlaylist: $('.playlist.btn')
            };
            write_language();
            dom_cache.progress.slider({
                range: "min",
                min: 0,
                max: 1000,
                change: function(event, ui) {
                    if ('which' in event === false) {
                        return;
                    }
                    engine.position(ui.value / 10);
                },
                slide: function(event, ui) {
                    if ('which' in event === false) {
                        return;
                    }
                    engine.position(ui.value / 10);
                },
                create: function() {
                    var div_loaded = $('<div>', {'class': 'loaded'});
                    dom_cache.progress.append(div_loaded);
                    pre_buffering_controller.setObj(div_loaded);
                }
            });
            dom_cache.volume.slider({
                range: "min",
                min: 0,
                max: 100,
                change: function(event, ui) {
                    if ('which' in event === false) {
                        return;
                    }
                    engine.volume(ui.value);
                },
                slide: function(event, ui) {
                    if ('which' in event === false) {
                        return;
                    }
                    engine.volume(ui.value);
                }
            });
            view.state('emptied');
            view.state("playlist_is_empty");
            dom_cache.body.on('drop', function(event) {
                event.preventDefault();
                var files = event.originalEvent.dataTransfer.files;
                var entrys = event.originalEvent.dataTransfer.items;
                if (files.length === 1) {
                    var entry = entrys[0].webkitGetAsEntry();
                    if ("isDirectory" in entry && entry.isDirectory) {
                        readDirectory(entry);
                        return;
                    }
                }
                readFileArray(files, entrys);
            });
            var drag_timeout = null;
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
            dom_cache.picture.get(0).onerror = function() {
                engine.badImage($(this).attr('data-id'));
                hideImage();
            };
            $('.close').on('click', function() {
                save_pos();
                engine.sendPlaylist(function(window) {
                    window.close();
                });
                engine.vizClose();
                window.close();
            });
            $('.mini').on('click', function() {
                engine.sendPlaylist(function(window) {
                    window.playlist.minimize();
                });
                engine.vizMini();
                chrome.app.window.current().minimize();
            });
            dom_cache.time.on('click', function() {
                time_tipe = (time_tipe) ? 0 : 1;
                chrome.storage.local.set({'time_tipe': time_tipe});
                var audio = engine.getAudio();
                view.setProgress(audio.duration, audio.currentTime);
            });
            chrome.storage.local.get('time_tipe', function(storage) {
                if ('time_tipe' in storage) {
                    time_tipe = storage.time_tipe;
                }
            });
            chrome.storage.local.get('volume', function(storage) {
                if ('volume' in storage) {
                    engine.volume(storage.volume);
                }
                if ('volume' in storage === false || storage.volume === 100) {
                    engine.volume();
                }
            });
            $('.click_for_open').on('click', function() {
                var accepts = [{
                        mimeTypes: ['audio/*']
                    }];
                chrome.fileSystem.chooseEntry({type: 'openFile', accepts: accepts, acceptsMultiple: true}, function(entry) {
                    if (!entry) {
                        return;
                    }
                    entry2files(entry, function(files) {
                        readFileArray(files, entry);
                    });
                });
            });
            dom_cache.mute.on('click', function() {
                engine.mute();
            });
            engine.set_hotkeys(document);
            chrome.contextMenus.removeAll(function() {
                chrome.contextMenus.create({
                    id: "1",
                    title: _lang.ctx_open_files,
                    contexts: ['page', 'launcher']
                });
                chrome.contextMenus.create({
                    id: "3",
                    title: _lang.ctx_open_folder,
                    contexts: ['page', 'launcher']
                });
                chrome.contextMenus.create({
                    id: "o_f_sub",
                    title: _lang.ctx_open_folder_sub,
                    contexts: ['page', 'launcher']
                });
                chrome.contextMenus.create({
                    id: "2",
                    title: _lang.ctx_open_url,
                    contexts: ['page', 'launcher']
                });
                chrome.contextMenus.create({
                    type: "checkbox",
                    id: "ws",
                    title: _lang.ctx_webui + " (0.0.0.0:9898)",
                    contexts: ['page', 'launcher']
                });
                chrome.contextMenus.create({
                    id: "viz",
                    title: _lang.ctx_viz,
                    contexts: ['page', 'launcher']
                });
                chrome.contextMenus.create({
                    id: "cloud",
                    title: _lang.ctx_cloud,
                    contexts: ['page', 'launcher']
                });
                chrome.contextMenus.create({
                    id: "vk",
                    parentId: "cloud",
                    title: "vk.com",
                    contexts: ['page', 'launcher']
                });
                chrome.contextMenus.create({
                    id: "sc",
                    parentId: "cloud",
                    title: "soundcloud.com",
                    contexts: ['page', 'launcher']
                });
                chrome.contextMenus.create({
                    id: "gd",
                    parentId: "cloud",
                    title: "drive.google.com",
                    contexts: ['page', 'launcher']
                });
                chrome.contextMenus.create({
                    id: "db",
                    parentId: "cloud",
                    title: "dropbox.com",
                    contexts: ['page', 'launcher']
                });
                chrome.contextMenus.create({
                    id: "box",
                    parentId: "cloud",
                    title: "box.com",
                    contexts: ['page', 'launcher']
                });
                chrome.contextMenus.create({
                    id: "sd",
                    parentId: "cloud",
                    title: "skydrive.com",
                    contexts: ['page', 'launcher']
                });
                chrome.contextMenus.create({
                    id: "p_play_pause",
                    title: _lang.play_pause,
                    contexts: ['launcher']
                });
                chrome.contextMenus.create({
                    id: "p_next",
                    title: _lang.next,
                    contexts: ['launcher']
                });
                chrome.contextMenus.create({
                    id: "p_previous",
                    title: _lang.prev,
                    contexts: ['launcher']
                });
                chrome.contextMenus.create({
                    id: "options",
                    title: _lang.ctx_options,
                    contexts: ['page', 'launcher']
                });
                chrome.runtime.getBackgroundPage(function(bg) {
                    chrome.contextMenus.update("ws", {checked: bg.wm.ws.active()});
                });
            });
            chrome.contextMenus.onClicked.addListener(function(info) {
                if (info.menuItemId === "options") {
                    chrome.runtime.getBackgroundPage(function(bg) {
                        bg.wm.showOptions();
                    });
                    return;
                }
                if (info.menuItemId === "1") {
                    $('.click_for_open').trigger('click');
                    return;
                }
                if (info.menuItemId === "2") {
                    chrome.runtime.getBackgroundPage(function(bg) {
                        bg.wm.showDialog({type: "url", h: 60});
                    });
                    return;
                }
                if (info.menuItemId === "vk") {
                    cloud.vk.makeAlbums(function(list) {
                        engine.setM3UPlaylists({list: list});
                        if (list.length === 1) {
                            engine.select_playlist(list[0].id);
                        } else
                        if (list.length > 0) {
                            chrome.runtime.getBackgroundPage(function(bg) {
                                bg.wm.showDialog({type: "m3u", h: 200, w: 350, r: true, playlists: list});
                            });
                        }
                    });
                    return;
                }
                if (info.menuItemId === 'sc') {
                    cloud.sc.makeAlbums(function(list) {
                        engine.setM3UPlaylists({list: list});
                        if (list.length === 1) {
                            engine.select_playlist(list[0].id);
                        } else
                        if (list.length > 0) {
                            chrome.runtime.getBackgroundPage(function(bg) {
                                bg.wm.showDialog({type: "m3u", h: 200, w: 350, r: true, playlists: list});
                            });
                        }
                    });
                    return;
                }
                if (info.menuItemId === "save_vk") {
                    var track = engine.getCurrentTrack();
                    if (track !== undefined && track.track_id !== undefined) {
                        engine.vk.addInLibrarty(track.track_id, track.owner_id);
                    }
                    return;
                }
                if (info.menuItemId === "db") {
                    cloud.db.getFilelist(function(list) {
                        chrome.runtime.getBackgroundPage(function(bg) {
                            bg.wm.showDialog({type: "db", h: 315, w: 350, r: true, filelist: list});
                        });
                    });
                    return;
                }
                if (info.menuItemId === "gd") {
                    cloud.gd.getFilelist(undefined, function(list) {
                        chrome.runtime.getBackgroundPage(function(bg) {
                            bg.wm.showDialog({type: "gd", h: 315, w: 350, r: true, filelist: list});
                        });
                    });
                    return;
                }
                if (info.menuItemId === "box") {
                    cloud.box.getFilelist(function(list) {
                        chrome.runtime.getBackgroundPage(function(bg) {
                            bg.wm.showDialog({type: "box", h: 315, w: 350, r: true, filelist: list});
                        });
                    });
                    return;
                }
                if (info.menuItemId === "sd") {
                    cloud.sd.getFilelist(undefined, function(list) {
                        chrome.runtime.getBackgroundPage(function(bg) {
                            bg.wm.showDialog({type: "sd", h: 315, w: 350, r: true, filelist: list});
                        });
                    });
                    return;
                }
                if (info.menuItemId === "viz") {
                    chrome.runtime.getBackgroundPage(function(bg) {
                        bg.wm.showViz();
                    });
                    return;
                }
                if (info.menuItemId === "3") {
                    chrome.fileSystem.chooseEntry({type: 'openDirectory'}, function(entry) {
                        if (!entry) {
                            return;
                        }
                        readDirectory(entry);
                    });
                    return;
                }
                if (info.menuItemId === 'o_f_sub') {
                    chrome.fileSystem.chooseEntry({type: 'openDirectory'}, function(entry) {
                        if (!entry) {
                            return;
                        }
                        readDirectoryWithSub(entry);
                    });
                    return;
                }
                if (info.menuItemId === "ws") {
                    if (info.checked) {
                        chrome.runtime.getBackgroundPage(function(bg) {
                            bg.wm.ws.start();
                        });
                    } else {
                        chrome.runtime.getBackgroundPage(function(bg) {
                            bg.wm.ws.stop();
                        });
                    }
                    return;
                }
                if (info.menuItemId === "p_play_pause") {
                    engine.playToggle();
                    return;
                }
                if (info.menuItemId === "p_next") {
                    engine.next();
                    return;
                }
                if (info.menuItemId === "p_previous") {
                    engine.preview();
                    return;
                }
            });
            chrome.storage.local.get('shuffle', function(storage) {
                if ('shuffle' in storage && storage.shuffle) {
                    engine.shuffle();
                }
            });
            chrome.storage.local.get('loop', function(storage) {
                if ('loop' in storage && storage.loop) {
                    engine.loop();
                }
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
            dom_cache.btnPlaylist.unbind().on('click', function() {
                chrome.runtime.getBackgroundPage(function(bg) {
                    bg.wm.toggle_playlist();
                });
            });
            var save_pos = function() {
                if (document.webkitHidden) {
                    return;
                }
                var wl = window.screenLeft;
                var wr = window.screenTop;
                if (var_cache['wl'] !== wl || var_cache['wr'] !== wr) {
                    var_cache['wl'] = wl;
                    var_cache['wr'] = wr;
                    chrome.storage.local.set({'pos_left': wl, 'pos_top': wr});
                }
            };
            setInterval(function() {
                save_pos();
                chrome.runtime.getBackgroundPage(function(bg) {
                    bg.wm.hi("player", chrome.app.window.current());
                });
            }, 5000);
        },
        setTags: function(tags) {
            if (tags === null) {
                tags = {};
            }
            var title = "";
            var trackalbum = "";
            if ("title" in tags && tags.title.length > 0) {
                title = tags.title;
            } else {
                title = engine.get_filename();
            }
            if ("album" in tags && "artist" in tags && tags.album.length > 0 && tags.artist.length > 0) {
                trackalbum = tags.artist + ' - ' + tags.album;
            } else
            if ("artist" in tags && tags.artist.length > 0) {
                trackalbum = tags.artist;
            } else
            if ("album" in tags && tags.album.length > 0) {
                trackalbum = tags.album;
            }
            dom_cache.trackname.text(title).parent().attr("title", title);
            dom_cache.trackalbum.text(trackalbum).parent().attr("title", trackalbum);
            if ("picture" in tags) {
                showImage(tags.picture);
            } else {
                hideImage();
            }
            //console.log(tags)
        },
        setProgress: function(max, pos) {
            var width_persent = pos / max * 100;
            dom_cache.progress.slider("value", width_persent * 10);
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
            var box = $('body > .player > .box');
            var boxState = box.hasClass('volume_scroll');
            if (settings.extend_volume_scroll && !boxState) {
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
            if (!settings.extend_volume_scroll && boxState) {
                box.unbind('mousewheel').removeClass('volume_scroll');
            }
        },
        readPlaylist: readPlaylist,
        getFilesFromFolder: getFilesFromFolder,
        pre_buffering_controller: pre_buffering_controller
    };
}();
$(function() {
    chrome.storage.local.get('lang', function(obj) {
        _lang = get_lang(obj.lang);
        delete window.get_lang;
        view.show();
    });
});