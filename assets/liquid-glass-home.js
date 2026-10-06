/* Restored from Daihaolin201.github.io commit 7d270d8; static bilingual pages replace old i18n hooks. */
/* ---- active-section nav highlight ---- */
    const sections = ["about", "research", "publications", "projects", "experience", "awards", "service", "contact"];
    const menuMap = new Map(sections.map((id) => [id, document.querySelector(`.menu a[href="#${id}"]`)]));
    const navObserver = new IntersectionObserver((entries) => {
      let current = null, maxRatio = 0;
      for (const entry of entries) {
        if (entry.isIntersecting && entry.intersectionRatio > maxRatio) { maxRatio = entry.intersectionRatio; current = entry.target.id; }
      }
      if (!current) return;
      for (const [id, link] of menuMap.entries()) { if (link) link.setAttribute("aria-current", id === current ? "true" : "false"); }
    }, { rootMargin: "-20% 0px -55% 0px", threshold: [0.2, 0.45, 0.7] });
    sections.forEach((id) => { const el = document.getElementById(id); if (el) navObserver.observe(el); });

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    /* ---- boot sequence: one-shot mission-control intro (skippable, once per session) ---- */
    (function () {
      let seen = null;
      try { seen = sessionStorage.getItem("boot-seen"); } catch (e) {}
      if (reduceMotion || seen) return;
      try { sessionStorage.setItem("boot-seen", "1"); } catch (e) {}
      const o = document.createElement("div");
      o.id = "boot"; o.setAttribute("aria-hidden", "true");
      o.style.cssText = "position:fixed;inset:0;z-index:80;background:#04070f;display:flex;align-items:center;justify-content:center;transition:opacity .45s ease;cursor:pointer;";
      o.innerHTML = '<pre style="font-family:var(--mono);font-size:12px;line-height:1.8;color:#7dd3fc;margin:0;text-shadow:0 0 14px rgba(34,211,238,.45)"></pre>';
      document.body.appendChild(o);
      const pre = o.querySelector("pre");
      const lines = [
        "◤ DENNIS.LI — SWARM CONSOLE v2",
        "> spawning agents ............ OK",
        "> mesh link / consensus ...... OK",
        "> bayesian belief filter ..... OK",
        "> source-seeking online — welcome."
      ];
      let li = 0;
      (function next() {
        if (!o.isConnected) return;
        if (li < lines.length) { pre.textContent += (li ? "\n" : "") + lines[li++]; setTimeout(next, 130); }
        else setTimeout(() => { o.style.opacity = "0"; setTimeout(() => o.remove(), 500); }, 380);
      })();
      o.addEventListener("pointerdown", () => o.remove());
    })();

    /* ---- scroll reveal + stat count-up ---- */
    const reveal = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        e.target.classList.add("in");
        e.target.querySelectorAll(".stat-num[data-count]").forEach(countUp);
        reveal.unobserve(e.target);
      });
    }, { threshold: 0.12 });
    document.querySelectorAll(".section").forEach((s) => reveal.observe(s));

    function countUp(el) {
      if (el.dataset.done) return; el.dataset.done = "1";
      const target = parseInt(el.dataset.count, 10);
      if (isNaN(target)) return;
      const final = String(target).padStart(2, "0");
      if (reduceMotion) { el.textContent = final; return; }
      const dur = 900, start = performance.now();
      function frame(t) {
        const p = Math.min((t - start) / dur, 1);
        el.textContent = String(Math.round(p * target)).padStart(2, "0");
        if (p < 1) requestAnimationFrame(frame);
      }
      requestAnimationFrame(frame);
      setTimeout(() => { el.textContent = final; }, dur + 400);  // guarantee final value even if rAF is throttled (background tab)
    }

    /* ---- cursor spotlight + card sheen + shared pointer ---- */
    const root = document.documentElement;
    const pointer = { x: -999, y: -999, active: false };
    window.__pointer = pointer;
    window.addEventListener("pointermove", (event) => {
      root.style.setProperty("--mx", `${(event.clientX / window.innerWidth) * 100}%`);
      root.style.setProperty("--my", `${(event.clientY / window.innerHeight) * 100}%`);
      pointer.x = event.clientX; pointer.y = event.clientY; pointer.active = true;
      const card = event.target.closest && event.target.closest(".pub");
      if (card) {
        const r = card.getBoundingClientRect();
        card.style.setProperty("--cmx", `${event.clientX - r.left}px`);
        card.style.setProperty("--cmy", `${event.clientY - r.top}px`);
      }
    });
    window.addEventListener("pointerleave", () => { pointer.active = false; });

    /* ---- scroll progress bar ---- */
    const progress = document.getElementById("scroll-progress");
    function updateProgress() {
      const h = document.documentElement;
      const max = h.scrollHeight - h.clientHeight;
      const p = max > 0 ? (h.scrollTop || document.body.scrollTop) / max : 0;
      if (progress) progress.style.width = `${Math.min(p, 1) * 100}%`;
    }
    window.addEventListener("scroll", updateProgress, { passive: true });
    updateProgress();

    /* ---- keep content clear of the fixed nav (height varies with wrap / language) ---- */
    const fixedNav = document.querySelector(".top-nav");
    const containerEl = document.querySelector(".container");
    function padForNav() {
      if (fixedNav && containerEl) containerEl.style.paddingTop = (fixedNav.offsetHeight + 22) + "px";
    }
    padForNav();
    window.addEventListener("load", padForNav);
    if (window.ResizeObserver && fixedNav) new ResizeObserver(padForNav).observe(fixedNav);

    /* ---- cinematic layer: text decode, 3D tilt, magnetic CTAs, grid parallax ---- */
    const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

    const SCRAMBLE = "!<>-_/[]{}=+*^?#$%&";
    function decodeText(el, dur = 950) {
      if (reduceMotion || !el) return;
      const node = el.childNodes[0];
      if (!node || node.nodeType !== 3) return;   // only scramble the text node; keep the caret span intact
      const final = node.textContent;
      const start = performance.now();
      (function tick(now) {
        const p = Math.min((now - start) / dur, 1);
        const reveal = Math.floor(p * final.length);
        let out = final.slice(0, reveal);
        for (let i = reveal; i < final.length; i++) out += final[i] === " " ? " " : SCRAMBLE[(Math.random() * SCRAMBLE.length) | 0];
        node.textContent = out;
        if (p < 1) requestAnimationFrame(tick); else node.textContent = final;
      })(start);
      setTimeout(() => { node.textContent = final; }, dur + 250);  // rAF is paused in background tabs — guarantee the final text
    }
    const heroH1 = document.querySelector("#about h1");
    decodeText(heroH1);

    if (finePointer && !reduceMotion) {
      document.querySelectorAll(".pub, .profile").forEach((el) => {
        el.addEventListener("pointermove", (e) => {
          const r = el.getBoundingClientRect();
          const px = (e.clientX - r.left) / r.width - 0.5, py = (e.clientY - r.top) / r.height - 0.5;
          el.style.transform = `perspective(760px) rotateX(${(-py * 3.4).toFixed(2)}deg) rotateY(${(px * 4.6).toFixed(2)}deg)`;
        });
        el.addEventListener("pointerleave", () => { el.style.transform = ""; });
      });
      document.querySelectorAll(".btn").forEach((btn) => {
        btn.addEventListener("pointermove", (e) => {
          const r = btn.getBoundingClientRect();
          btn.style.transform = `translate(${((e.clientX - r.left - r.width / 2) * 0.16).toFixed(1)}px, ${((e.clientY - r.top - r.height / 2) * 0.3).toFixed(1)}px)`;
        });
        btn.addEventListener("pointerleave", () => { btn.style.transform = ""; });
      });
    }

    const gridLayer = document.querySelector(".grid");
    window.addEventListener("scroll", () => {
      if (gridLayer && !reduceMotion) gridLayer.style.backgroundPosition = `0 ${(-(window.scrollY * 0.12)).toFixed(1)}px`;
    }, { passive: true });

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
        ctx.fillStyle = "#34d399"; ctx.globalAlpha = 0.85; ctx.font = '9px ui-monospace, "SF Mono", Menlo, monospace';
        ctx.fillText("LOCK", source.x + rr + 9, source.y + 3);
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
    })();

    /* ---- foreground FX layer: cursor particle trail + click burst (renders ABOVE content) ---- */
    (function () {
      if (reduceMotion) return;
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
        }, { passive: true });
      }
      let lastDown = 0;
      document.addEventListener("pointerdown", (e) => {
        if (e.target.closest("a, button, input, select, textarea")) return;
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
          return;
        }
        rings.push({ x: e.clientX, y: e.clientY, r: 4, life: 1 });
        for (let i = 0; i < 14; i++) {
          const a = Math.PI * 2 * i / 14, s = 1.5 + Math.random() * 2.2;
          parts.push({ x: e.clientX, y: e.clientY, vx: Math.cos(a) * s, vy: Math.sin(a) * s,
            life: 1, r: 1.4 + Math.random() * 1.6, c: i % 3 ? "#22d3ee" : "#c084fc" });
        }
        if (window.__deployBeacon) window.__deployBeacon(e.clientX, e.clientY);
      });
      (function loop() {
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
        requestAnimationFrame(loop);
      })();
    })();
