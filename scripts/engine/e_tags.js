var engine_tags = function(mySettings,myEngine) {
    window.engine_tags = undefined;
    var settings = mySettings;
    var engine = myEngine;
    var options = {
        hasGetMetadata: chrome.mediaGalleries.getMetadata !== undefined
    };
    var e_tags = function () {
        var covers = [];
        var str2blob = function (byteCharacters, contentType, sliceSize) {
            contentType = contentType || '';
            sliceSize = sliceSize || 256;
            var byteCharacters_len = byteCharacters.length;
            var byteArrays = new Array(Math.ceil(byteCharacters_len / sliceSize));
            var n = 0;
            for (var offset = 0; offset < byteCharacters_len; offset += sliceSize) {
                var slice = byteCharacters.slice(offset, offset + sliceSize);
                var slice_len = slice.length;
                var byteNumbers = new Array(slice_len);
                for (var i = 0; i < slice_len; i++) {
                    byteNumbers[i] = slice.charCodeAt(i) & 0xff;
                }
                byteArrays[n] = new Uint8Array(byteNumbers);
                n++;
            }
            return new Blob(byteArrays, {type: contentType});
        };
        var b64toBlob = function (b64Data, contentType) {
            contentType = contentType || '';
            var byteCharacters = atob(b64Data);
            return str2blob(byteCharacters, contentType, 256);
        };
        var arrayChksum = function (a) {
            var len = a.length;
            var c = 128;
            if (len < c) {
                c = len;
            }
            var step = Math.floor(len / c);
            var chk = new Array(len);
            for (var i = 0; i < c; i++) {
                chk[i] = [i * step];
            }
            return chk.join('');
        };
        var imageCheck = function (url, cb) {
            /*
             * Проверяет изображение на возможность прочтения
             * Изменяет размер обложки.
             */
            var img = new Image();
            img.onerror = function () {
                URL.revokeObjectURL(url);
                cb();
            };
            img.onload = function () {
                URL.revokeObjectURL(url);
                var MAXWidthHeight = 80 * 2;
                var r = MAXWidthHeight / Math.max(this.width, this.height),
                    w = Math.round(this.width * r),
                    h = Math.round(this.height * r),
                    c = document.createElement("canvas");
                c.width = w;
                c.height = h;
                c.getContext("2d").drawImage(this, 0, 0, w, h);
                var blob = b64toBlob(c.toDataURL('image/png', 1).split(',')[1], 'image/png');
                cb(blob);
            };
            img.src = url;
        };
        var checkCover = function (len, checksum) {
            /*
             * Проверяет наличие уже обложке в массиве обложек по некой checksum
             */
            var id;
            covers.forEach(function (item) {
                if (item.len === len && item.chk === checksum) {
                    id = item.id;
                    return 0;
                }
            });
            return id;
        };
        var addCover = function (len, bin, chk) {
            /*
             * Добавляет обложку в массив обложек.
             */
            var id = covers.length;
            covers.push({id: id, len: len, data: bin, chk: chk});
            return id;
        };
        var readImage = function (data, cb) {
            /*
             * data = Array || ArrayBuffer || Blob
             */
            var blob;
            if (data === undefined) {
                cb(undefined);
                return;
            }
            if (data.size === undefined) {
                if (data.buffer === undefined) {
                    //data is Array
                    data = new Uint8Array(data);
                }
                //data is Uint8Array
                var check_summ = arrayChksum(data);
                var o_b_len = data.length;
                var id = checkCover(o_b_len, check_summ);
                if (id !== undefined) {
                    cb(id);
                    return;
                }
                blob = new Blob([data], {type: 'image/jpeg'});
            } else {
                blob = data;
            }
            var url = URL.createObjectURL(blob);
            imageCheck(url, function (blob) {
                if (blob === undefined) {
                    cb(undefined);
                    return;
                }
                var url = URL.createObjectURL(blob);
                var cover_id = addCover(o_b_len, url, check_summ);
                cb(cover_id);
            });
        };
        var fileID3TagReader = function(track, params, id, cb) {
            /*
             if (window.time_log === undefined) {
             window.time_log = [];
             }
             var startDate = new Date().getTime();
             */
            if (track.file.isVideo) {
                cb(id);
                return;
            }
            ID3.loadTags(0, function () {
                /*
                 var endDate = new Date().getTime();
                 var raz = ((endDate - startDate) / 1000);
                 console.log("Time: " + raz + "s");
                 window.time_log.push(raz);
                 var sum = window.time_log.reduce(function(pv, cv) {
                 return pv + cv;
                 }, 0);
                 console.log('Среднее время: ', sum / window.time_log.length);
                 */
                var new_tags = ID3.getAllTags(0);
                ID3.clearAll();
                ['title', 'artist', 'album'].forEach(function (key) {
                    var item = new_tags[key];
                    if (item !== undefined) {
                        track.tags[key] = item;
                    }
                });
                if (new_tags.picture === undefined) {
                    cb(id);
                    return;
                }
                readImage(new_tags.picture.data, function (cover_id) {
                    if (cover_id !== undefined) {
                        track.tags.picture = cover_id;
                    }
                    cb(id);
                });
            }, params);
        };
        var fileTagReader = function (id, cb) {
            var track = engine.playlist.playlist[id];
            var file = track.blob || track.file;
            var params = {tags: ["artist", "title", "album", "picture"], file: file};
            if (options.hasGetMetadata && track.file.isVideo) {
                params.tags = ["picture"];
                chrome.mediaGalleries.getMetadata(file, {metadataType: 'all'}, function(metadata){
                    if (metadata.title !== undefined) {
                        track.tags.title = metadata.title;
                    }
                    if (metadata.artist !== undefined) {
                        track.tags.artist = metadata.artist;
                    }
                    if (metadata.album !== undefined) {
                        track.tags.album = metadata.artist;
                    }
                    if (metadata.duration !== undefined) {
                        track.duration = metadata.duration;
                    }
                    fileID3TagReader(track, params, id, cb);
                });
                return;
            }
            fileID3TagReader(track, params, id, cb);
        };
        var cloudTagReader = function (id, cb) {
            var track = engine.playlist.playlist[id];
            engine.cloud[track.cloud.type].read_tags(track, function (new_tags) {
                ['title', 'artist', 'album'].forEach(function (key) {
                    var item = new_tags[key];
                    if (item !== undefined) {
                        track.tags[key] = item;
                    }
                });
                if (new_tags.picture === undefined) {
                    cb(id);
                    return;
                }
                readImage(new_tags.picture.data, function (cover_id) {
                    if (cover_id !== undefined) {
                        track.tags.picture = cover_id;
                    }
                    cb(id);
                });
            });
        };
        var postTagReader = function (id, cb) {
            cb(id);
            if (settings.lastfm_info || settings.lastfm_cover) {
                e_tags.lfmTagReader(id);
            }
        };
        return {
            getCover : function (id) {
                return covers[id].data;
            },
            clearCovers: function () {
                covers = [];
            },
            tagReader : function (id, cb) {
                var loading_mode = function (id, track) {
                    track.state = "loading";
                    _send('playlist', function (window) {
                        window.playlist.updPlaylistItem(id, track);
                    });
                };
                var track = engine.playlist.playlist[id];
                if (track.tags === undefined) {
                    track.tags = {};
                }
                if (track.tags.reader_state === true) {
                    return;
                }
                track.tags.reader_state = true;
                if (track.cloud !== undefined) {
                    var config = track.cloud.tag_config;
                    if (config === undefined) {
                        if (engine.cloud[track.cloud.type].read_tags) {
                            config = 'cloud';
                        } else {
                            postTagReader(id, cb);
                            return;
                        }
                    }
                    if (config === 'blob') {
                        loading_mode(id, track);
                        fileTagReader(id, function (id) {
                            postTagReader(id, cb);
                        });
                    } else if (config === 'cloud') {
                        loading_mode(id, track);
                        cloudTagReader(id, function (id) {
                            postTagReader(id, cb);
                        });
                    }
                } else if (track.file.slice !== undefined) {
                    loading_mode(id, track);
                    fileTagReader(id, function (id) {
                        postTagReader(id, cb);
                    });
                }
            },
            getTagBody : function (id) {
                if (id === undefined) {
                    id = engine.player.current_id;
                }
                if (engine.playlist.playlist[id] === undefined) {
                    return {title: '3pm-player'};
                }
                var tags = engine.playlist.playlist[id].tags;
                if (tags === undefined) {
                    return {title: engine.playlist.playlist[id].file.name};
                }
                var title = "";
                var album = "";
                var artist = "";
                var artist_album = "";
                if (tags.title !== undefined && tags.title.length > 0) {
                    title = tags.title;
                } else {
                    title = engine.playlist.playlist[id].file.name;
                }
                if (tags.artist !== undefined && tags.artist.length > 0) {
                    artist = tags.artist;
                }
                if (tags.album !== undefined && tags.album.length > 0) {
                    album = tags.album;
                }
                if (album.length > 0 && artist.length > 0) {
                    artist_album = tags.artist + ' - ' + tags.album;
                } else if (artist.length > 0) {
                    artist_album = artist;
                } else if (album.length > 0) {
                    artist_album = album;
                }
                var data = {title: title};
                if (artist.length > 0) {
                    data.artist = artist;
                }
                if (artist.length > 0) {
                    data.album = album;
                }
                if (artist.length > 0) {
                    data.aa = artist_album;
                }
                if (tags.picture !== undefined) {
                    data.picture = tags.picture;
                }
                return data;
            },
            tagsLoaded : function (id, state) {
                // 1 - playlist only
                // 2 - player, lfm, viz
                // 3 - player, playlist, viz, notifi
                // other - all
                var tb;
                engine.playlist.playlist[id].state = "dune";
                var plist = function () {
                    _send('playlist', function (window) {
                        window.playlist.updPlaylistItem(id, engine.playlist.playlist[id]);
                    });
                };
                var plr = function () {
                    if (id !== engine.player.current_id) {
                        return;
                    }
                    view.setTags(tb);
                };
                var notifi = function () {
                    if (id !== engine.player.current_id) {
                        return;
                    }
                    if (settings.next_track_notification) {
                        engine.notification.update();
                    }
                };
                var viz = function () {
                    if (id !== engine.player.current_id) {
                        return;
                    }
                    _send('viz', function (window) {
                        window.viz.audio_state('track', tb);
                    });
                    _send('video', function (window) {
                        window.video.audio_state('track', tb);
                    });
                };
                var lfm = function () {
                    if (id !== engine.player.current_id) {
                        return;
                    }
                    if (settings.lastfm && tb.artist !== undefined && tb.album !== undefined) {
                        var audio = engine.player.getAudio();
                        engine.lastfm.updateNowPlaying(tb.artist, tb.title, tb.album, audio.duration);
                    }
                };
                if (state === 1) {
                    plist();
                    return;
                }
                tb = e_tags.getTagBody(id);
                if (state === 2) {
                    plr();
                    lfm();
                    viz();
                    return;
                } else if (state === 3) {
                    plr();
                    plist();
                    notifi();
                    viz();
                    return;
                }
                plr();
                plist();
                notifi();
                viz();
                lfm();
            },
            lfmTagReader: function (id) {
                var track = engine.playlist.playlist[id];
                if (track.lfm === undefined) {
                    track.lfm = {};
                }
                if (!settings.lastfm_info && !settings.lastfm_cover || track.lfm.lastfm) {
                    return;
                }
                var use_cache = engine.player.current_id !== id;
                if (use_cache) {
                    if (track.lfm.lastfm_cache) {
                        return;
                    } else {
                        track.lfm.lastfm_cache = true;
                    }
                } else {
                    track.lfm.lastfm = true;
                }
                if (track.tags === undefined
                    || track.tags.artist === undefined
                    || track.tags.title === undefined) {
                    return;
                }
                var no_cover = track.tags.picture !== undefined;
                engine.lastfm.getInfo(track.tags.artist, track.tags.title, track.tags.album, function (lfm_tags, blob) {
                    if (lfm_tags === undefined) {
                        return;
                    }
                    e_tags.lastfmTagReady(id, lfm_tags, blob, function (id) {
                        if (id === engine.player.current_id) {
                            e_tags.tagsLoaded(id, 3);
                        } else {
                            e_tags.tagsLoaded(id, 1);
                        }
                    });
                }, use_cache, no_cover);
            },
            lastfmTagReady : function (id, new_tags, blob, cb) {
                if (new_tags === undefined) {
                    return;
                }
                var track = engine.playlist.playlist[id];
                readImage(blob, function (cover_id) {
                    if (cover_id !== undefined) {
                        track.tags.picture = cover_id;
                    }
                    if (new_tags !== undefined) {
                        var changes_vk = false;
                        if (new_tags.artist !== undefined && track.tags.artist !== new_tags.artist) {
                            track.tags.artist = new_tags.artist;
                            changes_vk = true;
                        }
                        if (new_tags.album !== undefined && track.tags.album !== new_tags.album) {
                            track.tags.album = new_tags.album;
                        }
                        if (new_tags.title !== undefined && track.tags.title !== new_tags.title) {
                            track.tags.title = new_tags.title;
                            changes_vk = true;
                        }
                        if (changes_vk && settings.vk_tag_update && track.cloud !== undefined && track.cloud.type === 'vk' && track.cloud.from_lib === true) {
                            engine.cloud.vk.update_tags(track.cloud.owner_id, track.cloud.track_id, track.tags.artist, track.tags.title);
                        }
                    }
                    cb(id);
                });
            },
            readAllTags: function () {
                /*
                 var startDate = new Date().getTime();
                 */
                var thread = 0;
                var item_id = -1;
                var items = engine.playlist.playlist;
                var items_len = engine.playlist.playlist.length;
                var next_item = function () {
                    if (thread < 5) {
                        item_id++;
                        thread++;
                        if (item_id >= items_len) {
                            /*
                             var endDate = new Date().getTime();
                             console.log("Time: " + ((endDate - startDate) / 1000) + "s");
                             */
                            return;
                        }
                        var track = items[item_id];
                        if (track.tags !== undefined && track.tags.reader_state === true) {
                            thread--;
                            next_item();
                            return;
                        }
                        read_item(track);
                    }
                };
                var read_item = function (item) {
                    next_item();
                    e_tags.tagReader(item.id, function (id) {
                        e_tags.tagsLoaded(id, 1);
                        thread--;
                        next_item();
                    });
                };
                next_item();
            }
        };
    }();
    return e_tags;
};