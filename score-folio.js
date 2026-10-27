/**
 * A reversible score folio made from the three actual published parts.
 * The page owner supplies progress and calls measure() after layout changes.
 * No scroll listener, animation loop, layout read in render, or product state.
 */
export function createScoreFolio(section) {
  const field = section?.querySelector('.score-routing-field');
  const tracks = [...(section?.querySelectorAll('[data-score-part]') || [])];
  if (!field || tracks.length !== 3) throw new TypeError('Score folio needs its three existing score parts.');
  const papers = tracks.map(track => track.querySelector('.score-paper'));
  const captions = papers.map(paper => paper?.querySelector('figcaption'));
  const route = section.querySelector('.score-route-active');
  const lines = section.querySelector('.score-routing-lines');
  const styled = [...tracks, ...papers, ...captions, route, lines].filter(Boolean);
  const originalStyles = new Map(styled.map(element => [element, element.getAttribute('style')]));
  const previousWidth = field.style.getPropertyValue('--folio-paper-width');
  const writes = new WeakMap();
  const clamp = n => Math.max(0, Math.min(1, Number.isFinite(n) ? n : 0));
  const range = (p, a, b) => clamp((p - a) / (b - a));
  const smooth = p => p * p * (3 - 2 * p);
  const mix = (a, b, p) => a + (b - a) * p;
  const fmt = n => (Math.round(n * 1000) / 1000).toString();
  let dead = false, layout = null, lastProgress = -1, lastStill = null;

  function write(element, property, value) {
    if (!element) return;
    let cache = writes.get(element);
    if (!cache) { cache = new Map(); writes.set(element, cache); }
    if (cache.get(property) === value) return;
    element.style[property] = value;
    cache.set(property, value);
  }

  const wells = tracks.map((_, i) => {
    const well = document.createElement('div');
    well.className = 'folio-device-well';
    well.setAttribute('aria-hidden', 'true');
    well.dataset.folioWell = String(i);
    const status = document.createElement('i');
    status.className = 'folio-device-status';
    well.append(status);
    field.append(well);
    return well;
  });
  const pulse = document.createElement('div');
  pulse.className = 'folio-broadcast-pulse';
  pulse.setAttribute('aria-hidden', 'true');
  field.append(pulse);
  section.classList.add('folio-enhanced');

  function measure() {
    if (dead) return;
    // Read the field once; no geometry is queried while scrubbing.
    const {width, height} = field.getBoundingClientRect();
    const paperWidth = Math.max(120, Math.min(width * .275, 330, Math.max(110, height - 150) / (1700 / 2200)));
    const paperHeight = paperWidth * (1700 / 2200) + 38;
    const top = 22;
    layout = {
      width, height, paperWidth, paperHeight, top,
      stackX: (width - paperWidth) / 2,
      stackY: Math.min(74, Math.max(44, (height - paperHeight - 90) * .5)),
      slots: [.165, .5, .835].map(ratio => width * ratio - paperWidth / 2)
    };
    field.style.setProperty('--folio-paper-width', `${fmt(paperWidth)}px`);
    wells.forEach((well, i) => {
      write(well, 'width', `${fmt(paperWidth + 28)}px`);
      write(well, 'height', `${fmt(paperHeight + 28)}px`);
      write(well, 'left', `${fmt(layout.slots[i] - 14)}px`);
      write(well, 'top', `${fmt(top - 14)}px`);
    });
    lastProgress = -1;
  }

  function render(value, still = false) {
    if (dead || !layout) return;
    const p = clamp(Number(value));
    const settled = Boolean(still);
    if (p === lastProgress && settled === lastStill) return;
    lastProgress = p; lastStill = settled;
    section.classList.toggle('folio-still', settled);
    const phase = settled ? 'parts-ready' : p < .25 ? 'lifting' : p < .7 ? 'unfolding' : p < .91 ? 'broadcasting' : 'parts-ready';
    if (section.dataset.folioPhase !== phase) section.dataset.folioPhase = phase;
    const lift = smooth(range(p, .035, .25));
    const dock = smooth(range(p, .68, .9));
    tracks.forEach((track, i) => {
      const direction = i - 1;
      const fan = smooth(range(p, .23 + i * .035, .66 + i * .035));
      const arc = Math.sin(fan * Math.PI);
      const x = mix(layout.stackX + i * 5, layout.slots[i], fan);
      const y = mix(layout.stackY - lift * 27 + i * 4, layout.top - 8, fan) - arc * (18 + Math.abs(direction) * 12) + dock * 8;
      const depth = (1 - fan) * (2 - i) * 9 + arc * 22;
      const pitch = (1 - fan) * (-9 - lift * 7);
      const yaw = direction * (1 - fan) * 23 + direction * arc * -13;
      const roll = direction * (1 - fan) * 4.8 + direction * arc * 3;
      write(track, 'transform', settled ? 'none' : `translate3d(${fmt(x)}px,${fmt(y)}px,${fmt(depth)}px)`);
      write(track, 'zIndex', String(10 - i));
      write(papers[i], 'transform', settled ? 'none' : `rotateX(${fmt(pitch)}deg) rotateY(${fmt(yaw)}deg) rotateZ(${fmt(roll)}deg)`);
      write(captions[i], 'opacity', settled ? '1' : fmt(smooth(range(fan, .48, .93))));
      const wellEnter = smooth(range(p, .52 + i * .025, .8 + i * .025));
      write(wells[i], 'opacity', settled ? '0' : fmt(wellEnter));
      write(wells[i], 'transform', `translate3d(0,${fmt((1 - wellEnter) * 26)}px,0) scale(${fmt(.97 + wellEnter * .03)})`);
      write(wells[i].firstElementChild, 'opacity', fmt(smooth(range(p, .76 + i * .03, .87 + i * .03))));
    });
    write(lines, 'opacity', settled ? '0' : fmt(.14 + smooth(range(p, .53, .79)) * .86));
    write(route, 'strokeDashoffset', settled ? '0' : fmt(1 - smooth(range(p, .68, .9))));
    const wave = range(p, .71, .92);
    const waveOpacity = p > .71 && p < .92 ? Math.sin(wave * Math.PI) * .28 : 0;
    write(pulse, 'opacity', settled ? '0' : fmt(waveOpacity));
    write(pulse, 'transform', `translate3d(-50%,0,0) scale(${fmt(.2 + wave * 8.5)},${fmt(.2 + wave * 4.9)})`);
  }

  function dispose() {
    if (dead) return;
    dead = true;
    wells.forEach(well => well.remove());
    pulse.remove();
    originalStyles.forEach((value, element) => value === null ? element.removeAttribute('style') : element.setAttribute('style', value));
    if (previousWidth) field.style.setProperty('--folio-paper-width', previousWidth);
    else field.style.removeProperty('--folio-paper-width');
    section.classList.remove('folio-enhanced', 'folio-still');
    delete section.dataset.folioPhase;
    layout = null;
  }

  measure();
  return {measure, render, dispose};
}
