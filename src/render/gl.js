// SPDX-License-Identifier: Apache-2.0
// @ts-nocheck
import { buildFragmentSource, getVertexSource } from './shader.js';

/** @typedef {{ print: (t: unknown) => string, uniforms: (g: unknown) => Float32Array | number[], glsl: (tree: unknown, name: string) => string }} EngineLike */

/**
 * @param {{ engine: EngineLike, canvas: HTMLCanvasElement, coarsePointer?: boolean }} opts
 */
export function createRenderer(opts) {
  const { engine, canvas } = opts;
  const maxSteps = opts.coarsePointer ? 96 : 120;
  const vsSource = getVertexSource();

  /** @type {{ gl: WebGL2RenderingContext | null, vs: WebGLShader | null, vao: WebGLVertexArrayObject | null, par: { COMPLETION_STATUS_KHR: number } | null, fbo: WebGLFramebuffer | null, tex: WebGLTexture | null, fw: number, fh: number, cache: Map<string, unknown>, tick: number, info: string, bg: number[] }} */
  const state = {
    gl: null,
    vs: null,
    vao: null,
    par: null,
    fbo: null,
    tex: null,
    fw: 0,
    fh: 0,
    cache: new Map(),
    tick: 0,
    info: '',
    bg: [0.82, 0.85, 0.81],
  };

  const uniCache = new WeakMap();
  const keyOf = (g) => engine.print(g.t) + '#' + engine.print(g.c);
  const uniformsOf = (g) => {
    let u = uniCache.get(g);
    if (!u) {
      u = engine.uniforms(g);
      uniCache.set(g, u);
    }
    return u;
  };

  function init() {
    const gl = canvas.getContext('webgl2', {
      antialias: false,
      alpha: false,
      depth: false,
      stencil: false,
      preserveDrawingBuffer: false,
      powerPreference: 'high-performance',
    });
    if (!gl) return false;
    state.gl = gl;
    state.par = gl.getExtension('KHR_parallel_shader_compile');
    state.vs = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(state.vs, vsSource);
    gl.compileShader(state.vs);
    state.vao = gl.createVertexArray();
    state.fbo = gl.createFramebuffer();
    state.tex = gl.createTexture();
    state.fw = 0;
    state.fh = 0;
    state.cache = new Map();
    try {
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      state.info = ext
        ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL)
        : gl.getParameter(gl.RENDERER);
    } catch {
      state.info = '';
    }
    return true;
  }

  function programFor(g) {
    const gl = state.gl;
    if (!gl) throw new Error('WebGL not initialised');
    const key = keyOf(g);
    let e = state.cache.get(key);
    if (e) {
      e.used = ++state.tick;
      return e;
    }
    const fs = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(fs, buildFragmentSource(engine, g, { maxSteps }));
    gl.compileShader(fs);
    const prog = gl.createProgram();
    gl.attachShader(prog, state.vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    e = { key, prog, fs, state: 'pending', used: ++state.tick, err: '' };
    state.cache.set(key, e);
    if (state.cache.size > 30) {
      const victims = [...state.cache.values()]
        .filter((x) => x !== e && x.state !== 'pending')
        .sort((a, b) => a.used - b.used);
      for (const v of victims.slice(0, state.cache.size - 30)) {
        gl.deleteProgram(v.prog);
        gl.deleteShader(v.fs);
        state.cache.delete(v.key);
      }
    }
    return e;
  }

  function ready(e) {
    if (e.state !== 'pending') return e.state === 'ready';
    const gl = state.gl;
    if (!gl) return false;
    if (state.par && !gl.getProgramParameter(e.prog, state.par.COMPLETION_STATUS_KHR)) return false;
    if (!gl.getProgramParameter(e.prog, gl.LINK_STATUS)) {
      e.state = 'error';
      e.err = gl.getShaderInfoLog(e.fs) || gl.getProgramInfoLog(e.prog) || 'link failed';
      console.warn('shader error', e.err);
      return false;
    }
    const U = (n) => gl.getUniformLocation(e.prog, n);
    e.loc = {
      P: U('P'),
      res: U('uRes'),
      off: U('uOff'),
      flip: U('uFlip'),
      cam: U('uCam'),
      bg: U('uBg'),
      mt: U('uMT'),
    };
    e.state = 'ready';
    return true;
  }

  function ensureFBO(w, h) {
    const gl = state.gl;
    if (!gl) return;
    if (state.fw === w && state.fh === h) return;
    gl.bindTexture(gl.TEXTURE_2D, state.tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.bindFramebuffer(gl.FRAMEBUFFER, state.fbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, state.tex, 0);
    state.fw = w;
    state.fh = h;
  }

  function drawWith(e, g, o) {
    const gl = state.gl;
    if (!gl) return;
    if (o.fbo) {
      ensureFBO(o.w, o.h);
      gl.bindFramebuffer(gl.FRAMEBUFFER, state.fbo);
    } else gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, o.w, o.h);
    gl.useProgram(e.prog);
    gl.bindVertexArray(state.vao);
    gl.uniform4fv(e.loc.P, uniformsOf(g));
    gl.uniform2f(e.loc.res, o.fullW || o.w, o.fullH || o.h);
    gl.uniform2f(e.loc.off, o.offX || 0, o.offY || 0);
    gl.uniform1f(e.loc.flip, o.fbo ? 1 : 0);
    gl.uniform3f(e.loc.cam, o.cam[0], o.cam[1], o.cam[2]);
    gl.uniform3f(e.loc.bg, state.bg[0], state.bg[1], state.bg[2]);
    gl.uniform1f(e.loc.mt, o.mt);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  function readRaw(w, h) {
    const gl = state.gl;
    if (!gl) return new Uint8Array(0);
    const u8 = new Uint8Array(w * h * 4);
    gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, u8);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    return u8;
  }

  function readFBO(w, h) {
    const u8 = readRaw(w, h);
    return new ImageData(new Uint8ClampedArray(u8.buffer), w, h);
  }

  function setBackground(rgb) {
    state.bg = rgb;
  }

  function fragmentSourceFor(g) {
    return buildFragmentSource(engine, g, { maxSteps });
  }

  return {
    init,
    programFor,
    ready,
    drawWith,
    readRaw,
    readFBO,
    setBackground,
    fragmentSourceFor,
    get gl() {
      return state.gl;
    },
    get info() {
      return state.info;
    },
    get maxSteps() {
      return maxSteps;
    },
  };
}
