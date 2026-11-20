"use strict";
      async function generateFullVideoWebCodecs(format, width, height, fps, videoCodec, audioCodec) {
        const useAudio = config.audioEnabled && !!audioCodec;
        const isMp4 = format === "mp4";

        const muxer = isMp4
          ? new Mp4Muxer.Muxer({
              target: new Mp4Muxer.ArrayBufferTarget(),
              video: { codec: "avc", width, height },
              audio: useAudio ? { codec: "aac", numberOfChannels: 2, sampleRate: 48000 } : undefined,
              fastStart: "in-memory"
            })
          : new WebMMuxer.Muxer({
              target: new WebMMuxer.ArrayBufferTarget(),
              video: { codec: videoCodec.startsWith("vp09") ? "V_VP9" : "V_VP8", width, height },
              audio: useAudio ? { codec: "A_OPUS", numberOfChannels: 2, sampleRate: 48000 } : undefined
            });

        const bitrate = width >= 1080 ? (fps >= 60 ? 11_000_000 : 8_000_000) : 5_000_000;
        const videoEncoder = new VideoEncoder({
          output: (chunk, meta) => muxer.addVideoChunk(chunk, meta),
          error: (e) => console.error("VideoEncoder hatası:", e)
        });

        const encCfg = { codec: videoCodec, width, height, bitrate, framerate: fps };
        if (isMp4) encCfg.avc = { format: "avc" };
        videoEncoder.configure(encCfg);

        const offCanvas = document.createElement("canvas");
        offCanvas.width = width;
        offCanvas.height = height;
        const offCtx = offCanvas.getContext("2d", { alpha: false });

        const renderCfg = { ...config };
        const simState = createSimState(renderCfg);
        const audioEvents = [];

        const dt = 1 / fps;
        const frameDurationUs = Math.round(1_000_000 / fps);
        const maxFrames = fps * 240;
        let frameIdx = 0;
        const wallStart = performance.now();

        const emitAudio = (ev) => {
          if (!useAudio) return;
          audioEvents.push({ ...ev, theme: renderCfg.theme, mode: renderCfg.mode, time: frameIdx * dt });
        };

        while (!renderCancelRequested && frameIdx < maxFrames) {
          stepSimState(simState, dt, renderCfg, emitAudio);
          renderSimState(offCtx, simState, renderCfg, width, height);

          const frame = new VideoFrame(offCanvas, {
            timestamp: frameIdx * frameDurationUs,
            duration: frameDurationUs
          });
          videoEncoder.encode(frame, { keyFrame: frameIdx % (fps * 2) === 0 });
          frame.close();
          frameIdx++;

          if (frameIdx % 3 === 0 || videoEncoder.encodeQueueSize > 6) {
            previewCtx.drawImage(offCanvas, 0, 0, BASE_W, BASE_H);

            const remaining = simState.badges.filter((b) => !b.eliminated).length;
            const elimRatio = (simState.totalClubs - remaining) / Math.max(1, simState.totalClubs - 1);
            const celebRatio = simState.winner ? Math.min(1, simState.winnerTime / 3.5) : 0;
            const pct = Math.min(96, Math.round(elimRatio * 88 + celebRatio * 8));
            const wallSec = Math.max(0.1, (performance.now() - wallStart) / 1000);
            const speedX = (frameIdx * dt) / wallSec;

            renderProgressBar.style.width = `${pct}%`;
            renderPercentText.textContent = `${pct}%`;
            renderDurationText.textContent = fmtTime(frameIdx * dt);
            renderClubsText.textContent = `${remaining} / ${simState.totalClubs}`;
            renderSpeedText.textContent = `${speedX.toFixed(1)}x`;

            while (videoEncoder.encodeQueueSize > 8 && !renderCancelRequested) {
              await new Promise((r) => setTimeout(r, 4));
            }
            await new Promise((r) => setTimeout(r, 0));
          }

          if (simState.winner && simState.winnerTime >= 3.5) break;
        }

        if (renderCancelRequested) {
          try { videoEncoder.close(); } catch (_) {}
          return null;
        }

        renderStageTitle.textContent = useAudio ? "Ses Efektleri Ekleniyor..." : "Video Paketleniyor...";
        renderProgressBar.style.width = "97%";
        renderPercentText.textContent = "97%";
        await new Promise((r) => setTimeout(r, 10));

        await videoEncoder.flush();
        videoEncoder.close();

        const totalSec = frameIdx * dt;
        if (useAudio) {
          try {
            await synthesizeAndEncodeAudio(audioEvents, totalSec, audioCodec, muxer);
          } catch (err) {
            console.warn("Ses kodlama atlandı:", err);
          }
        }

        if (renderCancelRequested) return null;

        renderStageTitle.textContent = "Dosya Hazırlanıyor...";
        renderProgressBar.style.width = "100%";
        renderPercentText.textContent = "100%";
        muxer.finalize();

        const { buffer } = muxer.target;
        return {
          blob: new Blob([buffer], { type: isMp4 ? "video/mp4" : "video/webm" }),
          ext: format,
          winnerName: simState.winner ? simState.winner.club.name : "arena",
          totalSec
        };
      }

      async function generateFullVideoMediaRecorder(requestedFormat, width, height, fps) {
        const candidates = requestedFormat === "mp4"
          ? [
              { mime: "video/mp4;codecs=avc1", ext: "mp4" },
              { mime: "video/mp4", ext: "mp4" },
              { mime: "video/webm;codecs=vp9,opus", ext: "webm" },
              { mime: "video/webm", ext: "webm" }
            ]
          : [
              { mime: "video/webm;codecs=vp9,opus", ext: "webm" },
              { mime: "video/webm", ext: "webm" }
            ];

        let chosen = { mime: "", ext: "webm" };
        for (const c of candidates) {
          if (MediaRecorder.isTypeSupported(c.mime)) { chosen = c; break; }
        }

        const offCanvas = document.createElement("canvas");
        offCanvas.width = width;
        offCanvas.height = height;
        const offCtx = offCanvas.getContext("2d", { alpha: false });

        const stream = offCanvas.captureStream(fps);
        const chunks = [];
        const recorder = new MediaRecorder(stream, { mimeType: chosen.mime || undefined, videoBitsPerSecond: 7_500_000 });
        const stopPromise = new Promise((resolve) => {
          recorder.ondataavailable = (e) => { if (e.data && e.data.size > 0) chunks.push(e.data); };
          recorder.onstop = () => resolve(new Blob(chunks, { type: chosen.mime || "video/webm" }));
        });

        const renderCfg = { ...config };
        const simState = createSimState(renderCfg);
        const dt = 1 / fps;
        let elapsed = 0;

        recorder.start(250);
        while (!renderCancelRequested && elapsed < 240) {
          stepSimState(simState, dt, renderCfg, () => {});
          renderSimState(offCtx, simState, renderCfg, width, height);
          previewCtx.drawImage(offCanvas, 0, 0, BASE_W, BASE_H);
          elapsed += dt;

          const remaining = simState.badges.filter((b) => !b.eliminated).length;
          const pct = Math.min(98, Math.round(((simState.totalClubs - remaining) / Math.max(1, simState.totalClubs - 1)) * 92));
          renderProgressBar.style.width = `${pct}%`;
          renderPercentText.textContent = `${pct}%`;
          renderDurationText.textContent = fmtTime(elapsed);
          renderClubsText.textContent = `${remaining} / ${simState.totalClubs}`;
          renderSpeedText.textContent = "1.0x";

          if (simState.winner && simState.winnerTime >= 3.5) break;
          await new Promise((r) => setTimeout(r, Math.round(1000 / fps)));
        }

        recorder.stop();
        const blob = await stopPromise;
        if (renderCancelRequested) return null;
        return {
          blob,
          ext: chosen.ext,
          winnerName: simState.winner ? simState.winner.club.name : "arena",
          totalSec: elapsed
        };
      }

      async function handleGenerateFullVideo() {
        if (isRendering) return;
        const activeCount = allClubs.filter((c) => c.enabled).length;
        if (activeCount < 2) {
          showToast("En az 2 aktif kulüp seçili olmalıdır.", "warn");
          return;
        }

        previewRunning = false;
        updatePreviewButtonsUI();

        isRendering = true;
        renderCancelRequested = false;
        btnGenerateDownload.disabled = true;
        generateBtnLabel.textContent = "Tam Video Oluşturuluyor...";

        const { width, height, fps } = parseQuality(config.quality);
        const format = config.format;

        renderStageTitle.textContent = `Tam Video Oluşturuluyor (.${format.toUpperCase()})...`;
        renderProgressBar.style.width = "0%";
        renderPercentText.textContent = "0%";
        renderDurationText.textContent = "00:00";
        renderClubsText.textContent = `${activeCount} / ${activeCount}`;
        renderSpeedText.textContent = "...";
        renderOverlay.classList.remove("hidden");
        renderOverlay.classList.add("flex");

        try {
          const bitrate = width >= 1080 ? (fps >= 60 ? 11_000_000 : 8_000_000) : 5_000_000;
          const videoCodec = await findSupportedVideoCodec(format, width, height, fps, bitrate);
          const audioCodec = await findSupportedAudioCodec(format);
          const muxerOk = format === "mp4" ? typeof Mp4Muxer !== "undefined" : typeof WebMMuxer !== "undefined";

          let result = null;
          if (videoCodec && muxerOk) {
            result = await generateFullVideoWebCodecs(format, width, height, fps, videoCodec, audioCodec);
          } else if (typeof MediaRecorder !== "undefined") {
            showToast("Tarayıcı yedek video motoru kullanılıyor...", "info");
            result = await generateFullVideoMediaRecorder(format, width, height, fps);
          } else {
            throw new Error("Tarayıcınız video dışa aktarmayı desteklemiyor.");
          }

          if (result && !renderCancelRequested) {
            triggerBlobDownload(result.blob, result.ext, result.winnerName, result.totalSec);
          } else if (renderCancelRequested) {
            showToast("Video oluşturma iptal edildi.", "warn");
          }
        } catch (err) {
          console.error(err);
          showToast("Video oluşturulurken hata oluştu: " + (err.message || err), "error");
        } finally {
          isRendering = false;
          renderCancelRequested = false;
          btnGenerateDownload.disabled = false;
          generateBtnLabel.textContent = "Tam Videoyu Oluştur ve İndir";
          renderOverlay.classList.add("hidden");
          renderOverlay.classList.remove("flex");
          if (previewState) renderSimState(previewCtx, previewState, config, BASE_W, BASE_H);
        }
      }

      /* =========================================================================
         10. MOD GEÇİŞİ, URL PAYLAŞIM LİNKİ & ÖNİZLEME DÖNGÜSÜ
         ========================================================================= */
      const MODE_META = {
        ring:  { title: "🌀 Klasik Halka — Viral Mod Ayarları",  badge: "Dönen Boşluk Fiziği",    panel: panelModeRing },
        bomb:  { title: "💣 Saatli Bomba — Hot Potato Ayarları", badge: "Dokun & Devret",          panel: panelModeBomb },
        blade: { title: "⚔️ Kılıç Savaşı — Düello Ayarları",     badge: "3 Can • Enerji Kılıcı",   panel: panelModeBlade },
        laser: { title: "⚡ Ölüm Lazeri — Hayatta Kalma",        badge: "2 Can • Dönen Lazer",     panel: panelModeLaser },
        match: { title: "🥅 Maç Modu — Gerçek Maç Canlandırma",  badge: "Skorbord • Gol • Kale",   panel: panelModeMatch }
      };

      function setTheme(key, updateSub = true) {
        if (!THEMES[key]) return;
        config.theme = key;
        selectTheme.value = key;
        if (updateSub) {
          config.subTitle = THEMES[key].subDefault;
          inputSubTitle.value = config.subTitle;
          config.leagueSlug = THEMES[key].leagueSlug;
        }
        getLeagueLogo(config.leagueSlug || THEMES[key].leagueSlug);
        updateTrophyButtons();
      }

      function switchMode(newMode) {
        if (!MODE_META[newMode]) return;
        config.mode = newMode;

        modeTabs.forEach((btn) => {
          const active = btn.dataset.mode === newMode;
          btn.classList.toggle("mode-tab-active", active);
          if (!active) btn.classList.add("text-slate-300");
          else btn.classList.remove("text-slate-300");
        });

        [panelModeRing, panelModeBomb, panelModeBlade, panelModeLaser, panelModeMatch].forEach((p) => p.classList.add("hidden"));
        MODE_META[newMode].panel.classList.remove("hidden");
        modePanelTitle.textContent = MODE_META[newMode].title;
        modePanelBadge.textContent = MODE_META[newMode].badge;

        if (!isRendering) {
          previewRunning = false;
          updatePreviewButtonsUI();
          resetPreview();
        }
      }

      function buildShareableURL() {
        const params = new URLSearchParams();
        params.set("m", config.mode);
        params.set("t", config.theme);
        params.set("pr", config.preset || "ucl36");
        params.set("w", config.selectedWinnerKey);
        params.set("sp", config.simSpeed.toFixed(2));
        params.set("sl", config.slowMoFinale ? "1" : "0");
        params.set("sub", config.subTitle);
        params.set("main", config.mainTitle);
        if (config.watermark) params.set("wm", config.watermark);
        params.set("hk", config.viralHook);
        params.set("hkon", config.showViralHook ? "1" : "0");
        if (config.mode === "ring") {
          params.set("gap", String(config.gapDegrees));
          params.set("dg", config.doubleGap ? "1" : "0");
          params.set("sr", config.shrinkingRing ? "1" : "0");
        }
        const base = window.location.origin + window.location.pathname;
        return `${base}?${params.toString()}`;
      }

      function applyURLParamsOnLoad() {
        try {
          const p = new URLSearchParams(window.location.search);
          if (!p.toString()) return;
          const pr = p.get("pr");
          if (pr && pr.startsWith("espn:")) pendingLeague = pr.slice(5);
          else if (pr) { applyLeaguePreset(pr, true); pendingLeague = null; }
          if (p.get("m") && MODE_META[p.get("m")]) config.mode = p.get("m");
          if (p.get("t") && THEMES[p.get("t")]) {
            config.theme = p.get("t");
            selectTheme.value = config.theme;
          }
          if (p.get("w")) config.selectedWinnerKey = p.get("w");
          if (p.get("sp")) {
            config.simSpeed = Math.max(0.6, Math.min(2.0, parseFloat(p.get("sp")) || 1.0));
            sliderSimSpeed.value = config.simSpeed;
            valSimSpeed.textContent = `${config.simSpeed.toFixed(2)}x`;
          }
          if (p.get("sl")) {
            config.slowMoFinale = p.get("sl") === "1";
            toggleSlowMo.checked = config.slowMoFinale;
          }
          if (p.get("sub")) { config.subTitle = p.get("sub"); inputSubTitle.value = config.subTitle; }
          if (p.get("main")) { config.mainTitle = p.get("main"); inputMainTitle.value = config.mainTitle; }
          if (p.get("wm")) { config.watermark = p.get("wm"); inputWatermark.value = config.watermark; }
          if (p.get("hk")) { config.viralHook = p.get("hk"); inputViralHook.value = config.viralHook; }
          if (p.get("hkon")) {
            config.showViralHook = p.get("hkon") === "1";
            toggleViralHook.checked = config.showViralHook;
          }
          if (p.get("gap")) {
            config.gapDegrees = Math.max(16, Math.min(60, parseInt(p.get("gap"), 10) || 24));
            sliderGap.value = config.gapDegrees;
            valGap.textContent = `${config.gapDegrees}°`;
          }
          if (p.get("dg")) { config.doubleGap = p.get("dg") === "1"; modDoubleGap.checked = config.doubleGap; }
          if (p.get("sr")) { config.shrinkingRing = p.get("sr") === "1"; modShrinkingRing.checked = config.shrinkingRing; }
        } catch (_) {}
      }

      function resetPreview() {
        previewState = createSimState(config);
        updatePreviewStatsUI();
        renderSimState(previewCtx, previewState, config, BASE_W, BASE_H);
      }

      function updatePreviewButtonsUI() {
        previewIcon.textContent = previewRunning ? "⏸" : "▶";
        mbPlay.textContent = previewRunning ? "⏸" : "▶";
        previewLabel.textContent = previewRunning ? "Önizlemeyi Duraklat" : "Önizlemeyi Başlat";
      }

      function updatePreviewStatsUI() {
        if (!previewState) return;
        const rem = previewState.badges.filter((b) => !b.eliminated).length;
        previewElapsedEl.textContent = fmtTime(previewState.simTime);
        previewRemainingEl.textContent = previewState.mode === "match"
          ? `${previewState.score.home} - ${previewState.score.away}`
          : `${rem} / ${previewState.totalClubs}`;
      }

      let lastTs = 0;
      let physAccum = 0;
      const FIXED_DT = 1 / 60;

      function previewLoop(ts) {
        if (!lastTs) lastTs = ts;
        const dt = Math.min((ts - lastTs) / 1000, 0.05);
        lastTs = ts;

        if (!isRendering) {
          if (previewRunning && previewState) {
            physAccum += dt;
            while (physAccum >= FIXED_DT) {
              stepSimState(previewState, FIXED_DT, config, playLiveSound);
              physAccum -= FIXED_DT;
            }
            updatePreviewStatsUI();
          }
          if (previewState) renderSimState(previewCtx, previewState, config, BASE_W, BASE_H);
        }
        requestAnimationFrame(previewLoop);
      }

      /* =========================================================================
         11. KULÜP YÖNETİMİ, CANLI LİG SEÇİCİ (ESPN) & TAKIM ARAMA
         ========================================================================= */
      const ESPN_CORE = "https://sports.core.api.espn.com/v2/sports/soccer/leagues";
      const ESPN_SEARCH = "https://site.web.api.espn.com/apis/common/v3/search";

      // Seçilebilir ligler & turnuvalar (slug, görünen ad, video üst başlığı, otomatik tema)
      const LEAGUE_CATALOG = [
        { group: "UEFA Kupaları", items: [
          ["uefa.champions", "UEFA Şampiyonlar Ligi", "UEFA CHAMPIONS LEAGUE", "ucl"],
          ["uefa.europa", "UEFA Avrupa Ligi", "UEFA EUROPA LEAGUE", "europa"],
          ["uefa.europa.conf", "UEFA Konferans Ligi", "UEFA CONFERENCE LEAGUE", "conference"],
          ["uefa.champions_qual", "Şampiyonlar Ligi Elemeleri", "CHAMPIONS LEAGUE QUALIFYING", "ucl"],
          ["uefa.europa_qual", "Avrupa Ligi Elemeleri", "EUROPA LEAGUE QUALIFYING", "europa"],
          ["uefa.europa.conf_qual", "Konferans Ligi Elemeleri", "CONFERENCE LEAGUE QUALIFYING", "conference"],
          ["uefa.super_cup", "UEFA Süper Kupa", "UEFA SUPER CUP", "ucl"]
        ]},
        { group: "Türkiye", items: [
          ["tur.1", "Trendyol Süper Lig", "TÜRKİYE SÜPER LİG", "superlig"]
        ]},
        { group: "Avrupa Ligleri", items: [
          ["eng.1", "İngiltere Premier League", "PREMIER LEAGUE", "premier"],
          ["esp.1", "İspanya LaLiga", "LALIGA", "laliga"],
          ["ita.1", "İtalya Serie A", "SERIE A", "seriea"],
          ["ger.1", "Almanya Bundesliga", "BUNDESLIGA", "bundesliga"],
          ["fra.1", "Fransa Ligue 1", "LIGUE 1", "ligue1"],
          ["ned.1", "Hollanda Eredivisie", "EREDIVISIE", "eredivisie"],
          ["por.1", "Portekiz Liga Portugal", "LIGA PORTUGAL", "liga_pt"],
          ["bel.1", "Belçika Pro League", "BELGIAN PRO LEAGUE", "league"],
          ["sco.1", "İskoçya Premiership", "SCOTTISH PREMIERSHIP", "league"],
          ["gre.1", "Yunanistan Super League", "GREEK SUPER LEAGUE", "league"],
          ["aut.1", "Avusturya Bundesliga", "AUSTRIAN BUNDESLIGA", "league"],
          ["sui.1", "İsviçre Super League", "SWISS SUPER LEAGUE", "league"],
          ["den.1", "Danimarka Superliga", "DANISH SUPERLIGA", "league"],
          ["nor.1", "Norveç Eliteserien", "ELITESERIEN", "league"],
          ["swe.1", "İsveç Allsvenskan", "ALLSVENSKAN", "league"],
          ["rou.1", "Romanya Superliga", "ROMANIAN SUPERLIGA", "league"],
          ["isr.1", "İsrail Premier League", "ISRAELI PREMIER LEAGUE", "league"],
          ["cyp.1", "Kıbrıs 1. Lig", "CYPRUS FIRST DIVISION", "league"],
          ["rus.1", "Rusya Premier Lig", "RUSSIAN PREMIER LEAGUE", "league"],
          ["eng.2", "İngiltere Championship", "EFL CHAMPIONSHIP", "league"],
          ["esp.2", "İspanya LaLiga 2", "LALIGA 2", "league"],
          ["ita.2", "İtalya Serie B", "SERIE B", "league"],
          ["ger.2", "Almanya 2. Bundesliga", "2. BUNDESLIGA", "league"],
          ["fra.2", "Fransa Ligue 2", "LIGUE 2", "league"]
        ]},
        { group: "Yerel Kupalar", items: [
          ["eng.fa", "İngiltere FA Cup", "FA CUP", "league"],
          ["eng.league_cup", "İngiltere Lig Kupası", "CARABAO CUP", "league"],
          ["esp.copa_del_rey", "İspanya Kral Kupası", "COPA DEL REY", "league"],
          ["ita.coppa_italia", "İtalya Kupası", "COPPA ITALIA", "league"],
          ["ger.dfb_pokal", "Almanya Kupası", "DFB-POKAL", "league"],
          ["fra.coupe_de_france", "Fransa Kupası", "COUPE DE FRANCE", "league"]
        ]},
        { group: "Milli Takımlar", items: [
          ["fifa.world", "FIFA Dünya Kupası", "FIFA WORLD CUP", "worldcup"],
          ["uefa.euro", "UEFA EURO", "UEFA EURO", "worldcup"],
          ["uefa.nations", "UEFA Uluslar Ligi", "UEFA NATIONS LEAGUE", "worldcup"],
          ["uefa.euroq", "EURO Elemeleri", "EURO QUALIFIERS", "worldcup"],
          ["fifa.worldq.uefa", "Dünya Kupası Elemeleri (Avrupa)", "WORLD CUP QUALIFIERS", "worldcup"],
          ["conmebol.america", "Copa América", "COPA AMÉRICA", "worldcup"]
        ]},
        { group: "Dünya Kulüpleri", items: [
          ["fifa.cwc", "FIFA Kulüpler Dünya Kupası", "FIFA CLUB WORLD CUP", "worldcup"],
          ["conmebol.libertadores", "Copa Libertadores", "COPA LIBERTADORES", "league"],
          ["ksa.1", "Suudi Arabistan Pro Lig", "SAUDI PRO LEAGUE", "league"],
          ["usa.1", "ABD MLS", "MLS", "league"],
          ["mex.1", "Meksika Liga MX", "LIGA MX", "league"],
          ["bra.1", "Brezilya Série A", "BRASILEIRÃO", "league"],
          ["arg.1", "Arjantin Liga Profesional", "LIGA PROFESIONAL", "league"],
          ["jpn.1", "Japonya J1 League", "J1 LEAGUE", "league"],
          ["afc.champions", "AFC Şampiyonlar Ligi Elite", "AFC CHAMPIONS LEAGUE", "league"],
          ["concacaf.champions", "CONCACAF Şampiyonlar Kupası", "CONCACAF CHAMPIONS CUP", "league"]
        ]}
      ];
      const LEAGUE_META = {};
      LEAGUE_CATALOG.forEach((g) => g.items.forEach(([slug, label, title, theme]) => (LEAGUE_META[slug] = { slug, label, title, theme })));

      const BUILTIN_CAT_LABELS = {
        superlig: "Süper Lig", premier: "Premier League", laliga: "La Liga", seriea: "Serie A",
        bundesliga: "Bundesliga", europe: "Avrupa", world: "Dünya", national: "Milli Takımlar"
      };
      const leagueCache = {};
      const loadedLeagueOrder = [];
      let leagueLoading = false;

      function clubTags(c) {
        if (!c.tags) c.tags = [c.cat || "custom"];
        return c.tags;
      }
      function selectedCount() { return allClubs.filter((c) => c.enabled).length; }

      function fillLeagueSelect(extraLeagues) {
        const prev = leagueSelect.value || "uefa.champions";
        let html = "";
        LEAGUE_CATALOG.forEach((g) => {
          html += `<optgroup label="${g.group}">` + g.items.map(([slug, label]) => `<option value="${slug}">${label}</option>`).join("") + `</optgroup>`;
        });
        if (extraLeagues && extraLeagues.length) {
          html += `<optgroup label="Diğer tüm ligler">` + extraLeagues.map((l) => `<option value="${l.slug}">${escapeHtml(l.name)}</option>`).join("") + `</optgroup>`;
        }
        leagueSelect.innerHTML = html;
        leagueSelect.value = [...leagueSelect.options].some((o) => o.value === prev) ? prev : "uefa.champions";
      }

      function escapeHtml(str) {
        return String(str || "").replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]));
      }

      async function fetchJson(url) {
        const resp = await fetch(url.replace(/^http:/, "https:"));
        if (!resp.ok) throw new Error("HTTP " + resp.status);
        return resp.json();
      }

      async function loadAllLeagueNames() {
        btnLoadAllLeagues.disabled = true;
        leagueStatus.textContent = "Tüm ligler yükleniyor...";
        try {
          const idx = await fetchJson(`${ESPN_CORE}?limit=600`);
          const refs = (idx.items || []).map((i) => i.$ref);
          const out = [];
          for (let k = 0; k < refs.length; k += 25) {
            const part = await Promise.all(refs.slice(k, k + 25).map((u) => fetchJson(u).catch(() => null)));
            part.forEach((l) => {
              if (!l || !l.slug || LEAGUE_META[l.slug]) return;
              if (/women|femenin|\.w\.|wchampions|wwc|nwsl|u17|u19|u20|u21|u23|olymp|friendly|futsal|reina|shebelieves|pinatar|arnold/i.test(l.slug + " " + (l.name || ""))) return;
              out.push({ slug: l.slug, name: l.name || l.slug });
            });
            leagueStatus.textContent = `Ligler yükleniyor... ${Math.min(k + 25, refs.length)}/${refs.length}`;
          }
          out.sort((a, b) => a.name.localeCompare(b.name, "tr"));
          fillLeagueSelect(out);
          leagueStatus.textContent = `${out.length} ek lig/turnuva listeye eklendi.`;
          btnLoadAllLeagues.classList.add("hidden");
        } catch (err) {
          console.error(err);
          leagueStatus.textContent = "Lig listesi alınamadı. İnternet bağlantını kontrol et.";
          btnLoadAllLeagues.disabled = false;
        }
      }

      function pickLogo(logos) {
        if (!logos || !logos.length) return "";
        const def = logos.find((l) => (l.rel || []).includes("default") && !(l.rel || []).includes("dark"));
        return (def || logos[0]).href.replace(/^http:/, "https:");
      }

      function upsertEspnTeam(t, tag) {
        const id = Number(t.id);
        let club = allClubs.find((c) => c.id === id || c.espnId === id);
        if (!club) {
          const nm = String(t.displayName || t.name || "TAKIM").toUpperCase().slice(0, 22);
          club = {
            key: "espn_" + id,
            id: null,
            espnId: id,
            cat: tag,
            tags: [],
            name: nm,
            short: String(t.abbreviation || nm.replace(/[^A-Z0-9]/g, "").slice(0, 3) || "CLB").toUpperCase(),
            c1: t.color ? "#" + t.color : "#38bdf8",
            c2: t.alternateColor ? "#" + t.alternateColor : "#1e3a8a",
            enabled: false,
            custom: false,
            isFlag: !!t.isNational,
            logoUrl: pickLogo(t.logos) || `https://a.espncdn.com/i/teamlogos/soccer/500/${id}.png`,
            sprite: null,
            realLoaded: false,
            loadingStarted: false
          };
          club.sprite = createFallbackCrest(club);
          allClubs.push(club);
        }
        const tags = clubTags(club);
        if (!tags.includes(tag)) tags.push(tag);
        return club;
      }

      async function fetchLeagueTeams(slug) {
        if (leagueCache[slug]) return leagueCache[slug];
        const idx = await fetchJson(`${ESPN_CORE}/${slug}/teams?limit=300`);
        const refs = (idx.items || []).map((i) => i.$ref);
        if (!refs.length) throw new Error("empty");
        const teams = [];
        for (let k = 0; k < refs.length; k += 12) {
          const part = await Promise.all(refs.slice(k, k + 12).map((u) => fetchJson(u).catch(() => null)));
          part.forEach((t) => t && teams.push(t));
          leagueStatus.textContent = `Takımlar yükleniyor... ${teams.length}/${refs.length}`;
        }
        leagueCache[slug] = teams;
        return teams;
      }

      async function applyEspnLeague(slug, mode = "only") {
        if (leagueLoading) return;
        leagueLoading = true;
        btnLeagueOnly.disabled = btnLeagueAdd.disabled = true;
        const meta = LEAGUE_META[slug] || { slug, label: leagueSelect.selectedOptions[0]?.textContent || slug, title: (leagueSelect.selectedOptions[0]?.textContent || slug).toUpperCase(), theme: null };
        leagueStatus.textContent = `${meta.label} yükleniyor...`;
        renderGridSkeleton();
        try {
          const teams = await fetchLeagueTeams(slug);
          const clubs = teams.map((t) => upsertEspnTeam(t, slug));
          if (!BUILTIN_CAT_LABELS[slug] && !loadedLeagueOrder.includes(slug)) loadedLeagueOrder.push(slug);
          leagueLabels[slug] = meta.label;

          if (mode === "only") {
            const keep = new Set(clubs.map((c) => c.key));
            allClubs.forEach((c) => (c.enabled = keep.has(c.key)));
            config.subTitle = meta.title;
            inputSubTitle.value = meta.title;
            if (meta.theme) setTheme(meta.theme, false);
          } else {
            clubs.forEach((c) => (c.enabled = true));
          }
          config.preset = "espn:" + slug;
          if (mode === "only") { config.leagueSlug = slug; getLeagueLogo(slug); }
          clubs.forEach(loadClubLogo);
          if (clubModal.classList.contains("hidden")) {
            rebuildWinnerDropdown();
            if (!isRendering) { previewRunning = false; updatePreviewButtonsUI(); resetPreview(); }
          }
          activeModalCategory = slug;
          renderCategoryBar();
          renderClubModalGrid();
          leagueStatus.textContent = mode === "only"
            ? `${meta.label}: ${clubs.length} takım seçildi. İstemediklerine dokunup çıkarabilirsin.`
            : `${meta.label}: ${clubs.length} takım listeye eklendi (toplam ${selectedCount()} seçili).`;
        } catch (err) {
          console.error(err);
          leagueStatus.textContent = "Bu lig şu an yüklenemedi (ESPN'de kadro yok ya da bağlantı sorunu). Başka bir lig dene.";
          renderClubModalGrid();
        } finally {
          leagueLoading = false;
          btnLeagueOnly.disabled = btnLeagueAdd.disabled = false;
        }
      }
