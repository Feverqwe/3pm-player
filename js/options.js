var options = function () {
    var var_cache = {
        input_cache: {}
    };
    var dom_cache = {};
    var getImage = function (url, cb) {
        var xhr = new XMLHttpRequest();
        xhr.open("GET", url, true);
        xhr.responseType = "blob";
        xhr.onload = function () {
            cb(xhr.response);
        };
        xhr.onerror = function () {
            cb();
        };
        xhr.ontimeout = function () {
            cb();
        };
        xhr.timeout = 2000;
        xhr.send(null);
    };
    var writeInterfaceList = function(interfaceList) {
        var webui_interface = _settings.webui_interface || var_cache.def_settings.webui_interface.v;
        var port = _settings.webui_port || var_cache.def_settings.webui_port.v;
        var guiList = [];
        var list = [];
        interfaceList.forEach(function(item) {
            list.push(
                $('<option>', {value: item.name, text: item.name + ' ('+item.address+')', selected: webui_interface === item.name})
            );
            if ( (webui_interface === 'Any' || webui_interface === item.name) && item.name !== 'Any') {
                var dom_item;
                var url = 'http://' + item.address + ':' + port + '/';
                guiList.push(dom_item = $('<div>', {'class': 'item'}).append(
                    $('<div>', {'class': 'name', text: item.name}),
                    $('<a>', {'class': 'url', text: url, href: url, target: '_blank'})
                ));
                getImage('http://chart.apis.google.com/chart?cht=qr&chs=150x150&chl=' + encodeURIComponent(url) + '&chld=H|0', function(blob) {
                    if (blob === undefined) {
                        return;
                    }
                    dom_item.append(
                        $('<div>').append(
                            $('<img>', {src: URL.createObjectURL(blob)})
                        )
                    )
                });
            }
        });
        dom_cache.selectInterface.empty().append(list);
        dom_cache.qrList.empty().append(guiList);
    };
    var write_qrcodes = function () {
        var ipv6_disable = true;
        var interfaceList = [
            {name: 'Any', address: '0.0.0.0'}
        ];
        chrome.socket.getNetworkList(function (items) {
            items.forEach(function (item) {
                if (item.address.indexOf(':') !== -1) {
                    item.name += ' (IPv6)';
                    if (ipv6_disable) {
                        return 1;
                    }
                }
                interfaceList.push({name: item.name, address: item.address});
            });
            writeInterfaceList(interfaceList);
        });
    };
    var set_place_holder = function () {
        var settings = _settings;
        $.each(var_cache.def_settings, function (key, def_item) {
            var input;
            if (def_item.t === 'hidden') {
                return 1;
            }
            if (var_cache.input_cache[key] === undefined) {
                var_cache.input_cache[key] = $('input[name="' + key + '"]');
            }
            input = var_cache.input_cache[key];
            if (def_item.t === "text" || def_item.t === "number" || def_item.t === "password") {
                input.removeAttr("value");
                if (settings[key] !== undefined && settings[key] !== def_item.v) {
                    input.attr("value", settings[key]);
                }
                if (def_item.v !== undefined) {
                    input.attr("placeholder", def_item.v);
                }
            }
            if (def_item.t === "checkbox") {
                if (settings[key] !== undefined) {
                    input.prop('checked', settings[key]);
                } else {
                    input.prop('checked', def_item.v);
                }
            }
            if (def_item.t === "radio") {
                // settings[key] is only string!
                input.filter('[value="'+ (settings[key] || def_item.v) +'"]').prop('checked', true);
            }
        });
        write_qrcodes();
    };
    var saveAll = function () {
        var changes = {};
        $.each(var_cache.def_settings, function (key, def_item) {
            if (def_item.t === 'hidden') {
                return 1;
            }
            var val = undefined;
            var input = var_cache.input_cache[key];
            if (def_item.t === "text") {
                val = input.val();
                if (val.length === 0) {
                    val = def_item.v;
                }
            } else if (def_item.t === "password") {
                val = input.val();
            } else if (def_item.t === "checkbox") {
                val = input.prop('checked') ? 1 : 0;
            } else if (def_item.t === "number") {
                val = input.val();
                if (val.length === 0) {
                    val = def_item.v;
                }
                val = parseInt(val);
            } else if (def_item.t === "radio") {
                val = input.filter(':checked').val();
            } else {
                return 1;
            }
            if (val !== _settings[key]) {
                changes[key] = val;
            }
        });
        _send('player', function(window) {
            window.engine.settings.set(changes, function() {
                set_place_holder(_settings);
            });
        });
    };
    var optionsRender = function() {
        dom_cache.body.append(
            $('<div>', {'class': 'title'}).append(
                $('<h1>', {text: '3pm-player'})
            ),
            dom_cache.menu = $('<div>', {'class': 'menu'}).append(
                var_cache.activeTab = $('<a>', {'class': 'active', href: '#', text: chrome.i18n.getMessage('opt_Main') }).data('page', 'main'),
                $('<a>', {href: '#', text: chrome.i18n.getMessage('opt_Cloud') }).data('page', 'cloud'),
                $('<a>', {href: '#', text: chrome.i18n.getMessage('opt_WebUI') }).data('page', 'webui'),
                $('<a>', {href: '#', text: chrome.i18n.getMessage('opt_HotKeys') }).data('page', 'hotkeys'),
                dom_cache.btnSave = $('<a>', {'class': 'btnSave', href: '#', text: chrome.i18n.getMessage('opt_Save') })
            ),
            var_cache.activePage = $('<div>', {'class': 'page main active'}).append(
                $('<fieldset>').append(
                    $('<legend>', {text: chrome.i18n.getMessage('opt_Main') }),
                    $('<div>', {'class': 'optionList'}).append(
                        $('<div>').append(
                            $('<input>', {type: 'checkbox', name: 'notifi_enable'}),
                            $('<span>', {text: chrome.i18n.getMessage('opt_notifi_enable') })
                        ),
                        $('<div>').append(
                            $('<input>', {type: 'checkbox', name: 'notifi_btns'}),
                            $('<span>', {text: chrome.i18n.getMessage('opt_notifi_btns') })
                        ),
                        $('<div>').append(
                            $('<input>', {type: 'checkbox', name: 'extend_volume_scroll'}),
                            $('<span>', {text: chrome.i18n.getMessage('opt_extend_volume_scroll') })
                        ),
                        $('<div>').append(
                            $('<input>', {type: 'checkbox', name: 'is_winamp'}),
                            $('<span>', {text: chrome.i18n.getMessage('opt_is_winamp') })
                        ),
                        $('<div>').append(
                            $('<input>', {type: 'checkbox', name: 'lastfm_scrobble'}),
                            $('<span>', {text: chrome.i18n.getMessage('opt_lastfm_scrobble') })
                        ),
                        $('<div>').append(
                            $('<input>', {type: 'checkbox', name: 'lastfm_track_info'}),
                            $('<span>', {text: chrome.i18n.getMessage('opt_lastfm_track_info') })
                        ),
                        $('<div>').append(
                            $('<input>', {type: 'checkbox', name: 'lastfm_album_info'}),
                            $('<span>', {text: chrome.i18n.getMessage('opt_lastfm_album_info') })
                        ),
                        $('<div>').append(
                            $('<input>', {type: 'checkbox', name: 'pineble_playlist'}),
                            $('<span>', {text: chrome.i18n.getMessage('opt_pineble_playlist') })
                        )
                    ),
                    $('<div>', {'class': 'infoList'}).append(
                        $('<div>').html( chrome.i18n.getMessage('opt_info_global_hotkeys').replace('%/a%', '</a>').replace('%a%', '<a href="https://chrome.google.com/webstore/detail/anjdnenemcjillehagnffmblcpklapnn/" target="_blank">') )
                    )
                ),
                $('<fieldset>').append(
                    $('<legend>',{text: chrome.i18n.getMessage('opt_WinampViz') }),
                    $('<div>', {'class': 'optionList'}).append(
                        $('<div>').append(
                            $('<input>', {type: 'radio', name: 'visual_type', value: "0"}),
                            $('<span>', {text: chrome.i18n.getMessage('opt_winamp_vis_off') })
                        ),
                        $('<div>').append(
                            $('<input>', {type: 'radio', name: 'visual_type', value: "1"}),
                            $('<span>', {text: chrome.i18n.getMessage('opt_winamp_vis_spec') })
                        ),
                        $('<div>').append(
                            $('<input>', {type: 'radio', name: 'visual_type', value: "2"}),
                            $('<span>', {text: chrome.i18n.getMessage('opt_winamp_vis_osci') })
                        )
                    )
                )
            ),
            $('<div>', {'class': 'page webui'}).append(
                $('<fieldset>').append(
                    $('<legend>',{text: chrome.i18n.getMessage('opt_WebUI') }),
                    $('<div>', {'class': 'optionList'}).append(
                        $('<div>').append(
                            $('<span>', {text: chrome.i18n.getMessage('opt_webui_port') }),
                            $('<input>', {type: 'number', name: 'webui_port'})
                        ),
                        $('<div>').append(
                            $('<span>', {text: chrome.i18n.getMessage('opt_webui_interface') }),
                            dom_cache.selectInterface = $('<select>', {type: 'checkbox', name: 'select_webui_interface'}),
                            dom_cache.webui_interface = $('<input>', {type: 'hidden', name: 'webui_interface'})
                        ),
                        $('<div>').append(
                            $('<span>', {text: chrome.i18n.getMessage('opt_webui_run_onboot') }),
                            $('<input>', {type: 'checkbox', name: 'webui_run_onboot'})
                        )
                    ),
                    dom_cache.qrList = $('<div>', {'class': 'qrList'})
                )
            ),
            $('<div>', {'class': 'page hotkeys'}).append(
                $('<fieldset>').append(
                    $('<legend>',{text: chrome.i18n.getMessage('opt_HotKeys') }),
                    $('<div>', {'class': 'optionList'}).append(
                        $('<div>').append(
                            $('<span>', {'class': 'key', text: 'Space'}),
                            $('<span>', {text: chrome.i18n.getMessage('key_space') })
                        ),
                        $('<div>').append(
                            $('<span>', {'class': 'key', text: 'Tab'}),
                            $('<span>', {text: chrome.i18n.getMessage('key_tab') })
                        ),
                        $('<div>').append(
                            $('<span>', {'class': 'key', text: 'V'}),
                            $('<span>', {text: chrome.i18n.getMessage('key_v') })
                        ),
                        $('<div>').append(
                            $('<span>', {'class': 'key', text: 'S'}),
                            $('<span>', {text: chrome.i18n.getMessage('key_s') })
                        ),
                        $('<div>').append(
                            $('<span>', {'class': 'key', text: 'R'}),
                            $('<span>', {text: chrome.i18n.getMessage('key_r') })
                        ),
                        $('<div>').append(
                            $('<span>', {'class': 'key', text: 'N'}),
                            $('<span>', {text: chrome.i18n.getMessage('key_n') })
                        ),
                        $('<div>').append(
                            $('<span>', {'class': 'key', text: 'F1'}),
                            $('<span>', {text: chrome.i18n.getMessage('key_f1') })
                        ),
                        $('<div>').append(
                            $('<span>', {'class': 'key', text: 'F2'}),
                            $('<span>', {text: chrome.i18n.getMessage('key_f2') })
                        ),
                        $('<div>').append(
                            $('<span>', {'class': 'key', text: 'Ctrl+Up'}),
                            $('<span>', {text: chrome.i18n.getMessage('key_ctrl_up') })
                        ),
                        $('<div>').append(
                            $('<span>', {'class': 'key', text: 'Ctrl+Down'}),
                            $('<span>', {text: chrome.i18n.getMessage('key_ctrl_down') })
                        ),
                        $('<div>').append(
                            $('<span>', {'class': 'key', text: 'Ctrl+Left'}),
                            $('<span>', {text: chrome.i18n.getMessage('key_ctrl_left') })
                        ),
                        $('<div>').append(
                            $('<span>', {'class': 'key', text: 'Ctrl+Right'}),
                            $('<span>', {text: chrome.i18n.getMessage('key_ctrl_right') })
                        ),
                        $('<div>').append(
                            $('<span>', {'class': 'key', text: 'Ctrl+O'}),
                            $('<span>', {text: chrome.i18n.getMessage('key_ctrl_o') })
                        ),
                        $('<div>').append(
                            $('<span>', {'class': 'key', text: 'Ctrl+Shift+O'}),
                            $('<span>', {text: chrome.i18n.getMessage('key_ctrl_shift_o') })
                        ),
                        $('<div>').append(
                            $('<span>', {'class': 'key', text: 'Ctrl+Alt+O'}),
                            $('<span>', {text: chrome.i18n.getMessage('key_ctrl_alt_o') })
                        )
                    ),
                    $('<div>', {'class': 'infoList'}).append(
                        $('<div>').html( chrome.i18n.getMessage('opt_info_osx_ctrl') )
                    )
                )
            ),
            $('<div>', {'class': 'page cloud'}).append(
                $('<fieldset>').append(
                    $('<legend>', {text: 'VK.com'}),
                    $('<div>', {'class': 'optionList'}).append(
                        $('<div>').append(
                            $('<input>', {type: 'checkbox', name: 'vk_foreign_tracks'}),
                            $('<span>', {text: chrome.i18n.getMessage('opt_vk_foreign_tracks') })
                        ),
                        $('<div>').append(
                            $('<input>', {type: 'checkbox', name: 'vk_tag_update'}),
                            $('<span>', {text: chrome.i18n.getMessage('opt_vk_tag_update') })
                        )
                    )
                )
            ),
            $('<div>', {'class': 'bottom'}).append(
                $('<span>', {'class': 'author'}).append(
                    $('<a>', {href: 'mailto:leonardspbox@gmail.com', target: '_blank',
                        title: 'leonardspbox@gmail.com', text: 'Anton'}),
                    ', 2014'
                )
            ),
            dom_cache.btnTop = $('<div>', {'class': 'btnTop', title: 'Up!'})
        );
    };
    return {
        begin: function () {
            dom_cache.body = $(document.body);
            optionsRender();
            dom_cache.body_html = $('body,html');
            dom_cache.window = $(window);
            dom_cache.menu.on('click', 'a', function (e) {
                e.preventDefault();
                var $this = $(this);
                var page = $this.data('page');
                if (page === undefined) {
                    return;
                }
                var_cache.activeTab.removeClass('active');
                var_cache.activePage.removeClass('active');
                var_cache.activeTab = $this.addClass('active');
                var_cache.activePage = dom_cache.body.children('div.' + page).addClass('active');
            });
            dom_cache.btnSave.on('click', function (e) {
                e.preventDefault();
                saveAll();
            });
            dom_cache.window.scroll(function () {
                if ($(this).scrollTop() > 100) {
                    dom_cache.btnTop.fadeIn('fast');
                } else {
                    dom_cache.btnTop.fadeOut('fast');
                }
            });
            dom_cache.btnTop.on("click", function (event) {
                event.preventDefault();
                dom_cache.body_html.animate({
                    scrollTop: 0
                }, 200);
            });
            dom_cache.selectInterface.on('change', function() {
                dom_cache.webui_interface.val(this.value);
            });
            var_cache.def_settings = _config.def_settings;
            set_place_holder();
        }
    };
}();
$(function () {
    options.begin();
});