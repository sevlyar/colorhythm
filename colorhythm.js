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
	var AudioContext = 	window.AudioContext || 
						window.webkitAudioContext;

	if (AudioContext) {
		console.log('Colorhythm: AudioContext supported.');
	} else {
		console.error('Colorhythm: AudioContext not supported!');
	}

	var audioContext = null;
	$.getAudioContext = function() {
		if (audioContext === null) {
			audioContext = new AudioContext();
		}
		return audioContext;
	};
});

Colorhythm(function($) {
	navigator.getUserMedia = 	navigator.getUserMedia ||
								navigator.webkitGetUserMedia ||
								navigator.mozGetUserMedia ||
								navigator.msGetUserMedia;

	if (navigator.getUserMedia) {
		console.log('Colorhythm: navigator.getUserMedia supported.');
	} else {
		console.error('Colorhythm: navigator.getUserMedia not supported!');
	}

	var getUserMediaConf = { audio: true, video: true };

	function getUserMediaErrorCallback(err) {
		console.error('Colorhythm: navigator.getUserMedia error: ', err);
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
	var scriptFiles = { };
	$.loadScriptFile = function(url) {
		var def = jQuery.Deferred();
		if (url.length === 0) {
			def.resolve();
			return def.promise();
		}
		if (scriptFiles[url] === undefined) {
			console.log('Colorhythm: loading module ' + url + '...');
			scriptFiles[url] = def;
			jQuery.getScript('plugins/' + url)
				.done(function() {
					console.log('Colorhythm: module ' + url + ' loaded.');
					scriptFiles[url] = true;
					def.resolve();
				})
				.fail(function(jqxhr, settings, exception) {
					console.error('Colorhythm: ' + url + ' module loading error: ', exception);
				})
				.fail(def.reject)
			;
		} else {
			if (scriptFiles[url] !== true) {
				return scriptFiles[url].promise();
			} else {
				def.resolve();
			}
		}
		return def.promise();
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
	$.createComponent = function(name, conf) {
		var def = jQuery.Deferred();
		function resolve() {
			var comp = new components[name](conf);
			console.log('Colorhythm: ' + comp.type + ' ' + comp.name +' created with settings', conf);
			def.resolve(comp);
		}
		if (components[name] !== undefined) {
			resolve();
		} else {
			$.loadScriptFile(name.split('#')[0])
				.done(function() {
					if (components[name] !== undefined) {
						resolve();
					} else {
						console.error('Colorhythm: not found component ' + name);
						def.reject(name + ' component not found');
					}
				})
				.fail(def.reject)
			;
		}
		return def.promise();
	};
});

Colorhythm(function($) {
	var active = [];
	function refresh() {
		requestAnimationFrame(refresh);
		for (var i = 0; i < active.length; i++) {
			active[i].handle();
		}
	}
	refresh();

	function Node(comp) {
		this._comp = comp;
		this._nodes = [];
		switch(comp.type) {
		case $.SOURCE:
			active.unshift(this);
			break;
		case $.SCREEN:
			for (var i = 0; i < active.length; i++) {
				if (active[i]._comp === comp) {
					return;
				}
			}
			active.push(this);
			break;
		case $.PROCESSOR:
		case $.RENDER:
			break;
		default:
			throw new Error('invalid type of component: ' + comp.type);
		}
	}
	Node.prototype = {
		getComponent: function() {
			return this._comp;
		},
		add: function(comp) {
			switch(this._comp.type) {
			case $.SOURCE:
			case $.PROCESSOR:
				if (comp.type === $.SOURCE) {
					throw new Error('unable append component of type "source" to component of type' + this._comp.type);
				}
				break;
			case $.RENDER:
				if (comp.type !== $.SCREEN) {
					throw new Error('"render" may draw only on "screen"');
				}
				break;
			case $.SCREEN:
				throw new Error('unable append to "screen" child node');
			}
			var n = new Node(comp);
			this._nodes.push(n);
			return n;
		},
		handle: function(param) {
			var comp = this._comp;
			switch(comp.type) {
			case $.SOURCE:
				param = comp.getData();
				break;
			case $.PROCESSOR:
				param = comp.process(param);
				break;
			case $.RENDER:
				for (var i = 0; i < this._nodes.length; i++) {
					this._nodes[i]._comp.draw(this._comp, param);
				}
				return;
			case $.SCREEN:
				this._comp.present();
				return;
			}
			for (i = 0; i < this._nodes.length; i++) {
				this._nodes[i].handle(param);
			}
		}
	};

	$.Tree = function(comp) {
		if (comp.type !== $.SOURCE) {
			throw new Error('root of tree must be component of type "source"');
		}
		return new Node(comp);
	};
});

Colorhythm(function($) {
	function loadTree(parent, nodeConf, screen) {
		if (typeof nodeConf == 'string') {
			nodeConf = { name: nodeConf, nodes: [] };
		}
		return $.createComponent(nodeConf.name, nodeConf.conf)
			.done(function(comp) {
				var node = (parent !== null) ? parent.add(comp) : $.Tree(comp);

				var i = -1;
				function loadChild() {
					if ((i+1) < nodeConf.nodes.length) {
						i++;
						loadTree(node, nodeConf.nodes[i], screen).then(loadChild);
					}
				}

				if (comp.type === $.RENDER) {
					node.add(screen);
				} else {
					loadChild();
				}
			});
	}
	$.createVisualization = function(conf, screen) {
		loadTree(null, conf, screen);
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
	function Source(conf) {
		var self = this;
		function getUserMediaSuccessCallback(stream) {
			self.setStream(stream);
		}
		$.getUserMedia(getUserMediaSuccessCallback);
	}
	Source.prototype = {
		type: $.SOURCE,
		name: '#recorder',
		getData: function() {
			this.analyser.getByteTimeDomainData(this.u8buf);
			for (var i = 0; i < this.u8buf.length; i++) {
				this.f32buf[i] = this.u8buf[i] / 128.0 - 1;
			}
			return this.f32buf;
		},

		setStream: function(stream) {
			this.source = $.getAudioContext().createMediaStreamSource(stream);

			// create and setup analyser
			this.analyser = $.getAudioContext().createAnalyser();
			this.analyser.fftSize = 2048;
			this.source.connect(this.analyser);

			// create data buffer
			var bufferLength = this.analyser.frequencyBinCount;
			this.u8buf = $.fillArray(new Uint8Array(bufferLength), 128);
			this.f32buf = new Float32Array(bufferLength);
		},
		// dummies
		analyser: {
			getByteTimeDomainData: function() {}
		},
		u8buf: $.fillArray(new Uint8Array(4), 128),
		f32buf: new Float32Array(4)
	};
	$.registerComponent(Source);
	$.Recorder = function() {
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
			var self = this;
			function resizeHandler() {
				self._offcanv.width = self._canv.width;
				self._offcanv.height = self._canv.height;
			}

			var old = this._canv;
			if (canv !== undefined) {
				if (old !== null) {
					jQuery(old).off('resize', resizeHandler);
				}
				this._canv = canv;
				if (canv !== null) {
					resizeHandler();
					jQuery(canv).on('resize', resizeHandler);
				}
			}
			return old;
		},
		present: function() {
			if (this._canv !== null) {
				this._cx2d.restore();
				this._cx2d.save();
				this._canv.getContext('2d').drawImage(this._offcanv, 0, 0);
			}
		},
		draw: function(render, data) {
			render.draw(this._cx2d, this._offcanv, data);
		}

		// _active: true,
		// active: function(f) {
		// 	if (f !== undefined) {
		// 		this._active = f;
		// 	}
		// 	return this._active;
		// }
	};
	$.registerComponent(Screen);
	$.Screen = function() {
		return new Screen();
	};
});
