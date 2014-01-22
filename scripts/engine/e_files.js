var engine_files = function(mySettings, myEngine) {
    window.engine_files = undefined;
    var settings = mySettings;
    var engine = myEngine;
    var e_files = function() {
        var getEntryFromDir = function (entry, cb) {
            /**
             * @namespace entry.isDirectory
             * @namespace entry.createReader
             * @namespace dir.readEntries
             */
            /*
             * Получает массив файлов - Entry из Entry дирректории.
             */
            if (!entry.isDirectory) {
                cb([]);
                return;
            }
            var dir = entry.createReader();
            dir.readEntries(function (a) {
                cb(a);
            });
        };
        var entry2files = function (entry, cb) {
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
            var dune = function () {
                dune_count++;
                if (dune_count === entry_len) {
                    cb(files);
                }
            };
            entry.forEach(function (item) {
                if (item.isDirectory) {
                    dune();
                    return 1;
                }
                item.file(function (file) {
                    files.push(file);
                    dune();
                });
            });
        };
        var findMusicInFolder = function (entry, cb) {
            /*
             * Проверяет наличие хотя бы одного файла в каталоге.
             */
            getEntryFromDir(entry, function (sub_entry) {
                var sub_entry_len = sub_entry.length;
                var next = function (i) {
                    if (i >= sub_entry_len) {
                        cb(false);
                        return;
                    }
                    var item = sub_entry[i];
                    if (item.isDirectory) {
                        next(i + 1);
                        return;
                    }
                    item.file(function (file) {
                        if (engine.player.canPlay(file.type)) {
                            cb(true);
                        } else {
                            next(i + 1);
                        }
                    });
                };
                next(0);
            });
        };
        var readDirectoryWithM3U = function (entrys, entry, cb) {
            var playlists = {};
            var playlist_count = entrys.length;
            var playlist_dune_count = 0;
            var fileMode = false;
            var dune = function () {
                /*
                 * Получает команду готово как только один из плэйлистов будет заполнен.
                 * Когла получит все плэйлисты - отдает диалог выбора их.
                 */
                playlist_dune_count++;
                if (playlist_count !== playlist_dune_count) {
                    return;
                }
                var playlist = [];
                $.each(playlists, function (key, item) {
                    if (item.length === 0) {
                        return 1;
                    }
                    var urls = [];
                    var ent = [];
                    item.forEach(function (itm) {
                        if (itm.url !== undefined) {
                            urls.push({url: itm.url, name: itm.name});
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
                        playlist.push({name: name, entrys: ent, id: playlist.length, type: "m3u"});
                    }
                });
                if (playlist.length === 0) {
                    if (cb !== undefined) {
                        cb();
                    }
                    return;
                }
                playlist.sort(function (a, b) {
                    return (a.name === b.name) ? 0 : (a.name > b.name) ? 1 : -1;
                });
                if (cb !== undefined) {
                    cb(playlist);
                    return;
                }
                engine.playlist.setM3UPlaylists(playlist);
                if (playlist.length === 1) {
                    engine.playlist.selectPlaylist(playlist[0].id);
                } else if (playlist.length > 0) {
                    engine.windowManager({type: 'dialog', config: {type: "m3u", h: 200, w: 350, r: true, playlists: playlist}});
                }
            };
            var readM3U = function (content, name) {
                /*
                 * Читает m3u файл и строит дерево каталогов
                 */
                var ordered_name_list = [];
                var stream_count = 0;
                var stream_got = 0;
                var file_list = [];
                var file_getter = function (files) {
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
                    if (playlists[name] !== undefined) {
                        playlists[name] = playlists[name].concat(arr);
                    } else {
                        playlists[name] = arr;
                    }
                    dune();
                };
                var readEntry = function (entry, file_tree) {
                    /**
                     * @namespace sub_entry.isDirectory
                     * @namespace sub_entry.fullPath
                     */
                    /*
                     * ищет внутри всех папок, в соответствие с {} file_tree, и если внутри есть файлы из [] file_arr добавляет из в массив.
                     */
                    stream_count++;
                    getEntryFromDir(entry, function (sub_entry) {
                        var len = sub_entry.length;
                        var files = [];
                        for (var n = 0; n < len; n++) {
                            if (sub_entry[n].isDirectory) {
                                $.each(file_tree, function (item) {
                                    if (sub_entry[n].fullPath === item) {
                                        readEntry(sub_entry[n], file_tree);
                                    }
                                });
                            } else {
                                var file_arr = file_tree[entry.fullPath].files;
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
                var extinfo = '';
                for (var i = 0; i < len; i++) {
                    var line = lines[i].trim();
                    if (line.length < 1 || (line.substr(0, 1) === "#")) {
                        extinfo = line.substr(0,8);
                        if (extinfo === '#EXTINF:') {
                            extinfo = line.substr(8).trim();
                        } else {
                            extinfo = '';
                        }
                        continue;
                    }
                    var proto_url = line.substr(0, 7).toLowerCase();
                    if (proto_url === "http://" || proto_url === "https:/") {
                        if (playlists[name] === undefined) {
                            playlists[name] = [];
                        }
                        playlists[name].push({url: line, name: (extinfo.length > 0)?extinfo:undefined});
                        extinfo = '';
                        continue;
                    }
                    if (fileMode) {
                        continue;
                    }
                    var path_arr = line.split('/');
                    var path_len = path_arr.length;
                    ordered_name_list.push(path_arr[path_len - 1]);
                    var path = entry.fullPath;
                    for (var n = 0; n < path_len; n++) {
                        if (file_tree[path] === undefined) {
                            file_tree[path] = {files: [path_arr[n]]};
                        } else if (file_tree[path].files.indexOf(path_arr[n]) === -1) {
                            file_tree[path].files.push(path_arr[n]);
                        }
                        path += "/" + path_arr[n];
                    }
                }
                if (fileMode) {
                    dune();
                } else {
                    readEntry(entry, file_tree);
                }
            };
            var openM3U = function (file) {
                /*
                 * Получает контент m3u
                 */
                var r = new FileReader();
                r.onload = function () {
                    var playlist_name = file.name.substr(0, file.name.length - 1 - 3);
                    readM3U(r.result, playlist_name);
                };
                r.readAsText(file);
            };
            if (entrys.file !== undefined) {
                fileMode = true;
                playlist_count = 1;
                entrys.file(function (file) {
                    openM3U(file);
                });
            } else {
                entry2files(entrys, function (files) {
                    files.forEach(function (file) {
                        openM3U(file);
                    });
                });
            }
        };
        var readDirectory = function (entry, cb) {
            /*
             * Читает открытую дирректорию, аналиpирует куда направить работу с дирректорией - в m3u или в чтение подкаталогов
             */
            getEntryFromDir(entry, function (sub_entry) {
                var sub_entry_len = sub_entry.length;
                var dir_count = 0;
                var file_count = 0;
                var m3u = [];
                for (var i = 0; i < sub_entry_len; i++) {
                    var item = sub_entry[i];
                    if (item.isDirectory === true) {
                        dir_count++;
                    } else {
                        var ext = item.name.substr(item.name.lastIndexOf('.') + 1).toLowerCase();
                        if (ext === 'm3u') {
                            m3u.push(item);
                        } else {
                            file_count++;
                        }
                    }
                }
                if (file_count === 0 && dir_count === 0 && m3u.length === 0) {
                    if (cb !== undefined) {
                        cb();
                    }
                    return;
                }
                if (m3u.length > 0) {
                    readDirectoryWithM3U(m3u, entry, cb);
                } else {
                    readDirectoryWithSub(entry, cb);
                }
            });
        };
        var getFilesFromFolder = function (entry, cb) {
            /*
             * Отдает список файлов в папке
             */
            getEntryFromDir(entry, function (sub_entry) {
                sub_entry.sort(function (a, b) {
                    return (a.name === b.name) ? 0 : (a.name > b.name) ? 1 : -1;
                });
                entry2files(sub_entry, function (files) {
                    cb(files);
                });
            });
        };
        var readDirectoryWithSub = function (entry, cb) {
            /*
             * Читает дирректорию и дирректории внутри их..
             * Уровень вложенности - 1.
             * Формирует плэйлисты из вложенных папок.
             */
            getEntryFromDir(entry, function (sub_entry) {
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
                var dune = function () {
                    dune_count++;
                    if (dune_count !== list_dir_len) {
                        return;
                    }
                    if (playlist.length === 0) {
                        if (cb !== undefined) {
                            cb();
                        }
                        return;
                    }
                    playlist.sort(function (a, b) {
                        return (a.name === b.name) ? 0 : (a.name > b.name) ? 1 : -1;
                    });
                    if (cb !== undefined) {
                        cb(playlist);
                        return;
                    }
                    engine.playlist.setM3UPlaylists(playlist);
                    if (playlist.length === 1) {
                        engine.playlist.selectPlaylist(playlist[0].id);
                    } else if (playlist.length > 0) {
                        engine.windowManager({type: 'dialog', config: {type: "m3u", h: 200, w: 350, r: true, playlists: playlist}});
                    }
                };
                if (list_dir_len === 0) {
                    dune();
                    return;
                }
                list_dir.forEach(function (item) {
                    findMusicInFolder(item, function (canplay) {
                        if (canplay) {
                            playlist.push({name: item.name, entry: item, id: playlist.length, type: "subfiles"});
                        }
                        dune();
                    });
                });
            });
        };
        var readAnyFiles = function (entry, cb) {
            /*
             * Читает любой массив файлов
             * Что найдет все откроет и создаст соответствующие плейлисты.
             * Если есть папка - пошлет на чтение папок, где если найдет внутри m3u - пошлет на чтение m3u дирректории, если не найдет - пошлет на чтение папки с подпапками.
             * Если найдет m3u - пошлет на чтение m3u как только файл (только url) и создаст одноименный плейлист если найдет что то.
             * Если просто файл - создаст плейлист Root, в который все это и добавит
             */
            if (!entry) {
                entry = [];
            }
            var cb_count = 0;
            var dune_count = 0;
            var playlist = [];
            var dune = function(new_playlist) {
                dune_count++;
                if (new_playlist !== undefined) {
                    playlist = playlist.concat(new_playlist);
                }
                if (cb_count !== dune_count) {
                    return;
                }
                playlist.forEach(function(item, n) {
                    item.id = n;
                });
                if (playlist.length === 0) {
                    if (cb !== undefined) {
                        cb();
                    }
                    return;
                }
                if (cb !== undefined) {
                    cb(playlist);
                    return;
                }
                engine.playlist.setM3UPlaylists(playlist);
                if (playlist.length === 1) {
                    engine.playlist.selectPlaylist(playlist[0].id);
                } else if (playlist.length > 0) {
                    engine.windowManager({type: 'dialog', config: {type: "m3u", h: 200, w: 350, r: true, playlists: playlist}});
                }
            };
            var just_files = [];
            for (var i = 0, item; item = entry[i]; i++) {
                if (item.webkitGetAsEntry !== undefined) {
                    item = item.webkitGetAsEntry();
                }
                if (!item) {
                    continue;
                }
                if (item.isDirectory) {
                    cb_count++;
                    readDirectory(item, function(playlist) {
                        dune(playlist);
                    });
                } else {
                    var ext = item.name.substr(item.name.lastIndexOf('.') + 1).toLowerCase();
                    if (ext === 'm3u') {
                        cb_count++;
                        readDirectoryWithM3U(item,undefined,function(playlist) {
                            dune(playlist);
                        });
                        continue;
                    }
                    just_files.push(item);
                }
            }
            if (just_files.length > 0) {
                cb_count++;
                dune({type: 'm3u', isDefault: true, entrys: just_files, name: _lang.playlist_title});
            }
        };
        return {
            entry2files: entry2files,
            getFilesFromFolder: getFilesFromFolder,
            readAnyFiles: readAnyFiles,
            readDirectory: readDirectory,
            readDirectoryWithSub: readDirectoryWithSub
        };
    }();
    return e_files;
};