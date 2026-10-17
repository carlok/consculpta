(() => {
'use strict';
const E = ENGINE;

/* ================= Renderer (RENDER bundle) ================= */
const fc = document.getElementById('focus');
const GLR = RENDER.createRenderer({engine:E, canvas:fc, coarsePointer:matchMedia('(pointer: coarse)').matches});
const {prelude:PRE, scene:POST, noise:NOISE_GL} = RENDER.getSharedGlslBlocks();
const THUMB_CAM = RENDER.THUMB_CAM;
const {ZMIN, ZMAX} = RENDER;
const uniCache = new WeakMap();
function uniformsOf(g){ let u = uniCache.get(g); if (!u){ u = E.uniforms(g); uniCache.set(g, u); } return u; }
const GL = {gl:null, info:''};
function glInit(){
  const ok = GLR.init();
  GL.gl = GLR.gl;
  GL.info = GLR.info;
  return ok;
}
function programFor(g){ return GLR.programFor(g); }
function ready(e){ return GLR.ready(e); }
function drawWith(e, g, o){ GLR.drawWith(e, g, o); }
function readRaw(w, h){ return GLR.readRaw(w, h); }
function readFBO(w, h){ return GLR.readFBO(w, h); }
function syncRendererBg(){ GLR.setBackground(BG); }

/* ================= State ================= */
const $ = id => document.getElementById(id);
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const coarse = matchMedia('(pointer: coarse)').matches;
const DPR = Math.min(window.devicePixelRatio || 1, 2);
const DEFAULT_CAM = E.DEFAULT_CAMERA;
const SURFACE = [24, 2, 1, 3, 0, 6, 4, 5], COLOR = [19, 21, 20], LIGHT = [22, 23];

const S = {parent:E.startGenome(), gen:1, litter:[], litterId:0, mutation:0.35, shelf:[], kseq:0, history:[], future:[],
           spin:!reduceMotion, morph:false, morphT:0, yaw:DEFAULT_CAM.yaw, pitch:DEFAULT_CAM.pitch, dist:DEFAULT_CAM.dist, distT:DEFAULT_CAM.dist};
const CUR = {every:3, role:'advise', since:0, busy:null, notes:[], log:[], picks:[], 
             agree:0, rounds:0, pendingAsk:false, countdown:null};
let BG = [0.82, 0.85, 0.81];
let focusDirty = true, scale = coarse ? 0.6 : 1, emaDt = 16, adaptN = 0, lastTs = 0;
let thumbSize = 240, queue = [], snap = null, snapBlob = null, DL = null, glLost = false;
const drag = {active:false, x:0, y:0, touch:false};
let keyHeld = 0, keyTimer = 0;
const HIST_SAVED = 15;
const store = {
  load(){ try { return JSON.parse(localStorage.getItem('nsb.v3') || 'null'); } catch (e) { return null; } },
  /* lit: the current litter, so a reload shows the same six; hist: recent parents, so Undo survives a reload. */
  save(){ try { localStorage.setItem('nsb.v3', JSON.stringify({p:E.encode(S.parent), gen:S.gen, m:S.mutation, shelf:S.shelf, kseq:S.kseq,
    lit:S.litter.map(k => ({c:E.encode(k.g), l:k.label || '', ai:k.by === 'ai' ? 1 : 0})),
    hist:S.history.slice(-HIST_SAVED).map(h => ({p:E.encode(h.parent), gen:h.gen})),
    cur:{every:CUR.every, role:CUR.role, notes:CUR.notes, log:CUR.log.slice(0, 8), agree:CUR.agree, rounds:CUR.rounds}})); } catch (e) {} },
};

/* ================= UI construction ================= */
const pups = [];
for (let i = 0; i < 6; i++){
  const b = document.createElement('button');
  b.type = 'button'; b.className = 'pup'; b.id = 'pup-' + i;
  b.innerHTML = '<span class="pup-frame"><canvas width="240" height="240"></canvas><span class="badge" hidden>★ AI</span></span><span class="pup-meta"><span class="pup-id"></span><span class="pup-op"></span></span>';
  b.addEventListener('click', () => adopt(i, 'you'));
  $('litter').appendChild(b);
  pups.push({btn:b, cv:b.querySelector('canvas'), id:b.querySelector('.pup-id'), op:b.querySelector('.pup-op'), badge:b.querySelector('.badge')});
}
/* Gene controls. Each entry has sync(v) to show a gene value; discrete genes get radio segments, the rest sliders. */
const sliderEls = [];
function sliderRow(i){
  if (E.DISCRETE.has(i)) return segRow(i);
  const row = document.createElement('div'); row.className = 'row';
  row.innerHTML = `<label for="gene-${i}">${E.SCALARS[i].n}</label><input type="range" id="gene-${i}" min="0" max="1000" step="1" aria-describedby="gene-${i}-why"><output for="gene-${i}"></output><span class="sr-only" id="gene-${i}-why"></span>`;
  const input = row.querySelector('input'), out = row.querySelector('output');
  input.addEventListener('input', () => editScalar(i, input.value/1000));
  sliderEls[i] = {row, input, out, sync:v => { input.value = Math.round(v*1000); out.textContent = E.fmtScalar(i, v); }};
  return row;
}
/* Discrete genes: option labels, the gene value written for option k (bucket centre), and the option gene value g falls in. */
function discrete(i){
  const d = E.SCALARS[i];
  if (i === 24) return {labels:d.names, toV:k => k ? E.STRANDS_ON : E.STRANDS_OFF, idx:g => d.f(g)};
  const labels = d.names || [2, 3, 4, 5, 6, 7].map(String), n = labels.length, base = d.names ? 0 : 2;
  return {labels, toV:k => (k + 0.5)/n, idx:g => d.f(g) - base};
}
function segRow(i){
  const {labels, toV, idx} = discrete(i);
  const row = document.createElement('div'); row.className = 'row seg-row';
  row.innerHTML = `<span id="gene-${i}-l">${E.SCALARS[i].n}</span><div class="seg" role="radiogroup" id="gene-${i}" aria-labelledby="gene-${i}-l" aria-describedby="gene-${i}-why"></div><span class="sr-only" id="gene-${i}-why"></span>`;
  const seg = row.querySelector('.seg');
  const radios = labels.map((name, k) => {
    const l = document.createElement('label');
    l.innerHTML = `<input type="radio" name="gene-${i}" value="${k}"><span></span>`;
    l.querySelector('span').textContent = name;
    const r = l.querySelector('input');
    r.addEventListener('change', () => { if (r.checked) editScalar(i, toV(k)); });
    seg.appendChild(l);
    return r;
  });
  sliderEls[i] = {row, input:seg, out:null, sync:g => { const k = idx(g); radios.forEach((r, j) => { r.checked = j === k; }); }};
  return row;
}
/* '' when gene i shapes the render for genome values v, otherwise why it does not. */
function geneWhy(v, i){
  const strands = E.val(v, 24) === 1, mode = E.val(v, 2);
  if (i === 2 && strands) return 'Strands replace the surface.';
  if (i === 1 && !strands && mode === 0) return 'Solid surfaces have no thickness.';
  if (i === 3 && (strands || mode !== 2)) return 'Only used by contour surfaces.';
  return '';
}
function syncRelevance(){
  [1, 2, 3].forEach(i => {
    const why = geneWhy(S.parent.v, i), el = sliderEls[i];
    el.row.classList.toggle('idle', !!why);
    el.row.title = why;
    $(`gene-${i}-why`).textContent = why;
  });
}
SURFACE.forEach(i => $('gSurface').appendChild(sliderRow(i)));
COLOR.forEach(i => $('gColor').appendChild(sliderRow(i)));
LIGHT.forEach(i => $('gLight').appendChild(sliderRow(i)));
(() => {
  const pg = $('palgrid');
  ['', 'R', 'G', 'B'].forEach(h => { const s = document.createElement('span'); s.className = 'ph'; s.textContent = h; pg.appendChild(s); });
  [['a', 'bias', 7], ['b', 'amplitude', 10], ['c', 'frequency', 13], ['d', 'phase', 16]].forEach(([k, what, base]) => {
    const l = document.createElement('span'); l.className = 'pl'; l.textContent = `${k} ${what}`; pg.appendChild(l);
    ['r', 'g', 'b'].forEach((ch, j) => {
      const i = base + j, input = document.createElement('input');
      input.type = 'range'; input.min = '0'; input.max = '1000'; input.step = '1'; input.id = 'gene-' + i; input.className = ch;
      input.setAttribute('aria-label', `Palette ${k} (${what}), ${['red','green','blue'][j]}`);
      input.addEventListener('input', () => editScalar(i, input.value/1000));
      pg.appendChild(input); sliderEls[i] = {input, out:null, sync:v => { input.value = Math.round(v*1000); }};
    });
  });
})();
$('langRef').textContent = E.LANG;

/* ================= Rendering orchestration ================= */
function readBg(){
  const v = getComputedStyle(document.documentElement).getPropertyValue('--stage').trim();
  let m = /^#?([0-9a-f]{6})$/i.exec(v);
  if (m){ const n = parseInt(m[1], 16); return [(n >> 16 & 255)/255, (n >> 8 & 255)/255, (n & 255)/255]; }
  m = /rgba?\(([^)]+)\)/.exec(v);
  if (m){ const p = m[1].split(/[ ,/]+/).map(Number); return [p[0]/255, p[1]/255, p[2]/255]; }
  return [0.82, 0.85, 0.81];
}
function stageCss(){ const r = $('stage').getBoundingClientRect(); return [Math.max(64, Math.round(r.width)), Math.max(64, Math.round(r.height))]; }
function readRes(){ $('readRes').textContent = `${fc.width} × ${fc.height} px · zoom ${(DEFAULT_CAM.dist/S.distT).toFixed(2)}×`; }
function setScale(s){
  scale = Math.min(1, Math.max(0.28, s));
  const [w, h] = stageCss();
  const px = Math.max(64, Math.round(w*DPR*scale)), py = Math.max(64, Math.round(h*DPR*scale));
  if (fc.width !== px || fc.height !== py){ fc.width = px; fc.height = py; }
  readRes();
}

function drawFocus(){
  const e = programFor(S.parent);
  if (!ready(e)){
    const err = e.state === 'error';
    $('readFrame').textContent = err ? 'shader error' : 'compiling formula…';
    stageBusy(err ? 'This formula did not compile. Undo goes back.' : 'compiling formula…', err);
    return false;
  }
  stageBusy('');
  drawWith(e, S.parent, {w:fc.width, h:fc.height, cam:[S.yaw, S.pitch, S.dist], mt:S.morphT});
  if (afterFirstDraw){ const f = afterFirstDraw; afterFirstDraw = null; setTimeout(f, 0); }
  return true;
}
/* Runs once the parent is first on screen, so a boot-time toast is not spent while shaders compile. */
let afterFirstDraw = null;
/* Overlay while the parent's shader compiles (after a short grace period, so fast compiles don't flash) or failed. */
let busySince = 0;
function stageBusy(text, now){
  const el = $('stageBusy');
  if (!text){ busySince = 0; el.hidden = true; return; }
  const t = performance.now();
  if (!busySince) busySince = t;
  if (!now && t - busySince < 180) return;
  el.querySelector('span').textContent = text;
  el.classList.toggle('err', !!now);
  el.hidden = false;
}
function queueThumb(g, canvas, key, size){ queue = RENDER.enqueueThumb(queue, key, {g, canvas, key, size, tries:0}); }
function queueLitter(){
  S.litter.forEach((k, i) => {
    if (pups[i].cv.dataset.done !== String(S.litterId)) pups[i].btn.classList.add('pending');
    queueThumb(k.g, pups[i].cv, 'pup' + i, thumbSize);
  });
}
function queueShelf(){ shelfCanvases.forEach(({g, cv, k}) => queueThumb(g, cv, 'kept' + k, Math.round(76*DPR))); }
function processQueue(){
  if (RENDER.processThumbQueue(queue, GLR, {cam:THUMB_CAM, morphT:S.morphT, litterId:S.litterId, paintError})){
    pups.forEach(p => { if (p.cv.dataset.done === String(S.litterId)) p.btn.classList.remove('pending'); });
  }
}
function paintError(cv, T){
  if (cv.width !== T){ cv.width = cv.height = T; }
  const ctx = cv.getContext('2d'); ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--stage'); ctx.fillRect(0, 0, T, T);
  ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--muted'); ctx.font = `${Math.round(T/14)}px ui-monospace, monospace`; ctx.fillText('shader error', T*0.08, T*0.52);
  markDone(cv);
}
/* A litter canvas shows stale pixels until its job runs; .pending dims it so the label never sits over the wrong picture. */
function markDone(cv){
  cv.dataset.done = String(S.litterId);
  const btn = cv.closest('.pup'); if (btn) btn.classList.remove('pending');
}
function litterRendered(){ /* every litter canvas painted for the current litter */ return pups.every(p => p.cv.dataset.done === String(S.litterId)) && !queue.some(q => q.key.startsWith('pup')); }

/* Spin and morph only draw while the stage is on screen. */
let stageOnScreen = true;
new IntersectionObserver(es => {
  const on = es[es.length - 1].isIntersecting;
  if (on && !stageOnScreen) focusDirty = true;
  stageOnScreen = on;
}).observe($('stage'));
function frame(ts){
  const dt = lastTs ? Math.min(120, ts - lastTs) : 16; lastTs = ts;
  if (GL.gl && !glLost){
    const zooming = Math.abs(S.distT - S.dist) > 0.002;
    if (zooming){ S.dist += (S.distT - S.dist)*Math.min(1, dt*0.014); if (Math.abs(S.distT - S.dist) <= 0.002){ S.dist = S.distT; focusDirty = true; } }
    const moving = S.spin || S.morph || drag.active || keyHeld > 0 || zooming || pinch.active;
    const visible = stageOnScreen || !!(document.fullscreenElement || document.webkitFullscreenElement);
    if (S.spin && !drag.active && !snap && visible) S.yaw += dt*0.00032;
    if (S.morph && !snap && visible) S.morphT += dt*0.00008;
    if (snap){ /* the export has the GPU */ }
    else if (!visible){ /* stage scrolled away: leave the GPU to thumbnails */ }
    else if (moving){
      emaDt = emaDt*0.88 + dt*0.12;
      if (++adaptN > 14){
        adaptN = 0;
        if (emaDt > 36 && scale > 0.3) setScale(scale*0.85);
        else if (emaDt < 20 && scale < 1) setScale(scale*1.08);
      }
      if (drawFocus()) $('readFrame').textContent = `${Math.round(emaDt)} ms / frame`;
    } else if (focusDirty || scale < 1){
      if (scale < 1) setScale(1);
      if (drawFocus()){ focusDirty = false; $('readFrame').textContent = 'still · full resolution'; }
    }
    if (snap) stepSnapshot();
    else if (queue.length) processQueue();
    if (CUR.pendingAsk && !CUR.busy && litterRendered()){ CUR.pendingAsk = false; askBreeder(); }
  }
  requestAnimationFrame(frame);
}

/* ================= Breeding ================= */
const kindOf = g => `${E.val(g.v, 24) ? 'strands' : E.fmtScalar(2, g.v[2])} · ${E.fmtScalar(4, g.v[4])} · ${E.size(g.t)} nodes`;
const snapshotState = () => ({parent:E.cloneG(S.parent), gen:S.gen, litter:S.litter.map(k => ({...k, g:E.cloneG(k.g)}))});
function pushHistory(){
  S.history.push(snapshotState());
  if (S.history.length > 60) S.history.shift();
  S.future = [];
  dismissToast('history');
  syncHistoryButtons();
}
function syncHistoryButtons(){ $('undo').disabled = S.history.length === 0; $('redo').disabled = S.future.length === 0; }
function restoreState(h){
  cancelCountdown(); clearTimeout(editTimer); editing = false;
  S.parent = h.parent; S.gen = h.gen;
  if (h.litter && h.litter.length === 6){ S.litter = h.litter; S.litterId++; } else breed();   // history restored from storage has no litter
  refreshAll();
}
function undo(){
  const h = S.history.pop();
  if (!h){ toast('Nothing to undo.'); return; }
  S.future.push(snapshotState());
  restoreState(h);
}
function redo(){
  const h = S.future.pop();
  if (!h){ toast('Nothing to redo.'); return; }
  S.history.push(snapshotState());
  restoreState(h);
}
/* Toast with an Undo button that reverts the step that was just recorded. */
const undoToast = msg => toast(msg, {action:'Undo', onAction:undo, kind:'history'});
function breed(aiChild){
  cancelCountdown();
  const kids = [];
  const nCross = S.shelf.length ? 2 : 0;
  for (let i = 0; i < 6; i++){
    if (i >= 6 - nCross){
      const mate = S.shelf[Math.floor(Math.random()*S.shelf.length)];
      const mg = E.decode(mate.code);
      const h = mg && E.crossover(S.parent, mg);
      if (h){ kids.push({g:h, label:'× ' + mate.k}); continue; }
    }
    const m = E.mutate(S.parent, S.mutation);
    kids.push({g:m.g, label:m.label});
  }
  if (aiChild) kids[5] = {g:aiChild, label:aiName(), by:'ai'};
  S.litter = kids; S.litterId++;
}
function syncLitter(){
  $('litterGen').textContent = `generation ${S.gen + 1}`;
  S.litter.forEach((k, i) => {
    const p = pups[i];
    p.id.textContent = `${i + 1} · ${E.tag(k.g)}`;
    p.op.textContent = k.label || '';
    p.op.className = 'pup-op' + (k.by === 'ai' ? ' by-ai' : '');
    p.badge.hidden = !k.aiPick; p.badge.textContent = '★ ' + (k.pickBy || 'AI');
    p.btn.classList.toggle('picked', !!k.aiPick);
    p.btn.title = E.print(k.g.t);
    p.btn.setAttribute('aria-label', `Adopt offspring ${i + 1}, ${E.tag(k.g)}${k.label && k.by !== 'ai' ? `, ${k.label}` : ''}${k.aiPick ? `, ${k.pickBy || 'AI'}’s favourite` : ''}${k.by === 'ai' ? `, written by ${k.label}` : ''}`);
  });
}
function syncParent(){
  $('plateId').textContent = `G${S.gen} · ${E.tag(S.parent)}`;
  $('plateKind').textContent = kindOf(S.parent);
  sliderEls.forEach((s, i) => { if (s) s.sync(S.parent.v[i]); });
  syncRelevance();
  $('strip').style.background = E.palCSS(S.parent.v);
  if (document.activeElement !== $('fText')) $('fText').value = E.pretty(S.parent.t);
  if (document.activeElement !== $('cText')) $('cText').value = E.pretty(S.parent.c);
  $('fStats').textContent = `${E.size(S.parent.t)} nodes · ${E.cost(S.parent.t)} noise`;
  $('genomeSum').textContent = `${E.size(S.parent.t)} nodes · ${E.cost(S.parent.t)} noise · ${E.fmtScalar(4, S.parent.v[4])}`;
  if (document.activeElement !== $('fText') && document.activeElement !== $('cText')) markFormula('', null);
  if (document.activeElement !== $('code')) $('code').value = E.encode(S.parent);
  syncHistoryButtons();
  syncKeep();
}
function refreshAll(){ focusDirty = true; syncParent(); syncLitter(); queueLitter(); store.save(); }
function adopt(i, by, aiChild){
  const k = S.litter[i]; if (!k) return;
  cancelCountdown();
  if (by === 'you'){
    if (CUR.busy){ CUR.busy.abort(); }
    if (AI.on && S.litter.some(x => x.aiPick)){ CUR.rounds++; if (k.aiPick) CUR.agree++; }
    CUR.picks.push(E.print(k.g.t)); if (CUR.picks.length > 4) CUR.picks.shift();
    if (AI.on) CUR.since++;
  } else CUR.since = 0;
  pushHistory();
  S.parent = E.cloneG(k.g); S.gen += 1;
  breed(aiChild); refreshAll();
  pulsePlate();
  undoToast(`${by === 'you' ? 'Adopted' : aiName() + ' adopted'} offspring ${i + 1} · ${E.tag(S.parent)} as G${S.gen}.`);
  if (by === 'you' && CUR.every > 0 && CUR.since >= CUR.every && usable()) CUR.pendingAsk = true;
  curStatus();
}

function pulsePlate(){
  const el = document.querySelector('.plate');
  el.classList.remove('pulse'); void el.offsetWidth; el.classList.add('pulse');
}
let editTimer = 0, editing = false;
function editScalar(i, v){
  if (!editing){ pushHistory(); editing = true; }
  S.parent = E.cloneG(S.parent);
  S.parent.v[i] = v;
  focusDirty = true;
  if (sliderEls[i].out) sliderEls[i].out.textContent = E.fmtScalar(i, v);
  if (i === 2 || i === 24) syncRelevance();
  $('plateId').textContent = `G${S.gen} · ${E.tag(S.parent)}`;
  $('plateKind').textContent = kindOf(S.parent);
  $('strip').style.background = E.palCSS(S.parent.v);
  $('code').value = E.encode(S.parent);
  syncKeep();
  clearTimeout(editTimer);
  editTimer = setTimeout(() => { editing = false; breed(); syncLitter(); queueLitter(); store.save(); }, 650);
}
/* Shows a formula problem under the editors and flags the textarea it belongs to (null clears both). */
function markFormula(msg, which){
  $('fErr').textContent = msg;
  $('fText').setAttribute('aria-invalid', which === 'fText' ? 'true' : 'false');
  $('cText').setAttribute('aria-invalid', which === 'cText' ? 'true' : 'false');
}
/* Parse both formulas; returns {t, c} or marks the first error and returns null. */
function parseFormulas(){
  let t, c;
  try { t = E.parse($('fText').value); } catch (e) { markFormula('Shape: ' + e.message, 'fText'); return null; }
  try { c = E.parse($('cText').value); } catch (e) { markFormula('Colour: ' + e.message, 'cText'); return null; }
  markFormula('', null);
  return {t, c};
}
let checkTimer = 0;
['fText', 'cText'].forEach(id => {
  $(id).addEventListener('input', () => { clearTimeout(checkTimer); checkTimer = setTimeout(parseFormulas, 350); });
  $(id).addEventListener('keydown', e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)){ e.preventDefault(); $('fApply').click(); } });
});
$('fApply').addEventListener('click', () => {
  clearTimeout(checkTimer);
  const parsed = parseFormulas(); if (!parsed) return;
  const {t, c} = parsed;
  const g = {t, c, v:S.parent.v.slice()};
  if (E.size(t) > 34 || E.cost(t) > 9){ $('fErr').textContent = `Too heavy to render live: ${E.size(t)} nodes, ${E.cost(t)} noise (limit 34 and 9).`; return; }
  const st = E.stats(g);
  if (!st.ok){ $('fErr').textContent = st.why === 'flat' ? 'This formula is constant inside the block, so there is no surface.' : 'This formula changes too fast to render cleanly. Lower some frequencies.'; return; }
  E.fitIso(g);
  pushHistory(); S.parent = g; breed(); refreshAll(); undoToast('Formula applied.');
});

$('resetGenome').addEventListener('click', () => {
  cancelCountdown(); pushHistory();
  S.parent = E.startGenome(); S.gen = 1;
  breed(); refreshAll(); undoToast('Back to the starting specimen.');
});
$('resetGenes').addEventListener('click', () => {
  cancelCountdown(); pushHistory();
  const g = E.cloneG(S.parent); g.v = E.startGenome().v.slice(); E.fitIso(g);
  S.parent = g; breed(); refreshAll(); undoToast('Genes back to their defaults; the formula is unchanged.');
});
$('undo').addEventListener('click', undo);
$('redo').addEventListener('click', redo);
$('random').addEventListener('click', () => { pushHistory(); S.parent = E.randomGenome(); S.gen = 1; breed(); refreshAll(); undoToast(`Random specimen ${E.tag(S.parent)}.`); });
$('reroll').addEventListener('click', () => { cancelCountdown(); breed(); syncLitter(); queueLitter(); store.save(); });
$('rate').addEventListener('input', e => { S.mutation = e.target.value/100; $('rateOut').textContent = e.target.value + '%'; });
$('rate').addEventListener('change', () => { breed(); syncLitter(); queueLitter(); store.save(); });
function setToggle(id, on){ $(id).setAttribute('aria-pressed', on ? 'true' : 'false'); }
$('spin').addEventListener('click', () => { S.spin = !S.spin; setToggle('spin', S.spin); focusDirty = true; });
$('morph').addEventListener('click', () => { S.morph = !S.morph; setToggle('morph', S.morph); focusDirty = true; if (!S.morph) queueLitter(); });

/* Shelf */
const SHELF_MAX = 12;
let shelfCanvases = [];
function renderShelf(){
  const el = $('shelf'); el.innerHTML = ''; shelfCanvases = [];
  S.shelf.forEach(item => {
    const g = E.decode(item.code); if (!g) return;
    const wrap = document.createElement('div'); wrap.className = 'kept';
    const K = Math.round(76*DPR);
    wrap.innerHTML = `<button class="kept-open" type="button" aria-label="Load kept specimen ${item.k}"><canvas width="${K}" height="${K}"></canvas><span>${item.k} · ${E.tag(g)}</span></button><button class="kept-del" type="button" aria-label="Remove ${item.k} from the shelf">×</button>`;
    wrap.querySelector('.kept-open').addEventListener('click', () => { pushHistory(); S.parent = E.cloneG(g); breed(); refreshAll(); undoToast(`Loaded ${item.k}.`); });
    wrap.querySelector('.kept-del').addEventListener('click', () => {
      const at = S.shelf.indexOf(item);
      S.shelf = S.shelf.filter(x => x !== item); renderShelf(); store.save();
      toast(`Removed ${item.k} from the shelf.`, {action:'Undo', onAction:() => {
        if (S.shelf.some(x => x.code === item.code)) return;
        S.shelf.splice(Math.min(at, S.shelf.length), 0, item);
        if (S.shelf.length > SHELF_MAX) S.shelf.length = SHELF_MAX;
        renderShelf(); store.save();
      }});
    });
    el.appendChild(wrap);
    shelfCanvases.push({g, cv:wrap.querySelector('canvas'), k:item.k});
  });
  $('shelfEmpty').hidden = S.shelf.length > 0;
  $('shelf').hidden = S.shelf.length === 0;
  $('shelfCount').textContent = `${S.shelf.length} of ${SHELF_MAX}`;
  syncKeep();
  if (GL.gl) queueShelf();
}
/* Keep reads "Kept · K4" while the current parent is already on the shelf. */
function syncKeep(){
  const code = E.encode(S.parent), dup = S.shelf.find(x => x.code === code), b = $('keep');
  b.textContent = dup ? `Kept · ${dup.k}` : 'Keep';
  b.classList.toggle('is-kept', !!dup);
}
$('keep').addEventListener('click', () => {
  const code = E.encode(S.parent);
  const dup = S.shelf.find(x => x.code === code);
  if (dup){ toast(`Already on the shelf as ${dup.k}.`); return; }
  const first = S.shelf.length === 0;
  S.kseq += 1;
  const item = {k:'K' + S.kseq, code};
  S.shelf.unshift(item);
  const dropped = S.shelf.length > SHELF_MAX ? S.shelf.pop() : null;
  renderShelf(); store.save();
  if (dropped){
    toast(`Kept as ${item.k}. The shelf holds ${SHELF_MAX}, so ${dropped.k} was dropped.`, {action:'Undo', onAction:() => {
      S.shelf = S.shelf.filter(x => x !== item); S.shelf.push(dropped); renderShelf(); store.save();
    }});
  } else toast(first ? `Kept as ${item.k}. From the next litter on, offspring 5 and 6 graft in branches from the shelf.` : `Kept as ${item.k}.`);
});
$('copyCode').addEventListener('click', () => copyText(E.encode(S.parent), 'Genome code copied.', $('code')));
const shareUrl = () => location.origin + location.pathname + '#' + E.encode(S.parent);
$('copyLink').addEventListener('click', () => copyText(shareUrl(), 'Link copied. Opening it loads this specimen.', $('code')));
$('loadCode').addEventListener('click', () => {
  const g = E.decode($('code').value);
  if (!g){ toast('That is not a genome code. It starts with nsb3.'); return; }
  pushHistory(); S.parent = g; breed(); refreshAll(); undoToast('Genome loaded.');
});
function copyText(text, okMsg, selectEl){
  const fallback = () => { if (selectEl){ selectEl.focus(); selectEl.select(); } toast('Copy was blocked here. The text is selected; copy it with ⌘C or Ctrl+C.'); };
  try { navigator.clipboard.writeText(text).then(() => toast(okMsg), fallback); } catch (e) { fallback(); }
}

/* Orbit and zoom */
function zoomBy(f){ S.distT = RENDER.clampZoom(S.distT*f); focusDirty = true; readRes(); retireHint(); }
/* The orbit hint goes away after the first orbit or zoom, and stays away on this device. */
let hinted = false;
try { hinted = localStorage.getItem('nsb.hinted') === '1'; } catch (e) {}
document.querySelector('.hint').hidden = hinted;
function retireHint(){
  if (hinted) return;
  hinted = true;
  const h = document.querySelector('.hint'); h.classList.add('gone'); setTimeout(() => { h.hidden = true; }, 700);
  try { localStorage.setItem('nsb.hinted', '1'); } catch (e) {}
}
const stageEl = $('stage');
const pts = new Map(), pinch = {active:false, d:0, my:0};
fc.addEventListener('pointerdown', e => {
  pts.set(e.pointerId, {x:e.clientX, y:e.clientY});
  try { fc.setPointerCapture(e.pointerId); } catch (_) {}
  if (pts.size === 2){
    const [a, b] = [...pts.values()];
    pinch.active = true; pinch.d = Math.hypot(a.x - b.x, a.y - b.y) || 1; pinch.my = (a.y + b.y)/2; drag.active = false;
  } else {
    drag.active = true; drag.x = e.clientX; drag.y = e.clientY; drag.touch = e.pointerType === 'touch';
    retireHint();
  }
  fc.classList.add('grabbing');
});
fc.addEventListener('pointermove', e => {
  const p = pts.get(e.pointerId); if (!p) return;
  p.x = e.clientX; p.y = e.clientY;
  if (pinch.active && pts.size >= 2){
    const [a, b] = [...pts.values()], d = Math.hypot(a.x - b.x, a.y - b.y) || 1, my = (a.y + b.y)/2;
    zoomBy(pinch.d/d); pinch.d = d;
    /* Two fingers moving together vertically tilt the camera (one-finger vertical drags scroll the page on touch). */
    S.pitch = Math.min(1.25, Math.max(-1.25, S.pitch + (my - pinch.my)*0.008)); pinch.my = my;
    return;
  }
  if (!drag.active) return;
  const dx = e.clientX - drag.x, dy = e.clientY - drag.y; drag.x = e.clientX; drag.y = e.clientY;
  S.yaw -= dx*0.008;
  if (!drag.touch) S.pitch = Math.min(1.25, Math.max(-1.25, S.pitch + dy*0.008));
});
const endDrag = e => {
  pts.delete(e.pointerId);
  if (pts.size < 2) pinch.active = false;
  if (!pts.size){ drag.active = false; fc.classList.remove('grabbing'); focusDirty = true; }
};
fc.addEventListener('pointerup', endDrag); fc.addEventListener('pointercancel', endDrag); fc.addEventListener('lostpointercapture', endDrag);
/* The wheel zooms only once the stage is engaged (focused by a click or Tab, fullscreen) or with ⌘/Ctrl held,
   which also covers trackpad pinch. Otherwise it scrolls the page and a tip says how to zoom. */
const MOD = /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent) ? '⌘' : 'Ctrl';
let tipTimer = 0;
$('stage').addEventListener('wheel', e => {
  if (e.target.closest('.zoomer')) return;
  const engaged = stageEl.contains(document.activeElement) || !!(document.fullscreenElement || document.webkitFullscreenElement);
  if (!engaged && !e.ctrlKey && !e.metaKey){
    const tip = $('stageTip'); tip.textContent = `Click the stage or hold ${MOD} to zoom`; tip.hidden = false;
    clearTimeout(tipTimer); tipTimer = setTimeout(() => { tip.hidden = true; }, 1400);
    return;
  }
  e.preventDefault();
  $('stageTip').hidden = true;
  zoomBy(Math.exp(e.deltaY*(e.ctrlKey ? 0.01 : 0.0015)));
}, {passive:false});
$('zIn').addEventListener('click', () => zoomBy(1/1.3));
$('zOut').addEventListener('click', () => zoomBy(1.3));
function resetCamera(){ S.yaw = DEFAULT_CAM.yaw; S.pitch = DEFAULT_CAM.pitch; S.distT = DEFAULT_CAM.dist; focusDirty = true; readRes(); }
$('zReset').addEventListener('click', resetCamera);
$('stage').addEventListener('keydown', e => {
  const k = e.key; let used = true;
  if (k === 'ArrowLeft') S.yaw += 0.12; else if (k === 'ArrowRight') S.yaw -= 0.12;
  else if (k === 'ArrowUp') S.pitch = Math.min(1.25, S.pitch + 0.1); else if (k === 'ArrowDown') S.pitch = Math.max(-1.25, S.pitch - 0.1);
  else if (k === '+' || k === '=') zoomBy(1/1.3); else if (k === '-' || k === '_') zoomBy(1.3);
  else if (k === '0') resetCamera();
  else used = false;
  if (used){ e.preventDefault(); retireHint(); keyHeld = 1; focusDirty = true; clearTimeout(keyTimer); keyTimer = setTimeout(() => { keyHeld = 0; focusDirty = true; }, 220); }
});
/* Fullscreen (desktop browsers) */
const fsEnabled = !!(document.fullscreenEnabled || document.webkitFullscreenEnabled);
$('zFull').hidden = !fsEnabled;
$('zFull').addEventListener('click', async () => {
  try {
    if (document.fullscreenElement || document.webkitFullscreenElement) await (document.exitFullscreen ? document.exitFullscreen() : document.webkitExitFullscreen());
    else await (stageEl.requestFullscreen ? stageEl.requestFullscreen() : stageEl.webkitRequestFullscreen());
  } catch (e) { toast('Fullscreen isn’t available in this view.'); }
});
const onFs = () => { const on = !!(document.fullscreenElement || document.webkitFullscreenElement); setToggle('zFull', on); $('zFull').title = on ? 'Exit fullscreen' : 'Fullscreen'; focusDirty = true; };
document.addEventListener('fullscreenchange', onFs); document.addEventListener('webkitfullscreenchange', onFs);
/* Large view */
function setBig(on){
  $('bench').classList.toggle('big', on); setToggle('bigView', on);
  try { localStorage.setItem('nsb.big', on ? '1' : '0'); } catch (e) {}
}
$('bigView').addEventListener('click', () => setBig(!$('bench').classList.contains('big')));
try {
  const bigPref = localStorage.getItem('nsb.big');
  setBig(bigPref === '1');
} catch (e) {
  setBig(false);
}

/* ================= AI breeder: Anthropic API or OpenAI-compatible endpoint ================= */
const PROVIDERS = {anthropic:'Anthropic API', openai:'OpenAI-compatible'};
const EFFORTS = {
  anthropic:[['', 'Default'], ['low', 'Low'], ['medium', 'Medium'], ['high', 'High'], ['xhigh', 'Extra high'], ['max', 'Max']],
  openai:[['', 'Default (not sent)'], ['minimal', 'Minimal'], ['low', 'Low'], ['medium', 'Medium'], ['high', 'High'], ['xhigh', 'Extra high']],
};
const MODELS = {anthropic:['claude-sonnet-5-5', 'claude-opus-5-5', 'claude-haiku-5-5', 'claude-fable-5-1'], openai:[]};
const MODEL_NAMES = {'claude-haiku-5-5':'Haiku 5.5', 'claude-sonnet-5-5':'Sonnet 5.5', 'claude-opus-5-5':'Opus 5.5', 'claude-fable-5-1':'Fable 5.1'};
const AI = {on:false, provider:'anthropic', image:true, remember:false,
  cfg:{anthropic:{model:'claude-sonnet-5-5', effort:'', endpoint:'https://api.anthropic.com', key:''},
       openai:{model:'', effort:'', endpoint:'https://api.openai.com/v1', key:''}}};
const cfg = () => AI.cfg[AI.provider];
const aiName = () => 'The model';
const modelName = id => MODEL_NAMES[id] || id;
function aiLoad(){
  try {
    const a = JSON.parse(localStorage.getItem('nsb.ai') || 'null');
    if (a){
      if (typeof a.on === 'boolean') AI.on = a.on;
      AI.image = a.image !== false;
      if (PROVIDERS[a.provider]) AI.provider = a.provider;
      else if (a.provider === 'claude') AI.provider = 'anthropic';
      for (const k in AI.cfg) if (a.cfg && a.cfg[k]) for (const f of ['model', 'effort', 'endpoint']) if (typeof a.cfg[k][f] === 'string' && f in AI.cfg[k]) AI.cfg[k][f] = a.cfg[k][f];
    }
    const keys = JSON.parse(localStorage.getItem('nsb.keys') || 'null');
    if (keys){ AI.remember = true; for (const k of ['anthropic', 'openai']) if (typeof keys[k] === 'string') AI.cfg[k].key = keys[k]; }
    const old = JSON.parse(localStorage.getItem('nsb.key') || 'null');
    if (old && old.k && !AI.cfg.anthropic.key){ AI.cfg.anthropic.key = old.k; if (old.m) AI.cfg.anthropic.model = old.m; AI.remember = true; }
  } catch (e) {}
}
function aiSave(){
  try {
    const c = JSON.parse(JSON.stringify(AI.cfg)); delete c.anthropic.key; delete c.openai.key;
    localStorage.setItem('nsb.ai', JSON.stringify({on:AI.on, provider:AI.provider, image:AI.image, cfg:c}));
    if (AI.remember) localStorage.setItem('nsb.keys', JSON.stringify({anthropic:AI.cfg.anthropic.key, openai:AI.cfg.openai.key}));
    else localStorage.removeItem('nsb.keys');
    localStorage.removeItem('nsb.key');
  } catch (e) {}
}
/* '' when the breeder can run; otherwise what is missing */
function aiReason(){
  if (!AI.on) return 'off';
  const c = cfg();
  if (!c.endpoint.trim()) return 'Add the endpoint URL.';
  if (!c.model.trim()) return 'Add a model name.';
  if (AI.provider === 'anthropic' && !c.key.trim()) return 'Paste an Anthropic API key.';
  return '';
}
function usable(){ return aiReason() === ''; }
function curStatus(text){
  const el = $('curStatus');
  if (text){ el.textContent = text; return; }
  const why = aiReason();
  if (why === 'off'){ el.textContent = ''; return; }
  if (CUR.busy){ el.textContent = `looking at generation ${S.gen + 1}…`; return; }
  if (why){ el.textContent = 'not set up · see model settings'; return; }
  const agree = CUR.rounds ? ` · you agreed ${CUR.agree} of ${CUR.rounds}` : '';
  if (CUR.every === 0){ el.textContent = 'only when asked' + agree; return; }
  const left = Math.max(0, CUR.every - CUR.since);
  el.textContent = (left === 0 ? 'its turn is next' : `next turn in ${left} pick${left === 1 ? '' : 's'}`) + agree;
}
function syncAI(){
  const p = AI.provider, c = cfg();
  $('curOn').setAttribute('aria-pressed', AI.on ? 'true' : 'false'); $('curOn').textContent = AI.on ? 'On' : 'Off';
  $('curBody').hidden = !AI.on; $('curOffNote').hidden = AI.on;
  $('curTitle').textContent = 'AI breeder';
  $('curAsk').textContent = 'Ask model now';
  $('aiProvider').value = p;
  const selWrap = $('aiModelSelWrap'); if (selWrap) selWrap.hidden = true;
  $('aiModelWrap').hidden = false;
  $('aiEndpointWrap').hidden = false; $('aiKeyWrap').hidden = false; $('aiRememberWrap').hidden = false;
  if (document.activeElement !== $('aiModel')) $('aiModel').value = c.model;
  if (document.activeElement !== $('aiEndpoint')) $('aiEndpoint').value = c.endpoint;
  if (document.activeElement !== $('aiKey')) $('aiKey').value = c.key;
  $('aiKey').placeholder = p === 'anthropic' ? 'sk-ant-…' : 'optional for local servers';
  $('aiModels').innerHTML = MODELS[p].map(m => `<option value="${m}"></option>`).join('');
  const eff = $('aiEffort');
  eff.innerHTML = EFFORTS[p].map(([v, l]) => `<option value="${v}">${l}</option>`).join('');
  if (!EFFORTS[p].some(([v]) => v === c.effort)) c.effort = '';
  eff.value = c.effort;
  $('aiImage').checked = AI.image; $('aiRemember').checked = AI.remember;
  const model = c.model || 'no model yet';
  $('curSetSum').textContent = `${PROVIDERS[p]} · ${model}${c.effort ? ' · ' + c.effort + ' effort' : ''}`;
  const why = aiReason(), note = $('aiNote');
  note.classList.toggle('warn', !!why && why !== 'off');
  note.textContent = why && why !== 'off' ? why
    : p === 'anthropic' ? 'Requests go straight from this page to the endpoint with your key. Leave the endpoint as is unless you use a proxy or gateway. Higher effort means more thinking and a slower, costlier turn.'
    : 'Any server with an OpenAI-style /chat/completions route: OpenAI, OpenRouter, a gateway, or a local server. The endpoint is the base URL, for example https://api.openai.com/v1. Local servers must allow requests from this page (for Ollama, set OLLAMA_ORIGINS). Untick the picture for models without vision.';
  curStatus();
}
function setBusy(ctl){
  CUR.busy = ctl;
  $('curAsk').disabled = !!ctl; $('curStop').hidden = !ctl;
  curStatus();
}
async function sheetBlob(){
  const cell = 300, pad = 6, W = cell*3, H = cell*2;
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const ctx = c.getContext('2d');
  ctx.fillStyle = `rgb(${BG.map(x => Math.round(x*255)).join(',')})`; ctx.fillRect(0, 0, W, H);
  pups.forEach((p, i) => {
    const x = (i % 3)*cell, y = Math.floor(i/3)*cell;
    ctx.drawImage(p.cv, x + pad/2, y + pad/2, cell - pad, cell - pad);
    ctx.fillStyle = 'rgba(20,24,22,.85)'; ctx.fillRect(x + 8, y + 8, 30, 30);
    ctx.fillStyle = '#fff'; ctx.font = '600 20px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(String(i + 1), x + 23, y + 24);
  });
  return new Promise(res => c.toBlob(b => res(b), 'image/jpeg', 0.9));
}
function buildPrompt(withImage){
  const lines = S.litter.map((k, i) => `${i + 1}. shape: ${E.print(k.g.t)}\n   colour: ${E.print(k.g.c)}\n   surface: ${kindOf(k.g)}${k.by === 'ai' ? '  (your own proposal from last turn)' : ''}`).join('\n');
  const notes = CUR.notes.length ? CUR.notes.map((n, i) => `${i + 1}. ${n}`).join('\n') : 'none yet, this is your first turn';
  const picks = CUR.picks.length ? CUR.picks.map(p => '- ' + p).join('\n') : '- none yet';
  const agree = CUR.rounds ? `When you both looked at the same litter, the human picked your favourite ${CUR.agree} of ${CUR.rounds} times.` : '';
  return `You are co-breeding abstract 3D sculptures with a human in an interactive evolution app. Each sculpture is the set of points where a scalar field f(x, y, z) rises above an iso level inside a block (sphere, cube or drum), with the field faded toward the block's edge. The field is a formula in the small language below. A sculpture whose surface is listed as "strands" is drawn as thin filaments, traced where the formula's iso-surface crosses a rotated copy of itself. The app normalises every formula automatically (zero mean, fixed spread) and picks a sensible iso level, so only a formula's shape matters, not its scale. Colour comes from a cosine palette a + b·cos(2π(c·t + d)), where t mixes depth with a second colour formula.

${withImage ? 'The image is a contact sheet of the current litter: six offspring numbered 1-6, left to right then top to bottom, all rendered from the same camera on a plain studio background.' : 'No image is available this turn, so judge from the formulas alone.'}

Formula language:
${E.LANG}

All six descend from this parent (generation ${S.gen}):
shape: ${E.print(S.parent.t)}

Offspring:
${lines}

Formulas the human chose recently, oldest first:
${picks}
${agree}

Your taste notes from earlier turns, oldest first:
${notes}

Judge the six as sculptures: silhouette, balance, surface rhythm, colour harmony, and whether they read as intentional forms rather than noise. Then write one offspring of your own: a formula derived from your favourite that you expect to look better, in the direction your taste is heading. Keep it under 30 operators and at most 8 noise evaluations (noise counts 1, fbm counts its octaves, warp counts 3). Stay consistent with your earlier notes unless you have a reason to change course, and say so if you do.

Reply with only this JSON object:
{"favorite": 3, "ranking": [3, 1, 6, 2, 5, 4], "critique": "one sentence, under 25 words, on why your favourite works", "taste": "one sentence on the direction you want to push this lineage", "formula": "your shape formula", "color_formula": "a colour formula, or an empty string to keep your favourite's", "palette": {"a": [0.5, 0.5, 0.5], "b": [0.45, 0.4, 0.35], "c": [1, 1, 1], "d": [0, 0.15, 0.2]}, "strands": false}
Set "strands" to true to draw your offspring as filaments, false for a surface. Set "palette" to null to keep your favourite's colours. Palette ranges: a 0.3-0.7, b 0.15-0.55, c 0.3-1.7, d 0-1.`;
}
function parseReply(text){
  const t = String(text || '').trim();
  try { return JSON.parse(t); } catch (e) {}
  const f = /```(?:json)?\s*([\s\S]*?)```/i.exec(t);
  if (f){ try { return JSON.parse(f[1]); } catch (e) {} }
  const a = t.indexOf('{'), b = t.lastIndexOf('}');
  if (a >= 0 && b > a){ try { return JSON.parse(t.slice(a, b + 1)); } catch (e) {} }
  throw {code:'invalid_json', message:'no JSON in reply'};
}
const blobToB64 = blob => new Promise((res, rej) => { const fr = new FileReader(); fr.onload = () => res(String(fr.result).split(',')[1]); fr.onerror = rej; fr.readAsDataURL(blob); });
function endpointUrl(base, path){
  let u = String(base || '').trim().replace(/\/+$/, '');
  if (path === 'anthropic'){ if (/\/messages$/.test(u)) return u; return /\/v1$/.test(u) ? u + '/messages' : u + '/v1/messages'; }
  return /\/chat\/completions$/.test(u) ? u : u + '/chat/completions';
}
async function httpJSON(url, init){
  let r;
  try { r = await fetch(url, init); }
  catch (e) {
    if (e && e.name === 'AbortError') throw e;
    throw {code:'network', message:'could not reach the endpoint. Check the URL, and that the server accepts requests from this page (CORS).'};
  }
  const j = await r.json().catch(() => ({}));
  if (!r.ok){
    const m = (j.error && (j.error.message || (typeof j.error === 'string' && j.error))) || j.message || `HTTP ${r.status}`;
    throw {code:'http', message:`${m} (HTTP ${r.status})`};
  }
  return j;
}
async function viaAnthropic(prompt, blob, c, signal){
  const content = [];
  if (blob) content.push({type:'image', source:{type:'base64', media_type:'image/jpeg', data:await blobToB64(blob)}});
  content.push({type:'text', text:prompt});
  const body = {model:c.model.trim(), max_tokens:({xhigh:32000, max:32000, high:16000, '':16000})[c.effort] || 8000, messages:[{role:'user', content}]};
  if (c.effort) body.output_config = {effort:c.effort};
  const j = await httpJSON(endpointUrl(c.endpoint, 'anthropic'), {method:'POST', signal, headers:{
    'content-type':'application/json', 'x-api-key':c.key.trim(), 'anthropic-version':'2023-06-01', 'anthropic-dangerous-direct-browser-access':'true'},
    body:JSON.stringify(body)});
  const text = (j.content || []).filter(b => b.type === 'text').map(b => b.text).join('');
  return {json:parseReply(text), who:modelName(j.model || c.model)};
}
async function viaOpenAI(prompt, blob, c, signal){
  const content = blob ? [{type:'text', text:prompt}, {type:'image_url', image_url:{url:'data:image/jpeg;base64,' + await blobToB64(blob)}}] : prompt;
  const body = {model:c.model.trim(), messages:[{role:'user', content}]};
  if (c.effort) body.reasoning_effort = c.effort;
  const headers = {'content-type':'application/json'};
  if (c.key.trim()) headers.authorization = 'Bearer ' + c.key.trim();
  const j = await httpJSON(endpointUrl(c.endpoint, 'openai'), {method:'POST', signal, headers, body:JSON.stringify(body)});
  const m = j.choices && j.choices[0] && j.choices[0].message;
  const text = !m ? '' : typeof m.content === 'string' ? m.content : Array.isArray(m.content) ? m.content.map(x => x.text || '').join('') : '';
  return {json:parseReply(text), who:j.model || c.model};
}
async function askBreeder(){
  if (CUR.busy || !usable()) return;
  const litterId = S.litterId, p = AI.provider, c = {...cfg()}, name = aiName();
  const ctl = new AbortController(); setBusy(ctl);
  try {
    const blob = AI.image ? await sheetBlob() : null;
    const prompt = buildPrompt(!!blob);
    const out = p === 'anthropic' ? await viaAnthropic(prompt, blob, c, ctl.signal)
              : await viaOpenAI(prompt, blob, c, ctl.signal);
    if (S.litterId !== litterId || !AI.on) return;
    applyVerdict(out.json, out.who, name);
  } catch (e) {
    const code = e && e.code;
    if (code === 'cancelled' || (e && e.name === 'AbortError')) {}
    else if (code === 'images_unavailable'){ toast('Images can’t be sent here; the model will judge from the formulas.'); }
    else if (code === 'rate_limited'){ toast(`${name} is rate-limited right now. Try again in a bit.`); }
    else if (code === 'invalid_json'){ logNote(`${name}’s reply could not be read as JSON. Ask again, or try another model.`); }
    else { logNote(`${name} could not answer: ` + ((e && e.message) || 'unknown error')); }
  } finally {
    setBusy(null);
  }
}
function buildAiChild(res, favG){
  if (!res.formula || typeof res.formula !== 'string') return {why:'no formula'};
  let t, c;
  try { t = E.parse(res.formula); } catch (e) { return {why:'formula did not parse: ' + e.message}; }
  try { c = res.color_formula && String(res.color_formula).trim() ? E.parse(res.color_formula) : JSON.parse(JSON.stringify(favG.c)); } catch (e) { c = JSON.parse(JSON.stringify(favG.c)); }
  if (E.size(t) > 34 || E.cost(t) > 9) return {why:`too heavy (${E.size(t)} nodes, ${E.cost(t)} noise)`};
  if (E.size(c) > 12 || E.cost(c) > 3) c = JSON.parse(JSON.stringify(favG.c));
  const g = {t, c, v:favG.v.slice()};
  if (res.palette && typeof res.palette === 'object') E.paletteToGenes(res.palette, g.v);
  if (typeof res.strands === 'boolean') g.v[24] = res.strands ? 0.86 : 0.25;
  if (!E.fitIso(g)) return {why:'formula has no visible surface'};
  return {g};
}
function applyVerdict(res, who, name){
  name = name || aiName();
  const fav = Math.round(Number(res && res.favorite));
  if (!(fav >= 1 && fav <= 6)){ logNote(`${name}’s reply had no favourite.`); return; }
  const rank = Array.isArray(res.ranking) ? res.ranking.map(Number).filter(n => n >= 1 && n <= 6) : [];
  const favK = S.litter[fav - 1];
  const child = buildAiChild(res, favK.g);
  const critique = String(res.critique || '').slice(0, 240), taste = String(res.taste || '').slice(0, 240);
  if (taste){ CUR.notes.push(taste); if (CUR.notes.length > 5) CUR.notes.shift(); }
  S.litter.forEach(k => { k.aiPick = false; });
  favK.aiPick = true; favK.pickBy = name;
  let replaced = 0;
  if (CUR.role === 'advise'){
    if (child.g){
      let slot = rank.length ? rank[rank.length - 1] : 6;
      if (slot === fav) slot = fav === 6 ? 5 : 6;
      S.litter[slot - 1] = {g:child.g, label:name, by:'ai'};
      replaced = slot;
      pups[slot - 1].btn.classList.add('pending'); pups[slot - 1].cv.dataset.done = '';
      queueThumb(child.g, pups[slot - 1].cv, 'pup' + (slot - 1), thumbSize);
    }
    syncLitter();
  } else {
    syncLitter();
    startCountdown(fav, child.g || null, name);
  }
  CUR.since = 0;
  const id = 'v' + Date.now().toString(36);
  CUR.log.unshift({id, gen:S.gen + 1, fav, tag:E.tag(favK.g), critique, taste, formula:child.g ? E.print(child.g.t) : '', why:child.why || '', replaced, role:CUR.role, who:who || name});
  if (CUR.log.length > 8) CUR.log.pop();
  renderLog(id); store.save(); curStatus();
}
let logSeq = 0, logHidden = false;
const logOpen = new Set();
const logTimers = new Map();
try { logHidden = localStorage.getItem('nsb.logHidden') === '1'; } catch (e) {}
function logNote(text){ CUR.log.unshift({note:text, id:'n' + (++logSeq)}); if (CUR.log.length > 8) CUR.log.pop(); renderLog(); }
const AUTO_CLOSE_MS = 12000;
function scheduleClose(id){
  clearTimeout(logTimers.get(id));
  logTimers.set(id, setTimeout(() => {
    const d = document.querySelector(`#curLog details[data-id="${id}"]`);
    if (!d){ logOpen.delete(id); return; }
    if (d.matches(':hover') || d.contains(document.activeElement)){ scheduleClose(id); return; }
    d.open = false;
  }, AUTO_CLOSE_MS));
}
function renderLog(freshId){
  const ol = $('curLog'); ol.innerHTML = '';
  CUR.log.forEach(e => { if (!e.id) e.id = 'n' + (++logSeq); });
  if (freshId){ logOpen.add(freshId); }
  CUR.log.forEach(e => {
    const li = document.createElement('li');
    if (e.note){ li.className = 'plain'; li.innerHTML = '<p class="taste"></p>'; li.querySelector('p').textContent = e.note; ol.appendChild(li); return; }
    li.innerHTML = '<details><summary><span class="lh mono"><span class="h1"></span><span class="h2"></span></span><span class="crit"></span></summary><div class="nbody"><p class="taste"></p><p class="child"></p></div></details>';
    const d = li.querySelector('details');
    d.dataset.id = e.id;
    li.querySelector('.h1').textContent = `G${e.gen} · favourite ${e.fav} · ${e.tag}`;
    li.querySelector('.h2').textContent = [e.who, e.role === 'turns' ? 'chose the parent' : (e.replaced ? `its offspring replaced ${e.replaced}` : '')].filter(Boolean).join(' · ');
    li.querySelector('.crit').textContent = e.critique || '(no comment)';
    li.querySelector('.taste').textContent = e.taste ? 'Direction: ' + e.taste : '';
    li.querySelector('.child').textContent = e.formula ? 'Its formula: ' + e.formula : (e.why ? 'Its own offspring was dropped: ' + e.why : '');
    d.open = logOpen.has(e.id);
    d.addEventListener('toggle', () => {
      if (d.open) logOpen.add(e.id); else { logOpen.delete(e.id); clearTimeout(logTimers.get(e.id)); }
    });
    ol.appendChild(li);
  });
  if (freshId) scheduleClose(freshId);
  const n = CUR.log.filter(e => !e.note).length;
  $('logHead').hidden = CUR.log.length === 0;
  $('logCount').textContent = n ? String(n) : '';
  ol.hidden = logHidden || CUR.log.length === 0;
  $('logToggle').textContent = logHidden ? `Show notes${n ? ' (' + n + ')' : ''}` : 'Hide notes';
  $('logToggle').setAttribute('aria-expanded', logHidden ? 'false' : 'true');
  $('curEmpty').hidden = CUR.log.length > 0;
}
$('logToggle').addEventListener('click', () => {
  logHidden = !logHidden;
  try { localStorage.setItem('nsb.logHidden', logHidden ? '1' : '0'); } catch (e) {}
  renderLog();
});
function startCountdown(fav, child, name){
  cancelCountdown();
  let left = 5;
  const tick = () => {
    $('turnText').innerHTML = '<b></b> picks offspring ' + fav + '. Adopting in ' + left + ' s.';
    $('turnText').querySelector('b').textContent = name || aiName();
    if (left-- <= 0){ cancelCountdown(); adopt(fav - 1, 'ai', child); }
  };
  $('turn').hidden = false; tick();
  CUR.countdown = setInterval(tick, 1000);
}
function cancelCountdown(){ if (CUR.countdown){ clearInterval(CUR.countdown); CUR.countdown = null; } $('turn').hidden = true; }
$('turnCancel').addEventListener('click', () => { cancelCountdown(); toast('Your turn. Pick any offspring.'); });
$('curAsk').addEventListener('click', () => {
  const why = aiReason();
  if (why){ $('curSet').open = true; toast(why); return; }
  CUR.pendingAsk = true; curStatus('waiting for the litter to render…');
});
$('curStop').addEventListener('click', () => { if (CUR.busy) CUR.busy.abort(); });
$('curEvery').addEventListener('change', e => { CUR.every = Number(e.target.value); curStatus(); store.save(); });
$('curRole').addEventListener('change', e => { CUR.role = e.target.value; store.save(); });
$('curOn').addEventListener('click', () => {
  AI.on = !AI.on;
  if (!AI.on){ if (CUR.busy) CUR.busy.abort(); cancelCountdown(); CUR.pendingAsk = false; }
  syncAI(); aiSave();
});
$('aiProvider').addEventListener('change', e => { if (CUR.busy) CUR.busy.abort(); AI.provider = e.target.value; syncAI(); aiSave(); });
$('aiModel').addEventListener('input', e => { cfg().model = e.target.value; syncAI(); aiSave(); });
$('aiEffort').addEventListener('change', e => { cfg().effort = e.target.value; syncAI(); aiSave(); });
$('aiEndpoint').addEventListener('input', e => { cfg().endpoint = e.target.value; syncAI(); aiSave(); });
$('aiKey').addEventListener('input', e => { cfg().key = e.target.value; syncAI(); aiSave(); });
$('aiImage').addEventListener('change', e => { AI.image = e.target.checked; aiSave(); });
$('aiRemember').addEventListener('change', e => { AI.remember = e.target.checked; aiSave(); });
function initAiBreeder(){
  aiLoad();
  $('curSet').open = !usable() && AI.on;
  syncAI();
}
/* ================= Snapshot and shader export ================= */
const sheet = $('sheet');
let sheetReturn = null;
function openSheet(view){
  sheetReturn = document.activeElement;
  $('snapView').hidden = view !== 'snap'; $('glslView').hidden = view !== 'glsl';
  $('sheetTitle').textContent = view === 'snap' ? 'Snapshot' : 'Shader code';
  sheet.querySelector('.sheet-panel').classList.toggle('wide', view === 'snap');
  if (!sheet.open) sheet.showModal();
  $('sheetClose').focus();
}
/* A modal <dialog>: focus stays inside, the page behind is inert, Escape closes it natively. */
function closeSheet(){ if (sheet.open) sheet.close(); }
sheet.addEventListener('close', () => { cancelSnapshot(); if (sheetReturn && sheetReturn.focus) sheetReturn.focus(); });
$('sheetClose').addEventListener('click', closeSheet);
sheet.addEventListener('click', e => { if (e.target === sheet) closeSheet(); });
/* Page-wide shortcuts. Skipped while typing, while a sheet or dialog is open, and for keys the stage already used. */
const keys = $('keys');
$('keysOpen').addEventListener('click', () => keys.showModal());
$('keysClose').addEventListener('click', () => keys.close());
keys.addEventListener('click', e => { if (e.target === keys) keys.close(); });
const typing = el => !!el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName));
document.addEventListener('keydown', e => {
  if (e.defaultPrevented || e.altKey || typing(e.target) || sheet.open || keys.open) return;
  const mod = e.metaKey || e.ctrlKey, k = e.key.toLowerCase();
  let act = null;
  if (mod){
    if (k === 'z') act = e.shiftKey ? redo : undo;
    else if (k === 'y' && e.ctrlKey) act = redo;
  } else if (e.key === '?') act = () => keys.showModal();
  else if (/^[1-6]$/.test(e.key)) act = () => adopt(Number(e.key) - 1, 'you');
  else if (k === 'z') act = e.shiftKey ? redo : undo;
  else if (!e.shiftKey){
    act = {n:() => $('reroll').click(), k:() => $('keep').click(), r:() => $('random').click(),
           s:() => $('spin').click(), m:() => $('morph').click()}[k] || null;
  }
  if (!act) return;
  e.preventDefault(); act();
});
/* Zoomable preview: z is screen px per image px; the stage element is sized in image px and transformed. */
const VW = {W:1, H:1, z:1, tx:0, ty:0, fitted:true, pts:new Map(), pinch:null, url:null};
const viewer = $('viewer');
function vwSize(){ const r = viewer.getBoundingClientRect(); return [r.width || 1, r.height || 1]; }
function vwFitZ(){ const [vw, vh] = vwSize(); return Math.min(vw/VW.W, vh/VW.H); }
function vwSet(el, W, H, keep){
  const st = $('vwStage'); st.replaceChildren(el);
  const changed = W !== VW.W || H !== VW.H;
  st.style.width = W + 'px'; st.style.height = H + 'px';
  VW.W = W; VW.H = H; viewer.hidden = false;
  if (!keep || changed) vwFit(); else vwApply();
}
function vwApply(){
  const [vw, vh] = vwSize(), w = VW.W*VW.z, h = VW.H*VW.z;
  VW.tx = w <= vw ? (vw - w)/2 : Math.min(0, Math.max(vw - w, VW.tx));
  VW.ty = h <= vh ? (vh - h)/2 : Math.min(0, Math.max(vh - h, VW.ty));
  const st = $('vwStage');
  st.style.transform = `translate(${VW.tx}px, ${VW.ty}px) scale(${VW.z})`;
  st.classList.toggle('px', VW.z >= 2);
  $('vwZ').textContent = (VW.fitted ? 'fit · ' : '') + (VW.z < 0.1 ? (VW.z*100).toFixed(1) : Math.round(VW.z*100)) + '%';
}
function vwFit(){ VW.fitted = true; VW.z = vwFitZ(); VW.tx = VW.ty = 0; vwApply(); }
function vwZoomAt(f, cx, cy){
  const fit = vwFitZ(), nz = Math.min(8, Math.max(fit, VW.z*f)), k = nz/VW.z;
  VW.tx = cx - (cx - VW.tx)*k; VW.ty = cy - (cy - VW.ty)*k; VW.z = nz;
  VW.fitted = nz <= fit*1.0001; vwApply();
}
const vwCenter = () => { const [vw, vh] = vwSize(); return [vw/2, vh/2]; };
$('vwIn').addEventListener('click', () => vwZoomAt(1.5, ...vwCenter()));
$('vwOut').addEventListener('click', () => vwZoomAt(1/1.5, ...vwCenter()));
$('vwFit').addEventListener('click', vwFit);
$('vwOne').addEventListener('click', () => vwZoomAt(1/VW.z, ...vwCenter()));
$('vwStage').parentElement.querySelector('.vw-bar').addEventListener('pointerdown', e => e.stopPropagation());
viewer.addEventListener('wheel', e => {
  e.preventDefault();
  const r = viewer.getBoundingClientRect();
  vwZoomAt(Math.exp(-e.deltaY*(e.ctrlKey ? 0.01 : 0.0018)), e.clientX - r.left, e.clientY - r.top);
}, {passive:false});
viewer.addEventListener('pointerdown', e => {
  if (e.button > 0) return;
  try { viewer.setPointerCapture(e.pointerId); } catch (_) {}
  VW.pts.set(e.pointerId, {x:e.clientX, y:e.clientY});
  viewer.classList.add('grabbing');
  if (VW.pts.size === 2){ const [a, b] = [...VW.pts.values()]; VW.pinch = {d:Math.hypot(a.x - b.x, a.y - b.y), mx:(a.x + b.x)/2, my:(a.y + b.y)/2}; }
});
viewer.addEventListener('pointermove', e => {
  const p = VW.pts.get(e.pointerId); if (!p) return;
  const dx = e.clientX - p.x, dy = e.clientY - p.y; p.x = e.clientX; p.y = e.clientY;
  if (VW.pts.size >= 2 && VW.pinch){
    const [a, b] = [...VW.pts.values()], d = Math.hypot(a.x - b.x, a.y - b.y), mx = (a.x + b.x)/2, my = (a.y + b.y)/2;
    const r = viewer.getBoundingClientRect();
    VW.tx += mx - VW.pinch.mx; VW.ty += my - VW.pinch.my;
    vwZoomAt(d/(VW.pinch.d || d), mx - r.left, my - r.top);
    VW.pinch = {d, mx, my};
  } else if (VW.pts.size === 1){ VW.tx += dx; VW.ty += dy; vwApply(); }
});
const vwUp = e => { VW.pts.delete(e.pointerId); if (VW.pts.size < 2) VW.pinch = null; if (!VW.pts.size) viewer.classList.remove('grabbing'); };
viewer.addEventListener('pointerup', vwUp); viewer.addEventListener('pointercancel', vwUp);
viewer.addEventListener('dblclick', e => {
  const r = viewer.getBoundingClientRect();
  if (VW.fitted) vwZoomAt(1/VW.z, e.clientX - r.left, e.clientY - r.top); else vwFit();
});
viewer.addEventListener('keydown', e => {
  const [cx, cy] = vwCenter(); let used = true;
  if (e.key === '+' || e.key === '=') vwZoomAt(1.5, cx, cy);
  else if (e.key === '-' || e.key === '_') vwZoomAt(1/1.5, cx, cy);
  else if (e.key === '0') vwFit();
  else if (e.key === '1') vwZoomAt(1/VW.z, cx, cy);
  else if (e.key.startsWith('Arrow')){ const k = 80; VW.tx += e.key === 'ArrowLeft' ? k : e.key === 'ArrowRight' ? -k : 0; VW.ty += e.key === 'ArrowUp' ? k : e.key === 'ArrowDown' ? -k : 0; vwApply(); }
  else used = false;
  if (used){ e.preventDefault(); e.stopPropagation(); }
});
new ResizeObserver(() => { if (viewer.hidden) return; if (VW.fitted) vwFit(); else vwApply(); }).observe(viewer);

/* High-resolution export: tiles rendered on the GPU, box-filtered, and streamed into a PNG
   encoder (zlib via CompressionStream), so an 8K image never needs one giant canvas. */
const SNAP_TS = RENDER.SNAP_TILE_SIZE;
function snapDims(){
  const L = Number($('snapSize').value), f = $('snapFrame').value;
  return f === 'square' ? [L, L] : f === 'wide' ? [L, Math.round(L*9/16)] : [Math.round(L*9/16), L];
}
function updateSnapInfo(){
  const [W, H] = snapDims(), ss = Number($('snapSS').value);
  $('snapInfo').textContent = `${W} × ${H} px · ${(W*H/1e6).toFixed(1)} megapixels · ${ss === 2 ? 4 : 1} sample${ss === 2 ? 's' : ''} per pixel`;
}
const SNAP_OPTS = ['snapSize', 'snapFrame', 'snapSS'];
SNAP_OPTS.forEach(id => $(id).addEventListener('change', () => {
  updateSnapInfo();
  try { localStorage.setItem('nsb.snap', JSON.stringify(Object.fromEntries(SNAP_OPTS.map(k => [k, $(k).value])))); } catch (e) {}
}));
try {
  const o = JSON.parse(localStorage.getItem('nsb.snap') || 'null') || {};
  SNAP_OPTS.forEach(k => { if ([...$(k).options].some(x => x.value === o[k])) $(k).value = o[k]; });
} catch (e) {}
const pngStream = RENDER.pngStream;
const filterRows = RENDER.filterRows;
const fmtTime = ms => { const t = Math.round(ms/1000); return t < 60 ? `${t} s` : `${Math.floor(t/60)} min ${String(t % 60).padStart(2, '0')} s`; };
function cancelSnapshot(){ if (snap){ snap.png.abort(); snap = null; } $('snapGo').disabled = false; }
let snapFor = null;   // genome code of the specimen the shown render belongs to
function clearSnapResult(msg){
  snapBlob = null; snapFor = null;
  if (VW.url){ URL.revokeObjectURL(VW.url); VW.url = null; }
  $('vwStage').replaceChildren(); $('viewer').hidden = true;
  $('snapSave').hidden = true; $('snapHint').hidden = true;
  $('snapBar').style.width = '0%';
  $('snapMsg').textContent = msg;
}
$('snap').addEventListener('click', () => {
  if (!GL.gl) return;
  updateSnapInfo();
  if (!snap && snapFor && snapFor !== E.encode(S.parent)){
    clearSnapResult(`New specimen G${S.gen} · ${E.tag(S.parent)}. Press Render to capture it; the earlier render was cleared.`);
  } else if (!snap && !snapFor){
    $('snapBar').style.width = '0%';
    $('snapMsg').textContent = `Renders G${S.gen} · ${E.tag(S.parent)} from the current camera angle. Spin pauses while it renders.`;
  }
  openSheet('snap');
  if (!$('viewer').hidden) requestAnimationFrame(() => VW.fitted ? vwFit() : vwApply());
});
$('snapGo').addEventListener('click', () => {
  if (!GL.gl || snap) return;
  if (typeof CompressionStream === 'undefined'){ $('snapMsg').textContent = 'This browser cannot write large PNG files. Update Safari or Chrome and try again.'; return; }
  const [W, H] = snapDims(), ss = Number($('snapSS').value), TS = SNAP_TS;
  const {cols, rows, total} = RENDER.snapTileGrid(W, H, TS);
  const pvScale = Math.min(1, 2800/Math.max(W, H));
  const pv = document.createElement('canvas'); pv.width = Math.round(W*pvScale); pv.height = Math.round(H*pvScale);
  const pctx = pv.getContext('2d'); pctx.imageSmoothingEnabled = true; pctx.imageSmoothingQuality = 'high';
  pctx.fillStyle = `rgb(${BG.map(x => Math.round(x*255)).join(',')})`; pctx.fillRect(0, 0, pv.width, pv.height);
  vwSet(pv, W, H, false);
  const tmp = document.createElement('canvas'); tmp.width = tmp.height = TS;
  snap = {W, H, ss, TS, cols, rows, i:0, total, band:new Uint8Array(W*TS*3), tileImg:new ImageData(TS, TS),
          g:E.cloneG(S.parent), cam:[S.yaw, S.pitch, S.dist], mt:S.morphT, pv, pctx, pvScale, tmp, png:pngStream(W, H),
          t0:performance.now(), busy:false, tag:`G${S.gen}-${E.tag(S.parent)}`, label:`G${S.gen} · ${E.tag(S.parent)}`, forKey:E.encode(S.parent)};
  snapBlob = null; snapFor = null;
  $('snapGo').disabled = true;
  $('snapSave').hidden = true; $('snapHint').hidden = true;
  $('snapBar').style.width = '0%'; $('snapMsg').textContent = `Rendering ${snap.label} at ${W} × ${H} px…`;
});
function stepSnapshot(){
  const s = snap;
  if (s.busy) return;
  const e = programFor(s.g);
  if (!ready(e)) return;
  const R = s.TS*s.ss, t = performance.now();
  while (s.i < s.total && performance.now() - t < 45){
    const col = s.i % s.cols;
    const {ox, oy} = RENDER.snapTileOrigin(s.i, s.cols, s.TS);
    drawWith(e, s.g, {fbo:true, w:R, h:R, fullW:s.W*s.ss, fullH:s.H*s.ss, offX:ox*s.ss, offY:oy*s.ss, cam:s.cam, mt:s.mt});
    const px = readRaw(R, R);
    const tw = Math.min(s.TS, s.W - ox), th = Math.min(s.TS, s.H - oy), td = s.tileImg.data;
    RENDER.boxFilterTile(px, R, tw, th, ox, oy, s.W, s.band, td, s.TS, s.ss);
    s.tmp.getContext('2d').putImageData(s.tileImg, 0, 0);
    s.pctx.drawImage(s.tmp, 0, 0, tw, th, ox*s.pvScale, oy*s.pvScale, tw*s.pvScale, th*s.pvScale);
    s.i++;
    if (col === s.cols - 1){
      s.busy = true;
      s.png.write(filterRows(s.band, s.W, th)).then(() => {
        if (snap !== s) return;
        s.busy = false;
        if (s.i >= s.total) finishSnapshot(s);
      }, () => { if (snap === s){ $('snapMsg').textContent = 'The PNG encoder stopped. Try a smaller size.'; cancelSnapshot(); } });
      break;
    }
  }
  const el = performance.now() - s.t0, frac = s.i/s.total;
  $('snapBar').style.width = (100*frac).toFixed(1) + '%';
  $('snapMsg').textContent = `${s.label} · tile ${s.i} of ${s.total} · ${fmtTime(el)} elapsed` + (frac > 0.03 && frac < 1 ? ` · about ${fmtTime(el/frac - el)} left` : '');
}
async function finishSnapshot(s){
  $('snapMsg').textContent = 'Writing the PNG…';
  try {
    const blob = await s.png.close();
    if (snap !== s) return;
    snap = null; $('snapGo').disabled = false;
    snapBlob = {blob, name:`consculpta-${s.tag}-${s.W}x${s.H}.png`}; snapFor = s.forKey;
    const img = new Image();
    if (VW.url) URL.revokeObjectURL(VW.url);
    VW.url = URL.createObjectURL(blob); img.src = VW.url; img.alt = '';
    (img.decode ? img.decode() : Promise.resolve()).then(() => { if ($('vwStage').firstChild === s.pv) vwSet(img, s.W, s.H, true); },
      () => { $('snapHint').textContent = 'The preview shows a 2800 px version; the saved PNG has every pixel.'; $('snapHint').hidden = false; });
    $('snapMsg').textContent = `${s.label} · ${s.W} × ${s.H} px PNG · ${(blob.size/1048576).toFixed(1)} MB · rendered in ${fmtTime(performance.now() - s.t0)}`;
    const mb = blob.size/1048576;
    $('snapSave').textContent = `Save PNG · ${mb < 10 ? mb.toFixed(1) : mb.toFixed(0)} MB`;
    $('snapSave').hidden = false;
  } catch (e) {
    if (snap === s){ snap = null; $('snapGo').disabled = false; }
    $('snapMsg').textContent = 'The PNG could not be written: ' + ((e && e.message) || 'unknown error');
  }
}
async function saveFile(filename, data, btn){
  if (!DL){
    const a = document.createElement('a'); a.href = URL.createObjectURL(data instanceof Blob ? data : new Blob([data], {type:'text/plain'}));
    a.download = filename; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 60000);
    return;
  }
  try { await DL.save({filename, data}); toast('Saved.'); }
  catch (e) {
    const code = e && e.code;
    if (code === 'declined') return;
    if (code === 'rate_limited'){ toast('Another save prompt is already open.'); return; }
    btn.hidden = true;
    if (btn.id === 'snapSave'){ $('snapHint').textContent = 'Saving is not available in this view.'; $('snapHint').hidden = false; }
    toast('Saving files is not available in this view.');
  }
}
$('snapSave').addEventListener('click', () => { if (snapBlob) saveFile(snapBlob.name, snapBlob.blob, $('snapSave')); });
const f4 = x => (Math.round(x*10000)/10000).toFixed(4);
function exportGLSL(){
  const g = S.parent, U = uniformsOf(g);
  const rows = []; for (let i = 0; i < 8; i++) rows.push(`  vec4(${[0, 1, 2, 3].map(j => f4(U[i*4 + j])).join(', ')})`);
  const head = `// Consculpta · specimen G${S.gen} · ${E.tag(g)} (${kindOf(g)})
// Shape:  ${E.print(g.t)}
// Colour: ${E.print(g.c)}
// Paste into a new shader on shadertoy.com (Image tab). Drag to orbit.
// Simplex noise: Ian McEwan, Ashima Arts / Stefan Gustavson (MIT). Palette: Inigo Quilez cosine palette.

`;
  return head + RENDER.buildShadertoyExport({
    uniformRows: rows.join(',\n'),
    bg: BG.map(f4).join(', '),
    morph: S.morph ? '0.08' : '0.0',
    prelude: PRE,
    scene: POST,
    noise: NOISE_GL,
    treeGlsl: E.glsl(g.t, 'tree'),
    colorGlsl: E.glsl(g.c, 'ctree'),
    camExpr: `${f4(S.yaw % (Math.PI*2))} + iTime*0.32 - m.x*6.2832, clamp(${f4(S.pitch)} + m.y*2.0, -1.25, 1.25), ${f4(S.dist)}`,
  });
}
$('glsl').addEventListener('click', () => {
  const src = exportGLSL();
  $('glslText').value = src; $('glslSave').hidden = false;
  $('glslInfo').textContent = `${src.split('\n').length} lines · G${S.gen} · ${E.tag(S.parent)}`;
  openSheet('glsl');
});
$('glslCopy').addEventListener('click', () => copyText($('glslText').value, 'Shader copied. Paste it into a new shader on shadertoy.com.', $('glslText')));
$('glslSave').addEventListener('click', () => saveFile(`consculpta-G${S.gen}-${E.tag(S.parent)}.txt`, $('glslText').value, $('glslSave')));

let toastTimer = 0, toastKind = '';
/* opt.action adds a button (e.g. Undo) and keeps the toast up longer; hovering or focusing it holds it open. */
function toast(msg, opt){
  const t = $('toast'), o = opt || {};
  const text = document.createElement('span'); text.textContent = msg;
  t.replaceChildren(text);
  if (o.action){
    const b = document.createElement('button'); b.type = 'button'; b.className = 'toast-act'; b.textContent = o.action;
    b.addEventListener('click', () => { hideToast(); o.onAction(); });
    t.appendChild(b);
  }
  toastKind = o.kind || ''; t.hidden = false;
  armToast(o.action ? 10000 : 3600);
}
function armToast(ms){ clearTimeout(toastTimer); toastTimer = setTimeout(hideToast, ms); }
function hideToast(){ clearTimeout(toastTimer); $('toast').hidden = true; toastKind = ''; }
function dismissToast(kind){ if (toastKind === kind) hideToast(); }
$('toast').addEventListener('pointerenter', () => clearTimeout(toastTimer));
$('toast').addEventListener('pointerleave', () => armToast(2500));
$('toast').addEventListener('focusin', () => clearTimeout(toastTimer));
$('toast').addEventListener('focusout', () => armToast(2500));

/* ================= Boot ================= */
function showStageError(text){ const m = $('stageMsg'); m.innerHTML = '<p></p>'; m.querySelector('p').textContent = text; m.hidden = false; }
fc.addEventListener('webglcontextlost', e => { e.preventDefault(); glLost = true; });
fc.addEventListener('webglcontextrestored', () => { glInit(); glLost = false; setScale(scale); focusDirty = true; queueLitter(); queueShelf(); });
function measureThumbs(){
  const w = pups[0].btn.getBoundingClientRect().width || 120;
  const T = Math.max(96, Math.min(360, Math.round(w*Math.min(DPR, 1.5))));
  if (T !== thumbSize){ thumbSize = T; queueLitter(); }
}
let resizeT = 0;
new ResizeObserver(() => { clearTimeout(resizeT); resizeT = setTimeout(() => { setScale(scale); focusDirty = true; measureThumbs(); }, 80); }).observe($('stage'));
function onTheme(){ BG = readBg(); syncRendererBg(); focusDirty = true; queueLitter(); queueShelf(); }
matchMedia('(prefers-color-scheme: dark)').addEventListener('change', onTheme);
new MutationObserver(onTheme).observe(document.documentElement, {attributes:true, attributeFilter:['data-theme']});
const saved = store.load();
let savedLitter = null;
if (saved){
  const g = E.decode(saved.p); if (g){ S.parent = g; S.gen = saved.gen || 1; }
  if (typeof saved.m === 'number'){ S.mutation = saved.m; $('rate').value = Math.round(saved.m*100); $('rateOut').textContent = Math.round(saved.m*100) + '%'; }
  if (Array.isArray(saved.shelf)) S.shelf = saved.shelf.filter(x => x && E.decode(x.code)).slice(0, SHELF_MAX);
  S.kseq = saved.kseq || S.shelf.length;
  if (Array.isArray(saved.hist)) S.history = saved.hist.map(h => ({parent:E.decode(h && h.p), gen:(h && h.gen) || 1, litter:null})).filter(h => h.parent);
  const lit = g && Array.isArray(saved.lit) ? saved.lit.map(k => ({g:E.decode(k && k.c), label:(k && k.l) || '', by:k && k.ai ? 'ai' : undefined})) : [];
  if (lit.length === 6 && lit.every(k => k.g)) savedLitter = lit;
  if (saved.cur){
    CUR.every = [0, 2, 3, 5].includes(saved.cur.every) ? saved.cur.every : 3;
    CUR.role = saved.cur.role === 'turns' ? 'turns' : 'advise';
    CUR.notes = Array.isArray(saved.cur.notes) ? saved.cur.notes.slice(-5) : [];
    CUR.log = Array.isArray(saved.cur.log) ? saved.cur.log.slice(0, 8) : [];
    CUR.agree = saved.cur.agree || 0; CUR.rounds = saved.cur.rounds || 0;
  }
}
/* Share link: #nsb3… loads that specimen once, keeps yours one Undo away, and clears the hash. */
let sharedLoaded = false;
(() => {
  let code = location.hash.slice(1);
  try { code = decodeURIComponent(code); } catch (e) {}
  if (!code) return;
  const g = E.decode(code);
  history.replaceState(null, '', location.pathname + location.search);
  if (!g || E.encode(g) === E.encode(S.parent)) return;
  S.history.push({parent:E.cloneG(S.parent), gen:S.gen, litter:null});
  S.parent = g; S.gen = 1; savedLitter = null; sharedLoaded = true;
})();
$('curEvery').value = String(CUR.every); $('curRole').value = CUR.role;
initAiBreeder();
setToggle('spin', S.spin);
BG = readBg();
syncRendererBg();
if (savedLitter){ S.litter = savedLitter; S.litterId++; } else breed();
syncParent(); syncLitter(); renderLog(); curStatus(); store.save();
if (sharedLoaded) afterFirstDraw = () => undoToast(`Loaded shared specimen ${E.tag(S.parent)}. Undo returns to yours.`);
const footerCopy = $('footerCopy');
if (footerCopy) footerCopy.textContent = `© ${new Date().getFullYear()} carlok`;
if (!glInit()){
  showStageError('This page needs WebGL 2. Current Safari, Chrome and Firefox all support it.');
  if (afterFirstDraw){ afterFirstDraw(); afterFirstDraw = null; }
} else {
  if (GL.info){
    const raw = String(GL.info), m = /Renderer: ([^,)]+)/.exec(raw);
    const name = m ? m[1] : raw.replace(/^ANGLE \((.*)\)$/, '$1');
    $('gpu').textContent = 'GPU · ' + (name.length > 44 ? name.slice(0, 43) + '…' : name);
  }
  renderShelf();
  setScale(scale); measureThumbs(); queueLitter();
  requestAnimationFrame(frame);
}
})();
