Colorhythm(function($) {
  function Render(conf) { }
  Render.prototype = {
    type: $.RENDER,
    name: 'github.com/sevlyar/tiles#',
    conf: {
      mode: "lines"
    },
    draw: function(cx, canvas, samples) {
      var w = canvas.width,
        h = canvas.height;
      var sqw = w / samples.length / 2;
      // уровень насыщения, указывает при каком значении уровня сигнала
      //  происходит насыщение до полного цвета, далее идет выцветание
      var tilesVert = 7;

      function parseColor(str) {
        var r = parseInt(str.slice(1, 3), 16);
        var g = parseInt(str.slice(3, 5), 16);
        var b = parseInt(str.slice(5, 7), 16);
        return {r:r, g:g, b:b, a:1};
      }

      function formatColor(c) {
        return 'rgba('+c.r+','+c.g+','+c.b+','+c.a+')';
      }

      function saturate(v, sat) {
        if (sat < 0) {
          v += Math.ceil(sat * v);
        } else {
          v += Math.ceil(sat * (255 - v));
        }
        if (v > 255) v = 255;
        return v;
      }

      function drawTiles(tilesHor, tilesVert, tiles, mode) {
        var tw = w / tilesHor;
        var th = h / tilesVert;
        var border = tw / 10;
        if (mode == "lines") {
          for (var x = 0; x < tilesHor; x++) {
            var y = tilesVert - 1;
            var px = x * tw;
            var py = y * th;
            cx.fillStyle = tiles[x * tilesVert + y];
            var width = tw * samples[x];
            cx.fillRect(px + tw/2 - width/2, 0, width, h);
          }
          return;
        }
        for (var x = 0; x < tilesHor; x++) {
          for (var y = 0; y < tilesVert; y++) {
            var px = x * tw;
            var py = y * th;
            cx.fillStyle = tiles[x * tilesVert + y];
            if (mode == "rectangles") {
              cx.fillRect(px + border, py + border, tw - 2*border, th - 2*border);
            } else {
              cx.beginPath();
              cx.arc(px + tw / 2, py + th /2, samples[x]*(th/1.7), 0, 2*Math.PI, false);
              cx.fill();
            }
          }
        }
      }

      var tiles = [];
      for (var x = 0; x < samples.length; x++) {
        for (var y = tilesVert - 1; y >= 0; y--) {
          const threshold1 = 0.5;
          const threshold2 = 0.8;
          const saturation = 0.4;

          var color = 'rgba(0,0,0,0)';
          var level = samples[x];
          var sat = 0; // saturation in range [0; 1]
          if (level < threshold1) {
            sat = -(threshold1 - level) / (1 - threshold1);
          }
          if (level > threshold2) {
            sat = saturation * (level - threshold2) / (1 - threshold2);
          }
          if (y < tilesVert * samples[x]) {
            var c = parseColor($.RingColors[x]);
            c.r = saturate(c.r, sat);
            c.g = saturate(c.g, sat);
            c.b = saturate(c.b, sat);
            color = formatColor(c);
          }
          tiles.push(color);
        }
      }

      drawTiles(samples.length, tilesVert, tiles, this.conf.mode);
    }
  };
  $.registerComponent(Render);
});
