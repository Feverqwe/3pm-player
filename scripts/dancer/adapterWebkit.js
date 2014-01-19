(function() {
    var SAMPLE_SIZE = 2048;
    var SAMPLE_RATE = 44100;

    var adapter = function(dancer) {
        this.dancer = dancer;
        this.audio = new Audio();
        this._viz = undefined;
        if (window.viz === undefined && window.engine !== undefined) {
            this._viz = engine.player;
        } else {
            this._viz = viz;
        }
        var _this = this;
        this._viz.getAdapter(function(ad) {
            _this.context = ad.context;
        });
    };

    adapter.prototype = {
        load: function(_source, type) {
            var _this = this;
            _this.type = type || "viz";
            this.audio = _source;

            this.isLoaded = false;
            this.progress = 0;

            this.proc = this.context.createJavaScriptNode(SAMPLE_SIZE / 2, 1, 1);
            this.proc.onaudioprocess = function(e) {
                _this.update.call(_this, e);
            };
            //this.gain = this.context.createGainNode();

            this.fft = new FFT(SAMPLE_SIZE / 2, SAMPLE_RATE);
            this.signal = new Float32Array(SAMPLE_SIZE / 2);
            /*
             if (this.audio.readyState < 3) {
             this.audio.addEventListener('canplay', function() {
             connectContext.call(_this);
             });
             } else {
             connectContext.call(_this);
             }*/

            connectContext.call(_this);
            /*
             this.audio.addEventListener('progress', function(e) {
             if (e.currentTarget.duration && e.currentTarget.duration !== Infinity) {
             _this.progress = e.currentTarget.seekable.end(0) / e.currentTarget.duration;
             }
             });
             */
            return this.audio;
        },
        play: function() {
            //this.audio.play();
            this.isPlaying = true;
        },
        pause: function() {
            //this.audio.pause();
            this.isPlaying = false;
        },
        setVolume: function(volume) {
            //this.gain.gain.value = volume;
        },
        getVolume: function() {
            //return this.gain.gain.value;
        },
        getProgress: function() {
            return this.progress;
        },
        getWaveform: function() {
            return this.signal;
        },
        getSpectrum: function() {
            return this.fft.spectrum;
        },
        getTime: function() {
            return this.audio.currentTime;
        },
        update: function(e) {
            if (!this.isPlaying || !this.isLoaded)
                return;

            var
                    buffers = [],
                    channels = e.inputBuffer.numberOfChannels,
                    resolution = SAMPLE_SIZE / channels,
                    sum = function(prev, curr) {
                        return prev[ i ] + curr[ i ];
                    }, i;

            for (i = channels; i--; ) {
                buffers.push(e.inputBuffer.getChannelData(i));
            }

            for (i = 0; i < resolution; i++) {
                this.signal[ i ] = channels > 1 ?
                        buffers.reduce(sum) / channels :
                        buffers[ 0 ][ i ];
            }

            this.fft.forward(this.signal);
            this.dancer.trigger('update');
        },
        die: function(e) {
            this.proc.disconnect();
        }
    };

    function connectContext() {
        var _this = this;
        this._viz.getAdapter(function(ad) {
            _this.audio = ad.audio;
            _this.source = ad.source;
            if (ad.proc_list[_this.type] !== undefined) {
                ad.proc_list[_this.type].disconnect();
                delete ad.proc_list[_this.type];
            }
            _this.proc._window = window.window;
            _this.ad = ad;
            ad.proc_list[_this.type] = _this.proc;
            _this.proc.connect(_this.context.destination);
            _this.source.connect(_this.proc);
            _this.isLoaded = true;
            _this.progress = 1;
            _this.dancer.trigger('loaded');
        });
    }

    Dancer.adapters.webkit = adapter;

})();
