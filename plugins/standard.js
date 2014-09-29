// processor bypass
Colorhythm(function($) {
	function Processor(conf) {	}
	Processor.prototype = {
		type: $.PROCESSOR,
		name: 'standard.js#bypass',
		process: function(buffer) {
			return buffer;
		}
	};
	$.registerComponent(Processor);
	$.Bypass = function() {
		return new Processor();
	};
});

// processor discrete Haar wavelet transform
Colorhythm(function($) {
	function Processor(conf) {	}
	Processor.prototype = {
		type: $.PROCESSOR,
		name: 'standard.js#dwt.haar',
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
		name: 'standard.js#dwt.haar.spectrum',
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
	function Processor(conf) {	
		this.conf = jQuery.extend({}, this.conf, conf);
	}
	Processor.prototype = {
		type: $.PROCESSOR,
		name: 'standard.js#levels.normalizer',
		conf: {
			a: 0.7,
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


// render fader
Colorhythm(function($) {
	function Render(conf) {	
		this.conf = jQuery.extend({}, this.conf, conf);
	}
	Render.prototype = {
		type: $.RENDER,
		name: 'standard.js#fader',
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
		name: 'standard.js#oscilloscope',
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
		name: 'standard.js#peakmeter',
		draw: function(cx, canvas, samples) {
			var w = canvas.width,
				h = canvas.height;
			var hh = h/2;
			var hscale = (h);
			var rmar = 4;
			var rwd = w / samples.length - rmar;

			var x = 0;
			for (var i = 0; i < samples.length; i++) {
				cx.fillStyle = 'black';
				cx.beginPath();
				var peak = hscale*samples[i];
				cx.rect(x, h - peak, rwd, peak);
				cx.closePath();
				cx.fill();
				cx.stroke();
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
		name: 'standard.js#rotate-shadow',
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
		name: 'standard.js#scale-shadow',
		conf: {
			min: 0.995,
			max: 1.03,
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
