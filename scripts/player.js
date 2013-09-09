toHHMMSS = function(val) {
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
	if (parseInt(hours) > 0) {
		var time = hours + ':' + minutes + ':' + seconds;
	} else {
		var time = minutes + ':' + seconds;
	}
	return time;
};

var view = function() {
	var dom_cache = {};
	var var_cache = {};
	var time_tipe = 0;
	var isPlaying = function() {
		dom_cache.btnPlayPause.removeClass('play').addClass('pause');
	};
	var isPause = function() {
		dom_cache.btnPlayPause.removeClass('pause').addClass('play');
	};
	var showImage = function(src) {
		dom_cache.picture.get(0).src = src;
	};
	var hideImage = function() {
		dom_cache.picture.get(0).src = "images/no-cover.png";
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
				volume: $('.volume')
			};
			dom_cache.progress.slider({
				range: "min",
				min: 0,
				max: 1000,
				step: 10,
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
			dom_cache.body.on('drop', function(event) {
				event.preventDefault();
				engine.open(event.originalEvent.dataTransfer.files);
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
				hideImage();
			};
			$('.close').on('click', function() {
				chrome.storage.local.set({'pos_left': window.screenLeft, 'pos_top': window.screenTop}, function() {
					window.close();
				});
			});
			$('.mini').on('click', function() {
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
			$(window).keypress(function(event) {
				if ( 'keyCode' in event == false ) {
					return;
				}
				if (event.keyCode == 32) {
					event.preventDefault();
					dom_cache.btnPlayPause.trigger('click');
				}
			});
		},
		setTags: function(tags) {
			if (tags === null) {
				tags = {};
			}
			if ("title" in tags) {
				dom_cache.trackname.text(tags.title);
			} else {
				dom_cache.trackname.text(engine.get_filename());
			}
			if ("album" in tags && "artist" in tags) {
				dom_cache.trackalbum.text(tags.artist + ' - ' + tags.album);
			} else
			if ("artist" in tags) {
				dom_cache.trackalbum.text(tags.artist);
			} else
			if ("album" in tags) {
				dom_cache.trackalbum.text(tags.album);
			}
			if ("picture" in tags) {
				showImage("data:image/" + tags.picture.type + ";base64," + btoa(tags.picture.data));
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
			var max = 1.0;
			var width_persent = pos / max * 100;
			dom_cache.volume.slider("value", width_persent);
			chrome.storage.local.set({'volume': width_persent});
			if (width_persent > 50) {
				if (var_cache['volume_image'] === 1) {
					return;
				}
				var_cache['volume_image'] = 1;
				dom_cache.volume.parent().css('background-image', 'url(images/sound_high.png)');
			} else
			if (pos === 0) {
				if (var_cache['volume_image'] === 2) {
					return;
				}
				var_cache['volume_image'] = 2;
				dom_cache.volume.parent().css('background-image', 'url(images/sound_mute.png)');
			} else
			if (width_persent < 50) {
				if (var_cache['volume_image'] === 3) {
					return;
				}
				var_cache['volume_image'] = 3;
				dom_cache.volume.parent().css('background-image', 'url(images/sound_low.png)');
			}
		},
		state: function(type) {
			console.log(type);
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
				isPause()
			}
			if (type === "waiting") {
				dom_cache.loading.show();
			}
			if (type === "play") {
				dom_cache.loading.show();
				isPlaying()
			}
			if (type === "playing") {
				dom_cache.loading.hide();
				isPlaying()
			}
			if (type === "pause") {
				dom_cache.loading.hide();
				isPause()
			}
			if (type === "canplay") {
				engine.play();
			}
		}
	}
}();
$(function() {
	view.show();
});