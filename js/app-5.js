"use strict";
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
      btnNavClubs.addEventListener("click", () => {
        renderClubModalGrid();
        clubModal.classList.remove("hidden");
        clubModal.classList.add("flex");
      });
      btnCloseClubModal.addEventListener("click", () => {
        clubModal.classList.add("hidden");
        clubModal.classList.remove("flex");
      });

      presetBtns.forEach((btn) => {
        btn.addEventListener("click", () => applyLeaguePreset(btn.dataset.preset));
      });

      catTabs.forEach((btn) => {
        btn.addEventListener("click", () => {
          activeModalCategory = btn.dataset.cat;
          catTabs.forEach((b) => {
            const act = b.dataset.cat === activeModalCategory;
            b.className = act
              ? "cat-tab px-2.5 py-1 rounded-lg text-[11px] font-bold bg-sky-600 text-white cursor-pointer"
              : "cat-tab px-2.5 py-1 rounded-lg text-[11px] font-bold bg-slate-800 text-slate-300 hover:bg-slate-700 cursor-pointer";
          });
          renderClubModalGrid();
        });
      });

      localTeamSearch.addEventListener("input", (e) => {
        localSearchTerm = e.target.value;
        renderClubModalGrid();
      });

      btnSelectAllVisible.addEventListener("click", () => {
        const visible = getFilteredModalClubs();
        visible.forEach((c) => {
          c.enabled = true;
          loadClubLogo(c);
        });
        renderClubModalGrid();
      });

      btnClearAllClubs.addEventListener("click", () => {
        allClubs.forEach((c, idx) => (c.enabled = idx < 2));
        renderClubModalGrid();
        showToast("Sadece 2 takım bırakıldı (en az 2 takım gerekli).", "info");
      });

      btnRandom36.addEventListener("click", () => {
        const shuffled = [...allClubs].sort(() => Math.random() - 0.5);
        const picked = new Set(shuffled.slice(0, 36).map((c) => c.key));
        allClubs.forEach((c) => {
          c.enabled = picked.has(c.key);
          if (c.enabled) loadClubLogo(c);
        });
        renderClubModalGrid();
        showToast("Rastgele 36 takım seçildi!", "success");
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
        clubModal.classList.add("hidden");
        clubModal.classList.remove("flex");
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
      customTrophyInput.addEventListener("change", (e) => {
        const file = e.target.files && e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
          const img = new Image();
          img.onload = () => {
            customTrophyImg = img;
            btnResetTrophy.classList.remove("hidden");
            showToast("Özel kupa görseli uygulandı!", "success");
          };
          img.src = ev.target.result;
        };
        reader.readAsDataURL(file);
        customTrophyInput.value = "";
      });
      btnResetTrophy.addEventListener("click", () => {
        customTrophyImg = null;
        btnResetTrophy.classList.add("hidden");
        showToast("Varsayılan kupaya dönüldü.", "info");
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
      sliderLogoSize.addEventListener("input", (e) => {
        config.logoRadius = parseInt(e.target.value, 10);
        valLogoSize.textContent = `${config.logoRadius} px`;
        if (previewState) previewState.badges.forEach((b) => (b.r = config.logoRadius));
      });

      selectWinner.addEventListener("change", (e) => {
        config.selectedWinnerKey = e.target.value;
        if (previewState) previewState.selectedWinnerKey = config.selectedWinnerKey;
      });

      selectTheme.addEventListener("change", (e) => {
        config.theme = e.target.value;
        const th = THEMES[config.theme];
        if (th) {
          config.subTitle = th.subDefault;
          inputSubTitle.value = th.subDefault;
        }
      });

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
      window.addEventListener("load", () => {
        silverTrophyCanvas = buildTrophyCanvas("silver");
        goldTrophyCanvas = buildTrophyCanvas("gold");
        applyURLParamsOnLoad();
        preloadClubLogos(true);
        rebuildWinnerDropdown();
        switchMode(config.mode);
        checkEncoderCapabilitiesUI();
        requestAnimationFrame(previewLoop);
      });
