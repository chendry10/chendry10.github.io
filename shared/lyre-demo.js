/**
 * Faithful, dependency-free port of LyreLink's public About PhoneDemo.
 * All changes stay in this page. No band connection, private API or persistence.
 * Score image provenance is preserved in assets/lyrelink/README.md + manifest.json.
 */
export const lyreInstruments = Object.freeze({
  cornet: 'B♭ Cornet',
  clarinet: 'B♭ Clarinet',
  trombone: 'Trombone',
});

export const lyreSongs = Object.freeze([
  {
    id: 'victors', title: 'The Victors March', school: 'Michigan',
    composer: 'Louis Elbel', width: 1600, height: 1200,
    parts: { cornet: '1st B♭ Cornet', clarinet: '1st B♭ Clarinet', trombone: '1st Trombone' },
  },
  {
    id: 'victory', title: 'Victory March', school: 'Notre Dame',
    composer: 'John F. & Michael J. Shea', width: 2200, height: 1700,
    parts: { cornet: '1st B♭ Cornet', clarinet: 'Solo or 1st B♭ Clarinet', trombone: '1st & 2nd Trombones' },
  },
  {
    id: 'wisconsin', title: 'On, Wisconsin!', school: 'Wisconsin',
    composer: 'W. T. Purdy', width: 2200, height: 1700,
    parts: { cornet: '1st B♭ Cornet', clarinet: '1st B♭ Clarinet', trombone: '1st & 2nd Trombones' },
  },
]);

const mounted = new WeakMap();
let nextDemoId = 0;
const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (char) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
})[char]);

/** Mount once on an element, or use the automatic [data-lyre-demo] mount. */
export function initLyreDemo(target, options = {}) {
  const root = typeof target === 'string' ? document.querySelector(target) : target;
  if (!(root instanceof HTMLElement)) throw new TypeError('LyreLink demo requires a mount element.');
  if (mounted.has(root)) return mounted.get(root);

  const assetBase = new URL(options.assetBase || root.dataset.assetBase || './assets/lyrelink/', import.meta.url);
  if (!assetBase.pathname.endsWith('/')) assetBase.pathname += '/';
  const asset = (filename) => new URL(filename, assetBase).href;
  const logo = asset('logo.svg');
  const id = `lyre-demo-${++nextDemoId}`;
  const abort = new AbortController();
  const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  let active = null;
  let parts = ['cornet', 'clarinet'];
  let sequence = 0;
  let disposed = false;

  const logoImage = (size) => `<img src="${escapeHtml(logo)}" width="${size}" height="${size}" alt="" decoding="async">`;
  const memberMarkup = (number) => `
    <section class="ld-memberStation" data-member="${number}" data-song="" data-part="${parts[number - 1]}" aria-label="Member ${number} phone">
      <div class="ld-deviceLabel"><b>Member ${number}</b><span>Their phone · their instrument</span></div>
      <div class="ld-phone ld-landscape">
        <span class="ld-camera" aria-hidden="true"></span>
        <div class="ld-memberScreen">
          <div class="ld-memberBar">${logoImage(20)}<strong data-member-title>Waiting for the director</strong>
            <button type="button" data-enlarge="${number}" aria-label="Enlarge member ${number} score" disabled>Enlarge <span aria-hidden="true">⤢</span></button>
          </div>
          <div class="ld-readingArea" data-reading-area="${number}"></div>
          <div class="ld-memberControls">
            <label for="${id}-part-${number}">Instrument</label>
            <select id="${id}-part-${number}" data-part-select="${number}" aria-label="Member ${number} instrument">
              ${Object.entries(lyreInstruments).map(([part, name]) => `<option value="${part}"${part === parts[number - 1] ? ' selected' : ''}>${name}</option>`).join('')}
            </select>
            <span class="ld-following" data-following>Connected</span>
          </div>
        </div>
      </div>
      <dialog class="ld-scoreDialog" data-score-dialog="${number}" aria-label="Member ${number} complete score">
        <div class="ld-dialogBar"><span data-dialog-title></span><form method="dialog"><button type="submit" autofocus>Close score</button></form></div>
        <div data-dialog-score></div>
      </dialog>
    </section>`;

  root.classList.add('ld-demo');
  root.setAttribute('role', 'region');
  root.setAttribute('aria-label', 'LyreLink three-phone product demo');
  root.dataset.activeSong = '';
  root.innerHTML = `
    <div class="ld-demoBar">
      <p><span class="ld-dot" aria-hidden="true"></span> Interactive product demo <span class="ld-demoHint">You’re the director.</span></p>
      <button type="button" data-reset>Reset demo <span aria-hidden="true">↺</span></button>
    </div>
    <div class="ld-stage">
      <section class="ld-directorStation" aria-label="Director phone">
        <div class="ld-deviceLabel"><b>Director</b><span>Your phone · one shared song</span></div>
        <div class="ld-phone ld-portrait">
          <span class="ld-camera" aria-hidden="true"></span>
          <div class="ld-directorScreen">
            <div class="ld-brandBar">${logoImage(24)}<b>LyreLink</b><span>Director</span></div>
            <div class="ld-libraryHeading"><h3>Music library</h3><span>3 songs</span></div>
            <p class="ld-instruction">Pick the next song for the band.</p>
            <div class="ld-songList">
              ${lyreSongs.map((song) => `
                <article data-library-song="${song.id}" data-selected="false">
                  <div><h4>${escapeHtml(song.title)}</h4><span>${escapeHtml(song.school)} · 3 instrument parts</span></div>
                  <button type="button" data-broadcast="${song.id}" aria-label="Broadcast ${escapeHtml(song.title)}" aria-pressed="false"><span aria-hidden="true">◉</span> Broadcast <span aria-hidden="true">↗</span></button>
                  <span class="ld-live" data-live hidden>Playing on both member phones</span>
                </article>`).join('')}
            </div>
            <div class="ld-directorFoot"><span class="ld-dot" aria-hidden="true"></span><span data-director-status>Two members ready to follow</span></div>
          </div>
        </div>
        <p class="ld-deviceCaption">Tap <b>Broadcast</b> beside any song.</p>
      </section>
      <div class="ld-members">${memberMarkup(1)}${memberMarkup(2)}</div>
    </div>
    <div class="ld-result"><strong data-result>One tap on your phone. Music on theirs.</strong><p>Each musician keeps their instrument choice when you change the song.</p></div>
    <p class="ld-disclaimer">The interactive demo from <a href="https://lyrelink.com/about" target="_blank" rel="noopener">LyreLink’s About page</a>. All changes stay in this browser.</p>
    <p class="ld-srOnly" role="status" aria-live="polite" aria-atomic="true" data-announcement></p>`;

  const qs = (selector) => root.querySelector(selector);
  const announce = (message) => { qs('[data-announcement]').textContent = message; };
  const currentSong = () => active === null ? null : lyreSongs[active];

  // Match ScorePage.tsx: one automatic retry, then a recovery action that keeps
  // song and instrument state intact. Keep every printed pixel visible.
  function mountScore(container, song, part, withArrival = false) {
    container.replaceChildren();
    const frame = document.createElement('div');
    frame.className = withArrival ? 'ld-arrival' : 'ld-dialogImage';
    container.append(frame);
    let attempt = 0;
    let generation = 0;
    function load() {
      generation += 1;
      const requestGeneration = generation;
      frame.replaceChildren();
      const loading = document.createElement('span');
      loading.className = 'ld-scoreLoading';
      loading.textContent = 'Loading complete part…';
      loading.setAttribute('role', 'status');
      frame.append(loading);
      const img = document.createElement('img');
      img.alt = `${song.title} — complete ${song.parts[part]} part`;
      img.width = song.width;
      img.height = song.height;
      img.loading = 'eager';
      img.decoding = 'async';
      img.dataset.scoreSong = song.id;
      img.dataset.scorePart = part;
      img.addEventListener('load', () => {
        if (disposed || generation !== requestGeneration) return;
        loading.remove();
        img.dataset.loaded = 'true';
      }, { once: true });
      img.addEventListener('error', () => {
        if (disposed || generation !== requestGeneration) return;
        if (attempt === 0) { attempt = 1; load(); return; }
        frame.innerHTML = '<div class="ld-scoreError" role="status"><strong>This part couldn’t load.</strong><span>Your song and instrument are still selected.</span><button type="button">Retry part</button></div>';
        frame.querySelector('button').addEventListener('click', () => { attempt += 1; load(); }, { once: true });
      }, { once: true });
      img.src = `${asset(`${song.id}-${part}.webp`)}${attempt ? `?retry=${attempt}` : ''}`;
      frame.append(img);
    }
    load();
  }

  function renderMember(number, pulse = false) {
    const song = currentSong();
    const part = parts[number - 1];
    const station = qs(`[data-member="${number}"]`);
    const reading = qs(`[data-reading-area="${number}"]`);
    const dialog = qs(`[data-score-dialog="${number}"]`);
    station.dataset.song = song?.id || '';
    station.dataset.part = part;
    station.querySelector('[data-member-title]').textContent = song?.title || 'Waiting for the director';
    station.querySelector('[data-following]').textContent = song ? 'Following director' : 'Connected';
    station.querySelector('[data-enlarge]').disabled = !song;
    station.querySelector('[data-part-select]').value = part;
    station.querySelector('.ld-receiveGlow')?.remove();
    if (song) {
      mountScore(reading, song, part, true);
      if (pulse) {
        const glow = document.createElement('div');
        glow.className = 'ld-receiveGlow';
        glow.setAttribute('aria-hidden', 'true');
        station.querySelector('.ld-phone').append(glow);
      }
      if (dialog.open) updateDialog(number);
    } else {
      reading.innerHTML = `<div class="ld-waiting">${logoImage(42)}<strong>Ready for the next song.</strong><span>Tap Broadcast on the director’s phone.</span></div>`;
      dialog.close();
      station.querySelector('[data-dialog-score]').replaceChildren();
    }
  }

  function updateDialog(number) {
    const song = currentSong();
    if (!song) return;
    const station = qs(`[data-member="${number}"]`);
    const part = parts[number - 1];
    station.querySelector('[data-dialog-title]').textContent = `${song.title} · ${song.parts[part]}`;
    mountScore(station.querySelector('[data-dialog-score]'), song, part);
  }

  function renderDirector() {
    const song = currentSong();
    root.dataset.activeSong = song?.id || '';
    for (const item of root.querySelectorAll('[data-library-song]')) {
      const selected = item.dataset.librarySong === song?.id;
      item.dataset.selected = String(selected);
      item.querySelector('[data-broadcast]').setAttribute('aria-pressed', String(selected));
      item.querySelector('[data-live]').hidden = !selected;
    }
    qs('[data-director-status]').textContent = song ? 'Song sent to the band' : 'Two members ready to follow';
    qs('[data-result]').textContent = song ? 'Same song. Each player’s chosen part.' : 'One tap on your phone. Music on theirs.';
  }

  function transmission() {
    qs('.ld-transmission')?.remove();
    if (root.dataset.quiet === 'true') return;
    const signal = document.createElement('div');
    signal.className = 'ld-transmission';
    signal.setAttribute('aria-hidden', 'true');
    signal.innerHTML = [0, 1, 2].map((i) => `<span class="ld-wave" style="--wave:${i}"></span>`).join('')
      + [0, 1].map((i) => `<span class="ld-packet" style="--destination:${i}">${logoImage(24)}</span>`).join('');
    qs('.ld-stage').prepend(signal);
  }

  function broadcast(songIdOrIndex) {
    if (disposed) return false;
    const index = typeof songIdOrIndex === 'number' ? songIdOrIndex : lyreSongs.findIndex((song) => song.id === songIdOrIndex);
    if (!Number.isInteger(index) || index < 0 || index >= lyreSongs.length) return false;
    active = index;
    sequence += 1;
    renderDirector();
    renderMember(1, true);
    renderMember(2, true);
    transmission();
    announce(`${lyreSongs[index].title} sent to both member phones. Member 1: ${lyreInstruments[parts[0]]}. Member 2: ${lyreInstruments[parts[1]]}.`);
    return true;
  }

  function setPart(number, part) {
    if (disposed || ![1, 2].includes(number) || !Object.hasOwn(lyreInstruments, part)) return false;
    parts[number - 1] = part;
    renderMember(number);
    const song = currentSong();
    announce(`Member ${number} chose ${lyreInstruments[part]}.${song ? ` Still playing ${song.title}.` : ' Ready for the director.'}`);
    return true;
  }

  function reset() {
    if (disposed) return;
    active = null;
    parts = ['cornet', 'clarinet'];
    sequence = 0;
    qs('.ld-transmission')?.remove();
    renderDirector();
    renderMember(1);
    renderMember(2);
    announce('Demo reset. Choose a song on the director’s phone.');
  }

  const syncMotion = () => { root.dataset.quiet = String(options.motionOff === true || motionQuery.matches); };
  syncMotion();
  motionQuery.addEventListener('change', syncMotion, { signal: abort.signal });
  root.addEventListener('click', (event) => {
    const button = event.target.closest('button');
    if (!button || !root.contains(button)) return;
    if (button.hasAttribute('data-broadcast')) broadcast(button.dataset.broadcast);
    if (button.hasAttribute('data-reset')) reset();
    if (button.hasAttribute('data-enlarge') && currentSong()) {
      const number = Number(button.dataset.enlarge);
      updateDialog(number);
      qs(`[data-score-dialog="${number}"]`).showModal();
    }
  }, { signal: abort.signal });
  root.addEventListener('change', (event) => {
    if (event.target.matches('[data-part-select]')) setPart(Number(event.target.dataset.partSelect), event.target.value);
  }, { signal: abort.signal });
  for (const dialog of root.querySelectorAll('[data-score-dialog]')) {
    dialog.addEventListener('click', (event) => {
      if (event.target !== dialog) return;
      const box = dialog.getBoundingClientRect();
      if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) dialog.close();
    }, { signal: abort.signal });
  }

  const controller = Object.freeze({
    broadcast,
    setPart,
    reset,
    getState: () => ({ song: currentSong()?.id || null, parts: [...parts], sequence }),
    destroy: () => {
      if (disposed) return;
      for (const dialog of root.querySelectorAll('dialog')) dialog.close();
      disposed = true;
      abort.abort();
      root.replaceChildren();
      root.classList.remove('ld-demo');
      root.removeAttribute('role');
      root.removeAttribute('aria-label');
      delete root.dataset.activeSong;
      delete root.dataset.quiet;
      mounted.delete(root);
    },
  });
  mounted.set(root, controller);
  renderMember(1);
  renderMember(2);
  const initialSong = options.initialSong || root.dataset.initialSong;
  if (initialSong) broadcast(initialSong);
  return controller;
}

export function initLyreDemos() {
  return [...document.querySelectorAll('[data-lyre-demo]')].map((root) => initLyreDemo(root));
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initLyreDemos, { once: true });
else initLyreDemos();
