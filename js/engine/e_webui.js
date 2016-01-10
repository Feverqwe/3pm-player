engine.webui = function() {
    var active = false;
    var not_found = [];
    var cache = {};
    var debug = true;
    
    var stringToArrayBuffer = function(string) {
        var buffer = new ArrayBuffer(string.length);
        var bufferView = new Uint8Array(buffer);
        for (var i = 0; i < string.length; i++) {
            bufferView[i] = string.charCodeAt(i);
        }
        return buffer;
    };

    var arrayBufferToString = function(buffer) {
        var array = new Uint8Array(buffer);
        var str = '';
        for (var i = 0; i < array.length; ++i) {
            str += String.fromCharCode(array[i]);
        }
        return str;
    };

    var waitPlChange = function(id,cb) {
        //ждем изменения плэйлиста в течении 30 секунд, проверка каждые 500мс
        var counter = 60;
        var startTimer = function() {
            if (id !== engine.playlist.memory.collection.id) {
                setTimeout(function(){
                    counter--;
                    if (counter === 0) {
                        cb();
                        return;
                    }
                    startTimer();
                }, 500);
            } else {
                cb();
            }
        };
        startTimer();
    };
    var player_info = function() {
        var encode_name = function (title) {
            return window.btoa(encodeURIComponent(title));
        };
        var status = {};
        var media_el = engine.player.getMedia();
        status.paused = media_el.paused;
        status.loop = _settings.loop;
        status.shuffle = _settings.shuffle;
        if (engine.playlist.memory.collection !== undefined) {
            status.current_id = engine.playlist.memory.collection.track_id;
            status.playlist_info = {id:engine.playlist.memory.collection.id};
            status.playlist_count = engine.playlist.memory.collection.trackList.length;

            var track = engine.playlist.memory.collection.trackObj[status.current_id];
            var tags = engine.tags.readTags(track);
            status.title = encode_name(tags.title_artist_album);
        } else {
            status.current_id = undefined;
            status.playlist_info = {};
            status.playlist_count = undefined;
            status.title = undefined;
        }
        return status;
    };
    var api_player = function() {
        return JSON.stringify(player_info());
    };
    var api_playlist = function() {
        var trackList = [];
        if (engine.playlist.memory.collection !== undefined) {
            for (var i = 0, track; track = engine.playlist.memory.collection.trackList[i]; i++) {
                var tags = engine.tags.readTags(track);
                trackList.push({id: track.id, title: tags.title_artist_album});
            }
        }
        var collectionList = [];
        engine.playlist.memory.collectionList.forEach(function(collection) {
            collectionList.push({name: collection.title, id: collection.id});
        });
        var rez = player_info();
        rez.playlist = trackList;
        rez.playlists = collectionList;
        return window.btoa(encodeURIComponent(JSON.stringify(rez)));
    };
    var readUrl = function(headerMap, socketId) {
        if (headerMap.url === '/') {
            headerMap.url = '/index.html';
        } else
        if (headerMap.url === '/favicon.ico') {
            headerMap.url = '/../img/icon_16.png';
        } else
        if (headerMap.url === '/js/jquery-2.1.1.min.js') {
            headerMap.url = '/../js/jquery-2.1.1.min.js';
        }
        if (headerMap.url.substr(0, 5) === '/img/') {
            headerMap.url = '/..' + headerMap.url;
        }
        var is_xhr = false;
        if (not_found.indexOf(headerMap.url) >= 0) {
            return responseData(socketId, headerMap, '', ['404 Not Found']);
        } else
        if (cache[headerMap.url] !== undefined) {
            var data = cache[headerMap.url].data;
            if (headerMap["If-None-Match"] === String(data.byteLength)) {
                return responseData(socketId, headerMap, '', ["304 Not Modified"]);
            } else {
                var head = JSON.parse(JSON.stringify(cache[headerMap.url].head));
                return responseData(socketId, headerMap, data, head);
            }
        } else
        if (headerMap.url.substr(0, 4) === '/pl/') {
            var id = headerMap.url.substr(4);
            engine.playlist.selectTrack(id);
            return responseData(socketId, headerMap, api_player(), ['200 OK', 'Location: /', 'Cache-Control: no-cache', 'Content-Type: application/json']);
        } else
        if (headerMap.url.substr(0, 14) === '/set_playlist/') {
            var id = parseInt(headerMap.url.substr(14));
            engine.playlist.selectPlaylist(id);
            waitPlChange(id, function() {
                return responseData(socketId, headerMap, api_playlist(), ['200 OK', 'Location: /', 'Cache-Control: no-cache', 'Content-Type: : text/html']);
            });
            return;
        } else
        if (headerMap.url === '/playlist') {
            return responseData(socketId, headerMap, api_playlist(), ['200 OK', 'Location: /', 'Cache-Control: no-cache', 'Content-Type: : text/html']);
        } else
        if (headerMap.url === '/status') {
            return responseData(socketId, headerMap, api_player(), ['200 OK', 'Location: /', 'Cache-Control: no-cache', 'Content-Type: application/json']);
        } else
        if (headerMap.url === '/playToggle') {
            engine.player.playToggle();
            return responseData(socketId, headerMap, api_player(), ['200 OK', 'Location: /', 'Cache-Control: no-cache', 'Content-Type: application/json']);
        } else
        if (headerMap.url === '/readTags') {
            engine.tags.readTrackList();
            return responseData(socketId, headerMap, api_player(), ['200 OK', 'Location: /', 'Cache-Control: no-cache', 'Content-Type: application/json']);
        } else
        if (headerMap.url === '/play') {
            engine.player.play();
            return responseData(socketId, headerMap, api_player(), ['200 OK', 'Location: /', 'Cache-Control: no-cache', 'Content-Type: application/json']);
        } else
        if (headerMap.url === '/pause') {
            engine.player.pause();
            return responseData(socketId, headerMap, api_player(), ['200 OK', 'Location: /', 'Cache-Control: no-cache', 'Content-Type: application/json']);
        } else
        if (headerMap.url === '/next') {
            engine.playlist.nextTrack();
            return responseData(socketId, headerMap, api_player(), ['200 OK', 'Location: /', 'Cache-Control: no-cache', 'Content-Type: application/json']);
        } else
        if (headerMap.url === '/preview') {
            engine.playlist.previousTrack();
            return responseData(socketId, headerMap, api_player(), ['200 OK', 'Location: /', 'Cache-Control: no-cache', 'Content-Type: application/json']);
        } else
        if (headerMap.url.substr(0, 11) === '/volume_up/') {
            engine.player.volume(headerMap.url.substr(11));
            return responseData(socketId, headerMap, api_player(), ['200 OK', 'Location: /', 'Cache-Control: no-cache', 'Content-Type: application/json']);
        } else
        if (headerMap.url.substr(0, 13) === '/volume_down/') {
            engine.player.volume(headerMap.url.substr(13));
            return responseData(socketId, headerMap, api_player(), ['200 OK', 'Location: /', 'Cache-Control: no-cache', 'Content-Type: application/json']);
        } else
        if (headerMap.url.substr(0, 9) === '/next_up/') {
            engine.player.position(headerMap.url.substr(9));
            return responseData(socketId, headerMap, api_player(), ['200 OK', 'Location: /', 'Cache-Control: no-cache', 'Content-Type: application/json']);
        } else
        if (headerMap.url.substr(0, 11) === '/prew_down/') {
            engine.player.position(headerMap.url.substr(11));
            return responseData(socketId, headerMap, api_player(), ['200 OK', 'Location: /', 'Cache-Control: no-cache', 'Content-Type: application/json']);
        } else
        if (headerMap.url === '/shuffle') {
            engine.playlist.setShuffle();
            return responseData(socketId, headerMap, api_player(), ['200 OK', 'Location: /', 'Cache-Control: no-cache', 'Content-Type: application/json']);
        } else
        if (headerMap.url === '/loop') {
            engine.playlist.setLoop();
            return responseData(socketId, headerMap, api_player(), ['200 OK', 'Location: /', 'Cache-Control: no-cache', 'Content-Type: application/json']);
        } else {
            is_xhr = true;
            var ext = headerMap.url.substr(headerMap.url.lastIndexOf('.') + 1).toLowerCase();
            var ext_content_type = {
                'png': 'image/png',
                'js': 'application/javascript',
                'css': 'text/css',
                'html': 'text/html; charset=UTF-8'
            };
            ext = (ext_content_type[ext] !== undefined) ? 'Content-Type: ' + ext_content_type[ext] : '';
            var xhr = new XMLHttpRequest();
            xhr.open('GET', '/www' + headerMap.url, true);
            xhr.responseType = 'arraybuffer';
            xhr.onload = function() {
                var resp = this.response;
                var header = ["200 Ok"];
                if (ext.length > 0) {
                    header.push(ext);
                }
                header.push("Cache-control: max-age=172800");
                header.push("ETag: " + resp.byteLength);
                cache[headerMap.url] = {data: resp, head: JSON.parse(JSON.stringify(header))};
                if (headerMap["If-None-Match"] === String(resp.byteLength)) {
                    responseData(socketId, headerMap, '', ["304 Not Modified"]);
                } else {
                    responseData(socketId, headerMap, resp, header);
                }
            };
            xhr.onerror = function() {
                not_found.push(headerMap.url);
                responseData(socketId, headerMap, '', ['404 Not Found']);
            };
            xhr.ontimeout = function() {
                responseData(socketId, headerMap, '', ['404 Not Found']);
            };
            xhr.timeout = 500;
            xhr.send(null);
        }
        if (is_xhr === false) {
            responseData(socketId, headerMap, 'Do it more!', ['200 OK']);
        }
    };

    var responseData = function(socketId, headerMap, content, headers) {
        var head, header, header_ab;

        if (headers[0].substr(0, 3) === "304") {
            head = "HTTP/1.1 " + headers.join('\n');
            header = head + '\n\n';
            header_ab = stringToArrayBuffer(header);

            return send('tcp', socketId, header_ab).then(function(sendInfo) {
                debug && console.debug(sendInfo);
            });
        }

        var content_ab = content;
        if (typeof content === 'string') {
            content_ab = stringToArrayBuffer(content);
        }

        headers.push("Content-Length: " + content_ab.byteLength);
        headers.push("Connection: keep-alive");

        head = "HTTP/1.1 " + headers.join('\n');
        header = head + '\n\n';
        header_ab = stringToArrayBuffer(header);

        var packege_ab = new ArrayBuffer(content_ab.byteLength + header_ab.byteLength);
        var packege = new Uint8Array(packege_ab);
        packege.set(new Uint8Array(header_ab));
        packege.set(new Uint8Array(content_ab), header_ab.byteLength);

        return send('tcp', socketId, packege_ab).then(function(sendInfo) {
            debug && console.debug(sendInfo);
        });
    };

    var readData = function(info) {
        var requestData = arrayBufferToString(info.data).replace(/\r\n/g, '\n');
        var endIndex = requestData.indexOf('\n\n', endIndex);
        if (endIndex === -1) {
            return;
        }
        var headers = requestData.substring(0, endIndex).split('\n');
        var headerMap = {};
        var requestLine = headers[0].split(' ');
        headerMap['method'] = requestLine[0];
        headerMap['url'] = requestLine[1];
        headerMap['Http-Version'] = requestLine[2];
        for (var i = 1; i < headers.length; i++) {
            requestLine = headers[i].split(':', 2);
            if (requestLine.length === 2) {
                headerMap[requestLine[0]] = requestLine[1].trim();
            }
        }
        if (headerMap.url === undefined) {
            return responseData(info.socketId, headerMap, "Don't have url!", ['404 Not Found']);
        } else {
            readUrl(headerMap, info.socketId);
        }
    };

    var getSockets = function(type) {
        return new Promise(function(resolve) {
            chrome.sockets[type].getSockets(resolve);
        });
    };

    var disconnect = function(type, socketId) {
        return new Promise(function(resolve) {
            chrome.sockets[type].disconnect(socketId, resolve);
        });
    };

    var close = function(type, socketId) {
        return new Promise(function(resolve) {
            chrome.sockets[type].close(socketId, resolve);
        });
    };

    var create = function(type, properties) {
        return new Promise(function(resolve) {
            chrome.sockets[type].create(properties, resolve);
        });
    };

    var listen = function(socketId, address, port) {
        return new Promise(function(resolve, reject) {
            chrome.sockets.tcpServer.listen(socketId, address, port, function(result) {
                if (result < 0) {
                    return reject(result);
                }
                resolve(result);
            });
        });
    };

    var setKeepAlive = function(type, socketId, enable, delay) {
        return new Promise(function(resolve, reject) {
            chrome.sockets[type].setKeepAlive(socketId, enable, delay, function(result) {
                if (result < 0) {
                    return reject(result);
                }
                resolve(result);
            });
        });
    };

    var setPause = function(type, socketId, state) {
        return new Promise(function(resolve) {
            chrome.sockets[type].setPaused(socketId, state, resolve);
        });
    };

    var send = function(type, socketId, data) {
        return new Promise(function(resolve, reject) {
            chrome.sockets[type].send(socketId, data, function(sendInfo) {
                if (sendInfo.resultCode < 0) {
                    return reject(sendInfo);
                }
                resolve(sendInfo);
            });
        });
    };

    var onReceive = function(info) {
        debug && console.debug('onReceive', info);
        setKeepAlive('tcp', info.socketId, true, 15).then(function() {
            debug && console.debug('setKeepAlive', info.socketId);
            readData(info);
        });
    };

    var onReceiveError = function(info) {
        console.error('onReceiveError', info);
    };

    var stop = function() {
        var promiseList = ['tcp', 'tcpServer'].map(function(type) {
            return getSockets(type).then(function(socketInfoList) {
                var promiseList = socketInfoList.map(function(socketInfo) {
                    var promise = Promise.resolve();

                    if (socketInfo.connected) {
                        promise = promise.then(function() {
                            return disconnect(type, socketInfo.socketId).then(function() {
                                debug && console.debug('Socket', type, 'disconnected', socketInfo.socketId);
                            });
                        });
                    }

                    promise = promise.then(function() {
                        return close(type, socketInfo.socketId).then(function() {
                            debug && console.debug('Socket', type, 'closed', socketInfo.socketId);
                        });
                    });

                    return promise;
                });
                return Promise.all(promiseList);
            });
        });

        return Promise.all(promiseList).then(function() {
            debug && console.debug('Stop!');
        });
    };

    var start = function() {
        return stop().then(function() {
            return create('tcpServer', {
                name: '3pm-server-socket'
            }).then(function(createInfo) {
                debug && console.debug('Create socket', createInfo);
                return listen(createInfo.socketId, '0.0.0.0', _settings.webui_port).then(function(result) {
                    debug && console.debug('Listen', 'result:', result);
                });
            });
        }).then(function() {
            debug && console.debug('Start!');
        });
    };

    chrome.sockets.tcpServer.onAcceptError.addListener(function(info) {
        console.error('onAcceptError', info);
    });

    chrome.sockets.tcpServer.onAccept.addListener(function(info) {
        debug && console.debug('onAccept', info);

        setPause('tcp', info.clientSocketId, false);
    });

    chrome.sockets.tcp.onReceive.addListener(onReceive);

    chrome.sockets.tcp.onReceiveError.addListener(onReceiveError);

    return {
        start: function(cb) {
            start().then(function() {
                active = true;
                engine.context.update("webUI", {checked: active});
                cb && cb();
            });
        },
        stop: function(cb) {
            stop().then(function() {
                active = false;
                engine.context.update("webUI", {checked: active});
                cb && cb();
            });
        },
        active: function() {
            return active;
        }
    };
}();