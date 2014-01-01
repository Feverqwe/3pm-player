/**
 follow me on twitter : https://twitter.com/_vor
 */

if (window.reality === undefined) {
    window.reality = {};
}
(function($) {
    reality = $.extend(true, {debug: true, isDev: false,
        frames: 0,
        dim: {width: window.innerWidth, height: window.innerHeight},
        center: {x: window.innerWidth / 2, y: window.innerHeight / 2},
        cursor: {x: 0, y: 0},
        mouse: {x: 0, y: 0},
        items: [],
        $document: $(document),
        $window: $(window),
        $body: $('body'),
        $fake: $(1),
        $item: $('span#item'),
        $progress: $('span#progress'),
        $total: $('span#total'),
        toLoad: ['code'],
        loaded: [],
        defaults: {},
        cameraSpeed: .05,
        sampleRate: 44100,
        sampleSize: 2048,
        lib: {moves: {}, populates: {}, entities: {}},
        timing: {load: new Date().getTime(),
            finish: function(name, from) {
                if (this[from])
                {
                    var time = new Date().getTime() - this[from];
                    reality.debug && console.info(name + ':' + time + ' ms');
                    reality.$document.trigger('timing', [name, time]);
                }
            }}, scenes: [{time: 4000, fn: function() {
                }}, {time: 18000, fn: function() {
                }}, {time: 30000, fn: function() {
                }}], free: false, helpers: {},
        cameraMove: function() {
            this.camera.position.x += (this.mouse.x - this.camera.position.x) * reality.cameraSpeed;
            this.camera.position.y += Math.floor(-this.mouse.y - this.camera.position.y) * reality.cameraSpeed;
        }, init: function()
        {
            this.$document.bind('try', function(e, type)
            {
                var typeAt = reality.toLoad.indexOf(type), loaded = [], total = [], $node = $('<div></div>'), length = 0, i = 0;
                if (typeAt === -1) {
                    console.warn('INEXISTANT ITEM !!! : ' + type);
                    return;
                }
                loaded = reality.toLoad.splice(typeAt, 1);
                reality.loaded.push(loaded[0]);
                $.merge(total, reality.toLoad);
                $.merge(total, reality.loaded);
                total.sort();
                length = total.length;
                for (i = 0; i < length; ++i)
                {
                    $node.append($('<div>').html(total[i].substr(0, 25)).append($('<span>').html(reality.loaded.indexOf(total[i]) !== -1 ? 'loaded' : 'loading').addClass(reality.loaded.indexOf(total[i]) !== -1 ? 'loaded' : 'loading')));
                }
                reality.$item.html($node);
                reality.$progress.html(length - reality.toLoad.length);
                reality.$total.html(length);
                reality.toLoad.length === 0 && reality.$document.trigger('go');
            }).trigger('try', 'code');
            this.container = $('<div>').addClass('main')[0];
            document.body.appendChild(this.container);
            this.scene = new THREE.Scene();
            this.camera = new THREE.PerspectiveCamera(80, this.dim.width / this.dim.height, 1, 20000);
            this.camera.position.set(-270, -350, 320);
            this.scene.add(this.camera);
            for (var m = this.items.length, i = 0; i < m; ++i)
            {
                this.scene.add(this.items[i].particuleSystem);
            }
            this.renderer = new THREE.WebGLRenderer({preserveDrawingBuffer: true});
            this.renderer.setSize(this.dim.width, this.dim.height);
            this.renderer.sortObjects = false;
            this.renderer.autoClearColor = true;
            var lastResize = 0;
            window.addEventListener('resize', function()
            {
                clearTimeout(lastResize);
                lastResize = setTimeout(function()
                {
                    reality.center = {x: window.innerWidth / 2, y: window.innerHeight / 2};
                    reality.dim = {width: window.innerWidth, height: window.innerHeight};
                    reality.camera.aspect = reality.dim.width / reality.dim.height;
                    reality.camera.updateProjectionMatrix();
                    reality.renderer.setSize(reality.dim.width, reality.dim.height);
                    reality.$document.trigger('resized');
                }, 250);
            }, false);
            this.container.appendChild(this.renderer.domElement);
            Dancer.sampleRate = this.sampleRate;
            Dancer.sampleSize = this.sampleSize;
        }, loadMusic: function(src)
        {
            if (src === undefined) {
                return;
            }
            if (this.music === undefined) {
                this.music = new Dancer();
            }
            if (this.music.isLoaded()) {
                return;
            }
            reality.music.audioAdapter.context && (this.webkitAudiorRecyclableContext = reality.music.audioAdapter.context);
            this.music.spectrum = [];
            this.music.bind('error', function()
            {
                reality.toLoad.indexOf('music') !== -1 && reality.$document.trigger('try', ['music']);
            });
            this.music.bind('loaded', function()
            {
                if ("dancerInit" in viz) {
                    viz.dancerInit(true);
                }
                reality.music.mag = 0;
                reality.toLoad.indexOf('music') !== -1 && reality.$document.trigger('try', ['music']);
                reality.music.kick = reality.music.createKick({threshold: .2, onKick: function(mag) {
                        reality.music.mag = mag;
                        var fromStart = new Date().getTime() - reality.timing.load;
                        if (typeof reality.scenes[0] === 'object' && reality.scenes[0].time <= fromStart)
                        {
                            var scene = reality.scenes.shift();
                            scene.fn.call(scene, reality, fromStart);
                        }
                    }, offKick: function(mag) {
                        reality.music.mag = mag;
                    }});
                reality.music.kick.on();
                reality.$document.trigger('musicChange');
            });
            this.music.load(src);

        }, render: function()
        {
            var s = performance.now(), i = 0, m = this.items.length;
            ++this.frames;
            if (reality.music && reality.music.isPlaying())
            {
                this.music.spectrum = this.music.getSpectrum();
                for (; i < m; ++i)
                {
                    this.items[i].move();
                }
                reality.camera.position.x -= this.items[0].options.controls.camera.positionIncr.x + (this.items[0].options.controls.autoTraveler ? fluent.util.wavef(reality.frames, this.items[0].options.controls.camera.traveler.freq.x, this.items[0].options.controls.camera.traveler.phase.x, this.items[0].options.controls.camera.traveler.width.x, this.items[0].options.controls.camera.traveler.center.x) : 0);
                reality.camera.position.y -= this.items[0].options.controls.camera.positionIncr.y + (this.items[0].options.controls.autoTraveler ? fluent.util.wavef(reality.frames, this.items[0].options.controls.camera.traveler.freq.y, this.items[0].options.controls.camera.traveler.phase.y, this.items[0].options.controls.camera.traveler.width.y, this.items[0].options.controls.camera.traveler.center.y) : 0);
                reality.camera.position.z -= this.items[0].options.controls.camera.positionIncr.z + (this.items[0].options.controls.autoTraveler ? fluent.util.wavefc(reality.frames, this.items[0].options.controls.camera.traveler.freq.z, this.items[0].options.controls.camera.traveler.phase.z, this.items[0].options.controls.camera.traveler.width.z, this.items[0].options.controls.camera.traveler.center.z) : 0);
            }
            this.free && this.cameraMove();
            this.camera.lookAt(this.scene.position);
            this.renderer.render(this.scene, this.camera);
        }, animate: function()
        {
            requestAnimationFrame(reality.animate);
            reality.render();
        }}, reality);
}(jQuery));
(function($) {
    "use strict";
    var k = {}, max = Math.max, min = Math.min;
    k.c = {};
    k.c.d = $(document);
    k.c.t = function(e) {
        return e.originalEvent.touches.length - 1;
    };
    k.o = function() {
        var s = this;
        this.o = null;
        this.$ = null;
        this.i = null;
        this.g = null;
        this.v = null;
        this.cv = null;
        this.x = 0;
        this.y = 0;
        this.mx = 0;
        this.my = 0;
        this.$c = null;
        this.c = null;
        this.t = 0;
        this.isInit = false;
        this.fgColor = null;
        this.pColor = null;
        this.sH = null;
        this.dH = null;
        this.cH = null;
        this.eH = null;
        this.rH = null;
        this.run = function() {
            var cf = function(e, conf) {
                var k;
                for (k in conf) {
                    s.o[k] = conf[k];
                }
                s.init();
                s._configure()._draw();
            };
            if (this.$.data('kontroled'))
                return;
            this.$.data('kontroled', true);
            this.extend();
            this.o = $.extend({
                min: this.$.data('min') || 0,
                max: this.$.data('max') || 100,
                stopper: true,
                readOnly: this.$.data('readonly'),
                noScroll: this.$.data('noScroll'),
                cursor: (this.$.data('cursor') === true && 30) || this.$.data('cursor') || 0,
                thickness: this.$.data('thickness') || 0.35,
                width: this.$.data('width') || 200,
                height: this.$.data('height') || 200,
                displayInput: this.$.data('displayinput') == null || this.$.data('displayinput'),
                displayPrevious: this.$.data('displayprevious'),
                fgColor: this.$.data('fgcolor') || '#87CEEB',
                inline: false,
                start: null,
                draw: null,
                change: null,
                cancel: null,
                release: null},
            this.o);
            if (this.$.is('fieldset')) {
                this.v = {};
                this.i = this.$.find('input');
                this.i.each(function(k) {
                    var $this = $(this);
                    s.i[k] = $this;
                    s.v[k] = $this.val();
                    $this.bind('change', function() {
                        var val = {};
                        val[k] = $this.val();
                        s.val(val);
                    });
                });
                this.$.find('legend').remove();
            } else {
                this.i = this.$;
                this.v = this.$.val();
                (this.v.length === 0) && (this.v = this.o.min);
                this.$.bind('change', function() {
                    s.val(s.$.val());
                });
            }
            (!this.o.displayInput) && this.$.hide();
            this.$c = $('<canvas width="' +
                    this.o.width + 'px" height="' +
                    this.o.height + 'px"></canvas>');
            this.c = this.$c[0].getContext("2d");
            this.$.wrap($('<div style="' + (this.o.inline ? 'display:inline;' : '') + 'width:' + this.o.width + 'px;height:' +
                    this.o.height + 'px;"></div>')).before(this.$c);
            if (this.v instanceof Object) {
                this.cv = {};
                this.copy(this.v, this.cv);
            } else {
                this.cv = this.v;
            }
            this.$.bind("configure", cf).parent().bind("configure", cf);
            this._listen()._configure()._xy().init();
            this.isInit = true;
            this._draw();
            return this;
        };
        this._draw = function() {
            var d = true, c = document.createElement('canvas');
            c.width = s.o.width;
            c.height = s.o.height;
            s.g = c.getContext('2d');
            s.clear();
            s.dH && (d = s.dH());
            (d !== false) && s.draw();
            s.c.drawImage(c, 0, 0);
            c = null;
        };
        this._touch = function(e) {
            var touchMove = function(e) {
                var v = s.xy2val(e.originalEvent.touches[s.t].pageX, e.originalEvent.touches[s.t].pageY, 'touch');
                if (v == s.cv)
                    return;
                if (s.cH && (s.cH(v) === false))
                    return;
                s.change(v);
                s._draw();
            };
            this.t = k.c.t(e);
            if (this.sH && (this.sH() === false))
                return;
            touchMove(e);
            k.c.d.bind("touchmove.k", touchMove).bind("touchend.k", function() {
                k.c.d.unbind('touchmove.k touchend.k');
                if (s.rH && (s.rH(s.cv) === false))
                    return;
                s.val(s.cv);
            });
            return this;
        };
        this._mouse = function(e) {
            var mouseMove = function(e) {
                var v = s.xy2val(e.pageX, e.pageY, 'mouse');
                if (v == s.cv)
                    return;
                if (s.cH && (s.cH(v) === false))
                    return;
                s.change(v);
                s._draw();
            };
            if (this.sH && (this.sH() === false))
                return;
            s.mx = e.pageX;
            s.my = e.pageY;
            mouseMove(e);
            k.c.d.bind("mousemove.k", mouseMove).bind("keyup.k", function(e) {
                if (e.keyCode === 27) {
                    k.c.d.unbind("mouseup.k mousemove.k keyup.k");
                    if (s.eH && (s.eH() === false))
                        return;
                    s.cancel();
                }
            }).bind("mouseup.k", function(e) {
                k.c.d.unbind('mousemove.k mouseup.k keyup.k');
                if (s.rH && (s.rH(s.cv) === false))
                    return;
                s.val(s.cv);
            });
            return this;
        };
        this._xy = function() {
            var o = this.$c.offset();
            this.x = o.left;
            this.y = o.top;
            return this;
        };
        this._listen = function() {
            if (!this.o.readOnly) {
                this.$c.bind("mousedown", function(e) {
                    e.preventDefault();
                    s._xy()._mouse(e);
                }).bind("touchstart", function(e) {
                    e.preventDefault();
                    s._xy()._touch(e);
                });
                this.listen();
            } else {
                this.$.attr('readonly', 'readonly');
            }
            return this;
        };
        this._configure = function() {
            if (this.o.start)
                this.sH = this.o.start;
            if (this.o.draw)
                this.dH = this.o.draw;
            if (this.o.change)
                this.cH = this.o.change;
            if (this.o.cancel)
                this.eH = this.o.cancel;
            if (this.o.release)
                this.rH = this.o.release;
            if (this.o.displayPrevious) {
                this.pColor = this.h2rgba(this.o.fgColor, "0.4");
                this.fgColor = this.h2rgba(this.o.fgColor, "0.6");
            } else {
                this.fgColor = this.o.fgColor;
            }
            return this;
        };
        this._clear = function() {
            this.$c[0].width = this.$c[0].width;
        };
        this.listen = function() {
        };
        this.extend = function() {
        };
        this.init = function() {
        };
        this.change = function(v) {
        };
        this.val = function(v) {
        };
        this.xy2val = function(x, y, method) {
        };
        this.draw = function() {
        };
        this.clear = function() {
            this._clear();
        };
        this.h2rgba = function(h, a) {
            var rgb;
            h = h.substring(1, 7);
            rgb = [parseInt(h.substring(0, 2), 16), parseInt(h.substring(2, 4), 16), parseInt(h.substring(4, 6), 16)];
            return"rgba(" + rgb[0] + "," + rgb[1] + "," + rgb[2] + "," + a + ")";
        };
        this.copy = function(f, t) {
            for (var i in f) {
                t[i] = f[i];
            }
        };
    };
    k.Dial = function() {
        k.o.call(this);
        this.startAngle = null;
        this.xy = null;
        this.radius = null;
        this.lineWidth = null;
        this.cursorExt = null;
        this.w2 = null;
        this.PI2 = 2 * Math.PI;
        this.extend = function() {
            this.o = $.extend({
                bgColor: this.$.data('bgcolor') || '#EEEEEE',
                angleOffset: this.$.data('angleoffset') || 0,
                angleArc: this.$.data('anglearc') || 360,
                flatMouse: this.$.data('flatMouse'),
                inline: true},
            this.o);
        };
        this.val = function(v) {
            if (null != v) {
                this.cv = this.o.stopper ? max(min(v, this.o.max), this.o.min) : v;
                this.v = this.cv;
                this.$.val(this.v);
                this._draw();
            } else {
                return this.v;
            }
        };
        this.xy2val = function(x, y, m) {
            var a, ret;
            if ((m === 'mouse') && (this.o.flatMouse)) {
                a = ((this.my - y) + (x - this.mx)) / (this.o.height);
                ret = ~~(a * (this.o.max - this.o.min) + parseFloat(this.v));
                ret = max(min(ret, this.o.max), this.o.min);
            } else {
                a = Math.atan2(x - (this.x + this.w2), -(y - this.y - this.w2)) - this.angleOffset;
                if (this.angleArc != this.PI2 && (a < 0) && (a > -0.5)) {
                    a = 0;
                } else if (a < 0) {
                    a += this.PI2;
                }
                ret = ~~(0.5 + (a * (this.o.max - this.o.min) / this.angleArc))
                        + this.o.min;
            }
            this.o.stopper && (ret = max(min(ret, this.o.max), this.o.min));
            return ret;
        };
        this.listen = function() {
            var s = this, mw = function(e) {
                if (s.o.noScroll)
                    return;
                e.preventDefault();
                var ori = e.originalEvent, deltaX = ori.detail || ori.wheelDeltaX, deltaY = ori.detail || ori.wheelDeltaY, v = parseInt(s.$.val()) + (deltaX > 0 || deltaY > 0 ? 1 : deltaX < 0 || deltaY < 0 ? -1 : 0);
                if (s.cH && (s.cH(v) === false))
                    return;
                s.val(v);
            }, kval, to, m = 1, kv = {37: -1, 38: 1, 39: 1, 40: -1};
            this.$c.bind("mousewheel DOMMouseScroll", mw);
            this.$.bind("mousewheel DOMMouseScroll", mw);
        };
        this.init = function() {
            if (this.v < this.o.min || this.v > this.o.max)
                this.v = this.o.min;
            this.$.val(this.v);
            this.w2 = this.o.width / 2;
            this.cursorExt = this.o.cursor / 100;
            this.xy = this.w2;
            this.lineWidth = this.xy * this.o.thickness;
            this.radius = this.xy - this.lineWidth / 2;
            this.o.angleOffset && (this.o.angleOffset = isNaN(this.o.angleOffset) ? 0 : this.o.angleOffset);
            this.o.angleArc && (this.o.angleArc = isNaN(this.o.angleArc) ? this.PI2 : this.o.angleArc);
            this.angleOffset = this.o.angleOffset * Math.PI / 180;
            this.angleArc = this.o.angleArc * Math.PI / 180;
            this.startAngle = 1.5 * Math.PI + this.angleOffset;
            this.endAngle = 1.5 * Math.PI + this.angleOffset + this.angleArc;
            var s = max(String(Math.abs(this.o.max)).length, String(Math.abs(this.o.min)).length, 2) + 2;
            this.o.displayInput && this.i.css({
                'width': ((this.o.width / 2 + 4) >> 0) + 'px',
                'height': ((this.o.width / 3) >> 0) + 'px',
                'position': 'absolute',
                'vertical-align': 'middle',
                'margin-top': ((this.o.width / 3) >> 0) + 'px',
                'margin-left': '-' + ((this.o.width * 3 / 4 + 2) >> 0) + 'px',
                'border': 0,
                'background': 'none',
                'font': 'bold ' + ((this.o.width / s) >> 0) + 'px Arial',
                'text-align': 'center',
                'color': this.o.fgColor,
                'padding': '0px',
                '-webkit-appearance': 'none'
            }) || this.i.css({
                'width': '0px',
                'visibility': 'hidden'
            });
        };
        this.change = function(v) {
            this.cv = v;
            this.$.val(v);
        };
        this.angle = function(v) {
            return(v - this.o.min) * this.angleArc / (this.o.max - this.o.min);
        };
        this.draw = function() {
            var c = this.g, a = this.angle(this.cv), sat = this.startAngle, eat = sat + a, sa, ea, r = 1;
            c.lineWidth = this.lineWidth;
            this.o.cursor && (sat = eat - this.cursorExt) && (eat = eat + this.cursorExt);
            c.beginPath();
            c.strokeStyle = this.o.bgColor;
            c.arc(this.xy, this.xy, this.radius, this.endAngle, this.startAngle, true);
            c.stroke();
            if (this.o.displayPrevious) {
                ea = this.startAngle + this.angle(this.v);
                sa = this.startAngle;
                this.o.cursor && (sa = ea - this.cursorExt) && (ea = ea + this.cursorExt);
                c.beginPath();
                c.strokeStyle = this.pColor;
                c.arc(this.xy, this.xy, this.radius, sa, ea, false);
                c.stroke();
                r = (this.cv == this.v);
            }
            c.beginPath();
            c.strokeStyle = r ? this.o.fgColor : this.fgColor;
            c.arc(this.xy, this.xy, this.radius, sat, eat, false);
            c.stroke();
        };
        this.cancel = function() {
            this.val(this.v);
        };
    };
    $.fn.dial = $.fn.knob = function(o) {
        return this.each(function() {
            var d = new k.Dial();
            d.o = o;
            d.$ = $(this);
            d.run();
        }).parent();
    };
    k.XY = function() {
        k.o.call(this);
        this.m = [];
        this.p = [];
        this.f = [];
        this.s = {0: 1, 1: -1};
        this.cur2 = 0;
        this.cursor = 0;
        this.v = {};
        this.div = null;
        this.extend = function() {
            this.o = $.extend({
                min: this.$.data('min') || 0,
                max: this.$.data('max') || 100,
                width: this.$.data('width') || 200,
                height: this.$.data('height') || 200},
            this.o);
        };
        this._coord = function() {
            for (var i in this.v) {
                this.m[i] = ~~(0.5 + ((this.s[i] * this.v[i] - this.o.min) / this.f[i]) + this.cur2);
                this.p[i] = this.m[i];
            }
        };
        this.init = function() {
            this.cursor = this.o.cursor || 30;
            this.cur2 = this.cursor / 2;
            this.f[0] = (this.o.max - this.o.min) / (this.o.width - this.cursor);
            this.f[1] = (this.o.max - this.o.min) / (this.o.height - this.cursor);
            if (!this.isInit) {
                this._coord();
            }
            if (this.o.displayInput) {
                var s = this;
                this.$.css({'margin-top': '-30px', 'border': 0, 'font': '11px Arial'});
                this.i.each(function() {
                    $(this).css({'width': (s.o.width / 4) + 'px', 'border': 0, 'background': 'none', 'color': s.o.fgColor, 'padding': '0px', '-webkit-appearance': 'none'});
                });
            } else {
                this.$.css({'width': '0px', 'visibility': 'hidden'});
            }
        };
        this.xy2val = function(x, y) {
            this.m[0] = max(this.cur2, min(x - this.x, this.o.width - this.cur2));
            this.m[1] = max(this.cur2, min(y - this.y, this.o.height - this.cur2));
            return{0: ~~(this.o.min + (this.m[0] - this.cur2) * this.f[0]), 1: ~~(this.o.min + (this.o.height - this.m[1] - this.cur2) * this.f[1])};
        };
        this.change = function(v) {
            this.cv = v;
            this.i[0].val(this.cv[0]);
            this.i[1].val(this.cv[1]);
        };
        this.val = function(v) {
            if (null !== v) {
                this.cv = v;
                this.copy(this.cv, this.v);
                this._coord();
                this._draw();
            } else {
                return this.v;
            }
        };
        this.cancel = function() {
            this.copy(this.v, this.cv);
            this.i[0].val(this.cv[0]);
            this.i[1].val(this.cv[1]);
            this.m[0] = this.p[0];
            this.m[1] = this.p[1];
            this._draw();
        };
        this.draw = function() {
            var c = this.g, r = 1;
            if (this.o.displayPrevious) {
                c.beginPath();
                c.lineWidth = this.cursor;
                c.strokeStyle = this.pColor;
                c.moveTo(this.p[0], this.p[1] + this.cur2);
                c.lineTo(this.p[0], this.p[1] - this.cur2);
                c.stroke();
                r = (this.cv[0] == this.v[0] && this.cv[1] == this.v[1]);
            }
            c.beginPath();
            c.lineWidth = this.cursor;
            c.strokeStyle = r ? this.o.fgColor : this.fgColor;
            c.moveTo(this.m[0], this.m[1] + this.cur2);
            c.lineTo(this.m[0], this.m[1] - this.cur2);
            c.stroke();
        };
    };
    $.fn.xy = function(o) {
        return this.each(function() {
            var x = new k.XY();
            x.$ = $(this);
            x.o = o;
            x.run();
        }).parent();
    };
    k.Bars = function() {
        k.o.call(this);
        this.bar = null;
        this.mid = null;
        this.col = null;
        this.colWidth = null;
        this.fontSize = null;
        this.displayMidLine = false;
        this.extend = function() {
            this.o = $.extend({
                min: this.$.data('min') || 0,
                max: this.$.data('max') || 100,
                width: this.$.data('width') || 600,
                displayInput: this.$.data('displayinput') == null || this.$.data('displayinput'),
                height: (this.$.data('height') || 200),
                fgColor: this.$.data('fgcolor') || '#87CEEB',
                bgColor: this.$.data('bgcolor') || '#CCCCCC',
                cols: this.$.data('cols') || 8,
                spacing: this.$.data('spacing') || 1
            }, this.o);
            (this.o.cols == 1) && (this.o.spacing = 0);
            this.colWidth = (((this.o.width - this.o.spacing * this.o.cols) / this.o.cols) >> 0);
            if (this.o.displayInput) {
                this.fontSize = max(~~(this.colWidth / 3), 10);
                this.o.height -= this.fontSize;
            }
        };
        this.xy2val = function(x, y) {
            var cw = this.colWidth + this.o.spacing, val = (max(this.o.min, min(this.o.max, -(-this.mid + (y - this.y)) / this.bar))) >> 0, ret = {};
            this.col = max(0, min(this.o.cols - 1, ((x - this.x) / cw) >> 0));
            ret[this.col] = val;
            return ret;
        };
        this.init = function() {
            this.bar = this.o.height / (this.o.max - this.o.min);
            this.mid = (this.o.max * this.bar) >> 0;
            this.displayMidLine = this.o.cursor && this.o.min < 0;
            if (this.o.displayInput) {
                var s = this;
                this.$.css({'margin': '0px', 'border': 0, 'padding': '0px'});
                this.i.each(function() {
                    $(this).css({'width': (s.colWidth - 4 + s.o.spacing) + 'px', 'border': 0, 'background': 'none', 'font': s.fontSize + 'px Arial', 'color': s.o.fgColor, 'margin': '0px', 'padding': '0px', '-webkit-appearance': 'none', 'text-align': 'center'});
                });
            } else {
                this.$.css({'width': '0px', 'visibility': 'hidden'});
            }
        };
        this.change = function(v) {
            for (var i in v) {
                this.cv[i] = v[i];
                this.i[i].val(this.cv[i]);
            }
        };
        this.val = function(v) {
            if (null !== v) {
                this.copy(v, this.cv);
                this.copy(this.cv, this.v);
                this.col = null;
                this._draw();
            } else {
                return this.v;
            }
        };
        this.cancel = function() {
            this.copy(this.v, this.cv);
            this.col = null;
            this._draw();
        };
        this._bar = function(col) {
            var x = (col * (this.colWidth + this.o.spacing) + this.colWidth / 2);
            if (this.displayMidLine) {
                this.g.beginPath();
                this.g.lineWidth = this.colWidth;
                this.g.strokeStyle = this.o.fgColor;
                this.g.moveTo(x, this.mid);
                this.g.lineTo(x, this.mid + 1);
                this.g.stroke();
            }
            if (this.o.displayPrevious) {
                this.g.beginPath();
                this.g.lineWidth = this.colWidth;
                this.g.strokeStyle = (this.cv[col] == this.v[col]) ? this.o.fgColor : this.pColor;
                if (this.o.cursor) {
                    this.g.lineTo(x, this.mid - ((this.v[col] * this.bar) >> 0) + this.o.cursor / 2);
                } else {
                    this.g.moveTo(x, this.mid);
                }
                this.g.lineTo(x, this.mid - ((this.v[col] * this.bar) >> 0) - this.o.cursor / 2);
                this.g.stroke();
            }
            this.g.beginPath();
            this.g.lineWidth = this.colWidth;
            this.g.strokeStyle = this.fgColor;
            if (this.o.cursor) {
                this.g.lineTo(x, this.mid - ((this.cv[col] * this.bar) >> 0) + this.o.cursor / 2);
            } else {
                this.g.moveTo(x, this.mid);
            }
            this.g.lineTo(x, this.mid - ((this.cv[col] * this.bar) >> 0) - this.o.cursor / 2);
            this.g.stroke();
        };
        this.clear = function() {
            if (this.col) {
                this.c.clearRect(this.col * (this.colWidth + this.o.spacing), 0, this.colWidth + this.o.spacing, this.o.height);
            } else {
                this._clear();
            }
        };
        this.draw = function() {
            if (this.col) {
                this._bar(this.col);
            } else {
                for (var i = 0; i < this.o.cols; i++) {
                    this._bar(i);
                }
            }
        };
    };
    $.fn.bars = function(o) {
        return this.each(function() {
            var b = new k.Bars();
            b.$ = $(this);
            b.o = o;
            b.run();
        }).parent();
    };
})(jQuery);
reality.updateManager = {init: function()
    {
        reality.toLoad.push('updates');
        this.checkUpdate();
        reality.$document.bind('go', function() {
            reality.updateManager.isStarted = true;
        });
    }, isStarted: false, toLoad: [], checkUpdate: function() {
        var self = this;
        self.toLoad = [];
        setTimeout(function() {
            self.updatePresets();
            self.updateFlares();
            if (!self.isStarted)
            {
                self.updatePlaylist();
                reality.$document.trigger('try', ['updates']);
            }
        }, 100);
    }, updatePresets: function()
    {
        var self = this, presets = localStorage2.getItem('presets'),
                ready = function() {
                    if (self.isStarted) {
                        reality.helpers.presets.refresh();
                    }
                    else {
                        reality.$document.trigger('try', ['presets']);
                    }
                };
        !this.isStarted && reality.toLoad.push('presets');
        reality.presets = presets;
        ready();
    }, updateFlares: function()
    {
        var self = this, flares = localStorage2.getItem('flares'), ready = function() {
            if (!self.isStarted) {
                reality.$document.trigger('try', ['flares']);
            }
        };
        !this.isStarted && reality.toLoad.push('flares');
        reality.flares = flares;
        ready();
    }, updatePlaylist: function()
    {
        var self = this,
                ready = function() {
                    reality.musicUrl = reality.defaults.musicSrc;
                    reality.toLoad.push('music');
                    reality.loadMusic(viz.getAudio());
                    reality.$document.trigger('try', ['playlist']);
                };
        !this.isStarted && reality.toLoad.push('playlist');
        ready();
    }};
reality.updateManager.init();
reality.settings = {settings: {preset: {mode: 'timer', timer: 25000},
        playlist: {mode: 'random', autoStart: true},
        transition: {time: 1000}, nick: 'Anonymous' + Math.round(Math.random() * 1e6), particlesNumber: 1e4,
        lineIn: {freqAmp: 380, magAmp: 7.6, smoothingTimeConstant: 0.04, autoStart: false},
        tips: {main: 0, lineIn: 0, presets: 0, irc: 0}}, presetInterval: 0, load: function()
    {
        $.extend(true, this.settings, localStorage2.getItem('settings'));
        return this;
    }, run: function() {
        clearInterval(this.presetInterval);
        if (this.settings.preset.mode === 'timer')
        {
            this.presetInterval = setInterval(function() {
                reality.randomPreset();
            }, this.settings.preset.timer);
        }
        return this;
    }};
reality.settings.defaultSettings = JSON.parse(JSON.stringify(reality.settings.settings));
fluent = {util: {wave: function(i, freq, phase, width, center) {
            return Math.round(Math.sin(freq * i + phase) * width + center);
        }, wavec: function(i, freq, phase, width, center) {
            return Math.round(Math.cos(freq * i + phase) * width + center);
        }, wavef: function(i, freq, phase, width, center) {
            return Math.sin(freq * i + phase) * width + center;
        }, wavefc: function(i, freq, phase, width, center) {
            return Math.cos(freq * i + phase) * width + center;
        }, gradiant: function(i, frequency, phase, center, width) {
            i = i || 0;
            center = center || 128;
            width = width || 127;
            return{i: ++i, color: {
                    r: this.wave(i, frequency.r, phase.r, width, center),
                    g: this.wave(i, frequency.g, phase.g, width, center),
                    b: this.wave(i, frequency.b, phase.b, width, center)}
            };
        }, rgbToHex: function(r, g, b) {
            return parseInt('' + (1 << 24 | r << 16 | g << 8 | b).toString(16).substr(1), 16);
        }}};
reality.mutate = function(d1, d2, time, stepHandler, finalHandler)
{
    stepHandler = stepHandler || function() {
    };
    finalHandler = finalHandler || function() {
    };
    var fps = 16, frames = Math.round(time / fps), next = fps, d3 = JSON.parse(JSON.stringify(d1)), last = reality.mutate.last = Math.random(), calcStep = function(d1, d2)
    {
        var r = {};
        for (key in d1)
        {
            switch (typeof d1[key])
            {
                case'number':
                    r[key] = (d2[key] - d1[key]) / frames;
                    break;
                case'object':
                    r[key] = calcStep(d1[key], d2[key]);
                    break;
                default:
                    r[key] = d1[key];
            }
        }
        return r;
    }, step = calcStep(d1, d2), doStep = function(d, step)
    {
        for (key in d)
        {
            switch (typeof d[key])
            {
                case'number':
                    d[key] += step[key];
                    break;
                case'object':
                    d[key] = doStep(d[key], step[key]);
                    break;
                default:
            }
        }
        return d;
    }, runStep = function()
    {
        if ((next < time) && (last == reality.mutate.last))
        {
            next += fps;
            doStep(d3, step);
            stepHandler(d3);
            setTimeout(runStep, fps);
        }
        else {
            d3 = d2;
            stepHandler(d3);
            finalHandler(d3);
        }
    };
    runStep();
};
reality.mutate.last = 0.0;
$(window).bind('online', function() {
    reality.updateManager.checkUpdate();
});
reality.getPreset = function(string)
{
    string = (typeof string === 'boolean' ? string : true);
    var json = [], i = 0, m = reality.items.length;
    for (; i < m; ++i)
    {
        json.push({
            controls: reality.items[i].options.controls,
            camera: {
                position: {x: reality.camera.position.x, y: reality.camera.position.y, z: reality.camera.position.z},
                rotation: {x: reality.camera.rotation.x, y: reality.camera.rotation.y, z: reality.camera.rotation.z}},
            particles: {
                position: {x: reality.items[i].particleSystem.position.x, y: reality.items[i].particleSystem.position.y, z: reality.items[i].particleSystem.position.z},
                rotation: {x: reality.items[i].particleSystem.rotation.x, y: reality.items[i].particleSystem.rotation.y, z: reality.items[i].particleSystem.rotation.z}
            }
        });
    }
    return string ? JSON.stringify(json) : json;
};
reality.setPreset = function(preset, fast)
{
    !$.isArray(preset.set) && (preset.set = [preset.set]);
    var i = 0, m = preset.set.length || 0, sizeChanged = false;
    for (; i < m; ++i)
    {
        $.extend(true, preset.set[i].controls, $.extend(true, {}, reality.lib.entities.adiveinmusic.controlsDefault, preset.set[i].controls));
    }
    var originSet = $.extend(true, [], reality.helpers.presets.current.set, reality.getPreset(false));
    reality.helpers.presets.current = JSON.parse(JSON.stringify(preset));
    var toDel = originSet.length - preset.set.length;
    if (toDel > 0)
    {
        for (i = 0; i < toDel; ++i)
        {
            reality.scene.remove(reality.items[preset.set.length + i].particleSystem);
        }
        reality.items.splice(preset.set.length, toDel);
        originSet.splice(preset.set.length, toDel);
        sizeChanged = true;
    }
    if (preset.id)
    {
        $('.presets .overview p.selected,.myPresets .overview p.selected').removeClass('selected');
        $('.presets .overview p').each(function()
        {
            reality.$fake[0] = this;
            if (reality.$fake.data('presetId') == preset.id)
            {
                reality.$fake.addClass('selected');
                return;
            }
        });
    }
    if (!preset) {
        return;
    }
    for (i = 0; i < m; ++i)
    {
        if (!reality.items[i])
        {
            sizeChanged = true;
            reality.items[i] = new reality.adiveInCloud($.extend(true, {}, reality.lib.entities.adiveinmusic));
            reality.items[i].particleSystem.rotation.x = 1.5;
            reality.items[i].particleSystem.rotation.y = -0.1;
            reality.scene.add(reality.items[i].particleSystem);
        }
        reality.items[i].uniforms.texture.texture = THREE.ImageUtils.loadTexture(preset.set[i].controls.picture);
    }
    if (!sizeChanged && !fast && typeof originSet[0].camera !== 'undefined' && reality.settings.settings.transition.time > 0)
    {
        reality.mutate(originSet, preset.set, reality.settings.settings.transition.time, reality.setPreset.dynamicUpdate, reality.setPreset.staticUpdate);
    }
    else
    {
        reality.setPreset.dynamicUpdate(preset.set);
    }
    if (sizeChanged)
    {
        reality.$document.trigger('refresh', [reality.particlesNumber, fast]);
        return;
    }
    reality.helpers.titles.$main !== null && reality.helpers.titles.show(preset.name + ' by ' + preset.author);
};
reality.setPreset.dynamicUpdate = function(set) {
    for (var i = 0, m = set.length; i < m; ++i)
    {
        $.extend(true, reality.items[i].particleSystem, set[i].particles);
        $.extend(true, reality.items[i].options.controls, reality.items[i].options.controlsDefault, set[i].controls);
    }
    $.extend(reality.camera.position, set[0].camera.position);
    $.extend(reality.camera.rotation, set[0].camera.rotation);
};
reality.setPreset.staticUpdate = function() {
};
reality.getFullPreset = function(set, author, name) {
    return{author: author || 'Anonymous', name: name || 'Name me', set: set};
};
reality.randomPreset = function() {
    reality.setPreset(reality.helpers.presets.presets[Math.round(Math.random() * reality.helpers.presets.presets.length)]);
};
reality.getFullPresetFromString = function(str)
{
    return reality.getFullPreset(JSON.parse(str));
};
reality.getPresetFromId = function(id)
{
    for (var i = 0, l = reality.helpers.presets.presets.length; i < l; ++i)
    {
        if (reality.helpers.presets.presets[i].id == id)
        {
            return reality.helpers.presets.presets[i];
        }
    }
    return false;
};
reality.set = {add: function()
    {
        var newPreset = reality.getFullPreset(reality.getPreset(false));
        newPreset.set.push(newPreset.set[newPreset.set.length - 1]);
        reality.setPreset(newPreset, true);
    }, remove: function(itemIndex) {
        if (itemIndex > 0)
        {
            var newPreset = reality.getFullPreset(reality.getPreset(false));
            newPreset.set.splice(itemIndex, 1);
            reality.setPreset(newPreset, true);
        }
    }};
navigator.getMedia = navigator.webkitGetUserMedia;
window.AudioContext = window.AudioContext || window.webkitAudioContext;
reality.helpers.titles = {
    $main: false,
    pile: [],
    create: function()
    {
        /*
         this.$main = $('<div>').addClass('titleZone').prependTo('body');
         */
    }, show: function(title, displayFor)
    {
        return;
        /*
         if (reality.helpers.titles.pile.indexOf(title) === -1)
         {
         reality.helpers.titles.pile.push(title);
         displayFor = displayFor || 1500;
         var $title = $('<h4>').html(title).appendTo(this.$main);
         setTimeout(function() {
         $title.addClass('enter');
         setTimeout(function() {
         $title.addClass('leave');
         setTimeout(function()
         {
         $title.remove();
         reality.helpers.titles.pile.splice(reality.helpers.titles.pile.indexOf(title), 1);
         }, 500);
         }, displayFor);
         }, 100);
         }
         */
    }, showSub: function(title, delay)
    {
        /*
         typeof reality.helpers.titles.$subTitle === 'undefined' && (reality.helpers.titles.$subTitle = $('<h4>').addClass('sub').appendTo(this.$main));
         reality.helpers.titles.$subTitle.html(title).removeClass('leave').addClass('enter');
         if (delay)
         {
         setTimeout(reality.helpers.titles.hideSub, delay);
         }
         */
    }, hideSub: function()
    {
        /*
         reality.helpers.titles.$subTitle.addClass('leave').removeClass('enter');
         */
    }
};
reality.helpers.presets = {
    $main: false,
    name: 'presets',
    presets: [],
    current: false,
    get: function(id)
    {
        var i = 0, p = this.presets, m = p.length;
        for (; i < m; ++i)
        {
            if (id == p[i].id) {
                return p[i];
            }
        }
        return false;
    }, disconnectCurrent: function()
    {
        this.current.id = false;
    }, refresh: function() {
        this.presets = reality.presets;
    }
};
reality.$document.bind('go', function()
{
    reality.ui = {
        interact: false,
        lastMove: 0,
        lastPos: {x: 0, y: 0},
        lastTarget: null,
        inspectInterval: 1000,
        sleepingInterval: 3000
    };
    $(reality.$document).bind('mousemove', function(e) {
        reality.ui.lastTarget = e.target;
        if (reality.ui.lastPos.x != e.pageX && reality.ui.lastPos.Y != e.pageY)
        {
            reality.ui.lastMove = new Date();
            reality.ui.interact = true;
            reality.ui.lastPos.x = e.pageX;
            reality.ui.lastPos.y = e.pageY;
            reality.$document.trigger('interacting');
        }
    });
    setInterval(function() {
        if (reality.ui.lastTarget == reality.renderer.domElement && (new Date() - reality.ui.lastMove) > reality.ui.sleepingInterval)
        {
            reality.ui.interact = false;
            reality.$document.trigger('sleeping');
        }
    }, reality.ui.inspectInterval);
});
reality.bufferCode = '';
reality.bufferCodeHandler = 0;
reality.timing.finish('boot', 'boot');
reality.sampleRate = 22100;
reality.sampleSize = 2048;
reality.cameraSpeed = .0005;
reality.settings.load();
reality.particlesNumber = reality.settings.settings.particlesNumber || 3e4;
reality.delayMusicLoad = true;
reality.defaults = $.extend(true, reality.defaults, {musicSrc: 'viz/sound/thesaxman.ogg', presetId: 99}, reality.defaultApplication);
reality.cameraMove = function()
{
    switch (reality.lastButtonEvent.which)
    {
        case 1:
            this.camera.position.z += (this.mouse.x - this.camera.position.z) * reality.cameraSpeed;
            this.camera.position.y += (this.mouse.y - this.camera.position.y) * reality.cameraSpeed;
            break;
    }
};
reality.init();
reality.lastCandidatePresetId = false;
$(document).bind('mousedown', function(e)
{
    if (e.target.tagName == 'CANVAS' && $(e.target).closest('.modal,.panel').length < 1)
    {
        reality.free = true;
        reality.lastButtonEvent = e;
    }
}).bind('mouseup', function(e) {
    reality.free = false;
}).bind('musicChange', function()
{
    reality.settings.settings.preset.mode == 'song' && reality.randomPreset();
}).bind('refresh', function(e, particlesNumber, fast)
{
    var i = 0, m = reality.helpers.presets.current.set.length;
    reality.particlesNumber = particlesNumber || reality.particlesNumber;
    reality.lib.entities.adiveinmusic.particleNumber = Math.round(particlesNumber / m);
    for (; i < m; ++i)
    {
        reality.scene.remove(reality.items[i].particleSystem);
        reality.items[i] = new reality.adiveInCloud($.extend(true, {}, reality.lib.entities.adiveinmusic));
        reality.scene.add(reality.items[i].particleSystem);
    }
    reality.setPreset(reality.helpers.presets.current, fast);
}).bind('sleeping', function() {
    reality.$body.addClass('sleeping');
}).bind('interacting', function() {
    reality.$body.removeClass('sleeping');
}).bind('go', function()
{
    reality.timing.finish('load', 'load');
    reality.settings.run();
    reality.musicUrl && reality.music.play();
    reality.lib.entities.adiveinmusic.controls = $.extend(true, {}, reality.lib.entities.adiveinmusic.controlsDefault);
    reality.items[0] = new reality.adiveInCloud(reality.lib.entities.adiveinmusic);
    reality.items[0].particleSystem.rotation.x = 1.5;
    reality.items[0].particleSystem.rotation.y = -0.1;
    reality.scene.add(reality.items[0].particleSystem);
    reality.helpers.titles.create();
    reality.helpers.presets.presets = reality.presets;
    //var presetID = document.location.search.match(/preset=(\d+)/), dataPreset = document.location.search.match(/datapreset=([^&=]+)/);
    preset = {};
    //dataPreset = dataPreset !== null ? reality.getFullPresetFromString(decodeURI(dataPreset[1])) : false;
    var presetID = reality.defaults.presetId;
    //(dataPreset || presetID) && 
    reality.setPreset(reality.helpers.presets.get(presetID));
    reality.animate();
});
reality.lib.entities.adiveinmusic = {
    image: "img/pg1.png",
    particleNumber: reality.particlesNumber,
    sizeAttenuation: false, sort: false,
    blending: THREE.AdditiveBlending,
    vertexColors: THREE.VertexColors,
    populate: function()
    {
        this.particleNumber = this.options.particleNumber;
        var i = 0;
        for (; i < this.particleNumber; ++i)
        {
            this.particles.vertices.push(new THREE.Vector3(1, i * 50, 1));
            this.attributes.customColor.value.push(new THREE.Color().setRGB(1, 0.5, .5));
            this.attributes.colorDecr.value.push(new THREE.Color().setRGB(0, 0, 0));
        }
    }, controlsDefault: {seuilAudible: .001, radiusAmplitude: 1, radius: 100, radiusVar: 1, radiusVarAmp: 0, amplitudeOnMag: 0, colors: {r: 0, g: .5, b: .9}, burningColors: {r: 5, g: 0, b: 0}, burningColorsMax: {r: 1, g: 1, b: 1}, spectralColors: {r: 1, g: 1, b: 1}, bgColors: {r: 0, g: 0, b: 0}, speed: 2, picture: "img/pg1.png", colorsDecr: {r: .0017, g: .0017, b: .0017}, dots: 64, maxSize: 500, rotation: {x: 0, y: 0, z: 0}, position: {x: 0, y: 0, z: 0}, radiusIncr: 0, radiusIncrAmp: 0, speedIncr: 0, opacityBase: 1, opacityAmp: 0, opacityDecr: 0, centerAmp: 0, sizeAmp: 1, sizeDecr: 0, freqSpeedIncr: 0, magSpeedIncr: 0, baseRotate: 0, autoRotate: 0, rotateAmp: 0, textureRotateDecr: 0, textureRotateAmp: 0, equalizer: 0, gravity: {x: 0, y: 0, z: 0}, gravityAmp: {x: 0, y: 0, z: 0}, showAmp: true, blending: THREE.AdditiveBlending, autoTraveler: true, camera: {positionIncr: {x: 0, y: 0, z: 0}, traveler: {freq: {x: 0, y: .01, z: .01, x2: 0, y2: 0, z2: 0}, phase: {x: 0, y: .01, z: .01, x2: 0, y2: 0, z2: 0}, width: {x: 0, y: .1, z: .1, x2: 0, y2: 0, z2: 0}, center: {x: 0, y: 0, z: 0, x2: 0, y2: 0, z2: 0}}}}, controls: {}, profiling: {times: [], last: 0}, move: function()
    {
        ++this.uniforms.gProcess.value;
        this.uniforms.textureRotateDecr.value = this.options.controls.textureRotateDecr;
        this.uniforms.speedIncr.value = this.options.controls.speedIncr * reality.music.mag;
        this.uniforms.gravityX.value = this.options.controls.gravity.x + (this.options.controls.gravity.x * this.options.controls.gravityAmp.x * reality.music.mag);
        this.uniforms.gravityY.value = this.options.controls.gravity.y + (this.options.controls.gravity.y * this.options.controls.gravityAmp.y * reality.music.mag);
        this.uniforms.gravityZ.value = this.options.controls.gravity.z + (this.options.controls.gravity.z * this.options.controls.gravityAmp.z * reality.music.mag);
        this.particleSystem.rotation.x -= (this.options.controls.autoTraveler ? fluent.util.wavef(reality.frames, this.options.controls.camera.traveler.freq.x2, this.options.controls.camera.traveler.phase.x2, this.options.controls.camera.traveler.width.x2, this.options.controls.camera.traveler.center.x2) : 0);
        this.particleSystem.rotation.y -= this.options.controls.rotation.y + (this.options.controls.autoTraveler ? fluent.util.wavef(reality.frames, this.options.controls.camera.traveler.freq.y2, this.options.controls.camera.traveler.phase.y2, this.options.controls.camera.traveler.width.y2, this.options.controls.camera.traveler.center.y2) : 0);
        this.particleSystem.rotation.z -= this.options.controls.rotation.z + (this.options.controls.autoTraveler ? fluent.util.wavefc(reality.frames, this.options.controls.camera.traveler.freq.z2, this.options.controls.camera.traveler.phase.z2, this.options.controls.camera.traveler.width.z2, this.options.controls.camera.traveler.center.z2) : 0);
        this.particleSystem.position.y -= this.options.controls.position.y;
        this.particleSystem.position.z -= this.options.controls.position.z;
        this.options.controls.baseRotate += this.options.controls.autoRotate + this.options.controls.rotateAmp * reality.music.mag || 0;
        var start = {x: -60, y: 300}, i = 0, newVertice = 0, dots = this.options.controls.dots, radius = this.options.controls.radius - this.options.controls.radius * reality.music.mag * this.options.controls.amplitudeOnMag, angle = this.options.controls.baseRotate, angleIncr = Math.PI * 2 / (dots * this.options.controls.radiusVar + (this.options.controls.radiusVar * this.options.controls.radiusVarAmp * reality.music.mag)), currentCenterAmp = this.options.controls.centerAmp * reality.music.mag, currentPosAmp = 0, cVertice = 0, tmp = 0;
        if (this.options.controls.showAmp)
        {
            ++newVertice;
            cVertice = this.current + newVertice;
            this.particles.vertices[cVertice] = new THREE.Vector3(start.x, 0, 0);
            this.attributes.customColor.value[cVertice] = new THREE.Color().setRGB(.1 + Math.min(.9, reality.music.spectrum[50] * 20), .1 + Math.min(.9, reality.music.spectrum[30] * 20), .1 + Math.min(.9, reality.music.spectrum[10] * 20));
            this.attributes.colorDecr.value[cVertice] = new THREE.Color().setRGB(this.options.controls.colorsDecr.r, this.options.controls.colorsDecr.g, this.options.controls.colorsDecr.b);
            this.attributes.process.value[cVertice] = this.uniforms.gProcess.value;
            this.attributes.opacity.value[cVertice] = 1;
            this.attributes.rotation.value[cVertice] = 0;
            this.attributes.rotationSpeed.value[cVertice] = 0;
            this.attributes.size.value[cVertice] = Math.max(1, this.options.controls.maxSize * reality.music.mag * this.options.controls.sizeAmp / 7) | 0;
            this.attributes.speed.value[cVertice] = this.options.controls.speed;
        }
        for (; i < dots; ++i)
        {
            radius += this.options.controls.radiusIncr + (this.options.controls.radiusIncr * this.options.controls.radiusIncrAmp * reality.music.mag);
            if (reality.music.spectrum[i] > this.options.controls.seuilAudible)
            {
                this.options.controls.equalizer != 0 && (reality.music.spectrum[i] = Math.exp(i / this.options.controls.equalizer) * reality.music.spectrum[i]);
                ++newVertice;
                cVertice = this.current + newVertice;
                this.attributes.process.value[cVertice] = this.uniforms.gProcess.value;
                currentPosAmp = radius - (radius * reality.music.spectrum[i] * this.options.controls.radiusAmplitude);
                this.particles.vertices[cVertice] = new THREE.Vector3(start.x, Math.cos(angle) * currentPosAmp + currentCenterAmp, Math.sin(angle) * currentPosAmp + currentCenterAmp);
                this.attributes.customColor.value[cVertice] = new THREE.Color().setRGB((this.options.controls.colors.r - (i * this.options.controls.spectralColors.r / dots)) + (tmp = reality.music.spectrum[i] * this.options.controls.burningColors.r, (tmp > this.options.controls.burningColorsMax.r ? this.options.controls.burningColorsMax.r : tmp)), (this.options.controls.colors.g - (i * this.options.controls.spectralColors.g / dots)) + (tmp = reality.music.spectrum[i] * this.options.controls.burningColors.g, (tmp > this.options.controls.burningColorsMax.g ? this.options.controls.burningColorsMax.g : tmp)), (this.options.controls.colors.b - (i * this.options.controls.spectralColors.b / dots)) + (tmp = reality.music.spectrum[i] * this.options.controls.burningColors.b, (tmp > this.options.controls.burningColorsMax.b ? this.options.controls.burningColorsMax.b : tmp)));
                this.attributes.colorDecr.value[cVertice] = new THREE.Color().setRGB(this.options.controls.colorsDecr.r, this.options.controls.colorsDecr.g, this.options.controls.colorsDecr.b);
                this.attributes.opacity.value[cVertice] = (tmp = this.options.controls.opacityBase + (this.options.controls.opacityAmp * reality.music.spectrum[i])), tmp > 1 ? 1 : tmp;
                this.attributes.size.value[cVertice] = (tmp = this.options.controls.maxSize * reality.music.spectrum[i] * this.options.controls.sizeAmp), (tmp > 1 ? tmp : 1) | 0;
                this.attributes.rotation.value[cVertice] = 0;
                this.attributes.rotationSpeed.value[cVertice] = reality.music.spectrum[i] * this.options.controls.textureRotateAmp;
                this.attributes.speed.value[cVertice] = this.options.controls.speed + (this.options.controls.magSpeedIncr * reality.music.mag) + (this.options.controls.freqSpeedIncr * reality.music.spectrum[i]);
                this.attributes.opacityDecr.value[cVertice] = this.options.controls.opacityDecr;
            }
            angle += angleIncr;
        }
        this.current = cVertice;
        this.current >= this.particleNumber && (this.current = this.current - this.particleNumber);
        this.particleSystem.geometry.verticesNeedUpdate = true;
        this.attributes.customColor.needsUpdate = true;
        this.attributes.colorDecr.needsUpdate = true;
        this.attributes.size.needsUpdate = true;
        this.attributes.opacity.needsUpdate = true;
        this.attributes.opacityDecr.needsUpdate = true;
        this.attributes.rotation.needsUpdate = true;
        this.attributes.rotationSpeed.needsUpdate = true;
        this.attributes.process.needsUpdate = true;
        this.attributes.speed.needsUpdate = true;
    }};
reality.adiveInCloud = function(options) {
    this.particles = new THREE.Geometry();
    this.current = 0;
    this.attributes = {size: {type: 'f', value: new Uint8Array(reality.particlesNumber)},
        opacity: {type: 'f', value: new Float32Array(reality.particlesNumber)},
        opacityDecr: {type: 'f', value: new Float32Array(reality.particlesNumber)},
        customColor: {type: 'c', value: []}, colorDecr: {type: 'c', value: []},
        rotation: {type: 'f', value: new Float32Array(reality.particlesNumber)},
        rotationSpeed: {type: 'f', value: new Float32Array(reality.particlesNumber)},
        process: {type: 'f', value: new Uint32Array(reality.particlesNumber)},
        speed: {type: 'f', value: new Float32Array(reality.particlesNumber)}
    };
    this.uniforms = {color: {type: "c"},
        texture: {type: "t", value: 0},
        gProcess: {type: 'f', value: 0},
        speedIncr: {type: 'f', value: 0.0},
        gravityX: {type: 'f', value: 0.0},
        gravityY: {type: 'f', value: 0.0},
        gravityZ: {type: 'f', value: 0.0},
        textureRotateDecr: {type: 'f', value: 0.0},
        spectrum: {type: 'f', value: []}
    };
    this.initParticles = function()
    {
        this.material = new THREE.ShaderMaterial({uniforms: this.uniforms, attributes: this.attributes, vertexShader: '   attribute float size;'
                    + '   attribute float opacity;'
                    + '   attribute float opacityDecr;'
                    + '   attribute float speed;'
                    + '   attribute float rotation;'
                    + '   attribute float rotationSpeed;'
                    + '   attribute vec3 customColor;'
                    + '   attribute vec3 colorDecr;'
                    + '   attribute float process;'
                    + '   uniform float gProcess;'
                    + '   uniform float textureRotateDecr;'
                    + '   uniform float speedIncr;'
                    + '   uniform float gravityX;'
                    + '   uniform float gravityY;'
                    + '   uniform float gravityZ;'
                    + '   varying vec3 vColor;'
                    + '   varying float vOpacity;'
                    + '   varying float vOpacityDecr;'
                    + '   varying float vRotation;'
                    + '   varying float progress;'
                    + '   void main() {'
                    + '    vOpacity = opacity;'
                    + '    vOpacityDecr= opacityDecr;'
                    + '    progress = (gProcess - process);'
                    + '    vColor  = customColor - colorDecr * progress;'
                    + '    vRotation = rotation + progress * textureRotateDecr + progress * rotationSpeed;'
                    + '    vec4 mvPosition = modelViewMatrix * vec4( position.x - progress*speed*(1.0+(progress*gravityX)) - speedIncr,position.y*(1.0+(progress*gravityY)),position.z*(1.0+(progress*gravityZ)), 1.0 );'
                    + '    gl_PointSize = size * ( 300.0 / length( mvPosition.xyz ) );'
                    + '    gl_Position = projectionMatrix * mvPosition;'
                    + '   }', fragmentShader: '   uniform vec3 color;'
                    + '   uniform sampler2D texture;'
                    + '   varying vec3 vColor;'
                    + '   varying float vOpacity;'
                    + '   varying float vOpacityDecr;'
                    + '   varying float vRotation;'
                    + '   varying float progress;'
                    + '   void main() {'
                    + '    float mid = 0.5;'
                    + '    gl_FragColor = vec4( color * vColor,  vOpacity - progress * vOpacityDecr);'
                    + '    vec2 rotatedCoord = vec2(cos(vRotation) * (gl_PointCoord.x - mid) + sin(vRotation) * (gl_PointCoord.y - mid) + mid, cos(vRotation) * (gl_PointCoord.y - mid) - sin(vRotation) * (gl_PointCoord.x - mid) + mid);'
                    + '    gl_FragColor = gl_FragColor * texture2D( texture, rotatedCoord );'
                    + '   }', blending: THREE.AdditiveBlending, depthTest: false, transparent: true});
        this.particleSystem = new THREE.ParticleSystem(this.particles, this.material);
        this.particleSystem.sortParticles = this.options.sort;
        for (var max = this.particleSystem.geometry.vertices.length, i = 0; i < max; ++i)
        {
            this.particleSystem.geometry.vertices[i].ox = this.particleSystem.geometry.vertices[i].x;
            this.particleSystem.geometry.vertices[i].oy = this.particleSystem.geometry.vertices[i].y;
            this.particleSystem.geometry.vertices[i].oz = this.particleSystem.geometry.vertices[i].z;
        }
    };
    this.init = function()
    {
        this.options = $.extend({move: function() {
            }, populate: function() {
            }, image: "img/red.png", size: 200, color: 0xFFFFFF, transparent: true, vertexColors: null, depthTest: false, opacity: 1, sizeAttenuation: false, sort: true, blending: THREE.AdditiveBlending}, options);
        this.move = this.options.move;
        this.populate = this.options.populate;
        this.uniforms.color.value = new THREE.Color(0xffffff);
        this.uniforms.texture.texture = THREE.ImageUtils.loadTexture(this.options.image);
        this.populate();
        this.initParticles();
    };
    this.init();
    return this;
};