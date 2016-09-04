var Colorhythm = (function(){
	function Colorhythm(f) {
		f(Colorhythm);
	}
	Colorhythm.plugin = function(f) {
		f(Colorhythm);
	};
	return Colorhythm;
}());

Colorhythm(function($) {
	function ColorhythmError(id, message, err) {
		this.name = 'ColorhythmError';
		this.id = id || 'ERR';
		this.message = message || '';
		this.err = err || null;
	}
	ColorhythmError.prototype = new Error();
	ColorhythmError.prototype.constructor = ColorhythmError;

	$.onerror = null;
	$.error = function(id, message, err) {
		var m = 'Colorhythm error: ' + message;
		if (err) {
			if (!err.stack) {
				m += ': ' + err.name + ': ' + err.message;
			}
			else {
				m += ':\n' + err.stack;
			}
		}
		console.error(m);
		if ($.onerror) {
			$.onerror(new ColorhythmError(id, message, err));
		}
	};
});

Colorhythm(function($) {
	var AudioContext =
		window.AudioContext ||
		window.webkitAudioContext;

	if (AudioContext) {
		console.log('Colorhythm: AudioContext supported.');
	} else {
		console.warn('Colorhythm: AudioContext not supported!');
	}

	var audioContext = null;
	$.getAudioContext = function() {
		if (audioContext === null) {
			if (AudioContext) {
				audioContext = new AudioContext();
			} else {
				$.error('EAUDIOUNSUP', 'Unable get audio context: this browser does not support Web Audio API');
			}
		}
		return audioContext;
	};
});

Colorhythm(function($) {
	navigator.getUserMedia =
		navigator.getUserMedia ||
		navigator.webkitGetUserMedia ||
		navigator.mozGetUserMedia ||
		navigator.msGetUserMedia;

	if (navigator.getUserMedia) {
		console.log('Colorhythm: navigator.getUserMedia supported.');
	} else {
		console.warn('Colorhythm: navigator.getUserMedia not supported!');
	}

	var getUserMediaConf = { audio: true };

	function getUserMediaErrorCallback(err) {
		$.error('EGETUSERMEDIA', 'Unable to access the audio device', err);
	}

	$.getUserMedia = function(callback) {
		navigator.getUserMedia(
			getUserMediaConf,
			callback,
			getUserMediaErrorCallback
		);
	};
});

Colorhythm(function($) {
	// map of pairs module_url:value
	// value:
	//	undefined - 	not loading
	//	deferred obj - 	loading
	//	true - 			loaded
	var modules = {
		"": true // this module allready loaded
	};

	function moduleLoaded(url) {
		console.log('Colorhythm: module ' + url + ' loaded.');
		var def = modules[url];
		modules[url] = true;
		def.resolve(url);
	}

	$.loadModule = function(url) {
		var def;
		switch (modules[url]) {
		case true:
			return jQuery.Deferred().resolve(url).promise();
		case undefined:
			console.log('Colorhythm: loading module ' + url + '...');
			def = modules[url] = jQuery.Deferred();
			jQuery.getScript('plugins/' + url)
				.done(function() { moduleLoaded(url); })
				.fail(function(jqxhr, settings, exception) {
					$.error(url + ' module loading error', exception);
				})
				.fail(def.reject)
			;
		}
		return modules[url].promise();
	};
});

Colorhythm(function($) {
	$.SOURCE = 'source';
	$.PROCESSOR = 'processor';
	$.RENDER = 'render';
	$.SCREEN = 'screen';

	var components = { };

	$.registerComponent = function(comp) {
		console.log('Colorhythm: ' + comp.prototype.type + ' ' + comp.prototype.name +' registered.');
		components[comp.prototype.name] = comp;
	};

	$.createComponent = function(descr) {
		if (typeof descr == 'string') {
			descr = { name: descr, conf: {} };
		}

		var name = descr.name;
		var conf = descr.conf;
		var def = jQuery.Deferred();

		var resolve = function() {
			var comp = new components[name](conf);
			var conf = jQuery.extend(comp.conf, descr.conf);
			jQuery.extend(comp, descr);
			comp.conf = conf;
			console.log('Colorhythm: ' + comp.type + ' ' + comp.name +' created with settings', conf);
			def.resolve(comp);
		}

		var loaded = function() {
			if (components[name] !== undefined) {
				resolve();
			} else {
				$.error('not found component ' + name);
				def.reject(name + ' component not found');
			}
		}

		if (components[name] !== undefined) {
			resolve();
		} else {
			$.loadModule(name.split('#')[0]+'.js')
				.done(loaded)
				.fail(def.reject)
			;
		}

		return def.promise();
	};

	$.createComponents = function(descrs) {
		var comps = { length: 0 };
		jQuery.each(descrs, function(i, descr) {
			comps[i] = $.createComponent(descr)
				.done(function(comp) {
					comps[i] = comp;
				});
			comps.length++;
		});
		var def = jQuery.Deferred();
		jQuery.when.apply(jQuery, comps)
			.done(def.resolve)
			.fail(def.reject);
		return def.promise();
	}

	var Loader = $.Loader = function() {
		this.tasks = [];
		this.progress = 0;
		this.scheduled = 0;
	};

	Loader.prototype.load = function(obj) {
		for (var i = 0; i < this.tasks.length; i++) {
			this.tasks[i] = this.tasks[i]();
		}
		var def = jQuery.Deferred();
		jQuery.when.apply(jQuery, this.tasks)
			.done(function() {
				def.resolve(obj);
			})
			.fail(def.reject);
		this.tasks = [];
		return def.promise();
	};

	Loader.prototype.schedule = function(descr, obj, key) {
		this.scheduled++;
		var self = this;
		this.tasks.push(function() {
			return $.createComponent(descr)
				.done(function(comp) {
					obj[key] = comp;
					self.progress++;
				})
		})
		return this;
	};

	Loader.prototype.scheduleArray = function(descrs, target) {
		for (var i = 0; i < descrs.length; i++) {
			this.schedule(descrs[i], target||descrs, i);
		}
		return this;
	}
});

Colorhythm(function($) {
  	window.requestAnimationFrame =
  		window.requestAnimationFrame ||
  		window.mozRequestAnimationFrame ||
  		window.webkitRequestAnimationFrame ||
  		window.msRequestAnimationFrame;

	var active = [];

	function refresh() {
		if (active.length) {
			requestAnimationFrame(refresh);
			for (var i = 0; i < active.length; i++) {
				active[i].handle();
			}
		}
	}

	$.startHandling = function(component) {
		if (!active.length) {
			requestAnimationFrame(refresh);
		} else {
			if (active.indexOf(component) >= 0) {
				return;
			}
		}
		active.push(component);
	};

	$.stopHandling = function(component) {
		var i = active.indexOf(component);
		if (i >= 0) {
			active.splice(i, 1);
		}
	};
})

Colorhythm(function($) {

	var Scene = $.Scene = function(conf) {
		this.conf = conf;
		this.plugs = {};
		this.process = [];
		this.renders = [];

		var loader = new $.Loader();

		return loader
			.schedule(conf.screen, this, 'screen')
			.scheduleArray(conf.process, this.process)
			.scheduleArray(conf.renders, this.renders)
			.load(this)
		;
	};

	Scene.prototype.powerOn = function() {
		$.startHandling(this);
	};

	Scene.prototype.powerOff = function() {
		$.stopHandling(this);
	};

	Scene.prototype.handle = function() {
		this.handleProcessors();
		this.handleRenders();
		this.screen.present();
	};

	// временно сделано по одной линии
	Scene.prototype.handleProcessors = function() {
		var buffer = null;
		for (var i = 0; i < this.process.length; i++) {
			var comp = this.process[i];
			try {
				buffer = comp.process(buffer);
				if (comp.plug) {
					this.plugs[comp.plug] = buffer;
				}
			} catch (err) {
				$.error('ECOMPERR', 'processor "'+comp.name+'" ('+i+') threw error', err);
				this.powerOff();
				return;
			}
		}
	};

	Scene.prototype.handleRenders = function() {
		for (var i = 0; i < this.renders.length; i++) {
			var render = this.renders[i];
			// if (!render.buffers) {
				render.buffers = [];
				if (render.jacks) {
					for (var k = 0; k < render.jacks.length; k++) {
						render.buffers[k] = this.plugs[render.jacks[k]];
					}
				}
			// }
			try {
				this.screen.draw(render, render.buffers[0]);
				} catch (err) {
				$.error('ECOMPERR', 'render "'+render.name+'" ('+i+') threw error', err);
				this.powerOff();
				return;
			}
		}
	};
});

Colorhythm(function($) {
	$.fillArray = function(array, value) {
		for (var i = 0; i < array.length; i++) {
			array[i] = value;
		}
		return array;
	};

	$.createBuffer = function(length) {
		return $.fillArray(new Float32Array(length), 0.0);
	};
});

Colorhythm(function($) {
	$.RingColors = ['#FF0000', '#FF7400', '#FFAA00', '#FFD300', '#FFFF00', '#9FEE00', '#00CC00', '#009999', '#1240AB', '#3914B0', '#7109AB', '#CD0074'];
});

Colorhythm(function($) {
	var analyser = null;
	var source = null;
	var u8buf = $.fillArray(new Uint8Array(4), 128);
	var f32buf = new Float32Array(4);

	function setStream(stream) {
		source = $.getAudioContext().createMediaStreamSource(stream);

		// create and setup analyser
		analyser = $.getAudioContext().createAnalyser();
		analyser.fftSize = 2048;
		source.connect(analyser);

		// create data buffer
		var bufferLength = analyser.frequencyBinCount;
		u8buf = $.fillArray(new Uint8Array(bufferLength), 128);
		f32buf = new Float32Array(bufferLength);
	}

	function Source(conf) {
		if (!analyser) {
			analyser = {
				getByteTimeDomainData: function() {}
			},
			$.getUserMedia(function(stream) {
				setStream(stream);
			});
		}
	}
	Source.prototype = {
		type: $.SOURCE,
		name: '#recorder',
		process: function() {
			analyser.getByteTimeDomainData(u8buf);
			for (var i = 0; i < u8buf.length; i++) {
				f32buf[i] = u8buf[i] / 128.0 - 1;
			}
			return f32buf;
		}
	};
	$.registerComponent(Source);
	$.Recorder = function() {
		return new Source();
	};
});

Colorhythm(function($) {
	var analyser = null;
	var source = null;
	var u8buf = $.fillArray(new Uint8Array(4), 128);
	var f32buf = new Float32Array(4);

	function loadSoundFile(url) {
		var xhr = new XMLHttpRequest();
	  	xhr.open('GET', url, true);
	  	xhr.responseType = 'arraybuffer';
	  	xhr.onload = function(e) {
	  		console.log(e);
	  		var audioData = xhr.response;
	    	$.getAudioContext().decodeAudioData(audioData, function(decoded) {
	      		play(decoded);
	    	}, function(e) {
	      		console.log('Error decoding file', e);
	    	});
	  	};
	  	xhr.send();
	}

	function play(buffer) {
		var context = $.getAudioContext();
		source = context.createBufferSource();
		source.buffer = buffer;

		source.connect(context.destination);
		source.loop = true;

		analyser = context.createAnalyser();
		analyser.fftSize = 2048;
		source.connect(analyser);

		var bufferLength = analyser.frequencyBinCount;
		u8buf = $.fillArray(new Uint8Array(bufferLength), 128);
		f32buf = new Float32Array(bufferLength);

		source.start(0);
	}

	function Source(conf) {
		if (!analyser) {
			analyser = {
				getByteTimeDomainData: function() {}
			},
			loadSoundFile("https://cs1-41v4.vk-cdn.net/p20/551a35ae900b51.mp3?extra=UP0CWUuTItRiiwGz0-54x1DAEk9XeerXylBoajmiTuIT4oXWlOtQH7kMWDcbBJFSQS9RiaP8owfxKQPZ-aJwz8hIlQqXJtCXpVLGAidcn_1USuG-vXEFl_QxtXCDFvA_zC_k904Xob8-Gw");
		}
	}
	Source.prototype = {
		type: $.SOURCE,
		name: '#player',
		conf: {
			source: ""
		},
		process: function() {
			analyser.getByteTimeDomainData(u8buf);
			for (var i = 0; i < u8buf.length; i++) {
				f32buf[i] = u8buf[i] / 128.0 - 1;
			}
			return f32buf;
		}
	};
	$.registerComponent(Source);
	$.Player = function() {
		return new Source();
	};
});

Colorhythm(function($) {
	function Screen(conf) {
		this._offcanv = document.createElement('canvas');
		this._cx2d = this._offcanv.getContext('2d');
		this._cx2d.save();
	}
	Screen.prototype = {
		type: $.SCREEN,
		name: '#screen',

		_canv: null,
		canvas: function(canv) {
			var old = this._canv;
			if (canv !== undefined) {
				this._canv = canv;
			}
			return old;
		},
		_active: true,
		on: function() {
			this._active = true;
		},
		off: function() {
			this._active = false;
			this._canv.getContext('2d').clearRect(0, 0, this._canv.width, this._canv.height);
		},
		draw: function(render, data) {
			if (this._active) {
				if (this._offcanv.width != this._canv.clientWidth) {
					this._canv.width = this._canv.clientWidth;
					this._offcanv.width = this._canv.clientWidth;
				}
				if (this._offcanv.height != this._canv.clientHeight) {
					this._canv.height = this._canv.clientHeight;
					this._offcanv.height = this._canv.clientHeight;
				}
				render.draw(this._cx2d, this._offcanv, data);
			}
		},
		present: function() {
			if (this._canv !== null && this._active) {
				this._cx2d.restore();
				this._cx2d.save();
				this._canv.getContext('2d').drawImage(this._offcanv, 0, 0);
			}
		}
	};
	$.registerComponent(Screen);
	$.Screen = function() {
		return new Screen();
	};
});
