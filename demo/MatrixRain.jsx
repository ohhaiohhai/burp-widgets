import { useEffect, useRef } from 'react';
import { burstMatrix } from './effects.jsx';

/*
 * A full-screen WebGL "digital rain": accent-colored digits scrolling downward.
 * It is a background layer (pointer-events: none, z-index below content) that
 * plays a timed BURST each time a `matrix-burst` event fires (dispatched by the
 * copy buttons) — but only while the effect is toggled on. When idle it tears
 * down its animation frame so it costs nothing.
 */

const GLYPHS = '0123456789';
const BURST_MS = 8000;   // how long one burst lasts before fading out
const FADE_IN_MS = 2000; // slow ramp-up: reaches full intensity 2s in

const VERT = `
attribute vec2 a_pos;
void main() { gl_Position = vec4(a_pos, 0.0, 1.0); }
`;

const FRAG = `
precision highp float;
uniform vec2  u_res;
uniform vec2  u_cell;
uniform float u_time;
uniform float u_intensity;
uniform float u_glyphCount;
uniform vec3  u_color;
uniform sampler2D u_atlas;

float rand(vec2 c) { return fract(sin(dot(c, vec2(12.9898, 78.233))) * 43758.5453); }

void main() {
  vec2 frag = gl_FragCoord.xy;
  vec2 coord = frag / u_cell;
  float col = floor(coord.x);
  vec2 cellUv = fract(coord);

  float rows = u_res.y / u_cell.y;
  float rowFromTop = (u_res.y - frag.y) / u_cell.y;

  // Per-column speed + phase so columns fall independently.
  float speed  = mix(5.0, 16.0, rand(vec2(col, 1.0)));
  float offset = rand(vec2(col, 7.0)) * 120.0;
  float head = mod(u_time * speed + offset, rows + 24.0);

  // Distance behind the falling head (0 = head, grows up the trail).
  float dist = head - rowFromTop;
  float trail = (dist >= 0.0 && dist < 20.0) ? (1.0 - dist / 20.0) : 0.0;
  float headGlow = smoothstep(1.6, 0.0, abs(dist));

  // Glyph for this cell, reshuffled a couple times a second.
  float row = floor(rowFromTop);
  float g = floor(rand(vec2(col, row + floor(u_time * 2.5))) * u_glyphCount);
  float gx = (g + clamp(cellUv.x, 0.04, 0.96)) / u_glyphCount;
  float glyph = texture2D(u_atlas, vec2(gx, 1.0 - cellUv.y)).a;

  vec3 headColor = mix(u_color, vec3(1.0), 0.6); // lighter leading edge
  vec3 color = u_color * trail + headColor * headGlow;
  float alpha = glyph * (trail + headGlow) * u_intensity;
  gl_FragColor = vec4(color, clamp(alpha, 0.0, 1.0));
}
`;

function compile(gl, type, src) {
  const sh = gl.createShader(type);
  gl.shaderSource(sh, src);
  gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
    console.warn('MatrixRain shader error:', gl.getShaderInfoLog(sh));
    gl.deleteShader(sh);
    return null;
  }
  return sh;
}

function makeAtlasTexture(gl) {
  const tile = 64;
  const c = document.createElement('canvas');
  c.width = tile * GLYPHS.length;
  c.height = tile;
  const ctx = c.getContext('2d');
  ctx.clearRect(0, 0, c.width, c.height);
  ctx.fillStyle = '#fff';
  ctx.font = `bold ${Math.floor(tile * 0.78)}px "Courier New", monospace`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (let i = 0; i < GLYPHS.length; i++) {
    ctx.fillText(GLYPHS[i], i * tile + tile / 2, tile / 2 + 2);
  }
  const tex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, c);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  return tex;
}

/* Current --accent (incl. swatch override) as [r,g,b] 0–1, for the rain color. */
function readAccentRGB() {
  const fallback = [0.18, 1.0, 0.33];
  try {
    let v = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim();
    if (v[0] === '#') v = v.slice(1);
    if (v.length === 3) v = v.split('').map((c) => c + c).join('');
    if (v.length !== 6) return fallback;
    const n = parseInt(v, 16);
    return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
  } catch (e) {
    return fallback;
  }
}

export default function MatrixRain() {
  const canvasRef = useRef(null);
  const rafRef = useRef(0);
  const burstStartRef = useRef(-Infinity);
  const scaleRef = useRef(1);       // brightness multiplier for the current burst
  const durRef = useRef(BURST_MS);  // duration of the current burst

  useEffect(() => {
    const canvas = canvasRef.current;
    const gl = canvas.getContext('webgl', { alpha: true, premultipliedAlpha: false });
    if (!gl) return undefined;

    const vs = compile(gl, gl.VERTEX_SHADER, VERT);
    const fs = compile(gl, gl.FRAGMENT_SHADER, FRAG);
    if (!vs || !fs) return undefined;
    const prog = gl.createProgram();
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      console.warn('MatrixRain link error:', gl.getProgramInfoLog(prog));
      return undefined;
    }

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const aPos = gl.getAttribLocation(prog, 'a_pos');

    const u = {
      res: gl.getUniformLocation(prog, 'u_res'),
      cell: gl.getUniformLocation(prog, 'u_cell'),
      time: gl.getUniformLocation(prog, 'u_time'),
      intensity: gl.getUniformLocation(prog, 'u_intensity'),
      glyphCount: gl.getUniformLocation(prog, 'u_glyphCount'),
      color: gl.getUniformLocation(prog, 'u_color'),
      atlas: gl.getUniformLocation(prog, 'u_atlas'),
    };
    const tex = makeAtlasTexture(gl);
    let color = readAccentRGB(); // refreshed at each burst start
    const dpr = () => Math.min(window.devicePixelRatio || 1, 2);

    function resize() {
      const d = dpr();
      const w = Math.floor(window.innerWidth * d);
      const h = Math.floor(window.innerHeight * d);
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
      gl.viewport(0, 0, canvas.width, canvas.height);
    }

    function clear() {
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
    }

    function render(intensity) {
      resize();
      const d = dpr();
      gl.useProgram(prog);
      gl.enableVertexAttribArray(aPos);
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);
      gl.uniform2f(u.res, canvas.width, canvas.height);
      gl.uniform2f(u.cell, 16 * d, 20 * d); // original cell size => bigger digits
      gl.uniform1f(u.time, performance.now() / 1000);
      gl.uniform3f(u.color, color[0], color[1], color[2]);
      gl.uniform1f(u.intensity, intensity);
      gl.uniform1f(u.glyphCount, GLYPHS.length);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.uniform1i(u.atlas, 0);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }

    function loop() {
      const elapsed = performance.now() - burstStartRef.current;
      const fadeIn = Math.min(elapsed / FADE_IN_MS, 1);
      const decay = Math.max(1 - elapsed / durRef.current, 0);
      // Keep a floor while the burst is live so the first frame always shows.
      const base = Math.max(fadeIn * decay, decay > 0 ? 0.08 : 0);
      const intensity = base * scaleRef.current;
      if (intensity <= 0) {
        clear();
        canvas.style.display = 'none'; // leave the compositor when idle
        rafRef.current = 0;
        return;
      }
      render(intensity);
      rafRef.current = requestAnimationFrame(loop);
    }

    function onBurst(e) {
      const d = (e && e.detail) || {};
      const scale = typeof d.scale === 'number' ? d.scale : 1;
      const ms = d.ms > 0 ? d.ms : BURST_MS;
      const now = performance.now();
      color = readAccentRGB(); // pick up the current accent / swatch choice
      if (rafRef.current) {
        // A burst is already running: keep the stronger scale, extend if later,
        // and don't restart the clock (so a scroll can't dim an active copy burst).
        scaleRef.current = Math.max(scaleRef.current, scale);
        const curEnd = burstStartRef.current + durRef.current;
        if (now + ms > curEnd) durRef.current = now + ms - burstStartRef.current;
      } else {
        scaleRef.current = scale;
        durRef.current = ms;
        burstStartRef.current = now;
      }
      canvas.style.display = 'block'; // show synchronously — no React commit race
      if (!rafRef.current) rafRef.current = requestAnimationFrame(loop);
    }

    // Scrolling triggers a subtle burst, throttled so it isn't constant.
    let lastScroll = 0;
    function onScroll() {
      const now = performance.now();
      if (now - lastScroll < 500) return;
      lastScroll = now;
      burstMatrix({ scale: 0.5, ms: 2200 });
    }

    window.addEventListener('matrix-burst', onBurst);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('matrix-burst', onBurst);
      window.removeEventListener('scroll', onScroll);
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = 0;
      }
      // NB: do NOT lose the GL context here. In React StrictMode (dev) this
      // effect runs mount→cleanup→mount; losing the context on the first
      // cleanup leaves the re-created context dead, so nothing ever renders.
    };
  }, []);

  return <canvas ref={canvasRef} className="matrix-canvas" aria-hidden="true" />;
}
