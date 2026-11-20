"use strict";
      function resetIfIdle() {
        if (config.mode === "match" && !isRendering) {
          previewRunning = false;
          updatePreviewButtonsUI();
          resetPreview();
        }
      }

      function addGoal(side) {
        const m = config.match;
        const last = m.goals.length ? parseMatchMinute(m.goals[m.goals.length - 1].label) : 0;
        const min = Math.min(90, Math.floor(last) + 12);
        const club = matchClubByKey(side === "home" ? m.homeKey : m.awayKey);
        m.goals.push({ side, label: `${min}'`, name: club ? club.short : "GOL" });
        m.goals.sort((x, y) => parseMatchMinute(x.label) - parseMatchMinute(y.label));
        renderGoalList();
        resetIfIdle();
      }

      async function fetchMatches() {
        const slug = matchLeagueSel.value;
        const d = matchDateInp.value ? new Date(matchDateInp.value + "T12:00:00") : new Date();
        const key = ymd(d).replace(/-/g, "");
        matchFetchStatus.textContent = "Maçlar yükleniyor...";
        matchListEl.innerHTML = Array.from({ length: 3 }, () => `<div class="h-14 rounded-xl skeleton"></div>`).join("");
        try {
          const j = await fetchJson(`https://site.web.api.espn.com/apis/site/v2/sports/soccer/${slug}/scoreboard?dates=${key}`);
          const events = j.events || [];
          if (!events.length) {
            matchListEl.innerHTML = "";
            matchFetchStatus.textContent = "Bu tarihte maç yok. Başka bir gün ya da lig dene.";
            return;
          }
          matchFetchStatus.textContent = `${events.length} maç bulundu. Canlandırmak istediğine dokun.`;
          matchListEl.innerHTML = "";
          events.forEach((e) => {
            const comp = e.competitions[0];
            const H = comp.competitors.find((t) => t.homeAway === "home");
            const A = comp.competitors.find((t) => t.homeAway === "away");
            const done = comp.status && comp.status.type && comp.status.type.completed;
            const live = comp.status && comp.status.type && comp.status.type.state === "in";
            const mid = done || live ? `${H.score} - ${A.score}` : new Date(e.date).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });
            const btn = document.createElement("button");
            btn.type = "button";
            btn.className = "press grid grid-cols-[1fr_auto_1fr] items-center gap-2 px-3 py-2 rounded-xl bg-slate-900/90 border border-slate-800 hover:border-sky-500/60 text-left cursor-pointer";
            btn.innerHTML = `
              <span class="flex items-center gap-2 min-w-0"><img src="${H.team.logo}" alt="" class="w-7 h-7 object-contain shrink-0" /><span class="text-xs font-bold text-white truncate">${escapeHtml(H.team.displayName)}</span></span>
              <span class="text-sm font-black tabular-nums ${done ? "text-white" : live ? "text-emerald-300" : "text-slate-400"}">${mid}${live ? " •" : ""}</span>
              <span class="flex items-center gap-2 min-w-0 justify-end"><span class="text-xs font-bold text-white truncate text-right">${escapeHtml(A.team.displayName)}</span><img src="${A.team.logo}" alt="" class="w-7 h-7 object-contain shrink-0" /></span>`;
            btn.addEventListener("click", () => importMatch(e, slug, btn));
            matchListEl.appendChild(btn);
          });
        } catch (err) {
          console.error(err);
          matchListEl.innerHTML = "";
          matchFetchStatus.textContent = "Maçlar alınamadı. İnternet bağlantını kontrol et.";
        }
      }

      function importMatch(e, slug, btn) {
        const comp = e.competitions[0];
        const H = comp.competitors.find((t) => t.homeAway === "home");
        const A = comp.competitors.find((t) => t.homeAway === "away");
        const toTeam = (t) => ({
          id: t.team.id, displayName: t.team.displayName, abbreviation: t.team.abbreviation,
          color: t.team.color, alternateColor: t.team.alternateColor,
          logos: t.team.logo ? [{ href: t.team.logo, rel: ["default"] }] : [], isNational: false
        });
        const hc = upsertEspnTeam(toTeam(H), slug);
        const ac = upsertEspnTeam(toTeam(A), slug);
        if (H.team.abbreviation) hc.short = H.team.abbreviation;
        if (A.team.abbreviation) ac.short = A.team.abbreviation;
        loadClubLogo(hc); loadClubLogo(ac);

        const details = comp.details || [];
        const goals = details.filter((d) => d.scoringPlay).map((d) => ({
          side: String(d.team && d.team.id) === String(H.team.id) ? "home" : "away",
          label: (d.clock && d.clock.displayValue) || "1'",
          name: surname((d.athletesInvolved || [])[0]) || (String(d.team && d.team.id) === String(H.team.id) ? hc.short : ac.short),
          og: !!d.ownGoal, pen: !!d.penaltyKick
        }));
        const cards = details.filter((d) => /card/i.test((d.type && d.type.text) || "")).map((d) => ({
          side: String(d.team && d.team.id) === String(H.team.id) ? "home" : "away",
          label: (d.clock && d.clock.displayValue) || "1'",
          name: surname((d.athletesInvolved || [])[0]) || "",
          red: /red/i.test(d.type.text)
        })).filter((k) => k.name);

        const meta = LEAGUE_META[slug];
        const m = config.match;
        m.homeKey = hc.key;
        m.awayKey = ac.key;
        m.goals = goals;
        m.cards = cards;
        m.title = (meta ? meta.title : (matchLeagueSel.selectedOptions[0]?.textContent || "")).replace(/^UEFA\s+/, "").toUpperCase();
        const city = comp.venue && comp.venue.address && comp.venue.address.city;
        m.city = city ? `IN ${city.toUpperCase()}` : "";
        const stage = e.season && e.season.slug ? e.season.slug.replace(/-/g, " ").toUpperCase() : "";
        m.footer = [stage, enDate(new Date(e.date))].filter(Boolean).join(" · ");
        m.scripted = goals.length > 0;
        matchScriptedChk.checked = m.scripted;
        matchTitleInp.value = m.title;
        matchCityInp.value = m.city;
        matchFooterInp.value = m.footer;
        if (meta && meta.theme) setTheme(meta.theme, false);
        config.leagueSlug = slug;
        getLeagueLogo(slug);

        refreshMatchTeamSelects();
        renderGoalList();
        matchListEl.querySelectorAll("button").forEach((b) => b.classList.remove("ring-2", "ring-sky-500"));
        if (btn) btn.classList.add("ring-2", "ring-sky-500");
        const done = comp.status && comp.status.type && comp.status.type.completed;
        matchFetchStatus.textContent = done
          ? `${hc.name} ${H.score} - ${A.score} ${ac.name} yüklendi: ${goals.length} gol${cards.length ? `, ${cards.length} kart` : ""}.`
          : "Bu maç henüz oynanmadı; skor fizikle belirlenecek.";
        resetIfIdle();
      }

      function initMatchPanel() {
        matchLeagueSel.innerHTML = LEAGUE_CATALOG.map((g) => `<optgroup label="${g.group}">` + g.items.map(([slug, label]) => `<option value="${slug}">${label}</option>`).join("") + `</optgroup>`).join("");
        matchLeagueSel.value = "uefa.champions";
        const yest = new Date(); yest.setDate(yest.getDate() - 1);
        matchDateInp.value = ymd(yest);
        const m = config.match;
        if (!m.homeKey) {
          const gs = matchClubByKey("galatasaray"), fb = matchClubByKey("fenerbahce");
          m.homeKey = gs ? gs.key : null;
          m.awayKey = fb ? fb.key : null;
        }
        refreshMatchTeamSelects();
        renderGoalList();
        matchTitleInp.value = m.title;
        matchCityInp.value = m.city;
        if (!m.footer) m.footer = `LEAGUE PHASE · ${enDate(new Date())}`;
        matchFooterInp.value = m.footer;
      }

      btnMatchFetch.addEventListener("click", fetchMatches);
      matchLeagueSel.addEventListener("change", fetchMatches);
      matchDateInp.addEventListener("change", fetchMatches);
      document.querySelectorAll(".match-day").forEach((b) => b.addEventListener("click", () => {
        const d = new Date(); d.setDate(d.getDate() + parseInt(b.dataset.day, 10));
        matchDateInp.value = ymd(d);
        fetchMatches();
      }));
      matchHomeSel.addEventListener("change", () => {
        config.match.homeKey = matchHomeSel.value;
        if (config.match.awayKey === config.match.homeKey) refreshMatchTeamSelects();
        loadClubLogo(matchClubByKey(config.match.homeKey));
        resetIfIdle();
      });
      matchAwaySel.addEventListener("change", () => {
        config.match.awayKey = matchAwaySel.value;
        if (config.match.awayKey === config.match.homeKey) refreshMatchTeamSelects();
        loadClubLogo(matchClubByKey(config.match.awayKey));
        resetIfIdle();
      });
      matchTitleInp.addEventListener("input", (e) => (config.match.title = e.target.value));
      matchCityInp.addEventListener("input", (e) => (config.match.city = e.target.value));
      matchFooterInp.addEventListener("input", (e) => (config.match.footer = e.target.value));
      matchScriptedChk.addEventListener("change", (e) => { config.match.scripted = e.target.checked; resetIfIdle(); });
      matchCardsChk.addEventListener("change", (e) => { config.match.showCards = e.target.checked; resetIfIdle(); });
      document.getElementById("btnGoalAddHome").addEventListener("click", () => addGoal("home"));
      document.getElementById("btnGoalAddAway").addEventListener("click", () => addGoal("away"));
      sliderGoalWidth.addEventListener("input", (e) => { config.matchGoalWidth = parseInt(e.target.value, 10); valGoalWidth.textContent = `${config.matchGoalWidth}°`; });
      sliderGoalSpeed.addEventListener("input", (e) => { config.matchGoalSpeed = parseFloat(e.target.value); valGoalSpeed.textContent = `${config.matchGoalSpeed.toFixed(2)}x`; });

      let pendingLeague = "uefa.champions"; // açılışta güncel Şampiyonlar Ligi kadrosu canlı yüklenir

      // Mobil alt çubuk
      mbPlay.addEventListener("click", () => btnPreviewToggle.click());
      mbReset.addEventListener("click", () => btnPreviewReset.click());
      mbGenerate.addEventListener("click", () => btnGenerateDownload.click());

      window.addEventListener("load", () => {
        Object.keys(THEMES).forEach((k) => getTrophyCanvas(THEMES[k].trophy));
        fillLeagueSelect();
        initMatchPanel();
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
