var engine_webui = function(mySettings, myEngine) {
    window.engine_webui = undefined;
    var settings = mySettings;
    var engine = myEngine;
    chrome.runtime.onMessage.addListener(function(msg) {
        if (msg === 'settings_ready') {
            if (settings.webui_run_onboot) {
                e_webui.start();
            }
        }
    });
    var e_webui = function() {
        var active = false;
        var not_found = [];
        var cache = {};
        var server_socketId;
        var reset_timeout = null;
        var socket_list = [];
        var socket_close = function(socketId) {
            if (socketId === undefined) {
                return;
            }
            /**
             * @namespace chrome.socket
             */
            chrome.socket.disconnect(socketId);
            chrome.socket.destroy(socketId);
            var index = socket_list.indexOf(socketId);
            if (index >= 0) {
                socket_list.splice(index, 1);
            }
        };
        var socket_open = function(socketId) {
            if (socketId === undefined) {
                return;
            }
            socket_list.push(socketId);
        };
        var socket_killall = function() {
            socket_list.forEach(function(socketId) {
                chrome.socket.disconnect(socketId);
                chrome.socket.destroy(socketId);
            });
            socket_list = [];
        };
        var reset_server_socket = function() {
            clearTimeout(reset_timeout);
            if (!active) {
                return;
            }
            reset_timeout = setTimeout(function() {
                kill_server_socket();
                start();
            }, 5000);
        };
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
                if (id !== engine.playlist.playlist_info.id) {
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
        var readUrl = function(headerMap, socketId) {
            if (headerMap.url === '/') {
                headerMap.url = '/index.html';
            } else
            if (headerMap.url === '/favicon.ico') {
                headerMap.url = '/../icon_16.png';
            } else
            if (headerMap.url === '/js/jquery-2.0.3.min.js') {
                headerMap.url = '/../scripts/jquery-2.0.3.min.js';
            }
            if (headerMap.url.substr(0, 8) === '/images/') {
                headerMap.url = '/..' + headerMap.url;
            }
            var is_xhr = false;
            if (not_found.indexOf(headerMap.url) >= 0) {
                return response_(socketId, headerMap, '', ['404 Not Found']);
            } else
            if (cache[headerMap.url] !== undefined) {
                var data = cache[headerMap.url].data;
                if (headerMap["If-None-Match"] === String(data.byteLength)) {
                    return response_(socketId, headerMap, '', ["304 Not Modified"]);
                } else {
                    var head = JSON.parse(JSON.stringify(cache[headerMap.url].head));
                    return response_(socketId, headerMap, data, head);
                }
            } else
            if (headerMap.url.substr(0, 4) === '/pl/') {
                var id = headerMap.url.substr(4);
                engine.player.open(id);
                return response_(socketId, headerMap, engine.APIstatus(), ['200 OK', 'Location: /', 'Cache-Control: no-cache', 'Content-Type: application/json']);
            } else
            if (headerMap.url.substr(0, 14) === '/set_playlist/') {
                var id = parseInt(headerMap.url.substr(14));
                engine.playlist.selectPlaylist(id);
                waitPlChange(id, function() {
                    return response_(socketId, headerMap, engine.playlist.APIplaylist(), ['200 OK', 'Location: /', 'Cache-Control: no-cache', 'Content-Type: : text/html']);
                });
                return;
            } else
            if (headerMap.url === '/playlist') {
                return response_(socketId, headerMap, engine.playlist.APIplaylist(), ['200 OK', 'Location: /', 'Cache-Control: no-cache', 'Content-Type: : text/html']);
            } else
            if (headerMap.url === '/status') {
                return response_(socketId, headerMap, engine.APIstatus(), ['200 OK', 'Location: /', 'Cache-Control: no-cache', 'Content-Type: application/json']);
            } else
            if (headerMap.url === '/playToggle') {
                engine.player.playToggle();
                return response_(socketId, headerMap, engine.APIstatus(), ['200 OK', 'Location: /', 'Cache-Control: no-cache', 'Content-Type: application/json']);
            } else
            if (headerMap.url === '/readTags') {
                engine.tags.readAllTags();
                return response_(socketId, headerMap, engine.APIstatus(), ['200 OK', 'Location: /', 'Cache-Control: no-cache', 'Content-Type: application/json']);
            } else
            if (headerMap.url === '/play') {
                engine.player.play();
                return response_(socketId, headerMap, engine.APIstatus(), ['200 OK', 'Location: /', 'Cache-Control: no-cache', 'Content-Type: application/json']);
            } else
            if (headerMap.url === '/pause') {
                engine.player.pause();
                return response_(socketId, headerMap, engine.APIstatus(), ['200 OK', 'Location: /', 'Cache-Control: no-cache', 'Content-Type: application/json']);
            } else
            if (headerMap.url === '/next') {
                engine.playlist.next();
                return response_(socketId, headerMap, engine.APIstatus(), ['200 OK', 'Location: /', 'Cache-Control: no-cache', 'Content-Type: application/json']);
            } else
            if (headerMap.url === '/preview') {
                engine.playlist.preview();
                return response_(socketId, headerMap, engine.APIstatus(), ['200 OK', 'Location: /', 'Cache-Control: no-cache', 'Content-Type: application/json']);
            } else
            if (headerMap.url.substr(0, 11) === '/volume_up/') {
                engine.player.volume(headerMap.url.substr(11));
                return response_(socketId, headerMap, engine.APIstatus(), ['200 OK', 'Location: /', 'Cache-Control: no-cache', 'Content-Type: application/json']);
            } else
            if (headerMap.url.substr(0, 13) === '/volume_down/') {
                engine.player.volume(headerMap.url.substr(13));
                return response_(socketId, headerMap, engine.APIstatus(), ['200 OK', 'Location: /', 'Cache-Control: no-cache', 'Content-Type: application/json']);
            } else
            if (headerMap.url.substr(0, 9) === '/next_up/') {
                engine.player.position(headerMap.url.substr(9));
                return response_(socketId, headerMap, engine.APIstatus(), ['200 OK', 'Location: /', 'Cache-Control: no-cache', 'Content-Type: application/json']);
            } else
            if (headerMap.url.substr(0, 11) === '/prew_down/') {
                engine.player.position(headerMap.url.substr(11));
                return response_(socketId, headerMap, engine.APIstatus(), ['200 OK', 'Location: /', 'Cache-Control: no-cache', 'Content-Type: application/json']);
            } else
            if (headerMap.url === '/shuffle') {
                engine.playlist.setShuffle();
                return response_(socketId, headerMap, engine.APIstatus(), ['200 OK', 'Location: /', 'Cache-Control: no-cache', 'Content-Type: application/json']);
            } else
            if (headerMap.url === '/loop') {
                engine.playlist.setLoop();
                return response_(socketId, headerMap, engine.APIstatus(), ['200 OK', 'Location: /', 'Cache-Control: no-cache', 'Content-Type: application/json']);
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
                        response_(socketId, headerMap, '', ["304 Not Modified"]);
                    } else {
                        response_(socketId, headerMap, resp, header);
                    }
                };
                xhr.onerror = function() {
                    not_found.push(headerMap.url);
                    response_(socketId, headerMap, '', ['404 Not Found']);
                };
                xhr.ontimeout = function() {
                    response_(socketId, headerMap, '', ['404 Not Found']);
                };
                xhr.timeout = 500;
                xhr.send(null);
            }
            if (is_xhr === false) {
                response_(socketId, headerMap, 'Do it more!', ['200 OK']);
            }
        };
        var response_ = function(socketId, headerMap, content, headers) {
            var isKeepAlive = (headerMap['Connection'] === 'keep-alive');
            if (headers[0].substr(0, 3) === "304") {
                var head = "HTTP/1.1 " + headers.join('\n');
                var header = head + '\n\n';
                var header_ab = stringToArrayBuffer(header);
                var header_ab_len = header_ab.byteLength;
                /**
                 * @namespace chrome.socket.write
                 */
                chrome.socket.write(socketId, header_ab, function(writeInfo) {
                    /**
                     * @namespace writeInfo.bytesWritten
                     */
                    if (writeInfo.bytesWritten === header_ab_len) {
                        if (isKeepAlive) {
                            reset_server_socket();
                            readRequestFromSocket_(socketId);
                        } else {
                            socket_close(socketId);
                        }
                    }
                });
                return;
            }
            var content_ab;
            if (typeof content === 'string') {
                content_ab = stringToArrayBuffer(content);
            } else {
                content_ab = content;
            }
            headers.push("Content-Length: " + content_ab.byteLength);
            headers.push("Connection: keep-alive");
            var head = "HTTP/1.1 " + headers.join('\n');
            var header = head + '\n\n';
            var header_ab = stringToArrayBuffer(header);
            var packege_ab = new ArrayBuffer(content_ab.byteLength + header_ab.byteLength);
            var packege = new Uint8Array(packege_ab);
            packege.set(new Uint8Array(header_ab));
            packege.set(new Uint8Array(content_ab), header_ab.byteLength);
            var packege_ab_len = packege_ab.byteLength;
            chrome.socket.write(socketId, packege_ab, function(writeInfo) {
                if (writeInfo.bytesWritten === packege_ab_len) {
                    if (isKeepAlive) {
                        reset_server_socket();
                        readRequestFromSocket_(socketId);
                    } else {
                        socket_close(socketId);
                    }
                }
            });
        };
        var readRequestFromSocket_ = function(socketId) {
            var requestData = '';
            var endIndex = 0;
            var onDataRead = function(readInfo) {
                /**
                 * @namespace readInfo.resultCode
                 */
                if (readInfo.resultCode <= 0) {
                    socket_close(socketId);
                    reset_server_socket();
                    return;
                }
                reset_server_socket();
                requestData += arrayBufferToString(readInfo.data).replace(/\r\n/g, '\n');
                endIndex = requestData.indexOf('\n\n', endIndex);
                if (endIndex === -1) {
                    endIndex = requestData.length - 1;
                    /**
                     * @namespace chrome.socket.read
                     */
                    chrome.socket.read(socketId, onDataRead);
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
                    if (requestLine.length === 2)
                        headerMap[requestLine[0]] = requestLine[1].trim();
                }
                if (headerMap.url === undefined) {
                    return response_(socketId, headerMap, "Don't have url!", ['404 Not Found']);
                }
                readUrl(headerMap, socketId);
            };
            /**
             * @namesace chrome.socket.read
             */
            chrome.socket.read(socketId, onDataRead);
        };
        var onConnection_ = function(acceptInfo) {
            /**
             * @namespace acceptInfo.socketId
             */
            socket_open(acceptInfo.socketId);
            readRequestFromSocket_(acceptInfo.socketId);
        };
        var acceptConnection_ = function(socketId) {
            chrome.socket.accept(socketId, function(acceptInfo) {
                if (acceptInfo.socketId === undefined) {
                    e_webui.stop();
                    return;
                }
                /**
                 * @namespace chrome.socket.setKeepAlive
                 */
                chrome.socket.setKeepAlive(acceptInfo.socketId, true, 5, function(e) {
                    if (e) {
                        onConnection_(acceptInfo);
                    }
                });
                acceptConnection_(socketId);
            });
        };
        var kill_server_socket = function() {
            clearTimeout(reset_timeout);
            if (server_socketId === undefined) {
                return;
            }
            chrome.socket.disconnect(server_socketId);
            chrome.socket.destroy(server_socketId);
            server_socketId = undefined;
        };
        var stop = function(cb) {
            kill_server_socket();
            socket_killall();
            active = false;
            if (cb !== undefined) {
                cb();
            }
        };
        var start = function(cb) {
            if (server_socketId !== undefined) {
                stop();
            }
            chrome.socket.create("tcp", function(createInfo) {
                active = true;
                if (cb !== undefined) {
                    cb();
                }
                server_socketId = createInfo.socketId;
                chrome.storage.local.set({wabui_socket: server_socketId});
                try {
                    /**
                     * @namespace chrome.socket.getNetworkList
                     */
                    chrome.socket.getNetworkList(function(items) {
                        var addr;
                        var n = 0;
                        items.forEach(function(item) {
                            /**
                             * @namespace item.address
                             */
                            if (item.address.indexOf(':') !== -1) {
                                item.name += ' (IPv6)';
                            }
                            if (settings.webui_interface === item.name) {
                                addr = item.address;
                                n++;
                            }
                        });
                        if (n > 1 || n === 0) {
                            addr = '0.0.0.0';
                        }
                        chrome.socket.listen(server_socketId, addr, settings.webui_port, function() {
                            acceptConnection_(server_socketId);
                        });
                    });
                } catch (e) {
                    stop(cb);
                }
            });
        };
        var Info = function() {
            chrome.socket.getInfo(server_socketId, function(e) {
                console.log(e);
            });
        };
        return {
            start: function() {
                chrome.storage.local.get('wabui_socket', function(obj) {
                    if (obj.wabui_socket !== undefined) {
                        chrome.socket.disconnect(obj.wabui_socket);
                        chrome.socket.destroy(obj.wabui_socket);
                        chrome.storage.local.remove('wabui_socket');
                    }
                    start(function() {
                        chrome.contextMenus.update("webUI", {checked: active});
                    });
                });
            },
            info: Info,
            stop: function() {
                stop(function() {
                    chrome.contextMenus.update("webUI", {checked: active});
                });
            },
            active: function() {
                return active;
            }
        };
    }();
    return e_webui;
};