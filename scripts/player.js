var view = function() {
    var dom_cache = {};
    var var_cache = {};
    var time_tipe = 0;
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
        var len = entry.length;
        var wlen = entry.length;
        var n = 0;
        if (len === 0) {
            cb(files);
            return;
        }
        for (var i = 0; i < len; i++) {
            if (entry[i].isDirectory) {
                wlen--;
                continue;
            }
            entry[i].file(function(file) {
                files.push(file);
                n++;
                if (n === wlen && cb) {
                    cb(files);
                }
            });
        }
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
            entry2files(sub_entry, function(files) {
                readFileArray(files, entry);
            });
        });
    };
    return {
        show: function() {
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
                window.close();
            });
            $('.mini').on('click', function() {
                engine.sendPlaylist(function(window) {
                    window.playlist.minimize();
                });
                chrome.app.window.current().minimize();
            });
            dom_cache.time.on('click', function() {
                time_tipe = (time_tipe) ? 0 : 1;
                chrome.storage.local.set({'time_tipe': time_tipe});
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
            $(document).keydown(function(event) {
                if ('keyCode' in event === false) {
                    return;
                }
                if (event.keyCode === 32) {
                    event.preventDefault();
                    engine.playToggle();
                } else
                if (event.keyCode === 118 || event.keyCode === 86) {
                    event.preventDefault();
                    engine.mute();
                } else
                if (event.keyCode === 115 || event.keyCode === 83) {
                    event.preventDefault();
                    engine.shuffle();
                } else
                if (event.keyCode === 114 || event.keyCode === 82) {
                    event.preventDefault();
                    engine.loop();
                } else
                if (event.keyCode === 113) {
                    event.preventDefault();
                    engine.next();
                } else
                if (event.keyCode === 112) {
                    event.preventDefault();
                    engine.preview();
                } else
                if (event.ctrlKey) {
                    if (event.keyCode === 38) {
                        event.preventDefault();
                        engine.volume("+10");
                    } else
                    if (event.keyCode === 40) {
                        event.preventDefault();
                        engine.volume("-10");
                    } else
                    if (event.keyCode === 39) {
                        event.preventDefault();
                        clearTimeout(var_cache.progress_keydown_timer);
                        var_cache.progress_keydown_timer = setTimeout(function() {
                            engine.position("+10");
                        }, 25);
                    } else
                    if (event.keyCode === 37) {
                        event.preventDefault();
                        clearTimeout(var_cache.progress_keydown_timer);
                        var_cache.progress_keydown_timer = setTimeout(function() {
                            engine.position("-10");
                        }, 25);
                    }
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
            chrome.contextMenus.removeAll(function() {
                chrome.contextMenus.create({
                    id: "1",
                    title: "Open files",
                    contexts: ["all"]
                });
                chrome.contextMenus.create({
                    id: "3",
                    title: "Open folder",
                    contexts: ["all"]
                });
                chrome.contextMenus.create({
                    id: "2",
                    title: "Open URL",
                    contexts: ["all"]
                });
                chrome.contextMenus.create({
                    type: "checkbox",
                    id: "ws",
                    title: "Enable webUI (0.0.0.0:9898)",
                    contexts: ["all"]
                });
                chrome.runtime.getBackgroundPage(function(bg) {
                    chrome.contextMenus.update("ws", {checked: bg.wm.ws.active()});
                });
                chrome.contextMenus.onClicked.addListener(function(info) {
                    if (info.menuItemId === "1") {
                        $('.click_for_open').trigger('click');
                    } else
                    if (info.menuItemId === "2") {
                        chrome.runtime.getBackgroundPage(function(bg) {
                            bg.wm.showDialog({type: "url", h: 60});
                        });
                    } else
                    if (info.menuItemId === "3") {
                        chrome.fileSystem.chooseEntry({type: 'openDirectory'}, function(entry) {
                            if (!entry) {
                                return;
                            }
                            readDirectory(entry);
                        });
                    } else
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
                    }
                });
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
            if (time_tipe) {
                var time = "-" + toHHMMSS(max - pos);
            } else {
                var time = toHHMMSS(pos);
            }
            dom_cache.time.html(time);
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
            if (type === "loadstart") {
                dom_cache.loading.show();
            }
            if (type === "loadeddata") {
                dom_cache.loading.hide();
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
            }
            if (type === "error") {
                dom_cache.loading.hide();
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
        select_playlist: function(id) {
            var filePlaylists = engine.getM3UPlaylists();
            if (filePlaylists === undefined) {
                return;
            }
            var name = undefined;
            filePlaylists.list.forEach(function(item) {
                if (item.id === id) {
                    name = item.name;
                }
            });
            readPlaylist(filePlaylists.entry, filePlaylists.data[id], function(files) {
                engine.open(files, {name: name, id: id});
            });
        }
    };
}();
$(function() {
    view.show();
});
var tmp = {};