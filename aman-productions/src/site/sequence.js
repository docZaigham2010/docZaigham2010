// A scroll-scrubbed film: draws numbered frames onto a canvas, "cover"-fitted.
// Frames load in a coarse-to-fine order so scrubbing works early and sharpens as more arrive.
export function createSequence(canvas, { count, src }) {
  const ctx = canvas.getContext('2d');
  const frames = new Array(count);
  let current = -1, wanted = 0;

  function resize() {
    const dpr = Math.min(devicePixelRatio || 1, 2);
    canvas.width = Math.round(canvas.clientWidth * dpr);
    canvas.height = Math.round(canvas.clientHeight * dpr);
    current = -1;
    draw(wanted);
  }

  function nearestLoaded(i) {
    for (let d = 0; d < count; d++) {
      if (frames[i - d]?.complete && frames[i - d].naturalWidth) return frames[i - d];
      if (frames[i + d]?.complete && frames[i + d].naturalWidth) return frames[i + d];
    }
    return null;
  }

  function draw(i) {
    wanted = Math.max(0, Math.min(count - 1, Math.round(i)));
    const img = nearestLoaded(wanted);
    if (!img || !canvas.width) return;
    const key = img === frames[wanted] ? wanted : -2 - wanted;
    if (key === current) return;
    current = key;
    const cw = canvas.width, ch = canvas.height, iw = img.naturalWidth, ih = img.naturalHeight;
    const s = Math.max(cw / iw, ch / ih);
    const w = iw * s, h = ih * s;
    ctx.drawImage(img, (cw - w) / 2, (ch - h) / 2, w, h);
  }

  // Order: first frame, then every 16th, 8th, 4th, 2nd, then the rest
  const order = [];
  const seen = new Set();
  for (const step of [count, 16, 8, 4, 2, 1]) for (let i = 0; i < count; i += step) if (!seen.has(i)) { seen.add(i); order.push(i); }
  let loadedCount = 0;
  const ready = new Promise((resolve) => {
    let inFlight = 0, next = 0;
    const pump = () => {
      while (inFlight < 6 && next < order.length) {
        const i = order[next++];
        const img = new Image();
        img.decoding = 'async';
        img.src = src(i);
        frames[i] = img;
        inFlight++;
        const done = () => {
          inFlight--; loadedCount++;
          if (i === 0) resolve();
          if (Math.abs(i - wanted) < 3) { current = -1; draw(wanted); }
          pump();
        };
        img.onload = done; img.onerror = done;
      }
    };
    pump();
  });

  addEventListener('resize', resize);
  resize();
  return { draw, ready, progress: () => loadedCount / count };
}
