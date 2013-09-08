String.prototype.toHHMMSS = function() {
	var sec_num = parseInt(this, 10); // don't forget the second parm
	if (isNaN(sec_num))
		return '00:00'
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
}

var view = function() {
	var dom_cache = {};
	var var_cache = {};
	var time_tipe = 0;
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
				progress_bar: $('.progress > .progress_bar'),
				picture: $('.image > img')
			}
			view.state('emptied');
			dom_cache.body.on('drop', function(event) {
				event.preventDefault();
				engine.open(event.originalEvent.dataTransfer.files)
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
				view.hideImage();
			}
			$('.close').on('click', function() {
				chrome.storage.local.set({'pos_left': window.screenLeft, 'pos_top': window.screenTop}, function() {
					window.close();
				});
			});
			$('.mini').on('click', function() {
				chrome.app.window.current().minimize();
			});
			dom_cache.progress.on('click', function(e) {
				engine.position(e.offsetX / e.currentTarget.clientWidth * 100)
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
		},
		isPlaying: function() {
			dom_cache.btnPlayPause.removeClass('play').addClass('pause');
		},
		isPause: function() {
			dom_cache.btnPlayPause.removeClass('pause').addClass('play');
		},
		showImage: function(src) {
			dom_cache.picture.get(0).src = src;
		},
		hideImage: function() {
			dom_cache.picture.get(0).src = "images/no-cover.png";
		},
		setTags: function(tags) {
			if (tags === null) {
				tags = {}
			}
			if ("title" in tags) {
				dom_cache.trackname.text(tags.title)
			} else {
				dom_cache.trackname.text(engine.get_filename())
			}
			if ("album" in tags && "artist" in tags) {
				dom_cache.trackalbum.text(tags.artist + ' - ' + tags.album)
			} else
			if ("artist" in tags) {
				dom_cache.trackalbum.text(tags.artist)
			} else
			if ("album" in tags) {
				dom_cache.trackalbum.text(tags.album)
			}
			if ("picture" in tags) {
				var image = tags.picture;
				var binary = image.data.reduce(function(str, charIndex) {
					return str += String.fromCharCode(charIndex);
				}, '');
				var index = binary.indexOf('JFIF');
				var type = "jpeg"
				var pos = 6;
				if (index === -1) {
					index = binary.indexOf('PNG');
					type = "png"
					pos = 1;
				}
				if (index === -1) {
					var bin = String.fromCharCode.apply(null, [255, 216, 255, 225]);
					index = binary.indexOf(bin);
					type = "jpeg"
					pos = 0;
				}
				if (index !== -1) {
					binary = binary.substr(index - pos)
					view.showImage("data:image/" + type + ";base64," + btoa(binary));
				} else {
					console.log('Can\'t show image!');
					//console.log(binary);
					view.hideImage();
				}
			} else {
				view.hideImage();
			}
			//console.log(tags)
		},
		setProgress: function(max, pos) {
			var width = pos / max * 100;
			width = Math.round(var_cache.progress_w / 100 * width * 10) / 10;
			if (var_cache['progress_bar_w'] == width)
				return;
			var_cache['progress_bar_w'] = width;
			dom_cache.progress_bar.css('width', width + 'px');
			if (time_tipe) {
				var time = "-" + String(max - pos).toHHMMSS();
			} else {
				var time = String(pos).toHHMMSS();
			}
			dom_cache.time.html(time)
		},
		state: function(type) {
			if (type == "loadstart") {
				dom_cache.loading.show();
			}
			if (type == "loadeddata") {
				dom_cache.loading.hide();
			}
			if (type == "emptied") {
				dom_cache.loading.hide();
				dom_cache.trackname.empty();
				dom_cache.trackalbum.empty();
				dom_cache.time.empty();
				view.hideImage();
				var_cache = {};
				var_cache['progress_w'] = dom_cache.progress.width();
				view.isPause();
				view.setProgress(0.1, 0);
			}
			if (type == "error") {
				dom_cache.loading.hide();
				view.isPause()
			}
			if (type == "waiting") {
				dom_cache.loading.show();
			}
			if (type == "play") {
				dom_cache.loading.show();
				view.isPlaying()
			}
			if (type == "playing") {
				dom_cache.loading.hide();
				view.isPlaying()
			}
			if (type == "pause") {
				dom_cache.loading.hide();
				view.isPause()
			}
			if (type == "canplay") {
				engine.play();
			}
		}
	}
}();
$(function() {
	view.show();
});