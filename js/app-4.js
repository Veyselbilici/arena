"use strict";
      /* =========================================================================
         9. HIZLI OFFLINE TAM VİDEO RENDER & İNDİRME MOTORU (.MP4 & .WEBM)
         ========================================================================= */
      async function findSupportedVideoCodec(format, width, height, fps, bitrate) {
        if (typeof VideoEncoder === "undefined") return null;
        const list = format === "mp4"
          ? ["avc1.640028", "avc1.4d002a", "avc1.420028", "avc1.42001f"]
          : ["vp09.00.10.08", "vp8"];
        for (const codec of list) {
          try {
            const res = await VideoEncoder.isConfigSupported({ codec, width, height, bitrate, framerate: fps });
            if (res && res.supported) return codec;
          } catch (_) {}
        }
        return null;
      }

      async function findSupportedAudioCodec(format) {
        if (typeof AudioEncoder === "undefined" || typeof OfflineAudioContext === "undefined") return null;
        const codec = format === "mp4" ? "mp4a.40.2" : "opus";
        try {
          const res = await AudioEncoder.isConfigSupported({ codec, numberOfChannels: 2, sampleRate: 48000, bitrate: 128000 });
          if (res && res.supported) return codec;
        } catch (_) {}
        return null;
      }

      async function checkEncoderCapabilitiesUI() {
        const mp4Codec = await findSupportedVideoCodec("mp4", 1080, 1920, 30, 8_000_000);
        const aacCodec = await findSupportedAudioCodec("mp4");
        if (mp4Codec && typeof Mp4Muxer !== "undefined") {
          encoderBadge.textContent = `✓ Hızlı MP4 Hazır (H.264${aacCodec ? " + AAC" : ""})`;
          encoderBadge.className = "px-3 py-1.5 rounded-full text-xs font-semibold bg-emerald-950/90 border border-emerald-600/60 text-emerald-300";
        } else if (typeof MediaRecorder !== "undefined") {
          encoderBadge.textContent = "✓ Tarayıcı Video Motoru Hazır";
          encoderBadge.className = "px-3 py-1.5 rounded-full text-xs font-semibold bg-amber-950/90 border border-amber-600/60 text-amber-200";
        } else {
          encoderBadge.textContent = "Video Motoru Desteklenmiyor";
          encoderBadge.className = "px-3 py-1.5 rounded-full text-xs font-semibold bg-rose-950 border border-rose-700 text-rose-200";
        }
      }

      function triggerBlobDownload(blob, ext, winnerName, totalSec) {
        if (lastReadyUrl) URL.revokeObjectURL(lastReadyUrl);
        lastReadyUrl = URL.createObjectURL(blob);
        lastReadyFilename = `viral-arena-${config.mode}-${slugify(winnerName)}.${ext}`;

        const a = document.createElement("a");
        a.href = lastReadyUrl;
        a.download = lastReadyFilename;
        document.body.appendChild(a);
        a.click();
        a.remove();

        const mb = (blob.size / (1024 * 1024)).toFixed(1);
        redownloadLabel.textContent = `Son Videoyu Tekrar İndir (.${ext} • ${mb} MB • ${fmtTime(totalSec)})`;
        btnRedownload.classList.remove("hidden");
        btnRedownload.classList.add("flex");
        showToast(`Tam video hazır ve indirildi! (${lastReadyFilename})`, "success");
      }

      async function synthesizeAndEncodeAudio(audioEvents, totalDurationSec, audioCodec, muxer) {
        const sampleRate = 48000;
        const totalSamples = Math.max(sampleRate, Math.ceil((totalDurationSec + 0.25) * sampleRate));
        const offlineCtx = new OfflineAudioContext(2, totalSamples, sampleRate);
        const master = offlineCtx.createGain();
        master.gain.value = 0.82;
        master.connect(offlineCtx.destination);

        let lastBounceT = -1;
        for (const ev of audioEvents) {
          if (ev.type === "bounce" || ev.type === "clang") {
            if (ev.time - lastBounceT < 0.055) continue;
            lastBounceT = ev.time;
          }
          scheduleSoundEvent(offlineCtx, master, ev, Math.max(0.01, ev.time));
        }

        const audioBuffer = await offlineCtx.startRendering();
        const ch0 = audioBuffer.getChannelData(0);
        const ch1 = audioBuffer.numberOfChannels > 1 ? audioBuffer.getChannelData(1) : ch0;

        const audioEncoder = new AudioEncoder({
          output: (chunk, meta) => muxer.addAudioChunk(chunk, meta),
          error: (e) => console.error("AudioEncoder hatası:", e)
        });
        audioEncoder.configure({ codec: audioCodec, numberOfChannels: 2, sampleRate, bitrate: 128000 });

        const chunkFrames = 1024;
        for (let offset = 0; offset < audioBuffer.length; offset += chunkFrames) {
          if (renderCancelRequested) break;
          const frames = Math.min(chunkFrames, audioBuffer.length - offset);
          const planar = new Float32Array(frames * 2);
          planar.set(ch0.subarray(offset, offset + frames), 0);
          planar.set(ch1.subarray(offset, offset + frames), frames);

          const audioData = new AudioData({
            format: "f32-planar",
            sampleRate,
            numberOfFrames: frames,
            numberOfChannels: 2,
            timestamp: Math.round((offset / sampleRate) * 1_000_000),
            data: planar
          });
          audioEncoder.encode(audioData);
          audioData.close();

          if (offset % (chunkFrames * 60) === 0) await new Promise((r) => setTimeout(r, 0));
        }

        await audioEncoder.flush();
        audioEncoder.close();
      }

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
          audioEvents.push({ ...ev, time: frameIdx * dt });
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
        laser: { title: "⚡ Ölüm Lazeri — Hayatta Kalma",        badge: "2 Can • Dönen Lazer",     panel: panelModeLaser }
      };

      function switchMode(newMode) {
        if (!MODE_META[newMode]) return;
        config.mode = newMode;

        modeTabs.forEach((btn) => {
          const active = btn.dataset.mode === newMode;
          btn.classList.toggle("mode-tab-active", active);
          if (!active) btn.classList.add("text-slate-300");
          else btn.classList.remove("text-slate-300");
        });

        [panelModeRing, panelModeBomb, panelModeBlade, panelModeLaser].forEach((p) => p.classList.add("hidden"));
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
          if (p.get("pr")) applyLeaguePreset(p.get("pr"), true);
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
        previewLabel.textContent = previewRunning ? "Önizlemeyi Duraklat" : "Önizlemeyi Başlat";
      }

      function updatePreviewStatsUI() {
        if (!previewState) return;
        const rem = previewState.badges.filter((b) => !b.eliminated).length;
        previewElapsedEl.textContent = fmtTime(previewState.simTime);
        previewRemainingEl.textContent = `${rem} / ${previewState.totalClubs}`;
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
         11. KULÜP YÖNETİMİ, LİG PAKETLERİ & CANLI İNTERNET LOGO ARAMA
         ========================================================================= */
      function applyLeaguePreset(presetKey, silent = false) {
        config.preset = presetKey;
        if (presetKey === "ucl36") {
          allClubs.forEach((c) => (c.enabled = !!c.ucl));
        } else if (presetKey === "superlig") {
          allClubs.forEach((c) => (c.enabled = c.cat === "superlig"));
          config.subTitle = "TÜRKİYE SÜPER LİG";
          inputSubTitle.value = config.subTitle;
        } else if (presetKey === "premier") {
          allClubs.forEach((c) => (c.enabled = c.cat === "premier"));
          config.subTitle = "PREMIER LEAGUE";
          inputSubTitle.value = config.subTitle;
        } else if (presetKey === "laliga") {
          allClubs.forEach((c) => (c.enabled = c.cat === "laliga"));
          config.subTitle = "LA LIGA EA SPORTS";
          inputSubTitle.value = config.subTitle;
        } else if (presetKey === "seriea") {
          allClubs.forEach((c) => (c.enabled = c.cat === "seriea"));
          config.subTitle = "SERIE A ENILIVE";
          inputSubTitle.value = config.subTitle;
        } else if (presetKey === "bundesliga") {
          allClubs.forEach((c) => (c.enabled = c.cat === "bundesliga"));
          config.subTitle = "BUNDESLIGA";
          inputSubTitle.value = config.subTitle;
        } else if (presetKey === "worldcup") {
          allClubs.forEach((c) => (c.enabled = c.cat === "national"));
          config.subTitle = "WORLD CUP SURVIVAL";
          inputSubTitle.value = config.subTitle;
        } else if (presetKey === "super50") {
          const superSet = new Set([
            "galatasaray", "fenerbahce", "besiktas", "trabzonspor", "basaksehir",
            "man_city", "arsenal", "liverpool", "chelsea", "man_united", "tottenham", "newcastle", "aston_villa",
            "real_madrid", "barcelona", "atletico", "bilbao", "sociedad", "villarreal", "betis", "sevilla",
            "inter", "ac_milan", "juventus", "napoli", "roma", "lazio", "atalanta", "fiorentina",
            "bayern", "dortmund", "leverkusen", "leipzig", "stuttgart", "frankfurt",
            "psg", "marseille", "monaco", "lyon", "lille", "ajax", "psv", "feyenoord",
            "benfica", "porto", "sporting", "celtic", "inter_miami", "al_nassr", "al_hilal"
          ]);
          allClubs.forEach((c) => (c.enabled = superSet.has(c.key)));
          config.subTitle = "50 WORLD GIANTS ARENA";
          inputSubTitle.value = config.subTitle;
        } else if (presetKey === "mega") {
          allClubs.forEach((c) => (c.enabled = true));
          config.subTitle = `MEGA CHAOS • ${allClubs.length} TEAMS`;
          inputSubTitle.value = config.subTitle;
        }

        preloadClubLogos(true);
        if (!silent) {
          renderClubModalGrid();
          showToast(`Paket uygulandı: ${allClubs.filter((c) => c.enabled).length} takım seçildi!`, "success");
        }
      }

      function getFilteredModalClubs() {
        const q = localSearchTerm.trim().toLowerCase();
        return allClubs.filter((c) => {
          const catOk = activeModalCategory === "all"
            ? true
            : activeModalCategory === "custom"
              ? !!c.custom
              : c.cat === activeModalCategory;
          if (!catOk) return false;
          if (!q) return true;
          return c.name.toLowerCase().includes(q) || c.short.toLowerCase().includes(q);
        });
      }

      function rebuildWinnerDropdown() {
        const activeClubs = allClubs.filter((c) => c.enabled);
        navClubsSub.textContent = `${activeClubs.length} / ${allClubs.length} Aktif`;
        const prev = config.selectedWinnerKey;
        selectWinner.innerHTML = `<option value="random">🎲 Rastgele (Doğal Fizik)</option>`;
        activeClubs.forEach((club) => {
          const opt = document.createElement("option");
          opt.value = club.key;
          opt.textContent = `🏆 ${club.name}`;
          selectWinner.appendChild(opt);
        });
        if (prev !== "random" && activeClubs.some((c) => c.key === prev)) {
          selectWinner.value = prev;
        } else {
          config.selectedWinnerKey = "random";
          selectWinner.value = "random";
        }
      }

      function renderClubModalGrid() {
        const selCount = allClubs.filter((c) => c.enabled).length;
        modalSelectedCount.textContent = `${selCount} / ${allClubs.length} Takım Seçili`;
        clubGrid.innerHTML = "";

        const visible = getFilteredModalClubs();
        if (visible.length === 0) {
          clubGrid.innerHTML = `<div class="col-span-full text-center py-8 text-xs text-slate-400">Eşleşen takım bulunamadı. Yukarıdaki <strong>İnternette Ara</strong> çubuğundan dilediğiniz kulübü anında ekleyebilirsiniz!</div>`;
          return;
        }

        visible.forEach((club) => {
          const btn = document.createElement("button");
          btn.type = "button";
          btn.className = `flex items-center gap-2 px-2.5 py-2 rounded-xl border text-left transition cursor-pointer ${
            club.enabled
              ? "bg-sky-950/55 border-sky-500/65 text-white"
              : "bg-slate-950/55 border-slate-800 text-slate-400 opacity-65 hover:opacity-100"
          }`;

          const thumbHtml = club.logoUrl
            ? `<img src="${club.logoUrl}" alt="" loading="lazy" class="w-6 h-6 object-contain shrink-0 ${club.isFlag ? "rounded-full" : ""}" onerror="this.style.display='none'" />`
            : `<span class="w-5 h-5 rounded-full shrink-0" style="background:${club.c1};border:2px solid ${club.c2}"></span>`;

          btn.innerHTML = `
            ${thumbHtml}
            <span class="text-[11px] font-bold truncate flex-1">${club.name}</span>
            <span class="text-xs font-black text-sky-400">${club.enabled ? "✓" : ""}</span>
          `;
          btn.addEventListener("click", () => {
            if (club.enabled && allClubs.filter((c) => c.enabled).length <= 2) {
              showToast("En az 2 takım seçili olmalıdır.", "warn");
              return;
            }
            club.enabled = !club.enabled;
            if (club.enabled) loadClubLogo(club);
            renderClubModalGrid();
          });
          clubGrid.appendChild(btn);
        });
      }

      async function searchOnlineTeams() {
        const q = onlineTeamQuery.value.trim();
        if (q.length < 2) {
          showToast("Aramak için en az 2 harf yazın (ör. Vanspor, Sakaryaspor).", "warn");
          return;
        }

        btnOnlineSearch.disabled = true;
        onlineSearchLabel.textContent = "Aranıyor...";
        onlineSearchResults.classList.remove("hidden");
        onlineSearchResults.innerHTML = `<div class="col-span-full text-center py-3 text-xs text-sky-300">🌐 "${q}" için gerçek kulüp logoları aranıyor...</div>`;

        try {
          const resp = await fetch(`https://www.thesportsdb.com/api/v1/json/123/searchteams.php?t=${encodeURIComponent(q)}`);
          if (!resp.ok) throw new Error("API yanıt vermedi");
          const data = await resp.json();
          const teams = (data.teams || []).filter((t) =>
            !t.strSport || t.strSport.toLowerCase().includes("soccer") || t.strSport.toLowerCase().includes("football")
          );

          if (teams.length === 0) {
            onlineSearchResults.innerHTML = `<div class="col-span-full text-center py-3 text-xs text-amber-300">"${q}" için futbol kulübü bulunamadı. İngilizce/tam adını deneyebilir veya alttan cihazınızdan PNG logo ekleyebilirsiniz.</div>`;
            return;
          }

          onlineSearchResults.innerHTML = "";
          teams.slice(0, 12).forEach((t) => {
            const badgeUrl = t.strBadge || t.strTeamBadge || "";
            const teamName = (t.strTeam || q).toUpperCase().slice(0, 22);
            const league = t.strLeague || t.strCountry || "Futbol Kulübü";
            const shortCode = (t.strTeamShort || teamName.replace(/[^A-Z]/g, "").slice(0, 3) || "CLB").toUpperCase();

            const card = document.createElement("div");
            card.className = "flex items-center gap-2.5 p-2 rounded-xl bg-slate-950/90 border border-indigo-500/35";
            card.innerHTML = `
              ${badgeUrl ? `<img src="${badgeUrl}" alt="" class="w-9 h-9 object-contain shrink-0 rounded-lg bg-slate-900/70 p-0.5" onerror="this.style.display='none'" />` : `<div class="w-9 h-9 rounded-lg bg-indigo-900/60 flex items-center justify-center text-xs font-black text-white shrink-0">${shortCode}</div>`}
              <div class="min-w-0 flex-1">
                <div class="text-xs font-extrabold text-white truncate">${teamName}</div>
                <div class="text-[10px] text-slate-400 truncate">${league}</div>
              </div>
              <button type="button" class="px-2.5 py-1.5 rounded-lg text-[11px] font-black bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer shrink-0">+ Ekle</button>
            `;

            const addBtn = card.querySelector("button");
            addBtn.addEventListener("click", () => {
              const existing = allClubs.find((c) => c.name === teamName);
              if (existing) {
                existing.enabled = true;
                if (badgeUrl && !existing.realLoaded) {
                  existing.logoUrl = badgeUrl;
                  existing.loadingStarted = false;
                  loadClubLogo(existing);
                }
                renderClubModalGrid();
                showToast(`${teamName} zaten listedeydi, aktif edildi!`, "info");
                return;
              }

              const newClub = {
                key: "online_" + (t.idTeam || Date.now()) + "_" + Math.floor(Math.random() * 999),
                id: null,
                cat: "custom",
                name: teamName,
                short: shortCode,
                c1: t.strColour1 && t.strColour1.startsWith("#") ? t.strColour1 : "#38bdf8",
                c2: t.strColour2 && t.strColour2.startsWith("#") ? t.strColour2 : "#1e3a8a",
                enabled: true,
                custom: true,
                isFlag: false,
                logoUrl: badgeUrl,
                sprite: null,
                realLoaded: false,
                loadingStarted: false
              };
              newClub.sprite = createFallbackCrest(newClub);
              allClubs.unshift(newClub);
              loadClubLogo(newClub);
              renderClubModalGrid();
              rebuildWinnerDropdown();
              addBtn.textContent = "✓ Eklendi";
              addBtn.disabled = true;
              addBtn.className = "px-2.5 py-1.5 rounded-lg text-[11px] font-black bg-slate-700 text-emerald-300 shrink-0";
              showToast(`${teamName} gerçek logosuyla arenaya eklendi!`, "success");
            });

            onlineSearchResults.appendChild(card);
          });
        } catch (err) {
          console.error(err);
          onlineSearchResults.innerHTML = `<div class="col-span-full text-center py-3 text-xs text-rose-300">İnternet aramasına ulaşılamadı. Bağlantınızı kontrol edin veya alttan manuel logo ekleyin.</div>`;
        } finally {
          btnOnlineSearch.disabled = false;
          onlineSearchLabel.textContent = "İnternette Ara";
        }
      }
