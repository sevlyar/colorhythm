// processor bypass
Colorhythm(function($) {
	function Processor(conf) {	}
	Processor.prototype = {
		type: $.PROCESSOR,
		name: 'standard#bypass',
		process: function(buffer) {
			return buffer;
		}
	};
	$.registerComponent(Processor);
	$.Bypass = function() {
		return new Processor();
	};
});

Colorhythm(function($) {
	var plugs = {};

	function Jack(conf) {
		this.conf.name = conf && conf.name || 'master';
	}
	Jack.prototype = {
		type: $.SOURCE,
		name: 'standard#jack',
		_stub: $.createBuffer(4),
		getData: function() {
			var plug = plugs[this.conf.name];
			if (!plug) {
				return this._stub;
			}
			plug.getData();
		}
	}
	Jack.prototype.constructor = Jack;
	$.registerComponent(Jack);

	// define jack plug-in point
	function Plug(conf) {
		this.conf.name = conf && conf.name || 'master';
		plugs[this.conf.name] = conf.source;
	}
	Plug.prototype = {
		type: $.SOURCE,
		name: 'standard#plug',
		_stub: Jack.prototype._stub,
		getData: Jack.prototype.getData
	}
	Plug.prototype.constructor = Plug;
	$.registerComponent(Plug);
})

// processor discrete Haar wavelet transform
Colorhythm(function($) {
	function Processor(conf) {	}
	Processor.prototype = {
		type: $.PROCESSOR,
		name: 'standard#dwt.haar',
		process: function(buffer) {
			if (this.lb === undefined || this.lb.length != buffer.length) {
				this.lb = $.createBuffer(buffer.length);
				this.hb = $.createBuffer(buffer.length);
			}
			this.pass(buffer, buffer.length / 2);
			for (var i = 2; i < buffer.length; ) {
				i *= 2;
				this.pass(this.lb, buffer.length / i);
			}
			this.hb[0] = this.lb[0];
			return this.hb;
		},
		pass: function(src, hlen) {
			for (var i = 0; i < hlen; i++) {
				var a = src[2*i];
				var b = src[2*i+1];
				var lo = (a+b)/2;
				var hi = (a-b)/2;
				this.lb[i] = lo;
				this.hb[hlen+i] = hi;
			}
		}
	};
	$.registerComponent(Processor);
});

// processor spectrum on discrete Haar wavelet transform
Colorhythm(function($) {
	function Processor(conf) {	}
	Processor.prototype = {
		type: $.PROCESSOR,
		name: 'standard#dwt.haar.spectrum',
		process: function(buffer) {
			if (this.b === undefined || this.b.length != buffer.length) {
				this.b = $.createBuffer(Math.log(buffer.length)/Math.LN2+1);
			}
			var n = 0;
			var from = 0;
			for (var to = 1; to <= buffer.length; to *= 2) {
				this.b[n] = 0;
				for (var i = from; i < to; i++) {
					var l = buffer[i];
					if (l < 0) {
						l = -l;
					}
					if (l > this.b[n]) {
						this.b[n] = l;
					}
				}
				n++;
				from = to;
			}
			return this.b;
		}
	};
	$.registerComponent(Processor);
});

// processor levels normalizer
Colorhythm(function($) {
	function Processor(conf) { }
	Processor.prototype = {
		type: $.PROCESSOR,
		name: 'standard#levels.normalizer',
		conf: {
			a: 0.07,
			n: 2
		},
		process: function(buffer) {
			if (this.b === undefined || this.b.length != buffer.length) {
				this.b = $.createBuffer(buffer.length);
				this.time = $.fillArray($.createBuffer(buffer.length), 1.0);
			}
			for (var i = 0; i < buffer.length; i++) {
				var l = buffer[i];
				this.time[i] = (1 - this.conf.a)*this.time[i] + this.conf.a*l;
				l /= this.time[i] * this.conf.n;
				l -= 0.2;
				if (l > 1) {
					l = 1;
				} else if (l < 0) {
					l = 0;
				}
				this.b[i] = l;
			}
			return this.b;
		}
	};
	$.registerComponent(Processor);
});

Colorhythm(function($) {
	function Processor(conf) { }
	Processor.prototype = {
		type: $.PROCESSOR,
		name: 'standard#levels.fader',
		conf: {
			fadeTime: 200,
		},
		process: function(samples, ts) {
			// initializtion
			if (this.b === undefined || this.b.length != samples.length) {
				this.b = $.fillArray($.createBuffer(samples.length), 0);
			}
			if (this.prevTs === undefined) {
				this.prevTs = ts;
			}
			var sincePrev = ts - this.prevTs
			this.prevTs = ts;
			// processing
			var d = sincePrev / this.conf.fadeTime
			for (var i = 0; i < samples.length; i++) {
				// fade level;
				this.b[i] -= d * this.b[i];
				if (this.b[i] < 0) {
					this.b[i] = 0
				}
				var level = samples[i];
				if (level > this.b[i]) {
					this.b[i] = level;
				}
			}
			return this.b;
		}
	};
	$.registerComponent(Processor);
});

// processor channel normalizer
Colorhythm(function($) {
	function Processor(conf) { }
	Processor.prototype = {
		type: $.PROCESSOR,
		name: 'standard#levels.channelnormalizer',
		conf: {
			scaleDuration: 3000, // milliseconds
			lowLimit: 0.01,
			cutOff: 0.1
		},
		process: function(samples, ts) {
			// initializtion
			if (this.b === undefined || this.b.length != samples.length) {
				this.b = $.createBuffer(samples.length);
				this.max = $.fillArray($.createBuffer(samples.length), 0.0001);
			}
			if (this.prevTs === undefined) {
				this.prevTs = ts;
			}
			var sincePrev = ts - this.prevTs
			this.prevTs = ts;
			// processing
			var d = sincePrev / this.conf.scaleDuration
			for (var i = 0; i < samples.length; i++) {
				var level = samples[i];
				if (level > this.max[i]) {
					this.max[i] = level;
				}
				// reduce level in time;
				this.max[i] -= d * this.max[i];
				if (this.max[i] < this.conf.lowLimit) {
					this.max[i] = this.conf.lowLimit;
				}
			}
			// adjust max levels
			for (var i = 0; i < this.max.length; i++) {
				var l, r;
				if (i == 0) {
					l = this.max[i];
				} else {
					l = this.max[i-1];
				}
				if (i >= this.max.length - 1) {
					r = this.max[i];
				} else {
					r = this.max[i+1];
				}
				var limit = (l+r)/3;
				if (this.max[i] < limit) {
					this.max[i] = limit;
				}
			}
			// normalize channels
			for (var i = 0; i < samples.length; i++) {
				var level = samples[i];
				// scale signal
				level /= this.max[i];
				if (level < this.conf.cutOff) {
					level = 0;
				}
				this.b[i] = level;
			}

			// logging
			if (this.mark === undefined) {
				this.mark = ts
			}
			if (ts - this.mark > 2000) {
				printArray("max", this.max);
				this.mark = ts;
			}

			return this.b;
		}
	};
	$.registerComponent(Processor);
});

function printArray(msg, v) {
	var arr = []
	for (var i = 0; i < v.length; i++) {
		var n = v[i]
		if (n > 0.001) {
			n = n.toFixed(2);
		}
		arr.push(n);
	}
	console.log(msg, arr);
}

// render fader
Colorhythm(function($) {
	function Render(conf) { }
	Render.prototype = {
		type: $.RENDER,
		name: 'standard#fader',
		conf: {
			color: 'rgba(255,255,255,0.4)'
		},
		draw: function(cx, canvas) {
			cx.fillStyle = this.conf.color;
			cx.fillRect(0, 0, canvas.width, canvas.height);
		}
	};
	$.registerComponent(Render);
	$.Fader = function() {
		return new Render();
	};
});

// render oscilloscope
Colorhythm(function($) {
	function Render(conf) {	}
	Render.prototype = {
		type: $.RENDER,
		name: 'standard#oscilloscope',
		angle: 0,
		draw: function(cx, canvas, samples) {
			var w = canvas.width,
				h = canvas.height;
			var hh = h/2;
			var hscale = (h/2);
			var vscale = (w/samples.length);

			cx.beginPath();
			cx.moveTo(0, hh);
			for (var i = 0; i < samples.length; i+=2) {
				cx.lineTo(vscale*i, hh + samples[i]*hscale);
			}
			cx.stroke();
		}
	};
	$.registerComponent(Render);
	$.Oscilloscope = function() {
		return new Render();
	};
});

// render peakmeter
Colorhythm(function($) {
	function Render(conf) {	}
	Render.prototype = {
		type: $.RENDER,
		name: 'standard#peakmeter',
		conf: {
			color: 'white',
			shift: 2,
			width: 2,
		},
		draw: function(cx, canvas, samples) {
			var w = canvas.width,
				h = canvas.height;
			var hh = h/2;
			var hscale = (h);
			var rmar = 4;
			var rwd = w / samples.length - rmar;

			var x = 0;
			for (var i = 0; i < samples.length; i++) {
				cx.fillStyle = this.conf.color;
				var peak = hscale*samples[i];
				cx.fillRect(x + this.conf.shift, h - peak, this.conf.width, peak);
				x += (rwd + rmar);
			}
		}
	};
	$.registerComponent(Render);
	$.Oscilloscope = function() {
		return new Render();
	};
});

// render rotate-shadow
Colorhythm(function($) {
	function Render(conf) {	}
	Render.prototype = {
		type: $.RENDER,
		name: 'standard#rotate-shadow',
		conf: {
			speed: 0.02
		},
		draw: function(cx, canvas) {
			var w = canvas.width,
				h = canvas.height;
			cx.save();
			cx.translate(w/2, h/2);
			cx.rotate(this.conf.speed);
			cx.translate(-w/2, -h/2);
			cx.drawImage(canvas, 0, 0);
			cx.restore();
		}
	};
	$.registerComponent(Render);
});

// render scale-shadow
Colorhythm(function($) {
	function Render(conf) {	}
	Render.prototype = {
		type: $.RENDER,
		name: 'standard#scale-shadow',
		conf: {
			min: 0.995,
			max: 1.08,
			channel: 0
		},
		draw: function(cx, canvas, data) {
			var w = canvas.width,
				h = canvas.height;
			cx.save();
			cx.translate(w/2, h/2);
			var d = this.conf.max - this.conf.min;
			var l = data[this.conf.channel];
			var scale = this.conf.min + d*l;
			cx.scale(scale, scale);
			cx.translate(-w/2, -h/2);
			cx.drawImage(canvas, 0, 0);
			cx.restore();
		}
	};
	$.registerComponent(Render);
});

// render stroke-colorer
Colorhythm(function($) {
	function Render(conf) {	}
	Render.prototype = {
		type: $.RENDER,
		name: 'standard#stroke-colorer',
		draw: function(cx, canvas, data) {
			var max = 0,
				imax = 0;
			for (var i = 0; i < data.length; i++) {
				if (data[i] > max) {
					max = data[i];
					imax = i;
				}
			}
			if (max > 0.8) {
				cx.strokeStyle = $.RingColors[imax];
			} else {
				cx.strokeStyle = 'black';
			}
		}
	};
	$.registerComponent(Render);
});
