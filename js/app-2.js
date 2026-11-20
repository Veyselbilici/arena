"use strict";
      const btnCancelRender = document.getElementById("btnCancelRender");

      // Preview controls
      const previewElapsedEl = document.getElementById("previewElapsed");
      const previewRemainingEl = document.getElementById("previewRemaining");
      const btnPreviewToggle = document.getElementById("btnPreviewToggle");
      const previewIcon = document.getElementById("previewIcon");
      const previewLabel = document.getElementById("previewLabel");
      const btnPreviewReset = document.getElementById("btnPreviewReset");

      // Club modal
      const clubModal = document.getElementById("clubModal");
      const btnCloseClubModal = document.getElementById("btnCloseClubModal");
      const clubGrid = document.getElementById("clubGrid");
      const modalSelectedCount = document.getElementById("modalSelectedCount");
      const presetBtns = document.querySelectorAll(".preset-btn");
      const categoryFilterBar = document.getElementById("categoryFilterBar");
      const leagueSelect = document.getElementById("leagueSelect");
      const btnLeagueOnly = document.getElementById("btnLeagueOnly");
      const btnLeagueAdd = document.getElementById("btnLeagueAdd");
      const btnLoadAllLeagues = document.getElementById("btnLoadAllLeagues");
      const leagueStatus = document.getElementById("leagueStatus");
      const btnDeselectVisible = document.getElementById("btnDeselectVisible");
      const btnOnlySelected = document.getElementById("btnOnlySelected");
      const localTeamSearch = document.getElementById("localTeamSearch");
      const btnSelectAllVisible = document.getElementById("btnSelectAllVisible");
      const btnClearAllClubs = document.getElementById("btnClearAllClubs");
      const btnRandom36 = document.getElementById("btnRandom36");
      const onlineTeamQuery = document.getElementById("onlineTeamQuery");
      const btnOnlineSearch = document.getElementById("btnOnlineSearch");
      const onlineSearchLabel = document.getElementById("onlineSearchLabel");
      const onlineSearchResults = document.getElementById("onlineSearchResults");
      const manualTeamName = document.getElementById("manualTeamName");
      const manualTeamUrl = document.getElementById("manualTeamUrl");
      const btnAddManualTeam = document.getElementById("btnAddManualTeam");
      const btnApplyClubs = document.getElementById("btnApplyClubs");
      const modalCustomLogoInput = document.getElementById("modalCustomLogoInput");

      // Mode inputs
      const sliderGap = document.getElementById("sliderGap");
      const valGap = document.getElementById("valGap");
      const sliderRingSpeed = document.getElementById("sliderRingSpeed");
      const valRingSpeed = document.getElementById("valRingSpeed");
      const modDoubleGap = document.getElementById("modDoubleGap");
      const modShrinkingRing = document.getElementById("modShrinkingRing");
      const modSpeedEscalation = document.getElementById("modSpeedEscalation");
      const modGrowSurvivor = document.getElementById("modGrowSurvivor");

      const sliderBombTimer = document.getElementById("sliderBombTimer");
      const valBombTimer = document.getElementById("valBombTimer");
      const sliderBombChaos = document.getElementById("sliderBombChaos");
      const valBombChaos = document.getElementById("valBombChaos");

      const sliderBladeSpeed = document.getElementById("sliderBladeSpeed");
      const valBladeSpeed = document.getElementById("valBladeSpeed");
      const sliderBladeLen = document.getElementById("sliderBladeLen");
      const valBladeLen = document.getElementById("valBladeLen");

      const sliderLaserSpeed = document.getElementById("sliderLaserSpeed");
      const valLaserSpeed = document.getElementById("valLaserSpeed");
      const selectLaserCount = document.getElementById("selectLaserCount");

      // Shared physics & viral inputs
      const sliderSimSpeed = document.getElementById("sliderSimSpeed");
      const valSimSpeed = document.getElementById("valSimSpeed");
      const sliderGravity = document.getElementById("sliderGravity");
      const valGravity = document.getElementById("valGravity");
      const sliderLogoSize = document.getElementById("sliderLogoSize");
      const sliderSpin = document.getElementById("sliderSpin");
      const valSpin = document.getElementById("valSpin");
      const toggleLeagueLogo = document.getElementById("toggleLeagueLogo");
      const selectDuration = document.getElementById("selectDuration");
      const valLogoSize = document.getElementById("valLogoSize");

      const selectWinner = document.getElementById("selectWinner");
      const selectTheme = document.getElementById("selectTheme");
      const customTrophyInput = document.getElementById("customTrophyInput");
      const btnResetTrophy = document.getElementById("btnResetTrophy");
      const trophyThemeLabel = document.getElementById("trophyThemeLabel");
      const inputSubTitle = document.getElementById("inputSubTitle");
      const inputMainTitle = document.getElementById("inputMainTitle");
      const inputWatermark = document.getElementById("inputWatermark");
      const inputViralHook = document.getElementById("inputViralHook");
      const toggleViralHook = document.getElementById("toggleViralHook");
      const toggleSlowMo = document.getElementById("toggleSlowMo");
      const toggleAudio = document.getElementById("toggleAudio");

      // Export controls
      const selectFormat = document.getElementById("selectFormat");
      const selectQuality = document.getElementById("selectQuality");
      const btnGenerateDownload = document.getElementById("btnGenerateDownload");
      const generateBtnLabel = document.getElementById("generateBtnLabel");
      const btnRedownload = document.getElementById("btnRedownload");
      const mbPlay = document.getElementById("mbPlay");
      const mbReset = document.getElementById("mbReset");
      const mbGenerate = document.getElementById("mbGenerate");
      const redownloadLabel = document.getElementById("redownloadLabel");

      const config = {
        mode: "ring", // ring | bomb | blade | laser
        theme: "ucl", // ucl | superlig | europa | worldcup
        selectedWinnerKey: "random",
        simSpeed: 1.0,
        gravityScale: 1.0,
        bounciness: 0.88,
        logoRadius: 44,

        // Ring mode
        gapDegrees: 24,
        ringSpeed: 1.15,
        doubleGap: false,
        shrinkingRing: false,
        speedEscalation: true,
        growSurvivor: false,

        // Bomb mode
        bombTimer: 3.5,
        targetDuration: 60,
        match: { homeKey: null, awayKey: null, goals: [], cards: [], title: "CHAMPIONS LEAGUE", city: "IN ISTANBUL", footer: "", scripted: true, showCards: true },
        matchGoalWidth: 46,
        matchGoalSpeed: 0.45,
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
        watermark: "taktiksports",
        showLeagueLogo: true,
        leagueSlug: null,
        spinSpeed: 0.3,
        viralHook: "SONA KALAN SENİN TAKIMIN MI? YORUMA YAZ! 👇",
        showViralHook: true,
        slowMoFinale: true,
        audioEnabled: true,
        preset: "ucl36",

        // Export
        format: "mp4",
        quality: "1080x1920@30"
      };

            const customTrophies = {}; // tema anahtarı -> Image (lige özel yüklenen gerçek kupa)

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
          logoStatusPill.className = "hidden sm:block px-3 py-1.5 rounded-full text-xs font-semibold bg-emerald-950/90 border border-emerald-600/60 text-emerald-300";
        } else {
          logoStatusPill.className = "hidden sm:block px-3 py-1.5 rounded-full text-xs font-semibold bg-slate-800/90 border border-slate-700 text-sky-300";
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
         5. LİGE ÖZEL GERÇEKÇİ KUPA ÇİZİMLERİ (özgün tasarımlar, metal shading)
         ========================================================================= */
      const METALS = {
        silver:   ["#3b4452", "#9aa5b4", "#f1f5f9", "#7b8696", "#dfe5ec", "#ffffff", "#8c97a6", "#2c3440"],
        platinum: ["#33404a", "#a7b6c2", "#f8fbff", "#6f8190", "#e6eef5", "#ffffff", "#93a4b3", "#26313a"],
        gold:     ["#4a2a05", "#b7791f", "#fde68a", "#92580f", "#f6c453", "#fff7d6", "#a8690f", "#3a2104"],
        champagne:["#4b3420", "#b08a5a", "#f6e7cf", "#8a6a45", "#e9d3b0", "#fffaf0", "#9c7b52", "#382618"]
      };

      function metalGradient(c, x0, x1, kind) {
        const g = c.createLinearGradient(x0, 0, x1, 0);
        const st = METALS[kind] || METALS.silver;
        const pos = [0, 0.12, 0.27, 0.42, 0.58, 0.7, 0.86, 1];
        st.forEach((col, i) => g.addColorStop(pos[i], col));
        return g;
      }

      // Simetrik döner gövde: profile = [[x,y], ...] sağ yarım, yukarıdan aşağı
      function latheBody(c, profile, kind, opts = {}) {
        const maxX = Math.max(...profile.map((p) => p[0]));
        const top = profile[0][1];
        const bottom = profile[profile.length - 1][1];
        c.beginPath();
        c.moveTo(-profile[0][0], profile[0][1]);
        for (let i = 1; i < profile.length; i++) {
          const [x, y] = profile[i];
          const [px, py] = profile[i - 1];
          c.quadraticCurveTo(-(px + x) / 2 - (opts.bulge || 0), (py + y) / 2, -x, y);
        }
        for (let i = profile.length - 1; i >= 0; i--) {
          const [x, y] = profile[i];
          if (i === profile.length - 1) { c.lineTo(x, y); continue; }
          const [nx, ny] = profile[i + 1];
          c.quadraticCurveTo((nx + x) / 2 + (opts.bulge || 0), (ny + y) / 2, x, y);
        }
        c.closePath();
        c.fillStyle = metalGradient(c, -maxX, maxX, kind);
        c.fill();
        // Kenar karartma (hacim)
        c.save();
        c.clip();
        const edge = c.createLinearGradient(-maxX, 0, maxX, 0);
        edge.addColorStop(0, "rgba(0,0,0,0.45)");
        edge.addColorStop(0.18, "rgba(0,0,0,0)");
        edge.addColorStop(0.82, "rgba(0,0,0,0)");
        edge.addColorStop(1, "rgba(0,0,0,0.5)");
        c.fillStyle = edge;
        c.fillRect(-maxX - 4, top - 4, maxX * 2 + 8, bottom - top + 8);
        // Keskin dikey yansıma şeritleri
        [[-0.42, 0.10, 0.55], [0.2, 0.05, 0.35]].forEach(([fx, fw, a]) => {
          const sx = fx * maxX;
          const sg = c.createLinearGradient(sx - fw * maxX, 0, sx + fw * maxX, 0);
          sg.addColorStop(0, "rgba(255,255,255,0)");
          sg.addColorStop(0.5, `rgba(255,255,255,${a})`);
          sg.addColorStop(1, "rgba(255,255,255,0)");
          c.fillStyle = sg;
          c.fillRect(sx - fw * maxX, top, fw * maxX * 2, bottom - top);
        });
        // Üstten gelen stadyum ışığı
        const vg = c.createLinearGradient(0, top, 0, bottom);
        vg.addColorStop(0, "rgba(255,255,255,0.18)");
        vg.addColorStop(0.35, "rgba(255,255,255,0)");
        vg.addColorStop(1, "rgba(0,0,0,0.28)");
        c.fillStyle = vg;
        c.fillRect(-maxX - 4, top - 4, maxX * 2 + 8, bottom - top + 8);
        c.restore();
        c.lineWidth = 1.6;
        c.strokeStyle = "rgba(255,255,255,0.35)";
        c.stroke();
      }

      function rimEllipse(c, y, rx, ry, kind, inner = true) {
        c.beginPath();
        c.ellipse(0, y, rx, ry, 0, 0, Math.PI * 2);
        c.fillStyle = metalGradient(c, -rx, rx, kind);
        c.fill();
        if (inner) {
          c.beginPath();
          c.ellipse(0, y + 1, rx * 0.9, ry * 0.68, 0, 0, Math.PI * 2);
          const ig = c.createLinearGradient(0, y - ry, 0, y + ry);
          ig.addColorStop(0, "rgba(10,14,22,0.92)");
          ig.addColorStop(1, "rgba(70,80,96,0.75)");
          c.fillStyle = ig;
          c.fill();
        }
        c.beginPath();
        c.ellipse(0, y, rx, ry, 0, 0, Math.PI * 2);
        c.lineWidth = 2.2;
        c.strokeStyle = "rgba(255,255,255,0.7)";
        c.stroke();
      }

      function handle(c, sign, kind, pts, width) {
        c.save();
        c.scale(sign, 1);
        c.beginPath();
        c.moveTo(pts[0][0], pts[0][1]);
        c.bezierCurveTo(pts[1][0], pts[1][1], pts[2][0], pts[2][1], pts[3][0], pts[3][1]);
        c.lineCap = "round";
        c.lineWidth = width + 5;
        c.strokeStyle = "rgba(0,0,0,0.45)";
        c.stroke();
        c.lineWidth = width;
        c.strokeStyle = metalGradient(c, pts[0][0] - 40, pts[2][0] + 40, kind);
        c.stroke();
        c.lineWidth = Math.max(1.5, width * 0.22);
        c.strokeStyle = "rgba(255,255,255,0.55)";
        c.stroke();
        c.restore();
      }

      function enamelBand(c, y, h, halfW, color, kind) {
        c.save();
        c.beginPath();
        c.ellipse(0, y + h, halfW, h * 0.32, 0, 0, Math.PI);
        c.lineTo(-halfW, y);
        c.ellipse(0, y, halfW, h * 0.32, 0, Math.PI, 0, true);
        c.closePath();
        const g = c.createLinearGradient(-halfW, 0, halfW, 0);
        g.addColorStop(0, "rgba(0,0,0,0.55)");
        g.addColorStop(0.3, color);
        g.addColorStop(0.55, "#ffffff55");
        g.addColorStop(0.7, color);
        g.addColorStop(1, "rgba(0,0,0,0.6)");
        c.fillStyle = color;
        c.fill();
        c.fillStyle = g;
        c.globalAlpha = 0.65;
        c.fill();
        c.globalAlpha = 1;
        c.lineWidth = 2.5;
        c.strokeStyle = metalGradient(c, -halfW, halfW, kind);
        c.stroke();
        c.restore();
      }

      function star5(c, x, y, r, fill) {
        c.beginPath();
        for (let i = 0; i < 10; i++) {
          const rr = i % 2 === 0 ? r : r * 0.45;
          const a = -Math.PI / 2 + (i * Math.PI) / 5;
          c.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
        }
        c.closePath();
        c.fillStyle = fill;
        c.fill();
      }

      function plinth(c, kind, opts = {}) {
        const w1 = opts.w1 || 150, w2 = opts.w2 || 190, y0 = opts.y || 228, h1 = 34, h2 = 58;
        // üst kademe
        c.beginPath();
        c.roundRect(-w1, y0, w1 * 2, h1, 6);
        const tg = c.createLinearGradient(-w1, 0, w1, 0);
        tg.addColorStop(0, "#050608"); tg.addColorStop(0.45, opts.stone || "#1d2330"); tg.addColorStop(0.55, "#2b3343"); tg.addColorStop(1, "#050608");
        c.fillStyle = tg;
        c.fill();
        // alt kademe
        c.beginPath();
        c.roundRect(-w2, y0 + h1, w2 * 2, h2, 8);
        const bg = c.createLinearGradient(-w2, 0, w2, 0);
        bg.addColorStop(0, "#030405"); bg.addColorStop(0.5, opts.stone || "#161b26"); bg.addColorStop(1, "#030405");
        c.fillStyle = bg;
        c.fill();
        // metal şeritler
        c.fillStyle = metalGradient(c, -w2, w2, kind);
        c.fillRect(-w1, y0, w1 * 2, 4);
        c.fillRect(-w2, y0 + h1, w2 * 2, 4);
        c.fillRect(-w2, y0 + h1 + h2 - 5, w2 * 2, 5);
        // plaket
        c.beginPath();
        c.roundRect(-70, y0 + h1 + 16, 140, 26, 4);
        c.fillStyle = metalGradient(c, -70, 70, kind);
        c.fill();
        c.fillStyle = "rgba(0,0,0,0.35)";
        c.fillRect(-56, y0 + h1 + 27, 112, 3);
        // yer gölgesi
        const sh = c.createRadialGradient(0, y0 + h1 + h2 + 6, 10, 0, y0 + h1 + h2 + 6, w2 * 1.3);
        sh.addColorStop(0, "rgba(0,0,0,0.55)");
        sh.addColorStop(1, "rgba(0,0,0,0)");
        c.fillStyle = sh;
        c.fillRect(-w2 * 1.4, y0 + h1 + h2 - 4, w2 * 2.8, 24);
      }

      function stem(c, kind, yTop, yBot, wTop, wMid, wBot) {
        latheBody(c, [[wTop, yTop], [wMid, (yTop + yBot) / 2], [wMid * 1.15, yBot - 18], [wBot, yBot]], kind);
        // düğüm halkası
        rimEllipse(c, (yTop + yBot) / 2, wMid + 10, 7, kind, false);
      }

      function buildTrophyCanvas(variant = "ucl") {
        const W = 560, H = 640;
        const off = document.createElement("canvas");
        off.width = W; off.height = H;
        const c = off.getContext("2d");
        c.save();
        c.translate(W / 2, 330);

        if (variant === "ucl") {
          // Gümüş, iki büyük kulplu şampiyonluk kupası
          handle(c, -1, "silver", [[96, -150], [230, -210], [250, -20], [74, 40]], 22);
          handle(c, 1, "silver", [[96, -150], [230, -210], [250, -20], [74, 40]], 22);
          latheBody(c, [[132, -205], [128, -120], [108, -20], [70, 60], [34, 100]], "silver");
          rimEllipse(c, -205, 132, 20, "silver");
          stem(c, "silver", 98, 190, 30, 22, 64);
          rimEllipse(c, 190, 70, 12, "silver", false);
          plinth(c, "silver", { w1: 120, w2: 160, y: 200 });
          // Gövdeye işlenmiş yıldız kuşağı
          for (let i = -2; i <= 2; i++) star5(c, i * 34, -150 + Math.abs(i) * 4, 10, "rgba(255,255,255,0.55)");
        } else if (variant === "europa") {
          // Uzun, kulpsuz gümüş vazo; altın kabartma kuşak
          latheBody(c, [[118, -250], [96, -200], [104, -110], [92, -20], [58, 70], [30, 120]], "silver", { bulge: 6 });
          rimEllipse(c, -250, 118, 17, "silver");
          enamelBand(c, -150, 30, 101, "#f59e0b", "gold");
          for (let i = -4; i <= 4; i++) {
            c.beginPath();
            c.ellipse(i * 21, -136, 6, 10, 0, 0, Math.PI * 2);
            c.fillStyle = "rgba(255,247,214,0.7)";
            c.fill();
          }
          stem(c, "silver", 118, 200, 30, 24, 70);
          rimEllipse(c, 200, 74, 12, "silver", false);
          plinth(c, "gold", { w1: 128, w2: 168, y: 210, stone: "#1f150d" });
        } else if (variant === "conference") {
          // İnce, modern platin lale formu; spiral kurdeleler
          latheBody(c, [[110, -240], [70, -160], [86, -60], [62, 40], [28, 110]], "platinum", { bulge: 10 });
          rimEllipse(c, -240, 110, 16, "platinum");
          c.save();
          c.beginPath();
          c.rect(-110, -236, 220, 340);
          c.clip();
          for (let k = 0; k < 5; k++) {
            c.beginPath();
            for (let y = -230; y <= 100; y += 6) {
              const half = 30 + 70 * Math.abs(Math.sin((y + 240) / 120));
              const x = Math.sin(y / 38 + k * 1.25) * half * 0.9;
              if (y === -230) c.moveTo(x, y); else c.lineTo(x, y);
            }
            c.lineWidth = 3;
            c.strokeStyle = k % 2 ? "rgba(190,242,100,0.55)" : "rgba(255,255,255,0.5)";
            c.stroke();
          }
          c.restore();
          stem(c, "platinum", 108, 196, 26, 18, 60);
          rimEllipse(c, 196, 64, 11, "platinum", false);
          plinth(c, "platinum", { w1: 116, w2: 150, y: 206, stone: "#0d1f16" });
        } else if (variant === "superlig") {
          // Altın, yuvarlak gövdeli, kıvrık kulplu; kırmızı mine kuşak
          handle(c, -1, "gold", [[104, -140], [196, -170], [196, -40], [86, -10]], 18);
          handle(c, 1, "gold", [[104, -140], [196, -170], [196, -40], [86, -10]], 18);
          latheBody(c, [[120, -200], [132, -130], [120, -40], [80, 40], [36, 96]], "gold", { bulge: 8 });
          rimEllipse(c, -200, 120, 19, "gold");
          enamelBand(c, -112, 34, 128, "#b91c1c", "gold");
          star5(c, 0, -94, 15, "#fff7d6");
          for (let i = 0; i < 7; i++) {
            const ang = Math.PI + (i / 6) * Math.PI;
            c.beginPath();
            c.ellipse(Math.cos(ang) * 46, -10 + Math.sin(ang) * -14, 9, 4, ang, 0, Math.PI * 2);
            c.fillStyle = "rgba(255,247,214,0.55)";
            c.fill();
          }
          stem(c, "gold", 94, 188, 32, 22, 66);
          rimEllipse(c, 188, 72, 12, "gold", false);
          plinth(c, "gold", { w1: 124, w2: 164, y: 198, stone: "#2a0a0e" });
        } else if (variant === "worldcup") {
          // Altın küre taşıyan spiral sütun
          c.save();
          latheBody(c, [[46, -120], [62, -40], [44, 60], [56, 150]], "gold", { bulge: 4 });
          c.beginPath();
          c.rect(-70, -120, 140, 270);
          c.clip();
          for (let k = 0; k < 6; k++) {
            c.beginPath();
            for (let y = -120; y <= 150; y += 5) {
              const half = 44 + 14 * Math.sin((y + 120) / 85);
              const x = Math.sin(y / 22 + k) * half;
              if (y === -120) c.moveTo(x, y); else c.lineTo(x, y);
            }
            c.lineWidth = 2.4;
            c.strokeStyle = "rgba(255,247,214,0.5)";
            c.stroke();
          }
          c.restore();
          // küre
          const gr = c.createRadialGradient(-34, -224, 10, 0, -196, 96);
          gr.addColorStop(0, "#fffbe6");
          gr.addColorStop(0.35, "#f6c453");
          gr.addColorStop(0.75, "#a8690f");
          gr.addColorStop(1, "#3a2104");
          c.beginPath();
          c.arc(0, -196, 88, 0, Math.PI * 2);
          c.fillStyle = gr;
          c.fill();
          c.save();
          c.clip();
          c.strokeStyle = "rgba(74,42,5,0.55)";
          c.lineWidth = 2;
          for (let i = -3; i <= 3; i++) { c.beginPath(); c.ellipse(0, -196, Math.abs(i) * 26 + 6, 88, 0, 0, Math.PI * 2); c.stroke(); }
          for (let j = -2; j <= 2; j++) { c.beginPath(); c.ellipse(0, -196 + j * 32, 88 * Math.cos(Math.asin(Math.min(1, Math.abs(j * 32) / 88))), 8, 0, 0, Math.PI * 2); c.stroke(); }
          c.restore();
          // tutan kollar
          handle(c, -1, "gold", [[40, -110], [96, -130], [92, -170], [62, -150]], 16);
          handle(c, 1, "gold", [[40, -110], [96, -130], [92, -170], [62, -150]], 16);
          rimEllipse(c, 152, 66, 12, "gold", false);
          plinth(c, "gold", { w1: 118, w2: 156, y: 164, stone: "#07130e" });
        } else {
          // league: kapaklı gümüş kupa, küre tepelik, turkuaz mine
          handle(c, -1, "silver", [[98, -120], [176, -140], [176, -30], [80, 0]], 15);
          handle(c, 1, "silver", [[98, -120], [176, -140], [176, -30], [80, 0]], 15);
          latheBody(c, [[112, -170], [118, -100], [102, -20], [66, 50], [30, 100]], "silver", { bulge: 6 });
          // kapak
          latheBody(c, [[40, -250], [92, -200], [118, -178]], "silver");
          rimEllipse(c, -174, 118, 15, "silver", false);
          const fg = c.createRadialGradient(-8, -278, 3, 0, -268, 24);
          fg.addColorStop(0, "#ffffff"); fg.addColorStop(0.5, "#cbd5e1"); fg.addColorStop(1, "#475569");
          c.beginPath(); c.arc(0, -268, 22, 0, Math.PI * 2); c.fillStyle = fg; c.fill();
          enamelBand(c, -90, 26, 114, "#0d9488", "silver");
          stem(c, "silver", 98, 188, 30, 22, 64);
          rimEllipse(c, 188, 70, 12, "silver", false);
          plinth(c, "silver", { w1: 120, w2: 160, y: 198 });
        }
        c.restore();
        return off;
      }
