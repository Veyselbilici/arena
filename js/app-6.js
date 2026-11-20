"use strict";
      const leagueLabels = {};

      function applyLeaguePreset(presetKey, silent = false) {
        config.preset = presetKey;
        const builtin = (c) => !c.espnOnly;
        const setSub = (t) => { config.subTitle = t; inputSubTitle.value = t; };
        if (presetKey === "ucl36") {
          allClubs.forEach((c) => (c.enabled = !!c.ucl));
          setSub("UEFA CHAMPIONS LEAGUE");
          setTheme("ucl", false);
        } else if (["superlig", "premier", "laliga", "seriea", "bundesliga"].includes(presetKey)) {
          allClubs.forEach((c) => (c.enabled = clubTags(c).includes(presetKey)));
          setSub({ superlig: "TÜRKİYE SÜPER LİG", premier: "PREMIER LEAGUE", laliga: "LALIGA", seriea: "SERIE A", bundesliga: "BUNDESLIGA" }[presetKey]);
          setTheme({ superlig: "superlig", premier: "premier", laliga: "laliga", seriea: "seriea", bundesliga: "bundesliga" }[presetKey], false);
        } else if (presetKey === "worldcup") {
          allClubs.forEach((c) => (c.enabled = clubTags(c).includes("national")));
          setSub("WORLD CUP SURVIVAL");
          setTheme("worldcup", false);
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
          setSub("50 WORLD GIANTS ARENA");
          setTheme("league", false);
        } else if (presetKey === "mega") {
          const live = allClubs.filter((c) => c.espnId || (c.tags || []).some((t) => leagueCache[t]) || c.custom);
          (live.length >= 2 ? live : allClubs).forEach((c) => (c.enabled = true));
          setSub(`MEGA CHAOS • ${selectedCount()} TEAMS`);
        }

        activeModalCategory = presetKey === "worldcup" ? "national" : (BUILTIN_CAT_LABELS[presetKey] ? presetKey : "selected");
        preloadClubLogos(true);
        if (!silent) {
          renderCategoryBar();
          renderClubModalGrid();
          showToast(`Paket uygulandı: ${selectedCount()} takım seçildi.`, "success");
        }
      }

      function getFilteredModalClubs() {
        const q = localSearchTerm.trim().toLocaleLowerCase("tr");
        return allClubs.filter((c) => {
          let catOk = true;
          if (activeModalCategory === "selected") catOk = c.enabled;
          else if (activeModalCategory === "custom") catOk = !!c.custom;
          else if (activeModalCategory !== "all") catOk = clubTags(c).includes(activeModalCategory);
          if (!catOk) return false;
          if (!q) return true;
          return c.name.toLocaleLowerCase("tr").includes(q) || c.short.toLocaleLowerCase("tr").includes(q);
        });
      }

      function renderCategoryBar() {
        const cats = [["selected", `Seçili (${selectedCount()})`], ["all", "Tümü"]];
        loadedLeagueOrder.forEach((slug) => cats.push([slug, leagueLabels[slug] || slug]));

        if (allClubs.some((c) => c.custom)) cats.push(["custom", "Özel"]);
        categoryFilterBar.innerHTML = cats.map(([k, v]) =>
          `<button type="button" data-cat="${k}" class="chip ${k === activeModalCategory ? "is-active" : ""}">${escapeHtml(v)}</button>`
        ).join("");
        const act = categoryFilterBar.querySelector(".is-active");
        if (act) act.scrollIntoView({ block: "nearest", inline: "nearest" });
      }

      function rebuildWinnerDropdown() {
        const activeClubs = allClubs.filter((c) => c.enabled).sort((a, b) => a.name.localeCompare(b.name, "tr"));
        navClubsSub.textContent = `${activeClubs.length} takım seçili`;
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

      function renderGridSkeleton() {
        clubGrid.innerHTML = Array.from({ length: 12 }, () => `<div class="h-11 rounded-xl skeleton"></div>`).join("");
      }

      function updateSelectedCountUI() {
        const n = selectedCount();
        modalSelectedCount.textContent = `${n} seçili`;
        modalSelectedCount.className = `text-[11px] font-extrabold px-2 py-1 rounded-lg border ${n >= 2 ? "text-sky-300 bg-sky-950/70 border-sky-700/50" : "text-rose-300 bg-rose-950/70 border-rose-700/50"}`;
        const selChip = categoryFilterBar.querySelector('[data-cat="selected"]');
        if (selChip) selChip.textContent = `Seçili (${n})`;
      }

      function renderClubModalGrid() {
        updateSelectedCountUI();
        const visible = getFilteredModalClubs();
        if (visible.length === 0) {
          clubGrid.innerHTML = `<div class="col-span-full text-center py-8 text-xs text-slate-400">Burada takım yok. Yukarıdan bir lig seç ya da takım ara.</div>`;
          return;
        }
        const frag = document.createDocumentFragment();
        visible.forEach((club) => {
          const btn = document.createElement("button");
          btn.type = "button";
          const paint = () => {
            btn.className = `press flex items-center gap-2 px-2.5 py-2 min-h-[44px] rounded-xl border text-left cursor-pointer ${
              club.enabled ? "bg-sky-950/60 border-sky-500/70 text-white" : "bg-slate-950/55 border-slate-800 text-slate-400"
            }`;
            btn.querySelector(".tick").textContent = club.enabled ? "✓" : "+";
          };
          const thumbHtml = club.logoUrl
            ? `<img src="${club.logoUrl}" alt="" loading="lazy" class="w-7 h-7 object-contain shrink-0 ${club.isFlag ? "rounded-full object-cover" : ""}" onerror="this.style.visibility='hidden'" />`
            : `<span class="w-6 h-6 rounded-full shrink-0" style="background:${club.c1};border:2px solid ${club.c2}"></span>`;
          btn.innerHTML = `${thumbHtml}<span class="text-[11px] font-bold truncate flex-1">${escapeHtml(club.name)}</span><span class="tick text-xs font-black text-sky-400 w-3 text-center"></span>`;
          paint();
          btn.addEventListener("click", () => {
            club.enabled = !club.enabled;
            if (club.enabled) loadClubLogo(club);
            paint();
            updateSelectedCountUI();
          });
          frag.appendChild(btn);
        });
        clubGrid.innerHTML = "";
        clubGrid.appendChild(frag);
      }

      async function searchOnlineTeams() {
        const q = onlineTeamQuery.value.trim();
        if (q.length < 2) {
          showToast("Aramak için en az 2 harf yaz.", "warn");
          return;
        }
        btnOnlineSearch.disabled = true;
        onlineSearchLabel.textContent = "...";
        onlineSearchResults.classList.remove("hidden");
        onlineSearchResults.innerHTML = Array.from({ length: 4 }, () => `<div class="h-14 rounded-xl skeleton"></div>`).join("");

        try {
          const data = await fetchJson(`${ESPN_SEARCH}?query=${encodeURIComponent(q)}&limit=25&type=team`);
          const seen = new Set();
          const teams = (data.items || []).filter((t) => {
            if (t.sport !== "soccer") return false;
            if (/wchampions|\.w\.|women|nwsl|wwc|u1\d|u2\d/i.test(String(t.league || t.defaultLeagueSlug || "") + " " + (t.displayName || ""))) return false;
            if (seen.has(t.id)) return false;
            seen.add(t.id);
            return true;
          }).slice(0, 12);

          if (teams.length === 0) {
            onlineSearchResults.innerHTML = `<div class="col-span-full text-center py-3 text-xs text-amber-300">"${escapeHtml(q)}" bulunamadı. İngilizce adını dene ya da aşağıdan logo linkiyle ekle.</div>`;
            return;
          }

          onlineSearchResults.innerHTML = "";
          teams.forEach((t) => {
            const logo = pickLogo(t.logos) || `https://a.espncdn.com/i/teamlogos/soccer/500/${t.id}.png`;
            const nm = String(t.displayName || q).toUpperCase().slice(0, 22);
            const lg = LEAGUE_META[t.league]?.label || t.league || "";
            const already = allClubs.find((c) => (c.id === Number(t.id) || c.espnId === Number(t.id)) && c.enabled);
            const card = document.createElement("div");
            card.className = "flex items-center gap-2.5 p-2 rounded-xl bg-slate-950/90 border border-slate-700";
            card.innerHTML = `
              <img src="${logo}" alt="" class="w-9 h-9 object-contain shrink-0" onerror="this.style.visibility='hidden'" />
              <div class="min-w-0 flex-1">
                <div class="text-xs font-extrabold text-white truncate">${escapeHtml(nm)}</div>
                <div class="text-[10px] text-slate-400 truncate">${escapeHtml(lg)}</div>
              </div>
              <button type="button" class="press px-3 py-2 rounded-lg text-[11px] font-black ${already ? "bg-slate-700 text-emerald-300" : "bg-emerald-600 hover:bg-emerald-500 text-white"} cursor-pointer shrink-0">${already ? "✓ Ekli" : "+ Ekle"}</button>`;
            const addBtn = card.querySelector("button");
            addBtn.addEventListener("click", () => {
              const club = upsertEspnTeam({ ...t, logos: t.logos }, "custom");
              club.custom = true;
              club.enabled = true;
              loadClubLogo(club);
              renderCategoryBar();
              renderClubModalGrid();
              addBtn.textContent = "✓ Ekli";
              addBtn.className = "press px-3 py-2 rounded-lg text-[11px] font-black bg-slate-700 text-emerald-300 shrink-0";
              showToast(`${club.name} eklendi.`, "success");
            });
            onlineSearchResults.appendChild(card);
          });
        } catch (err) {
          console.error(err);
          onlineSearchResults.innerHTML = `<div class="col-span-full text-center py-3 text-xs text-rose-300">Aramaya ulaşılamadı. Bağlantını kontrol et ya da aşağıdan logo linkiyle ekle.</div>`;
        } finally {
          btnOnlineSearch.disabled = false;
          onlineSearchLabel.textContent = "Ara";
        }
      }

      function openClubModal() {
        renderCategoryBar();
        renderClubModalGrid();
        clubModal.classList.remove("hidden");
        clubModal.classList.add("flex");
        document.body.style.overflow = "hidden";
      }
      function closeClubModal() {
        clubModal.classList.add("hidden");
        clubModal.classList.remove("flex");
        document.body.style.overflow = "";
      }
      /* =========================================================================
         12. EVENT LISTENERS
         ========================================================================= */
      modeTabs.forEach((btn) => btn.addEventListener("click", () => switchMode(btn.dataset.mode)));

      btnShareLink.addEventListener("click", () => {
        const url = buildShareableURL();
        const ok = copyTextReliable(url);
        if (ok) {
          showToast("Ayar linki kopyalandı! WhatsApp'tan arkadaşına yapıştırıp gönderebilirsin.", "success");
        } else {
          showToast("Link oluşturuldu: " + url, "info");
        }
      });

      btnGenerateDownload.addEventListener("click", handleGenerateFullVideo);
      btnCancelRender.addEventListener("click", () => {
        renderCancelRequested = true;
        renderStageTitle.textContent = "İptal ediliyor...";
      });
      btnRedownload.addEventListener("click", () => {
        if (!lastReadyUrl) return;
        const a = document.createElement("a");
        a.href = lastReadyUrl;
        a.download = lastReadyFilename;
        document.body.appendChild(a);
        a.click();
        a.remove();
      });

      btnPreviewToggle.addEventListener("click", () => {
        if (isRendering) return;
        initLiveAudio();
        if (previewState && previewState.winner) resetPreview();
        previewRunning = !previewRunning;
        updatePreviewButtonsUI();
      });
      btnPreviewReset.addEventListener("click", () => {
        if (isRendering) return;
        previewRunning = false;
        updatePreviewButtonsUI();
        resetPreview();
      });

      // Modal
      btnNavClubs.addEventListener("click", openClubModal);
      btnCloseClubModal.addEventListener("click", () => btnApplyClubs.click());
      clubModal.addEventListener("click", (e) => { if (e.target === clubModal) btnApplyClubs.click(); });
      document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !clubModal.classList.contains("hidden")) btnApplyClubs.click(); });

      presetBtns.forEach((btn) => {
        btn.addEventListener("click", () => applyLeaguePreset(btn.dataset.preset));
      });

      btnLeagueOnly.addEventListener("click", () => applyEspnLeague(leagueSelect.value, "only"));
      leagueSelect.addEventListener("change", () => applyEspnLeague(leagueSelect.value, "only"));
      document.querySelectorAll(".league-chip").forEach((btn) => btn.addEventListener("click", () => {
        leagueSelect.value = btn.dataset.league;
        applyEspnLeague(btn.dataset.league, "only");
        document.getElementById("modalScroll").scrollTo({ top: categoryFilterBar.closest("div.border-b").offsetTop - 8, behavior: "smooth" });
      }));
      btnLeagueAdd.addEventListener("click", () => applyEspnLeague(leagueSelect.value, "add"));
      btnLoadAllLeagues.addEventListener("click", loadAllLeagueNames);

      categoryFilterBar.addEventListener("click", (e) => {
        const btn = e.target.closest("[data-cat]");
        if (!btn) return;
        activeModalCategory = btn.dataset.cat;
        renderCategoryBar();
        renderClubModalGrid();
      });

      localTeamSearch.addEventListener("input", (e) => {
        localSearchTerm = e.target.value;
        renderClubModalGrid();
      });

      btnSelectAllVisible.addEventListener("click", () => {
        getFilteredModalClubs().forEach((c) => { c.enabled = true; loadClubLogo(c); });
        renderClubModalGrid();
      });
      btnDeselectVisible.addEventListener("click", () => {
        getFilteredModalClubs().forEach((c) => (c.enabled = false));
        renderClubModalGrid();
      });
      btnOnlySelected.addEventListener("click", () => {
        activeModalCategory = "selected";
        renderCategoryBar();
        renderClubModalGrid();
      });
      btnClearAllClubs.addEventListener("click", () => {
        allClubs.forEach((c) => (c.enabled = false));
        renderClubModalGrid();
        showToast("Tüm seçim temizlendi. En az 2 takım seç.", "info");
      });

      btnRandom36.addEventListener("click", () => {
        const pool = getFilteredModalClubs().length >= 36 ? getFilteredModalClubs() : allClubs;
        const picked = new Set([...pool].sort(() => Math.random() - 0.5).slice(0, 36).map((c) => c.key));
        allClubs.forEach((c) => {
          c.enabled = picked.has(c.key);
          if (c.enabled) loadClubLogo(c);
        });
        renderClubModalGrid();
        showToast(`Rastgele ${picked.size} takım seçildi.`, "success");
      });

      btnOnlineSearch.addEventListener("click", searchOnlineTeams);
      onlineTeamQuery.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          searchOnlineTeams();
        }
      });

      btnAddManualTeam.addEventListener("click", () => {
        const name = manualTeamName.value.trim().toUpperCase();
        const url = manualTeamUrl.value.trim();
        if (!name) {
          showToast("Lütfen manuel eklenecek takımın adını yazın.", "warn");
          return;
        }
        const newClub = {
          key: "manual_" + Date.now() + "_" + Math.floor(Math.random() * 999),
          id: null,
          cat: "custom",
          name: name.slice(0, 22),
          short: name.replace(/[^A-Z0-9]/g, "").slice(0, 3) || "CLB",
          c1: "#38bdf8",
          c2: "#1e3a8a",
          enabled: true,
          custom: true,
          isFlag: false,
          logoUrl: url || "",
          sprite: null,
          realLoaded: false,
          loadingStarted: false
        };
        newClub.sprite = createFallbackCrest(newClub);
        allClubs.unshift(newClub);
        if (url) loadClubLogo(newClub);
        manualTeamName.value = "";
        manualTeamUrl.value = "";
        renderClubModalGrid();
        rebuildWinnerDropdown();
        showToast(`${newClub.name} eklendi!`, "success");
      });

      btnApplyClubs.addEventListener("click", () => {
        if (selectedCount() < 2) {
          showToast("Arenaya göndermek için en az 2 takım seç.", "warn");
          return;
        }
        closeClubModal();
        preloadClubLogos(true);
        rebuildWinnerDropdown();
        if (!isRendering) {
          previewRunning = false;
          updatePreviewButtonsUI();
          resetPreview();
        }
      });

      modalCustomLogoInput.addEventListener("change", (e) => {
        const files = Array.from(e.target.files || []);
        files.forEach((file) => {
          const reader = new FileReader();
          reader.onload = (ev) => {
            const img = new Image();
            img.onload = () => {
              const rawName = file.name.replace(/\.[^.]+$/, "").toUpperCase().slice(0, 20) || "CUSTOM CLUB";
              allClubs.unshift({
                key: "custom_" + Date.now() + "_" + Math.floor(Math.random() * 1000),
                id: null,
                cat: "custom",
                name: rawName,
                short: rawName.slice(0, 3),
                c1: "#38bdf8", c2: "#1e3a8a",
                enabled: true, custom: true, realLoaded: true, loadingStarted: true,
                logoUrl: ev.target.result,
                sprite: createImageSprite(img)
              });
              updateLogoStatusUI();
              renderClubModalGrid();
              rebuildWinnerDropdown();
              showToast(`${rawName} eklendi!`, "success");
            };
            img.src = ev.target.result;
          };
          reader.readAsDataURL(file);
        });
        modalCustomLogoInput.value = "";
      });

      // Özel Kupa Yükleme
      // Lige özel kupa: yüklenen görsel küçültülüp o tema için tarayıcıda saklanır
      function storeTrophy(themeKey, dataUrl) {
        try { localStorage.setItem("arena_trophy_" + themeKey, dataUrl); } catch (_) {
          showToast("Kupa bu oturumda kullanılacak (tarayıcı kaydı dolu).", "warn");
        }
      }
      function restoreTrophies() {
        Object.keys(THEMES).forEach((k) => {
          let url = null;
          try { url = localStorage.getItem("arena_trophy_" + k); } catch (_) {}
          if (!url) return;
          const img = new Image();
          img.onload = () => { customTrophies[k] = img; updateTrophyButtons(); };
          img.src = url;
        });
      }
      function updateTrophyButtons() {
        btnResetTrophy.classList.toggle("hidden", !customTrophies[config.theme]);
        trophyThemeLabel.textContent = (THEMES[config.theme] || {}).name || "";
      }
      customTrophyInput.addEventListener("change", (e) => {
        const file = e.target.files && e.target.files[0];
        if (!file) return;
        const themeKey = config.theme;
        const reader = new FileReader();
        reader.onload = (ev) => {
          const src = new Image();
          src.onload = () => {
            const max = 640;
            const sc = Math.min(1, max / Math.max(src.naturalWidth, src.naturalHeight));
            const cv = document.createElement("canvas");
            cv.width = Math.round(src.naturalWidth * sc);
            cv.height = Math.round(src.naturalHeight * sc);
            cv.getContext("2d").drawImage(src, 0, 0, cv.width, cv.height);
            const url = cv.toDataURL("image/png");
            const img = new Image();
            img.onload = () => {
              customTrophies[themeKey] = img;
              storeTrophy(themeKey, url);
              updateTrophyButtons();
              showToast(`Kupa kaydedildi: ${THEMES[themeKey].name}`, "success");
            };
            img.src = url;
          };
          src.src = ev.target.result;
        };
        reader.readAsDataURL(file);
        customTrophyInput.value = "";
      });
      btnResetTrophy.addEventListener("click", () => {
        delete customTrophies[config.theme];
        try { localStorage.removeItem("arena_trophy_" + config.theme); } catch (_) {}
        updateTrophyButtons();
        showToast("Bu lig için tasarım kupaya dönüldü.", "info");
      });

      // Mod & Fizik Inputları
      sliderGap.addEventListener("input", (e) => { config.gapDegrees = parseInt(e.target.value, 10); valGap.textContent = `${config.gapDegrees}°`; });
      sliderRingSpeed.addEventListener("input", (e) => { config.ringSpeed = parseFloat(e.target.value); valRingSpeed.textContent = `${config.ringSpeed.toFixed(2)}x`; });
      modDoubleGap.addEventListener("change", (e) => (config.doubleGap = e.target.checked));
      modShrinkingRing.addEventListener("change", (e) => (config.shrinkingRing = e.target.checked));
      modSpeedEscalation.addEventListener("change", (e) => (config.speedEscalation = e.target.checked));
      modGrowSurvivor.addEventListener("change", (e) => (config.growSurvivor = e.target.checked));

      sliderBombTimer.addEventListener("input", (e) => { config.bombTimer = parseFloat(e.target.value); valBombTimer.textContent = `${config.bombTimer.toFixed(1)} sn`; });
      sliderBombChaos.addEventListener("input", (e) => { config.bombChaos = parseFloat(e.target.value); valBombChaos.textContent = `${config.bombChaos.toFixed(2)}x`; });

      sliderBladeSpeed.addEventListener("input", (e) => { config.bladeSpeed = parseFloat(e.target.value); valBladeSpeed.textContent = `${config.bladeSpeed.toFixed(2)}x`; });
      sliderBladeLen.addEventListener("input", (e) => { config.bladeLength = parseInt(e.target.value, 10); valBladeLen.textContent = `${config.bladeLength} px`; });

      sliderLaserSpeed.addEventListener("input", (e) => { config.laserSpeed = parseFloat(e.target.value); valLaserSpeed.textContent = `${config.laserSpeed.toFixed(2)}x`; });
      selectLaserCount.addEventListener("change", (e) => (config.laserCount = parseInt(e.target.value, 10)));

      sliderSimSpeed.addEventListener("input", (e) => { config.simSpeed = parseFloat(e.target.value); valSimSpeed.textContent = `${config.simSpeed.toFixed(2)}x`; });
      sliderGravity.addEventListener("input", (e) => { config.gravityScale = parseFloat(e.target.value); valGravity.textContent = `${config.gravityScale.toFixed(2)}x`; });
      const spinLabel = (v) => (v <= 0.001 ? "Kapalı" : v < 0.45 ? "Yavaş" : v < 0.9 ? "Orta" : "Hızlı") + ` (${v.toFixed(2)}x)`;
      valSpin.textContent = spinLabel(config.spinSpeed);
      sliderSpin.addEventListener("input", (e) => {
        config.spinSpeed = parseFloat(e.target.value);
        valSpin.textContent = spinLabel(config.spinSpeed);
      });
      toggleLeagueLogo.addEventListener("change", (e) => (config.showLeagueLogo = e.target.checked));

      sliderLogoSize.addEventListener("input", (e) => {
        config.logoRadius = parseInt(e.target.value, 10);
        valLogoSize.textContent = `${config.logoRadius} px`;
        if (previewState) { const rr = computeBadgeRadius(config.logoRadius, previewState.totalClubs); previewState.badges.forEach((b) => (b.r = rr)); }
      });

      selectWinner.addEventListener("change", (e) => {
        config.selectedWinnerKey = e.target.value;
        if (previewState) previewState.selectedWinnerKey = config.selectedWinnerKey;
      });

      selectTheme.addEventListener("change", (e) => setTheme(e.target.value, true));

      inputSubTitle.addEventListener("input", (e) => (config.subTitle = e.target.value));
      inputMainTitle.addEventListener("input", (e) => (config.mainTitle = e.target.value));
      inputWatermark.addEventListener("input", (e) => (config.watermark = e.target.value));
      inputViralHook.addEventListener("input", (e) => (config.viralHook = e.target.value));
      toggleViralHook.addEventListener("change", (e) => (config.showViralHook = e.target.checked));
      toggleSlowMo.addEventListener("change", (e) => (config.slowMoFinale = e.target.checked));
      toggleAudio.addEventListener("change", (e) => {
        config.audioEnabled = e.target.checked;
        if (config.audioEnabled) initLiveAudio();
      });

      selectFormat.addEventListener("change", (e) => (config.format = e.target.value));
      selectQuality.addEventListener("change", (e) => (config.quality = e.target.value));

      /* =========================================================================
         13. BAŞLANGIÇ
         ========================================================================= */
      let pendingLeague = "uefa.champions"; // açılışta güncel Şampiyonlar Ligi kadrosu canlı yüklenir

      // Mobil alt çubuk
      mbPlay.addEventListener("click", () => btnPreviewToggle.click());
      mbReset.addEventListener("click", () => btnPreviewReset.click());
      mbGenerate.addEventListener("click", () => btnGenerateDownload.click());

      window.addEventListener("load", () => {
        Object.keys(THEMES).forEach((k) => getTrophyCanvas(THEMES[k].trophy));
        fillLeagueSelect();
        restoreTrophies();
        applyURLParamsOnLoad();
        setTheme(config.theme, false);
        if (pendingLeague) {
          leagueSelect.value = pendingLeague;
          applyEspnLeague(pendingLeague, "only").then(() => {
            if (new URLSearchParams(location.search).get("t")) setTheme(new URLSearchParams(location.search).get("t"), false);
          });
        }
        preloadClubLogos(true);
        rebuildWinnerDropdown();
        switchMode(config.mode);
        checkEncoderCapabilitiesUI();
        requestAnimationFrame(previewLoop);
      });
