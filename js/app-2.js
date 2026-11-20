"use strict";
      const selectQuality = document.getElementById("selectQuality");
      const btnGenerateDownload = document.getElementById("btnGenerateDownload");
      const generateBtnLabel = document.getElementById("generateBtnLabel");
      const btnRedownload = document.getElementById("btnRedownload");
      const redownloadLabel = document.getElementById("redownloadLabel");

      const config = {
        mode: "ring", // ring | bomb | blade | laser
        theme: "ucl", // ucl | superlig | europa | worldcup
        selectedWinnerKey: "random",
        simSpeed: 1.0,
        gravityScale: 1.0,
        bounciness: 0.88,
        logoRadius: 37,

        // Ring mode
        gapDegrees: 24,
        ringSpeed: 1.15,
        doubleGap: false,
        shrinkingRing: false,
        speedEscalation: true,
        growSurvivor: false,

        // Bomb mode
        bombTimer: 3.5,
        bombChaos: 1.15,

        // Blade mode
        bladeSpeed: 1.2,
        bladeLength: 48,

        // Laser mode
        laserSpeed: 1.15,
        laserCount: 2,

        // Viral & text
        subTitle: "UEFA CHAMPIONS LEAGUE",
        mainTitle: "WHO SURVIVES?",
        watermark: "",
        viralHook: "SONA KALAN SENİN TAKIMIN MI? YORUMA YAZ! 👇",
        showViralHook: true,
        slowMoFinale: true,
        audioEnabled: true,
        preset: "ucl36",

        // Export
        format: "mp4",
        quality: "1080x1920@30"
      };

      let silverTrophyCanvas = null;
      let goldTrophyCanvas = null;
      let customTrophyImg = null;

      let previewState = null;
      let previewRunning = false;
      let isRendering = false;
      let renderCancelRequested = false;
      let lastReadyUrl = null;
      let lastReadyFilename = "football-viral-arena.mp4";

      // Live Web Audio
      let liveAudioCtx = null;
      let liveMasterGain = null;
      let lastLiveBounceT = 0;

      /* =========================================================================
         3. YARDIMCI FONKSİYONLAR & TOAST BİLDİRİMİ
         ========================================================================= */
      function showToast(msg, type = "info") {
        const el = document.createElement("div");
        const styles = {
          info: "bg-slate-800/95 border-sky-500/50 text-sky-100",
          success: "bg-emerald-950/95 border-emerald-500/60 text-emerald-100",
          warn: "bg-amber-950/95 border-amber-500/60 text-amber-100",
          error: "bg-rose-950/95 border-rose-500/60 text-rose-100"
        };
        el.className = `pointer-events-auto px-4 py-3 rounded-xl border text-xs sm:text-sm font-medium shadow-2xl backdrop-blur transition-all duration-300 ${styles[type] || styles.info}`;
        el.textContent = msg;
        toastContainer.appendChild(el);
        setTimeout(() => {
          el.style.opacity = "0";
          el.style.transform = "translateY(-8px)";
          setTimeout(() => el.remove(), 300);
        }, 4200);
      }

      function fmtTime(sec) {
        const s = Math.max(0, Math.floor(sec));
        const m = Math.floor(s / 60);
        return `${String(m).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
      }

      function slugify(str) {
        return String(str || "arena")
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-+|-+$/g, "") || "club";
      }

      function parseQuality(qStr) {
        const [dims, fpsStr] = qStr.split("@");
        const [w, h] = dims.split("x").map(Number);
        return { width: w || 1080, height: h || 1920, fps: Number(fpsStr) || 30 };
      }

      function normalizeAngle(a) {
        const twoPi = Math.PI * 2;
        return ((a % twoPi) + twoPi) % twoPi;
      }

      function angleDiff(a, b) {
        let d = normalizeAngle(a - b);
        if (d > Math.PI) d -= Math.PI * 2;
        return d;
      }

      function distPointToSegment(px, py, x1, y1, x2, y2) {
        const dx = x2 - x1;
        const dy = y2 - y1;
        const lenSq = dx * dx + dy * dy;
        if (lenSq < 0.0001) return Math.hypot(px - x1, py - y1);
        let t = ((px - x1) * dx + (py - y1) * dy) / lenSq;
        t = Math.max(0, Math.min(1, t));
        return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
      }

      function copyTextReliable(text) {
        const ta = document.createElement("textarea");
        ta.value = text;
        ta.style.position = "fixed";
        ta.style.top = "-9999px";
        document.body.appendChild(ta);
        ta.focus();
        ta.select();
        let ok = false;
        try { ok = document.execCommand("copy"); } catch (_) {}
        ta.remove();
        return ok;
      }

      /* =========================================================================
         4. GERÇEK KULÜP LOGOLARI (CORS-GÜVENLİ PNG + YÜKSEK ÇÖZÜNÜRLÜKLÜ YEDEK)
         ========================================================================= */
      function createFallbackCrest(club) {
        const size = 192;
        const off = document.createElement("canvas");
        off.width = size;
        off.height = size;
        const c = off.getContext("2d");
        const cx = size / 2;
        const cy = size / 2;

        c.save();
        c.beginPath();
        c.moveTo(cx, 14);
        c.lineTo(size - 24, 34);
        c.lineTo(size - 24, 102);
        c.quadraticCurveTo(size - 24, 154, cx, size - 14);
        c.quadraticCurveTo(24, 154, 24, 102);
        c.lineTo(24, 34);
        c.closePath();

        const g = c.createLinearGradient(0, 14, 0, size - 14);
        g.addColorStop(0, club.c1);
        g.addColorStop(1, club.c2);
        c.fillStyle = g;
        c.fill();

        c.save();
        c.clip();
        c.fillStyle = "rgba(255,255,255,0.16)";
        c.fillRect(cx - 18, 0, 36, size);
        const gloss = c.createLinearGradient(0, 0, 0, size * 0.55);
        gloss.addColorStop(0, "rgba(255,255,255,0.42)");
        gloss.addColorStop(1, "rgba(255,255,255,0)");
        c.fillStyle = gloss;
        c.fillRect(0, 0, size, size * 0.55);
        c.fillStyle = "rgba(4, 8, 26, 0.78)";
        c.fillRect(0, cy - 28, size, 56);
        c.restore();

        c.lineWidth = 7;
        c.strokeStyle = "#f8fafc";
        c.stroke();

        c.font = `900 ${club.short.length >= 4 ? 32 : 40}px 'Montserrat', sans-serif`;
        c.textAlign = "center";
        c.textBaseline = "middle";
        c.fillStyle = "#ffffff";
        c.fillText(club.short, cx, cy + 2);
        c.restore();
        return off;
      }

      function createImageSprite(img) {
        const size = 192;
        const off = document.createElement("canvas");
        off.width = size;
        off.height = size;
        const c = off.getContext("2d");
        const maxDim = size - 16;
        const scale = Math.min(maxDim / img.naturalWidth, maxDim / img.naturalHeight);
        const w = img.naturalWidth * scale;
        const h = img.naturalHeight * scale;
        c.drawImage(img, (size - w) / 2, (size - h) / 2, w, h);
        return off;
      }

      function createFlagSprite(img) {
        const size = 192;
        const off = document.createElement("canvas");
        off.width = size;
        off.height = size;
        const c = off.getContext("2d");
        const r = size / 2 - 10;

        c.save();
        c.beginPath();
        c.arc(size / 2, size / 2, r, 0, Math.PI * 2);
        c.clip();

        // Bayrağı daireye ortalayarak doldur (cover)
        const scale = Math.max((r * 2) / img.naturalWidth, (r * 2) / img.naturalHeight);
        const w = img.naturalWidth * scale;
        const h = img.naturalHeight * scale;
        c.drawImage(img, (size - w) / 2, (size - h) / 2, w, h);

        // Üst cam parlaması
        const gloss = c.createLinearGradient(0, 10, 0, size * 0.55);
        gloss.addColorStop(0, "rgba(255,255,255,0.34)");
        gloss.addColorStop(1, "rgba(255,255,255,0)");
        c.fillStyle = gloss;
        c.fillRect(0, 0, size, size * 0.55);
        c.restore();

        c.beginPath();
        c.arc(size / 2, size / 2, r, 0, Math.PI * 2);
        c.lineWidth = 7;
        c.strokeStyle = "#f8fafc";
        c.stroke();
        return off;
      }

      function updateLogoStatusUI() {
        const active = allClubs.filter((c) => c.enabled);
        const loaded = active.filter((c) => c.realLoaded).length;
        logoStatusPill.textContent = `Logolar: ${loaded}/${active.length} Hazır (${allClubs.length} Toplam)`;
        if (loaded === active.length && active.length > 0) {
          logoStatusPill.className = "px-3 py-1.5 rounded-full text-xs font-semibold bg-emerald-950/90 border border-emerald-600/60 text-emerald-300";
        } else {
          logoStatusPill.className = "px-3 py-1.5 rounded-full text-xs font-semibold bg-slate-800/90 border border-slate-700 text-sky-300";
        }
      }

      function loadClubLogo(club) {
        if (!club.sprite) club.sprite = createFallbackCrest(club);
        if (club.realLoaded || club.loadingStarted || !club.logoUrl) return;
        club.loadingStarted = true;

        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => {
          try {
            const sprite = club.isFlag ? createFlagSprite(img) : createImageSprite(img);
            sprite.getContext("2d").getImageData(0, 0, 1, 1); // CORS testi
            club.sprite = sprite;
            club.realLoaded = true;
            if (previewState) {
              previewState.badges.forEach((b) => { if (b.club === club) b.sprite = sprite; });
            }
            updateLogoStatusUI();
          } catch (_) {
            updateLogoStatusUI();
          }
        };
        img.onerror = () => updateLogoStatusUI();
        img.src = club.logoUrl;
      }

      function preloadClubLogos(onlyEnabled = true) {
        allClubs.forEach((club) => {
          if (!club.sprite) club.sprite = createFallbackCrest(club);
          if (!onlyEnabled || club.enabled) loadClubLogo(club);
        });
        updateLogoStatusUI();
      }

      /* =========================================================================
         5. GÜMÜŞ & ALTIN 3D METALİK ŞAMPİYONLAR KUPASI
         ========================================================================= */
      function buildTrophyCanvas(variant = "silver") {
        const W = 560;
        const H = 640;
        const off = document.createElement("canvas");
        off.width = W;
        off.height = H;
        const c = off.getContext("2d");
        const isGold = variant === "gold";

        c.save();
        c.translate(W / 2, 325);

        const bodyMetal = c.createLinearGradient(-138, 0, 138, 0);
        if (isGold) {
          bodyMetal.addColorStop(0.0, "#713f12");
          bodyMetal.addColorStop(0.16, "#eab308");
          bodyMetal.addColorStop(0.30, "#fef9c3");
          bodyMetal.addColorStop(0.46, "#a16207");
          bodyMetal.addColorStop(0.64, "#facc15");
          bodyMetal.addColorStop(0.80, "#fffbeb");
          bodyMetal.addColorStop(0.92, "#ca8a04");
          bodyMetal.addColorStop(1.0, "#422006");
        } else {
          bodyMetal.addColorStop(0.0, "#475569");
          bodyMetal.addColorStop(0.14, "#cbd5e1");
          bodyMetal.addColorStop(0.28, "#f8fafc");
          bodyMetal.addColorStop(0.45, "#64748b");
          bodyMetal.addColorStop(0.62, "#e2e8f0");
          bodyMetal.addColorStop(0.78, "#ffffff");
          bodyMetal.addColorStop(0.90, "#94a3b8");
          bodyMetal.addColorStop(1.0, "#334155");
        }

        const handleMetal = c.createLinearGradient(-230, -170, 230, 80);
        if (isGold) {
          handleMetal.addColorStop(0.0, "#ca8a04");
          handleMetal.addColorStop(0.25, "#fef08a");
          handleMetal.addColorStop(0.5, "#a16207");
          handleMetal.addColorStop(0.75, "#fde047");
          handleMetal.addColorStop(1.0, "#713f12");
        } else {
          handleMetal.addColorStop(0.0, "#94a3b8");
          handleMetal.addColorStop(0.25, "#f8fafc");
          handleMetal.addColorStop(0.5, "#64748b");
          handleMetal.addColorStop(0.75, "#f1f5f9");
          handleMetal.addColorStop(1.0, "#475569");
        }

        function drawEar(sign) {
          c.save();
          c.scale(sign, 1);
          c.beginPath();
          c.moveTo(108, -162);
          c.bezierCurveTo(235, -242, 268, -68, 178, 36);
          c.bezierCurveTo(148, 70, 112, 82, 74, 86);
          c.lineTo(66, 56);
          c.bezierCurveTo(106, 52, 134, 34, 154, 4);
          c.bezierCurveTo(212, -74, 196, -182, 108, -126);
          c.closePath();
          c.fillStyle = handleMetal;
          c.fill();
          c.strokeStyle = isGold ? "rgba(254,249,195,0.75)" : "rgba(255,255,255,0.75)";
          c.lineWidth = 4;
          c.stroke();
          c.restore();
        }
        drawEar(-1);
        drawEar(1);

        c.beginPath();
        c.moveTo(-136, -210);
        c.quadraticCurveTo(0, -188, 136, -210);
        c.bezierCurveTo(132, -88, 112, 26, 68, 110);
        c.quadraticCurveTo(0, 132, -68, 110);
        c.bezierCurveTo(-112, 26, -132, -88, -136, -210);
        c.closePath();
        c.fillStyle = bodyMetal;
        c.fill();
        c.strokeStyle = isGold ? "rgba(254,240,138,0.72)" : "rgba(241,245,249,0.72)";
        c.lineWidth = 3;
        c.stroke();

        c.save();
        c.clip();
        const s1 = c.createLinearGradient(-85, 0, -35, 0);
        s1.addColorStop(0, "rgba(255,255,255,0)");
        s1.addColorStop(0.5, "rgba(255,255,255,0.62)");
        s1.addColorStop(1, "rgba(255,255,255,0)");
        c.fillStyle = s1;
        c.fillRect(-95, -220, 65, 360);
        c.restore();

        c.beginPath();
        c.ellipse(0, -210, 136, 22, 0, 0, Math.PI * 2);
        c.fillStyle = bodyMetal;
        c.fill();
        c.lineWidth = 4;
        c.strokeStyle = isGold ? "#fef9c3" : "#f8fafc";
        c.stroke();

        c.beginPath();
        c.ellipse(0, 114, 64, 15, 0, 0, Math.PI * 2);
        c.fillStyle = bodyMetal;
        c.fill();

        c.beginPath();
        c.moveTo(-54, 118);
        c.quadraticCurveTo(-36, 158, -76, 190);
        c.lineTo(76, 190);
        c.quadraticCurveTo(36, 158, 54, 118);
        c.closePath();
        c.fillStyle = bodyMetal;
        c.fill();

        c.beginPath();
        c.roundRect(-98, 188, 196, 30, 8);
        c.fillStyle = bodyMetal;
        c.fill();

        c.beginPath();
        c.roundRect(-120, 218, 240, 38, 10);
        c.fillStyle = bodyMetal;
        c.fill();
        c.strokeStyle = "rgba(255,255,255,0.45)";
        c.lineWidth = 2.5;
        c.stroke();

        c.restore();
        return off;
      }

      /* =========================================================================
         6. PROCEDURAL WEB AUDIO MOTORU (CANLI + OFFLINE VIDEO SES KANALI)
         ========================================================================= */
      function initLiveAudio() {
        if (!liveAudioCtx) {
          const AC = window.AudioContext || window.webkitAudioContext;
          if (!AC) return;
          liveAudioCtx = new AC();
          liveMasterGain = liveAudioCtx.createGain();
          liveMasterGain.gain.value = 0.82;
          liveMasterGain.connect(liveAudioCtx.destination);
        }
        if (liveAudioCtx.state === "suspended") {
          liveAudioCtx.resume().catch(() => {});
        }
      }

      function scheduleSoundEvent(ac, dest, ev, t) {
        try {
          if (ev.type === "bounce") {
            const osc = ac.createOscillator();
            const g = ac.createGain();
            const k = Math.min(1, ev.intensity || 0.5);
            const freq = ev.isWall ? 320 + k * 280 : 210 + k * 170;
            osc.type = ev.isWall ? "sine" : "triangle";
            osc.frequency.setValueAtTime(freq, t);
            osc.frequency.exponentialRampToValueAtTime(freq * 0.48, t + 0.05);
            g.gain.setValueAtTime(Math.min(0.10, 0.02 + k * 0.07), t);
            g.gain.exponentialRampToValueAtTime(0.0008, t + 0.055);
            osc.connect(g); g.connect(dest);
            osc.start(t); osc.stop(t + 0.06);
          } else if (ev.type === "clang") {
            // Metalik kılıç çarpışması
            [1180, 1740].forEach((f, idx) => {
              const osc = ac.createOscillator();
              const g = ac.createGain();
              osc.type = idx === 0 ? "triangle" : "sine";
              osc.frequency.setValueAtTime(f, t);
              osc.frequency.exponentialRampToValueAtTime(f * 0.82, t + 0.11);
              g.gain.setValueAtTime(idx === 0 ? 0.09 : 0.06, t);
              g.gain.exponentialRampToValueAtTime(0.0008, t + 0.12);
              osc.connect(g); g.connect(dest);
              osc.start(t); osc.stop(t + 0.13);
            });
          } else if (ev.type === "slash") {
            const osc = ac.createOscillator();
            const g = ac.createGain();
            osc.type = "sawtooth";
            osc.frequency.setValueAtTime(640, t);
            osc.frequency.exponentialRampToValueAtTime(140, t + 0.14);
            g.gain.setValueAtTime(0.14, t);
            g.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
            osc.connect(g); g.connect(dest);
            osc.start(t); osc.stop(t + 0.16);
          } else if (ev.type === "tick") {
            const osc = ac.createOscillator();
            const g = ac.createGain();
            const urg = Math.min(1, Math.max(0, ev.urgency || 0));
            const f = 560 + urg * 740;
            osc.type = "square";
            osc.frequency.setValueAtTime(f, t);
            g.gain.setValueAtTime(0.065 + urg * 0.05, t);
            g.gain.exponentialRampToValueAtTime(0.001, t + 0.06);
            osc.connect(g); g.connect(dest);
            osc.start(t); osc.stop(t + 0.065);
          } else if (ev.type === "explode") {
            // Patlama bas + gürültü
            const sub = ac.createOscillator();
            const sg = ac.createGain();
            sub.type = "sine";
            sub.frequency.setValueAtTime(145, t);
            sub.frequency.exponentialRampToValueAtTime(28, t + 0.45);
            sg.gain.setValueAtTime(0.32, t);
            sg.gain.exponentialRampToValueAtTime(0.001, t + 0.48);
            sub.connect(sg); sg.connect(dest);
            sub.start(t); sub.stop(t + 0.5);

            const bufLen = Math.floor(ac.sampleRate * 0.35);
            const buf = ac.createBuffer(1, bufLen, ac.sampleRate);
            const data = buf.getChannelData(0);
            for (let i = 0; i < bufLen; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / bufLen);
            const noise = ac.createBufferSource();
            noise.buffer = buf;
            const filter = ac.createBiquadFilter();
            filter.type = "lowpass";
            filter.frequency.setValueAtTime(950, t);
            filter.frequency.exponentialRampToValueAtTime(160, t + 0.35);
            const ng = ac.createGain();
            ng.gain.setValueAtTime(0.24, t);
            ng.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
            noise.connect(filter); filter.connect(ng); ng.connect(dest);
            noise.start(t);
          } else if (ev.type === "zap") {
            const osc = ac.createOscillator();
            const g = ac.createGain();
            osc.type = "sawtooth";
            osc.frequency.setValueAtTime(980, t);
            osc.frequency.exponentialRampToValueAtTime(180, t + 0.18);
            g.gain.setValueAtTime(0.16, t);
            g.gain.exponentialRampToValueAtTime(0.001, t + 0.19);
            osc.connect(g); g.connect(dest);
            osc.start(t); osc.stop(t + 0.2);
          } else if (ev.type === "elim") {
            const sub = ac.createOscillator();
            const sg = ac.createGain();
            sub.type = "sine";
            sub.frequency.setValueAtTime(165, t);
            sub.frequency.exponentialRampToValueAtTime(42, t + 0.24);
            sg.gain.setValueAtTime(0.22, t);
            sg.gain.exponentialRampToValueAtTime(0.001, t + 0.26);
            sub.connect(sg); sg.connect(dest);
            sub.start(t); sub.stop(t + 0.28);
          } else if (ev.type === "final2") {
            [329.63, 440, 523.25].forEach((f, idx) => {
              const osc = ac.createOscillator();
              const g = ac.createGain();
              const st = t + idx * 0.08;
              osc.type = "triangle";
              osc.frequency.setValueAtTime(f, st);
              g.gain.setValueAtTime(0.001, st);
              g.gain.linearRampToValueAtTime(0.13, st + 0.04);
              g.gain.exponentialRampToValueAtTime(0.001, st + 0.7);
              osc.connect(g); g.connect(dest);
              osc.start(st); osc.stop(st + 0.75);
            });
          } else if (ev.type === "victory") {
            const notes = [261.63, 329.63, 392.0, 523.25, 659.25, 783.99, 1046.5];
            notes.forEach((f, idx) => {
              const osc = ac.createOscillator();
              const g = ac.createGain();
              const flt = ac.createBiquadFilter();
              const st = t + idx * 0.085;
              osc.type = idx < 3 ? "sawtooth" : "triangle";
              flt.type = "lowpass";
              flt.frequency.setValueAtTime(2000, st);
              osc.frequency.setValueAtTime(f, st);
              g.gain.setValueAtTime(0.001, st);
              g.gain.linearRampToValueAtTime(idx < 3 ? 0.08 : 0.14, st + 0.06);
              g.gain.exponentialRampToValueAtTime(0.001, st + 1.65);
              osc.connect(flt); flt.connect(g); g.connect(dest);
              osc.start(st); osc.stop(st + 1.7);
            });
          }
        } catch (_) {}
      }

      function playLiveSound(ev) {
        if (!config.audioEnabled || !liveAudioCtx || !liveMasterGain) return;
        const now = liveAudioCtx.currentTime;
        if (ev.type === "bounce" || ev.type === "clang") {
          if (now - lastLiveBounceT < 0.05) return;
          lastLiveBounceT = now;
        }
        scheduleSoundEvent(liveAudioCtx, liveMasterGain, ev, now);
      }

      /* =========================================================================
         7. 4 MODLU DETERMİNİSTİK SİMÜLASYON & FİZİK MOTORU
         ========================================================================= */
      function createBgParticles() {
        const list = [];
        for (let i = 0; i < 82; i++) {
          list.push({
            x: Math.random() * BASE_W,
            y: Math.random() * BASE_H,
            r: 1.3 + Math.random() * 3.4,
            vy: -12 - Math.random() * 24,
            vx: (Math.random() - 0.5) * 8,
            alpha: 0.16 + Math.random() * 0.48,
            phase: Math.random() * Math.PI * 2,
            bokeh: Math.random() > 0.78
          });
        }
        return list;
      }

      function createSimState(cfg) {
        const activeClubs = allClubs.filter((c) => c.enabled);
        const pool = [...activeClubs];
        for (let i = pool.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [pool[i], pool[j]] = [pool[j], pool[i]];
        }

        const count = pool.length;
        // 45+ takımlı Mega Kaos modunda logoların halkaya rahat sığması için akıllı boyut ölçekleme
        const baseR = cfg.logoRadius;
        const r = count > 90
          ? Math.max(19, Math.round(baseR * 0.58))
          : count > 50
            ? Math.max(23, Math.round(baseR * 0.72))
            : count > 38
              ? Math.max(27, Math.round(baseR * 0.85))
              : baseR;
        const startHp = cfg.mode === "blade" ? 3 : cfg.mode === "laser" ? 2 : 1;

        const badges = pool.map((club, idx) => {
          const frac = (idx + 0.5) / Math.max(count, 1);
          const dist = Math.sqrt(frac) * (BASE_RING_R - r - 38);
          const theta = idx * 2.399963229728653;
          const initSpd = cfg.mode === "ring" ? 310 : 420;
          const dir = Math.random() * Math.PI * 2;
          return {
            club,
            sprite: club.sprite,
            x: RING_CX + Math.cos(theta) * dist,
            y: RING_CY + Math.sin(theta) * dist,
            vx: Math.cos(dir) * initSpd,
            vy: Math.sin(dir) * initSpd,
            r,
            angle: (Math.random() - 0.5) * 0.3,
            vAngle: (Math.random() - 0.5) * 2.2,
            hp: startHp,
            maxHp: startHp,
            hitCooldown: 0,
            flashTimer: 0,
            kills: 0,
            bladeAngle: Math.random() * Math.PI * 2,
            bladeDir: Math.random() < 0.5 ? 1 : -1,
            eliminated: false,
            removed: false,
            trail: []
          };
        });

        const hasValidWinner =
          cfg.selectedWinnerKey !== "random" &&
          badges.some((b) => b.club.key === cfg.selectedWinnerKey);

        const state = {
          mode: cfg.mode,
          simTime: 0,
          ringAngle: Math.PI * 0.22,
          ringRadius: BASE_RING_R,
          laserAngle: Math.PI * 0.15,
          badges,
          totalClubs: badges.length,
          eliminatedList: [],
          bannerText: "",
          bannerSubBadge: null,
          bannerAccent: "#fb7185",
          bannerAnim: 0,
          pillPopAnim: 0,
          ringFlashAnim: 0,
          shakeIntensity: 0,
          timeSinceLastElim: 0,
          finalTwoTriggered: false,
          slowMoActive: false,
          winner: null,
          winnerTime: 0,
          confettiWave2Fired: false,
          selectedWinnerKey: hasValidWinner ? cfg.selectedWinnerKey : "random",

          // Bomb mode state
          bombHolder: null,
          bombTimer: cfg.bombTimer,
          bombMaxTimer: cfg.bombTimer,
          bombTransferCooldown: 0,
          bombTickAccum: 0,

          // Visual FX
          bgParticles: createBgParticles(),
          sparks: [],
          shockwaves: [],
          confetti: []
        };

        if (cfg.mode === "bomb" && badges.length >= 2) {
          assignNewBomb(state, cfg);
        }

        return state;
      }

      function assignNewBomb(state, cfg) {
        const alive = state.badges.filter((b) => !b.eliminated);
        if (alive.length <= 1) {
          state.bombHolder = null;
          return;
        }
        // Seçili kazanan varsa ilk bombayı diğerlerinden birine verme eğilimi
        const nonWinners = alive.filter((b) => b.club.key !== state.selectedWinnerKey);
        const pool = nonWinners.length > 0 && Math.random() < 0.72 ? nonWinners : alive;
        state.bombHolder = pool[Math.floor(Math.random() * pool.length)];
        state.bombMaxTimer = cfg.bombTimer;
        state.bombTimer = cfg.bombTimer;
        state.bombTransferCooldown = 0.25;
        state.bombTickAccum = 0;
      }

      function spawnSparks(state, x, y, color = "#e0f2fe", count = 8, speed = 260) {
        for (let i = 0; i < count; i++) {
          const ang = Math.random() * Math.PI * 2;
          const spd = speed * (0.35 + Math.random() * 0.9);
          state.sparks.push({
            x, y,
            vx: Math.cos(ang) * spd,
            vy: Math.sin(ang) * spd,
            life: 0.25 + Math.random() * 0.28,
            maxLife: 0.53,
            r: 2.2 + Math.random() * 3.8,
            color
          });
        }
        if (state.sparks.length > 260) state.sparks.splice(0, state.sparks.length - 260);
      }

      function spawnShockwave(state, x, y, color = "#f97316", maxR = 230) {
        state.shockwaves.push({ x, y, r: 20, maxR, life: 0.45, maxLife: 0.45, color });
      }

      function spawnConfettiWave(state, count = 135) {
        const colors = ["#facc15", "#fde047", "#ffffff", "#38bdf8", "#2563eb", "#f43f5e", "#10b981"];
        for (let i = 0; i < count; i++) {
          const side = i % 2 === 0 ? 120 : BASE_W - 120;
          const ang = i % 2 === 0
            ? -Math.PI * 0.38 + (Math.random() - 0.5) * 0.75
            : -Math.PI * 0.62 + (Math.random() - 0.5) * 0.75;
          const spd = 420 + Math.random() * 780;
          state.confetti.push({
            x: side + (Math.random() - 0.5) * 80,
            y: RING_CY + 140 + (Math.random() - 0.5) * 120,
            vx: Math.cos(ang) * spd,
            vy: Math.sin(ang) * spd,
            w: 11 + Math.random() * 15,
            h: 6 + Math.random() * 9,
            color: colors[Math.floor(Math.random() * colors.length)],
            rot: Math.random() * Math.PI * 2,
            vRot: (Math.random() - 0.5) * 14
          });
        }
      }

      function eliminateBadge(state, badge, cfg, emitAudio, reasonText, accent = "#fb7185", removeNow = false) {
        if (badge.eliminated) return;
        badge.eliminated = true;
        if (removeNow) badge.removed = true;

        state.eliminatedList.unshift(badge);
        state.bannerText = reasonText || `${badge.club.name} ELIMINATED`;
        state.bannerSubBadge = badge;
        state.bannerAccent = accent;
        state.bannerAnim = 1.0;
        state.pillPopAnim = 1.0;
        state.ringFlashAnim = 1.0;
        state.shakeIntensity = Math.max(state.shakeIntensity, 10);
        state.timeSinceLastElim = 0;

        // Ring modunda "Büyüyen Hayatta Kalanlar" aktifse hayatta kalanlar büyür
        if (state.mode === "ring" && cfg.growSurvivor) {
          state.badges.forEach((b) => {
            if (!b.eliminated) b.r = Math.min(cfg.logoRadius * 1.48, b.r + 0.85);
          });
        }

        const survivors = state.badges.filter((b) => !b.eliminated);
        if (survivors.length === 2 && !state.finalTwoTriggered) {
          state.finalTwoTriggered = true;
          emitAudio({ type: "final2" });
        }

        if (survivors.length === 1 && !state.winner) {
          state.winner = survivors[0];
          state.winnerTime = 0;
          state.confettiWave2Fired = false;
          state.bombHolder = null;
          spawnConfettiWave(state, 150);
          emitAudio({ type: "victory" });
        }
      }

      function isAngleInAnyGap(angle, ringAngle, gapHalf, doubleGap) {
        if (Math.abs(angleDiff(angle, ringAngle)) < gapHalf) return true;
        if (doubleGap && Math.abs(angleDiff(angle, ringAngle + Math.PI)) < gapHalf) return true;
        return false;
      }
