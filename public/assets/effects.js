/* Liquid-glass page effects: robots that follow the pointer (background), a cursor trail and click ripples (foreground),
   section highlighting in the menu and a scroll progress bar. Restored from the previous design and trimmed. */
(function () {
    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    let reduceMotion = motionQuery.matches;
    const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

    /* ---- current section in the menu ---- */
    const links = [...document.querySelectorAll('.menu a[href^="#"]')];
    const targets = links.map((a) => document.getElementById(a.getAttribute("href").slice(1))).filter(Boolean);
    const navObserver = new IntersectionObserver((entries) => {
      let current = null, maxRatio = 0;
      for (const entry of entries) if (entry.isIntersecting && entry.intersectionRatio > maxRatio) { maxRatio = entry.intersectionRatio; current = entry.target.id; }
      if (!current) return;
      for (const a of links) a.setAttribute("aria-current", a.getAttribute("href") === "#" + current ? "true" : "false");
    }, { rootMargin: "-20% 0px -55% 0px", threshold: [0.2, 0.45, 0.7] });
    targets.forEach((el) => navObserver.observe(el));

    /* ---- shared pointer + spotlight ----
       The spotlight position is set on the spotlight layer itself (not on <html>, which would restyle the whole page
       on every mouse move) and at most once per frame. */
    const spotlight = document.querySelector(".spotlight");
    const pointer = { x: -999, y: -999, active: false };
    window.__pointer = pointer;
    let spotFrame = 0;
    window.addEventListener("pointermove", (event) => {
      pointer.x = event.clientX; pointer.y = event.clientY; pointer.active = event.pointerType === "mouse";
      if (spotlight && pointer.active && !spotFrame) spotFrame = requestAnimationFrame(() => {
        spotFrame = 0;
        spotlight.style.setProperty("--mx", `${(pointer.x / window.innerWidth) * 100}%`);
        spotlight.style.setProperty("--my", `${(pointer.y / window.innerHeight) * 100}%`);
      });
    }, { passive: true });
    document.addEventListener("pointerleave", () => { pointer.active = false; });

    /* ---- scroll progress bar and grid parallax, once per frame; the bar scales instead of changing width ---- */
    const progress = document.getElementById("scroll-progress");
    const gridLayer = document.querySelector(".grid");
    let scrollFrame = 0;
    function onScroll() {
      scrollFrame = 0;
      const h = document.documentElement, max = h.scrollHeight - h.clientHeight;
      if (progress) progress.style.transform = `scaleX(${Math.min(max > 0 ? h.scrollTop / max : 0, 1).toFixed(4)})`;
      if (gridLayer && !reduceMotion) gridLayer.style.backgroundPosition = `0 ${(-(window.scrollY * 0.12)).toFixed(1)}px`;
    }
    window.addEventListener("scroll", () => { if (!scrollFrame) scrollFrame = requestAnimationFrame(onScroll); }, { passive: true });
    onScroll();

    /* ---- multi-agent consensus / source-seeking canvas ---- */
    (function () {
      const canvas = document.getElementById("agents");
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      let W = 0, H = 0, dpr = 1, agents = [], source = null, raf = null, frame = 0, packets = [], pulses = [];
      const N = Math.max(12, Math.min(22, Math.round(window.innerWidth / 80)));
      const LINK = 150, SRC_LINK = 270, SEP = 38;
      const SPIN = Math.random() < 0.5 ? -1 : 1;   // whole-swarm vortex direction, random per visit
      const rand = (a, b) => a + Math.random() * (b - a);

      function resize() {
        dpr = Math.min(window.devicePixelRatio || 1, 2);
        W = window.innerWidth; H = window.innerHeight;
        canvas.width = W * dpr; canvas.height = H * dpr;
        canvas.style.width = W + "px"; canvas.style.height = H + "px";
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      }
      function init() {
        agents = Array.from({ length: N }, (_, i) => ({
          x: rand(0, W), y: rand(0, H), vx: rand(-0.3, 0.3), vy: rand(-0.3, 0.3), trail: [],
          ring: 46 + (i % 3) * 26 + rand(-6, 6),   // preferred standoff radius: three nested escort rings
          dir: SPIN                                 // coherent vortex (same direction avoids head-on passes)
        }));
        source = { x: W * 0.55, y: H * 0.4, tx: W * 0.55, ty: H * 0.4, t: 0, boost: 0 };
      }
      // click-to-deploy: the fx layer calls this to drop the signal source at a point
      window.__deployBeacon = (x, y) => { if (!source) return; source.tx = x; source.ty = y; source.t = 300; source.boost = 140; };
      // double-click scatter: impulse away from the point, brief speed-cap lift, then the rings regroup
      window.__scatter = (x, y) => {
        for (const a of agents) {
          const dx = a.x - x, dy = a.y - y, d = Math.hypot(dx, dy) || 1;
          const k = Math.max(0.25, 1 - d / 460) * 7;
          a.vx += (dx / d) * k; a.vy += (dy / d) * k;
          a.burst = 36;
        }
      };
      function step() {
        const ptr = window.__pointer;
        const tracking = ptr && ptr.active && ptr.y < H;   // swarm follows the cursor (source-seeking)
        if (tracking) {
          source.tx = ptr.x; source.ty = ptr.y; source.t = 90;
        } else if (--source.t <= 0) {
          source.tx = rand(W * 0.25, W * 0.82); source.ty = rand(H * 0.18, H * 0.62); source.t = rand(220, 440);
        }
        const ease = tracking ? 0.05 : (source.boost > 0 ? (source.boost--, 0.045) : 0.01);
        source.x += (source.tx - source.x) * ease; source.y += (source.ty - source.y) * ease;
        for (const a of agents) {
          const dx = source.x - a.x, dy = source.y - a.y, d = Math.hypot(dx, dy) || 1;
          const ux = dx / d, uy = dy / d;
          // standoff-ring seek: spring toward this agent's escort radius, not the centre
          const radial = Math.max(-0.06, Math.min(0.055, (d - a.ring) * 0.0018));
          a.vx += ux * radial; a.vy += uy * radial;
          // tangential circulation: orbit the source once nearby (rings counter-rotate)
          const zone = a.ring * 2.4;
          if (d < zone) {
            const tng = 0.022 + 0.05 * (1 - d / zone);
            a.vx += -uy * a.dir * tng; a.vy += ux * a.dir * tng;
          }
          let cx = 0, cy = 0, n = 0;
          for (const b of agents) {
            if (b === a) continue;
            const ex = b.x - a.x, ey = b.y - a.y, dd = ex * ex + ey * ey;
            if (dd < LINK * LINK) { cx += b.vx; cy += b.vy; n++; }
            if (dd < SEP * SEP && dd > 0.01) {           // separation: keep safe spacing, no clumping
              const dl = Math.sqrt(dd), f = (1 - dl / SEP) * 0.16;
              a.vx -= (ex / dl) * f; a.vy -= (ey / dl) * f;
            }
          }
          if (n) { a.vx += (cx / n) * 0.03; a.vy += (cy / n) * 0.03; } // consensus / alignment
          a.vx = a.vx * 0.965 + rand(-0.02, 0.02); a.vy = a.vy * 0.965 + rand(-0.02, 0.02);
          const sp = Math.hypot(a.vx, a.vy), max = a.burst > 0 ? (a.burst--, 4) : 1.6; if (sp > max) { a.vx = a.vx / sp * max; a.vy = a.vy / sp * max; }
          a.x += a.vx; a.y += a.vy;
          let wrapped = false;
          if (a.x < -20) { a.x = W + 20; wrapped = true; } if (a.x > W + 20) { a.x = -20; wrapped = true; }
          if (a.y < -20) { a.y = H + 20; wrapped = true; } if (a.y > H + 20) { a.y = -20; wrapped = true; }
          if (wrapped) { a.trail.length = 0; }
          else { a.trail.push(a.x, a.y); if (a.trail.length > 24) a.trail.splice(0, 2); }
        }
        // communication packets travelling along active links
        if (packets.length < 24 && Math.random() < 0.3) {
          const a = agents[(Math.random() * agents.length) | 0];
          if (Math.hypot(a.x - source.x, a.y - source.y) < SRC_LINK) {
            packets.push({ fa: a, fb: source, t: 0, sp: rand(0.015, 0.03), c: "#c084fc", max: SRC_LINK });
          } else {
            const b = agents[(Math.random() * agents.length) | 0];
            if (b !== a && Math.hypot(a.x - b.x, a.y - b.y) < LINK) packets.push({ fa: a, fb: b, t: 0, sp: rand(0.02, 0.045), c: "#22d3ee", max: LINK });
          }
        }
        for (let i = packets.length - 1; i >= 0; i--) {
          const p = packets[i]; p.t += p.sp;
          if (p.t >= 1 || Math.hypot(p.fa.x - p.fb.x, p.fa.y - p.fb.y) > p.max * 1.25) packets.splice(i, 1); // done or link broken/wrapped
        }
        // sonar sensing pulses: a random agent occasionally pings its surroundings
        if (pulses.length < 5 && Math.random() < 0.014) {
          const a = agents[(Math.random() * agents.length) | 0];
          pulses.push({ x: a.x, y: a.y, r: 4, life: 1 });
        }
        for (let i = pulses.length - 1; i >= 0; i--) {
          const g = pulses[i]; g.r += 1.7; g.life -= 0.016;
          if (g.life <= 0) pulses.splice(i, 1);
        }
      }
      function draw() {
        ctx.clearRect(0, 0, W, H);
        for (let i = 0; i < agents.length; i++) {
          for (let j = i + 1; j < agents.length; j++) {
            const a = agents[i], b = agents[j], d = Math.hypot(a.x - b.x, a.y - b.y);
            if (d < LINK) { ctx.globalAlpha = (1 - d / LINK) * 0.3; ctx.strokeStyle = "#38bdf8"; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); }
          }
        }
        for (const a of agents) { const d = Math.hypot(a.x - source.x, a.y - source.y); if (d < SRC_LINK) { ctx.globalAlpha = (1 - d / SRC_LINK) * 0.16; ctx.strokeStyle = "#a855f7"; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(source.x, source.y); ctx.stroke(); } }
        ctx.globalAlpha = 1;
        // comet trails
        for (const a of agents) {
          const pts = a.trail.length / 2;
          for (let k = 0; k < a.trail.length; k += 2) {
            const f = (k / 2) / Math.max(pts - 1, 1);
            ctx.globalAlpha = f * 0.3;
            ctx.fillStyle = "#38bdf8";
            ctx.beginPath(); ctx.arc(a.trail[k], a.trail[k + 1], 1.5 * f + 0.2, 0, 6.2832); ctx.fill();
          }
        }
        ctx.globalAlpha = 1;
        for (const a of agents) { ctx.beginPath(); ctx.fillStyle = "#7dd3fc"; ctx.shadowColor = "#22d3ee"; ctx.shadowBlur = 10; ctx.arc(a.x, a.y, 2.7, 0, 6.2832); ctx.fill(); }
        const pulse = 1 + Math.sin(frame * 0.06) * 0.28;
        ctx.beginPath(); ctx.fillStyle = "#c084fc"; ctx.shadowColor = "#a855f7"; ctx.shadowBlur = 26 * pulse; ctx.arc(source.x, source.y, 4.6 * pulse, 0, 6.2832); ctx.fill();
        ctx.globalAlpha = 0.5; ctx.beginPath(); ctx.strokeStyle = "#a855f7"; ctx.lineWidth = 1; ctx.arc(source.x, source.y, 10 * pulse + 4, 0, 6.2832); ctx.stroke();
        ctx.globalAlpha = 1; ctx.shadowBlur = 0;
        // communication packets
        for (const p of packets) {
          const x = p.fa.x + (p.fb.x - p.fa.x) * p.t, y = p.fa.y + (p.fb.y - p.fa.y) * p.t;
          ctx.globalAlpha = 0.85 * (1 - Math.abs(p.t - 0.5) * 0.7);
          ctx.fillStyle = p.c; ctx.shadowColor = p.c; ctx.shadowBlur = 7;
          ctx.beginPath(); ctx.arc(x, y, 1.7, 0, 6.2832); ctx.fill();
        }
        ctx.globalAlpha = 1; ctx.shadowBlur = 0;
        // sonar pulses
        for (const g of pulses) {
          ctx.globalAlpha = g.life * 0.32; ctx.strokeStyle = "#22d3ee"; ctx.lineWidth = 1;
          ctx.beginPath(); ctx.arc(g.x, g.y, g.r, 0, 6.2832); ctx.stroke();
        }
        ctx.globalAlpha = 1;
        drawBelief();
        // shared lock metric: how converged the swarm is on the source
        let md = 0;
        for (const a of agents) md += Math.hypot(a.x - source.x, a.y - source.y);
        md /= agents.length;
        const lock = Math.max(0, Math.min(99, Math.round((1 - md / (SRC_LINK * 1.4)) * 100)));
        if (lock >= 70) drawReticle();
      }
      // rotating target-lock reticle around the source once the swarm converges
      function drawReticle() {
        const rr = 24 + 5 * Math.sin(frame * 0.08);
        ctx.save();
        ctx.translate(source.x, source.y); ctx.rotate(frame * 0.02);
        ctx.strokeStyle = "#34d399"; ctx.globalAlpha = 0.8; ctx.lineWidth = 1.2;
        for (let k = 0; k < 4; k++) {
          ctx.beginPath(); ctx.arc(0, 0, rr, k * 1.5708 + 0.2, k * 1.5708 + 1.37); ctx.stroke();
        }
        for (let k = 0; k < 4; k++) {
          const ang = k * 1.5708;
          ctx.beginPath(); ctx.moveTo(Math.cos(ang) * (rr - 5), Math.sin(ang) * (rr - 5)); ctx.lineTo(Math.cos(ang) * (rr + 5), Math.sin(ang) * (rr + 5)); ctx.stroke();
        }
        ctx.restore();
        ctx.globalAlpha = 1;
      }
      // swarm belief: 1-sigma covariance ellipse of agent positions (marching-ants) + centroid crosshair
      function drawBelief() {
        const n = agents.length; if (n < 3) return;
        let mx = 0, my = 0;
        for (const a of agents) { mx += a.x; my += a.y; } mx /= n; my /= n;
        let sxx = 0, syy = 0, sxy = 0;
        for (const a of agents) { const dx = a.x - mx, dy = a.y - my; sxx += dx * dx; syy += dy * dy; sxy += dx * dy; }
        sxx /= n; syy /= n; sxy /= n;
        const tr = sxx + syy, det = sxx * syy - sxy * sxy;
        const disc = Math.sqrt(Math.max(tr * tr / 4 - det, 0));
        const l1 = Math.max(tr / 2 + disc, 1), l2 = Math.max(tr / 2 - disc, 1);
        const ang = 0.5 * Math.atan2(2 * sxy, sxx - syy);
        ctx.save();
        ctx.strokeStyle = "#a855f7"; ctx.lineWidth = 1;
        ctx.setLineDash([5, 7]); ctx.lineDashOffset = -frame * 0.35; ctx.globalAlpha = 0.3;
        ctx.beginPath(); ctx.ellipse(mx, my, Math.sqrt(l1) * 1.3, Math.sqrt(l2) * 1.3, ang, 0, 6.2832); ctx.stroke();
        ctx.setLineDash([]); ctx.globalAlpha = 0.42;
        ctx.beginPath(); ctx.moveTo(mx - 7, my); ctx.lineTo(mx + 7, my); ctx.moveTo(mx, my - 7); ctx.lineTo(mx, my + 7); ctx.stroke();
        ctx.restore();
      }
      function loop() {
        frame++; step(); draw(); raf = requestAnimationFrame(loop);
      }
      function start() { if (!raf && !reduceMotion) loop(); }
      function stop() { if (raf) { cancelAnimationFrame(raf); raf = null; } }

      resize(); init();
      if (reduceMotion) { draw(); } else { start(); }
      let rt; window.addEventListener("resize", () => { clearTimeout(rt); rt = setTimeout(() => { resize(); init(); if (reduceMotion) draw(); }, 180); });
      document.addEventListener("visibilitychange", () => { document.hidden ? stop() : start(); });
      // follow a change of the system motion setting without a reload
      motionQuery.addEventListener("change", () => { reduceMotion = motionQuery.matches; if (reduceMotion) { stop(); draw(); } else start(); });
    })();

    /* ---- foreground FX layer: cursor particle trail + click burst (renders ABOVE content) ---- */
    (function () {
      const c = document.createElement("canvas");
      c.id = "fx"; c.setAttribute("aria-hidden", "true");
      c.style.cssText = "position:fixed;inset:0;z-index:10;pointer-events:none;";
      document.body.appendChild(c);
      const fctx = c.getContext("2d");
      let W = 0, H = 0, dpr = 1;
      function rs() {
        dpr = Math.min(window.devicePixelRatio || 1, 2);
        W = window.innerWidth; H = window.innerHeight;
        c.width = W * dpr; c.height = H * dpr;
        c.style.width = W + "px"; c.style.height = H + "px";
        fctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      }
      rs(); window.addEventListener("resize", rs);
      const parts = [], rings = [];
      window.__fx = { parts, rings };
      let fxFrame = 0;
      function wake() { if (!fxFrame && !reduceMotion) fxFrame = requestAnimationFrame(loop); }
      let lx = -1, ly = -1;
      if (finePointer) {
        window.addEventListener("pointermove", (e) => {
          if (lx >= 0) {
            const dx = e.clientX - lx, dy = e.clientY - ly, d = Math.hypot(dx, dy);
            const n = Math.min(3, Math.ceil(d / 12));
            for (let i = 0; i < n; i++) {
              const t = (i + 1) / n;
              parts.push({ x: lx + dx * t + (Math.random() - 0.5) * 4, y: ly + dy * t + (Math.random() - 0.5) * 4,
                vx: (Math.random() - 0.5) * 0.6, vy: (Math.random() - 0.5) * 0.6 - 0.25,
                life: 1, r: 1 + Math.random() * 1.8, c: Math.random() < 0.7 ? "#22d3ee" : "#a855f7" });
            }
          }
          lx = e.clientX; ly = e.clientY;
          if (parts.length > 140) parts.splice(0, parts.length - 140);
          if (!reduceMotion) wake();
        }, { passive: true });
      }
      let lastDown = 0;
      const quiet = "a, button, input, select, textarea, label, summary, canvas, svg, details, .pb-panel figure, [data-no-fx]"; // games, diagrams and controls get no ripples
      // Mouse and pen ripple on press. A finger only on a tap, so scrolling the page does not set off ripples.
      let touchStart = null;
      document.addEventListener("pointerdown", (e) => {
        if (e.pointerType === "touch") { touchStart = { x: e.clientX, y: e.clientY, t: performance.now() }; return; }
        burst(e);
      });
      document.addEventListener("pointerup", (e) => {
        if (e.pointerType !== "touch" || !touchStart) return;
        const tap = Math.hypot(e.clientX - touchStart.x, e.clientY - touchStart.y) < 10 && performance.now() - touchStart.t < 300;
        touchStart = null;
        if (tap) burst(e);
      });
      document.addEventListener("pointercancel", () => { touchStart = null; });
      function burst(e) {
        if (reduceMotion || !(e.target instanceof Element) || e.target.closest(quiet)) return;
        const now = performance.now(), dbl = now - lastDown < 350;
        lastDown = now;
        if (dbl) {
          // double-click: shockwave + scatter the swarm
          rings.push({ x: e.clientX, y: e.clientY, r: 6, life: 1, sp: 8 });
          for (let i = 0; i < 22; i++) {
            const a = Math.PI * 2 * i / 22, s = 3 + Math.random() * 3.5;
            parts.push({ x: e.clientX, y: e.clientY, vx: Math.cos(a) * s, vy: Math.sin(a) * s,
              life: 1, r: 1.6 + Math.random() * 1.8, c: i % 2 ? "#c084fc" : "#22d3ee" });
          }
          if (window.__scatter) window.__scatter(e.clientX, e.clientY);
          wake();
          return;
        }
        rings.push({ x: e.clientX, y: e.clientY, r: 4, life: 1 });
        for (let i = 0; i < 14; i++) {
          const a = Math.PI * 2 * i / 14, s = 1.5 + Math.random() * 2.2;
          parts.push({ x: e.clientX, y: e.clientY, vx: Math.cos(a) * s, vy: Math.sin(a) * s,
            life: 1, r: 1.4 + Math.random() * 1.6, c: i % 3 ? "#22d3ee" : "#c084fc" });
        }
        if (window.__deployBeacon) window.__deployBeacon(e.clientX, e.clientY);
        wake();
      }
      // runs only while particles or rings are visible; an idle page draws nothing
      function loop() {
        fxFrame = 0;
        fctx.clearRect(0, 0, W, H);
        for (let i = parts.length - 1; i >= 0; i--) {
          const p = parts[i];
          p.x += p.vx; p.y += p.vy; p.vx *= 0.96; p.vy *= 0.96; p.life -= 0.026;
          if (p.life <= 0) { parts.splice(i, 1); continue; }
          fctx.globalAlpha = p.life * 0.85; fctx.fillStyle = p.c; fctx.shadowColor = p.c; fctx.shadowBlur = 8;
          fctx.beginPath(); fctx.arc(p.x, p.y, p.r * p.life, 0, 6.2832); fctx.fill();
        }
        fctx.shadowBlur = 0;
        for (let i = rings.length - 1; i >= 0; i--) {
          const g = rings[i];
          g.r += g.sp || 3.2; g.life -= 0.03;
          if (g.life <= 0) { rings.splice(i, 1); continue; }
          fctx.globalAlpha = g.life * 0.6; fctx.strokeStyle = "#7dd3fc"; fctx.lineWidth = 1.5;
          fctx.beginPath(); fctx.arc(g.x, g.y, g.r, 0, 6.2832); fctx.stroke();
        }
        fctx.globalAlpha = 1;
        if (parts.length || rings.length) wake();
      }
    })();
})();
