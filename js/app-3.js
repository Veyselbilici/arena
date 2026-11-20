"use strict";
      const trophyCanvases = {};
      function getTrophyCanvas(variant) {
        if (!trophyCanvases[variant]) trophyCanvases[variant] = buildTrophyCanvas(variant);
        return trophyCanvases[variant];
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
          const prof = (THEMES[ev.theme] || THEMES.ucl).sound;
          const k = Math.pow(2, (prof.key || 0) / 12);
          const mode = ev.mode || "ring";

          const tone = (type, f0, f1, gain, dur, start = t, filterHz = 0) => {
            const osc = ac.createOscillator();
            const g = ac.createGain();
            osc.type = type;
            osc.frequency.setValueAtTime(f0, start);
            if (f1) osc.frequency.exponentialRampToValueAtTime(Math.max(20, f1), start + dur);
            g.gain.setValueAtTime(0.0001, start);
            g.gain.exponentialRampToValueAtTime(gain, start + Math.min(0.012, dur * 0.2));
            g.gain.exponentialRampToValueAtTime(0.0005, start + dur);
            let node = osc;
            if (filterHz) {
              const fl = ac.createBiquadFilter();
              fl.type = "lowpass";
              fl.frequency.setValueAtTime(filterHz, start);
              osc.connect(fl);
              node = fl;
            }
            node.connect(g);
            g.connect(dest);
            osc.start(start);
            osc.stop(start + dur + 0.02);
          };
          const noise = (dur, gain, type, f0, f1, start = t, q = 0.8) => {
            const len = Math.max(1, Math.floor(ac.sampleRate * dur));
            const buf = ac.createBuffer(1, len, ac.sampleRate);
            const d = buf.getChannelData(0);
            for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
            const src = ac.createBufferSource();
            src.buffer = buf;
            const fl = ac.createBiquadFilter();
            fl.type = type;
            fl.Q.value = q;
            fl.frequency.setValueAtTime(f0, start);
            if (f1) fl.frequency.exponentialRampToValueAtTime(f1, start + dur);
            const g = ac.createGain();
            g.gain.setValueAtTime(0.0001, start);
            g.gain.exponentialRampToValueAtTime(gain, start + Math.min(0.05, dur * 0.25));
            g.gain.exponentialRampToValueAtTime(0.0005, start + dur);
            src.connect(fl); fl.connect(g); g.connect(dest);
            src.start(start);
            src.stop(start + dur + 0.02);
          };
          const crowd = (dur, gain, start = t) => {
            noise(dur, gain, "bandpass", 700, 1100, start, 0.6);
            noise(dur * 0.9, gain * 0.6, "bandpass", 1800, 2400, start + 0.05, 1.2);
          };
          const kick = (start) => tone("sine", 150, 42, 0.32, 0.28, start);
          const snare = (start) => { noise(0.16, 0.16, "highpass", 1800, 0, start); tone("triangle", 220, 150, 0.06, 0.1, start); };

          if (ev.type === "bounce") {
            const kx = Math.min(1, ev.intensity || 0.5);
            if (mode === "bomb") {
              tone("triangle", (150 + kx * 80) * k, 70 * k, 0.05 + kx * 0.06, 0.09);
              noise(0.03, 0.03 + kx * 0.03, "bandpass", 1200, 0, t, 2);
            } else if (mode === "blade") {
              tone("square", (880 + kx * 300) * k, 640 * k, 0.025 + kx * 0.03, 0.045, t, 3200);
            } else if (mode === "laser") {
              tone("sawtooth", (420 + kx * 260) * k, 900 * k, 0.03 + kx * 0.035, 0.07, t, 2200);
            } else {
              const f = (ev.isWall ? 320 + kx * 280 : 210 + kx * 170) * k;
              tone(ev.isWall ? prof.wave === "square" ? "triangle" : "sine" : "triangle", f, f * 0.48, Math.min(0.10, 0.02 + kx * 0.07), 0.055);
            }
          } else if (ev.type === "clang") {
            tone("triangle", 1180 * k, 960 * k, 0.09, 0.12);
            tone("sine", 1740 * k, 1420 * k, 0.06, 0.12);
            noise(0.05, 0.05, "highpass", 4000, 0);
          } else if (ev.type === "slash") {
            tone("sawtooth", 640 * k, 140 * k, 0.13, 0.15, t, 2600);
            noise(0.12, 0.08, "bandpass", 3000, 900, t, 1.4);
          } else if (ev.type === "tick") {
            const urg = Math.min(1, Math.max(0, ev.urgency || 0));
            tone("square", (560 + urg * 740) * k, 0, 0.06 + urg * 0.05, 0.06);
          } else if (ev.type === "explode") {
            tone("sine", 145, 28, 0.34, 0.5);
            noise(0.45, 0.26, "lowpass", 1100, 140);
            crowd(0.9, 0.06 * prof.crowd, t + 0.12);
          } else if (ev.type === "zap") {
            tone("sawtooth", 980 * k, 180 * k, 0.15, 0.19, t, 3000);
            tone("square", 1960 * k, 360 * k, 0.04, 0.12);
          } else if (ev.type === "elim") {
            if (mode === "ring") {
              noise(0.35, 0.10, "bandpass", 2400, 300, t, 1.1); // aşağı doğru "vuuş"
              tone("sine", 165 * k, 42 * k, 0.2, 0.26);
            } else {
              tone("sine", 165 * k, 42 * k, 0.22, 0.26);
            }
            if (prof.crowd > 0.7) crowd(0.5, 0.035 * prof.crowd, t + 0.05);
          } else if (ev.type === "final2") {
            prof.fanfare.slice(0, 3).forEach((f, i) => tone(prof.wave, f, 0, 0.12, 0.75, t + i * 0.08, 2600));
            crowd(1.2, 0.05 * prof.crowd, t);
            if (prof.drums) [0, 0.24, 0.48].forEach((d) => kick(t + d));
          } else if (ev.type === "whistle") {
            // Hakem düdüğü: iki yakın frekans + titreşim
            const blasts = ev.triple ? [0, 0.42, 0.84] : [0];
            blasts.forEach((off, bi) => {
              const dur = ev.short ? 0.18 : ev.long && (bi === blasts.length - 1 || !ev.triple) ? 0.7 : 0.3;
              [2950, 3120].forEach((f) => {
                const osc = ac.createOscillator();
                const lfo = ac.createOscillator();
                const lfoG = ac.createGain();
                const g = ac.createGain();
                osc.type = "sine";
                osc.frequency.setValueAtTime(f, t + off);
                lfo.frequency.setValueAtTime(34, t + off);
                lfoG.gain.setValueAtTime(70, t + off);
                lfo.connect(lfoG); lfoG.connect(osc.frequency);
                g.gain.setValueAtTime(0.0001, t + off);
                g.gain.exponentialRampToValueAtTime(0.07, t + off + 0.02);
                g.gain.setValueAtTime(0.07, t + off + dur - 0.05);
                g.gain.exponentialRampToValueAtTime(0.0005, t + off + dur);
                osc.connect(g); g.connect(dest);
                osc.start(t + off); lfo.start(t + off);
                osc.stop(t + off + dur + 0.02); lfo.stop(t + off + dur + 0.02);
              });
            });
          } else if (ev.type === "goal") {
            crowd(3.0, 0.16 + 0.06 * prof.crowd, t);
            noise(0.5, 0.12, "lowpass", 600, 120, t);
            tone("sine", 120, 45, 0.3, 0.35, t);
            prof.fanfare.slice(0, 4).forEach((f, i) => tone(prof.brass, f, 0, 0.09, 0.9, t + 0.12 + i * 0.07, 2400));
            if (prof.drums) [0.1, 0.32, 0.54, 0.76].forEach((d, i) => (i % 2 ? snare(t + d) : kick(t + d)));
          } else if (ev.type === "victory") {
            prof.fanfare.forEach((f, i) => {
              const st = t + i * 0.09;
              tone(prof.brass, f, 0, i < 3 ? 0.08 : 0.13, 1.6, st, 2200);
              tone("sine", f * 2, 0, 0.025, 1.2, st);
            });
            const last = prof.fanfare[prof.fanfare.length - 1];
            [last * 0.5, last * 0.63, last * 0.75].forEach((f) => tone(prof.brass, f, 0, 0.07, 2.4, t + 0.7, 1800));
            crowd(3.2, 0.11 * prof.crowd, t + 0.1);
            if (prof.drums) {
              for (let b = 0; b < 8; b++) {
                const st = t + 0.2 + b * 0.22;
                if (b % 2 === 0) kick(st); else snare(st);
              }
            }
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
        scheduleSoundEvent(liveAudioCtx, liveMasterGain, { ...ev, theme: config.theme, mode: config.mode }, now);
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

      // Takım sayısına göre logoların halkaya sığacağı en büyük boyut (alan doluluğu ~%50)
      function computeBadgeRadius(baseR, count) {
        const fit = Math.floor((0.7 * (BASE_RING_R - 40)) / Math.sqrt(Math.max(1, count)));
        return Math.max(16, Math.min(baseR, fit));
      }

      /* =========================================================================
         MAÇ MODU — Gerçek maç canlandırma (skorbord, dönen kale, gol animasyonu)
         ========================================================================= */
      const MCX = BASE_W / 2;
      const MCY = 1045;
      const MR = 400;
      const EN_MONTHS = ["JANUARY", "FEBRUARY", "MARCH", "APRIL", "MAY", "JUNE", "JULY", "AUGUST", "SEPTEMBER", "OCTOBER", "NOVEMBER", "DECEMBER"];

      function parseMatchMinute(label) {
        const m = String(label || "").match(/(\d+)(?:'?\s*\+\s*(\d+))?/);
        if (!m) return 0;
        const base = parseInt(m[1], 10);
        const extra = m[2] ? parseInt(m[2], 10) : 0;
        return base + Math.min(0.9, extra * 0.1);
      }

      function angDiff(a, b) {
        let d = (a - b) % (Math.PI * 2);
        if (d > Math.PI) d -= Math.PI * 2;
        if (d < -Math.PI) d += Math.PI * 2;
        return Math.abs(d);
      }

      function matchClubByKey(key) {
        return allClubs.find((c) => c.key === key) || null;
      }

      function createMatchState(cfg) {
        const m = cfg.match;
        const enabled = allClubs.filter((c) => c.enabled);
        let home = matchClubByKey(m.homeKey) || enabled[0] || allClubs[0];
        let away = matchClubByKey(m.awayKey) || enabled.find((c) => c !== home) || allClubs.find((c) => c !== home);
        loadClubLogo(home);
        loadClubLogo(away);
        const r = Math.max(70, Math.min(112, Math.round(cfg.logoRadius * 2)));
        const mk = (club, side) => ({
          club, side, sprite: club.sprite, r,
          x: MCX + (side === "home" ? -150 : 150), y: MCY,
          vx: 0, vy: 0, angle: 0, vAngle: (Math.random() - 0.5) * 2,
          eliminated: false, removed: false, trail: []
        });
        const badges = [mk(home, "home"), mk(away, "away")];

        const scripted = m.scripted && m.goals.length > 0;
        const goals = scripted
          ? m.goals.map((g) => ({ ...g, sort: parseMatchMinute(g.label || g.minute) })).sort((a, b) => a.sort - b.sort)
          : [];
        const cards = (m.showCards ? m.cards || [] : []).map((k) => ({ ...k, sort: parseMatchMinute(k.label) })).sort((a, b) => a.sort - b.sort);

        const target = cfg.targetDuration || 60;
        const nGoals = scripted ? goals.length : 3;
        const playSec = Math.max(16, target - 5 - 1.8 - 1.2 - nGoals * 2.6);

        const state = {
          mode: "match",
          simTime: 0,
          minute: 0,
          minPerSec: 90 / playSec,
          phase: "intro",
          phaseTimer: 1.2,
          scripted,
          goals,
          goalIdx: 0,
          cards,
          cardIdx: 0,
          cardToast: null,
          score: { home: 0, away: 0 },
          scorers: { home: [], away: [] },
          scorePop: 0,
          goalInfo: null,
          goalAnim: 0,
          goalAngle: -0.55,
          goalDir: 1,
          goalFlipTimer: 6 + Math.random() * 4,
          netPulse: 0,
          halfDone: false,
          badges,
          totalClubs: 2,
          eliminatedList: [],
          ringRadius: MR,
          winner: null,
          winnerTime: 0,
          draw: false,
          confettiWave2Fired: false,
          slowMoActive: false,
          bombs: [],
          tempo: 1,
          shakeIntensity: 0,
          bgParticles: createBgParticles(),
          sparks: [],
          shockwaves: [],
          confetti: []
        };
        return state;
      }

      function matchKickoff(state) {
        const [h, a] = state.badges;
        const r = h.r;
        h.x = MCX - 150; h.y = MCY + (Math.random() - 0.5) * 60;
        a.x = MCX + 150; a.y = MCY + (Math.random() - 0.5) * 60;
        for (const b of state.badges) {
          const dir = Math.random() * Math.PI * 2;
          b.vx = Math.cos(dir) * 640;
          b.vy = Math.sin(dir) * 640;
          b.r = r;
          b.trail = [];
        }
      }

      function teamConfetti(state, x, y, colors, count = 90) {
        for (let i = 0; i < count; i++) {
          const ang = Math.random() * Math.PI * 2;
          const spd = 300 + Math.random() * 760;
          state.confetti.push({
            x, y,
            vx: Math.cos(ang) * spd,
            vy: Math.sin(ang) * spd - 300,
            w: 10 + Math.random() * 14, h: 6 + Math.random() * 8,
            color: colors[i % colors.length],
            rot: Math.random() * Math.PI * 2, vRot: (Math.random() - 0.5) * 14
          });
        }
      }

      function scoreMatchGoal(state, side, cfg, emitAudio, ev) {
        const team = state.badges.find((b) => b.side === side);
        state.score[side] += 1;
        const label = ev ? ev.label : `${Math.max(1, Math.ceil(state.minute))}'`;
        const name = ev ? ev.name : team.club.short;
        state.scorers[side].push({ name, label, og: ev && ev.og, pen: ev && ev.pen });
        state.goalInfo = { side, name, label, club: team.club, color: team.club.c1 || "#dc2626" };
        state.phase = "goal";
        state.phaseTimer = 2.5;
        state.goalAnim = 0;
        state.scorePop = 1;
        state.netPulse = 1;
        state.shakeIntensity = 16;
        if (ev) state.goalIdx += 1;
        const gx = MCX + Math.cos(state.goalAngle) * (MR + 40);
        const gy = MCY + Math.sin(state.goalAngle) * (MR + 40);
        teamConfetti(state, gx, gy, [team.club.c1 || "#ffffff", team.club.c2 || "#facc15", "#ffffff"], 110);
        spawnShockwave(state, gx, gy, team.club.c1 || "#ffffff", 300);
        emitAudio({ type: "goal" });
      }

      function attackerSide0(state) {
        const g = state.scripted ? state.goals[state.goalIdx] : null;
        return g && state.minute >= g.sort - 3.5 ? g.side : null;
      }

      function stepMatchState(state, rawDt, cfg, emitAudio) {
        state.simTime += rawDt;
        for (const s of state.bgParticles) {
          s.x += s.vx * rawDt; s.y += s.vy * rawDt;
          if (s.y < -20) { s.y = BASE_H + 20; s.x = Math.random() * BASE_W; }
          if (s.x < -20) s.x = BASE_W + 20;
          if (s.x > BASE_W + 20) s.x = -20;
        }
        for (let i = state.sparks.length - 1; i >= 0; i--) {
          const p = state.sparks[i];
          p.life -= rawDt;
          if (p.life <= 0) { state.sparks.splice(i, 1); continue; }
          p.vy += 380 * rawDt; p.x += p.vx * rawDt; p.y += p.vy * rawDt;
        }
        for (let i = state.shockwaves.length - 1; i >= 0; i--) {
          const sw = state.shockwaves[i];
          sw.life -= rawDt;
          if (sw.life <= 0) { state.shockwaves.splice(i, 1); continue; }
          sw.r = 24 + (1 - sw.life / sw.maxLife) * (sw.maxR - 24);
        }
        for (let i = state.confetti.length - 1; i >= 0; i--) {
          const p = state.confetti[i];
          p.vy += 620 * rawDt; p.vx *= 0.99;
          p.x += p.vx * rawDt; p.y += p.vy * rawDt; p.rot += p.vRot * rawDt;
          if (p.y > BASE_H + 60) state.confetti.splice(i, 1);
        }
        if (state.shakeIntensity > 0) state.shakeIntensity = Math.max(0, state.shakeIntensity - rawDt * 34);
        if (state.scorePop > 0) state.scorePop = Math.max(0, state.scorePop - rawDt * 1.6);
        if (state.netPulse > 0) state.netPulse = Math.max(0, state.netPulse - rawDt * 1.4);
        if (state.cardToast) { state.cardToast.t -= rawDt; if (state.cardToast.t <= 0) state.cardToast = null; }

        // Final düdüğü sonrası kutlama
        if (state.winner) {
          state.winnerTime += rawDt;
          for (const b of state.badges) {
            const tx = state.draw ? MCX + (b.side === "home" ? -120 : 120) : (b === state.winner ? MCX : MCX + (b.side === "home" ? -260 : 260));
            const ty = state.draw ? MCY + 40 : (b === state.winner ? MCY + 60 : MCY + 220);
            b.x += (tx - b.x) * Math.min(1, rawDt * 4);
            b.y += (ty - b.y) * Math.min(1, rawDt * 4);
            b.angle *= 0.9;
          }
          if (!state.draw && !state.confettiWave2Fired && state.winnerTime >= 1.2) {
            state.confettiWave2Fired = true;
            spawnConfettiWave(state, 120);
          }
          return;
        }

        // Faz zamanlayıcıları
        if (state.phase !== "play") {
          state.phaseTimer -= rawDt;
          if (state.phase === "goal") {
            state.goalAnim += rawDt;
            const sc = state.badges.find((b) => b.side === state.goalInfo.side);
            sc.vx *= 0.9; sc.vy *= 0.9;
            sc.x += sc.vx * rawDt; sc.y += sc.vy * rawDt;
          }
          if (state.phaseTimer <= 0) {
            if (state.phase === "fulltime") return;
            matchKickoff(state);
            state.phase = "play";
            emitAudio({ type: "whistle", long: false });
          }
          return;
        }

        const dt = rawDt * cfg.simSpeed;
        const pending = state.scripted ? state.goals[state.goalIdx] : null;

        // Dakika ilerlemesi: sıradaki golün dakikasında saat bekler
        if (pending && state.minute >= pending.sort) {
          state.minute = pending.sort;
        } else {
          // Uyarlanır saat: gol beklemelerinde kaybedilen süreyi sonra telafi eder
          const target = cfg.targetDuration || 60;
          const left = state.goals.length - state.goalIdx;
          const budget = target - 5 - state.simTime - left * 2.6 - (state.halfDone ? 0 : 1.8);
          const rate = Math.max(state.minPerSec * 0.7, Math.min(state.minPerSec * 3, (90 - state.minute) / Math.max(3, budget)));
          state.minute += rate * rawDt;
          if (pending && state.minute > pending.sort) state.minute = pending.sort;
        }

        // Devre arası
        if (!state.halfDone && state.minute >= 45 && !(pending && pending.sort < 46)) {
          state.halfDone = true;
          state.minute = 45;
          state.phase = "halftime";
          state.phaseTimer = 1.8;
          emitAudio({ type: "whistle", long: true });
          return;
        }
        // Maç sonu
        if (state.minute >= 90 && !(pending && pending.sort < 91)) {
          state.minute = 90;
          state.phase = "fulltime";
          const [h, a] = state.badges;
          if (state.score.home === state.score.away) { state.draw = true; state.winner = h; }
          else state.winner = state.score.home > state.score.away ? h : a;
          emitAudio({ type: "whistle", long: true, triple: true });
          if (!state.draw) { emitAudio({ type: "victory" }); spawnConfettiWave(state, 140); }
          return;
        }

        // Kartlar
        while (state.cardIdx < state.cards.length && state.cards[state.cardIdx].sort <= state.minute) {
          const k = state.cards[state.cardIdx++];
          state.cardToast = { ...k, t: 2.0 };
          emitAudio({ type: "whistle", long: false, short: true });
        }

        // Dönen kale
        state.goalFlipTimer -= rawDt;
        if (state.goalFlipTimer <= 0) { state.goalDir *= -1; state.goalFlipTimer = 9 + Math.random() * 6; }
        state.goalAngle += state.goalDir * cfg.matchGoalSpeed * 0.9 * dt * (attackerSide0(state) ? 0.6 : 1);

        const gapHalf = ((cfg.matchGoalWidth || 46) * Math.PI) / 360;
        const attackerSide = pending && state.minute >= pending.sort - 3.5 ? pending.side : null;
        const attacker = attackerSide ? state.badges.find((b) => b.side === attackerSide) : null;

        const sub = 5;
        const sdt = dt / sub;
        for (let s = 0; s < sub; s++) {
          for (const b of state.badges) {
            if (b === attacker) {
              const tx = MCX + Math.cos(state.goalAngle) * (MR + 60);
              const ty = MCY + Math.sin(state.goalAngle) * (MR + 60);
              const dx = tx - b.x, dy = ty - b.y;
              const d = Math.hypot(dx, dy) || 1;
              const urgency = state.minute >= pending.sort ? 2.2 : 1;
              b.vx += (dx / d) * 3400 * urgency * sdt;
              b.vy += (dy / d) * 3400 * urgency * sdt;
              const sp = Math.hypot(b.vx, b.vy);
              const maxSp = 1450;
              if (sp > maxSp) { b.vx *= maxSp / sp; b.vy *= maxSp / sp; }
            } else {
              const sp = Math.hypot(b.vx, b.vy) || 1;
              const want = Math.max(520, Math.min(860, sp));
              b.vx *= want / sp; b.vy *= want / sp;
            }
            b.x += b.vx * sdt;
            b.y += b.vy * sdt;
            b.angle += b.vAngle * sdt * (cfg.spinSpeed ?? 0.3);

            const dx = b.x - MCX, dy = b.y - MCY;
            const d = Math.hypot(dx, dy) || 1;
            const ang = Math.atan2(dy, dx);
            const mouthOk = angDiff(ang, state.goalAngle) < gapHalf - (b.r / MR) * 0.55;
            const canScore = state.scripted ? b === attacker : true;
            if (mouthOk && canScore) {
              if (d > MR + b.r * 0.15) {
                scoreMatchGoal(state, b.side, cfg, emitAudio, state.scripted ? pending : null);
                return;
              }
              continue;
            }
            if (d + b.r > MR) {
              const nx = dx / d, ny = dy / d;
              const vn = b.vx * nx + b.vy * ny;
              if (vn > 0) {
                b.vx -= 2 * vn * nx; b.vy -= 2 * vn * ny;
                b.vAngle += (Math.random() - 0.5) * 1.5;
                emitAudio({ type: "bounce", intensity: Math.min(1, vn / 900), isWall: true });
              }
              b.x = MCX + nx * (MR - b.r);
              b.y = MCY + ny * (MR - b.r);
            }
          }
          // İki takım çarpışması (hücum anında rakip yol açar)
          const [a, b] = state.badges;
          const dx = b.x - a.x, dy = b.y - a.y;
          const d = Math.hypot(dx, dy) || 1;
          const minD = a.r + b.r;
          if (d < minD && !attacker) {
            const nx = dx / d, ny = dy / d;
            const overlap = (minD - d) / 2;
            a.x -= nx * overlap; a.y -= ny * overlap;
            b.x += nx * overlap; b.y += ny * overlap;
            const rel = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
            if (rel < 0) {
              a.vx += rel * nx; a.vy += rel * ny;
              b.vx -= rel * nx; b.vy -= rel * ny;
              emitAudio({ type: "bounce", intensity: Math.min(1, -rel / 900), isWall: false });
              spawnSparks(state, a.x + nx * a.r, a.y + ny * a.r, "#ffffff", 6, 200);
            }
          }
        }
        for (const b of state.badges) {
          b.trail.push({ x: b.x, y: b.y });
          if (b.trail.length > 8) b.trail.shift();
        }
      }

      function fitText(c, text, maxW, font) {
        c.font = font;
        const w = c.measureText(text).width;
        return w > maxW ? maxW / w : 1;
      }

      function drawOutlinedText(c, text, x, y, fill, stroke, lw) {
        c.lineJoin = "round";
        c.strokeStyle = stroke;
        c.lineWidth = lw;
        c.strokeText(text, x, y);
        c.fillStyle = fill;
        c.fillText(text, x, y);
      }

      function renderMatchState(c, state, cfg, targetW = BASE_W, targetH = BASE_H) {
        const theme = THEMES[cfg.theme] || THEMES.ucl;
        const m = cfg.match;
        const [home, away] = state.badges;
        c.save();
        if (targetW !== BASE_W || targetH !== BASE_H) c.scale(targetW / BASE_W, targetH / BASE_H);
        if (state.shakeIntensity > 0.2) c.translate((Math.random() - 0.5) * state.shakeIntensity, (Math.random() - 0.5) * state.shakeIntensity);

        // Arka plan
        const bg = c.createRadialGradient(BASE_W * 0.5, BASE_H * 0.4, 60, BASE_W * 0.5, BASE_H * 0.5, BASE_H * 0.8);
        bg.addColorStop(0, theme.bg0); bg.addColorStop(0.36, theme.bg1); bg.addColorStop(0.76, theme.bg2); bg.addColorStop(1, theme.bg3);
        c.fillStyle = bg;
        c.fillRect(-25, -25, BASE_W + 50, BASE_H + 50);
        const ray = c.createLinearGradient(0, 300, 0, 1300);
        ray.addColorStop(0, "rgba(255,255,255,0.10)");
        ray.addColorStop(1, "rgba(255,255,255,0)");
        c.fillStyle = ray;
        c.beginPath(); c.ellipse(MCX, 560, 520, 260, 0, 0, Math.PI * 2); c.fill();
        for (const s of state.bgParticles) {
          const tw = 0.5 + 0.5 * Math.sin(state.simTime * 2.4 + s.phase);
          c.fillStyle = `rgba(219, 234, 254, ${s.alpha * tw * 0.7})`;
          c.beginPath(); c.arc(s.x, s.y, s.r, 0, Math.PI * 2); c.fill();
        }

        // Başlık: lig logosu + turnuva + şehir
        c.textAlign = "center";
        c.textBaseline = "middle";
        const lg = cfg.showLeagueLogo ? getLeagueLogo(cfg.leagueSlug || theme.leagueSlug) : null;
        if (lg) {
          const box = 74, sc = Math.min(box / lg.naturalWidth, box / lg.naturalHeight);
          c.drawImage(lg, MCX - (lg.naturalWidth * sc) / 2, 92 - (lg.naturalHeight * sc) / 2, lg.naturalWidth * sc, lg.naturalHeight * sc);
        }
        const title = (m.title || "CHAMPIONS LEAGUE").toUpperCase();
        const tFont = "900 72px 'Montserrat', sans-serif";
        const ts = fitText(c, title, 980, tFont);
        c.save();
        c.translate(MCX, 178); c.scale(ts, ts);
        const tg = c.createLinearGradient(-400, 0, 400, 0);
        tg.addColorStop(0, "#7dd3fc"); tg.addColorStop(0.5, "#e0f2fe"); tg.addColorStop(1, "#38bdf8");
        c.shadowColor = "rgba(0,0,0,0.55)"; c.shadowBlur = 16;
        c.fillStyle = theme.trophy === "ucl" ? tg : theme.subColor;
        c.fillText(title, 0, 0);
        c.restore();
        if (m.city) {
          c.font = "900 46px 'Montserrat', sans-serif";
          c.fillStyle = "#ffffff";
          c.shadowColor = "rgba(0,0,0,0.6)"; c.shadowBlur = 10;
          c.fillText(m.city.toUpperCase(), MCX, 242, 900);
          c.shadowBlur = 0;
        }

        // Skorbord
        const by = 300, bh = 100;
        c.save();
        c.fillStyle = "rgba(6, 10, 28, 0.72)";
        c.beginPath(); c.roundRect(40, by, BASE_W - 80, bh, 18); c.fill();
        const hg = c.createLinearGradient(40, 0, 420, 0);
        hg.addColorStop(0, (home.club.c1 || "#1e3a8a") + "66"); hg.addColorStop(1, "rgba(0,0,0,0)");
        c.fillStyle = hg; c.beginPath(); c.roundRect(40, by, 400, bh, 18); c.fill();
        const ag = c.createLinearGradient(BASE_W - 420, 0, BASE_W - 40, 0);
        ag.addColorStop(0, "rgba(0,0,0,0)"); ag.addColorStop(1, (away.club.c1 || "#7f1d1d") + "66");
        c.fillStyle = ag; c.beginPath(); c.roundRect(BASE_W - 440, by, 400, bh, 18); c.fill();
        c.fillStyle = "#dc2626";
        c.fillRect(40, by + bh - 6, BASE_W - 80, 6);
        c.restore();

        const logoR = 40;
        c.save(); c.shadowColor = "rgba(0,0,0,0.6)"; c.shadowBlur = 10;
        c.drawImage(home.sprite, 78, by + bh / 2 - logoR - 3, logoR * 2, logoR * 2);
        c.drawImage(away.sprite, BASE_W - 78 - logoR * 2, by + bh / 2 - logoR - 3, logoR * 2, logoR * 2);
        c.restore();
        c.font = "900 58px 'Montserrat', sans-serif";
        c.fillStyle = "#ffffff";
        c.textAlign = "left"; c.fillText(home.club.short.slice(0, 4), 180, by + bh / 2 - 2, 190);
        c.textAlign = "right"; c.fillText(away.club.short.slice(0, 4), BASE_W - 180, by + bh / 2 - 2, 190);

        // Skor kutusu
        const pop = 1 + state.scorePop * 0.18;
        c.save();
        c.translate(MCX, by + bh / 2 - 6);
        c.scale(pop, pop);
        const sbg = c.createLinearGradient(0, -62, 0, 62);
        sbg.addColorStop(0, "#ef233c"); sbg.addColorStop(1, "#b91c1c");
        c.fillStyle = sbg;
        c.shadowColor = "rgba(220, 38, 38, 0.6)"; c.shadowBlur = 24;
        c.beginPath(); c.roundRect(-128, -62, 256, 124, 14); c.fill();
        c.shadowBlur = 0;
        c.textAlign = "center";
        c.font = "900 92px 'Montserrat', sans-serif";
        c.fillStyle = "#ffffff";
        c.fillText(`${state.score.home} - ${state.score.away}`, 0, 6);
        c.restore();

        // Dakika
        const pending = state.scripted ? state.goals[state.goalIdx] : null;
        let minLabel = `${Math.max(0, Math.floor(state.minute))}'`;
        if (pending && state.minute >= pending.sort - 0.001 && pending.sort % 1 > 0) minLabel = pending.label;
        if (state.phase === "intro") minLabel = "0'";
        if (state.phase === "halftime") minLabel = "HT";
        if (state.winner) minLabel = "FT";
        c.save();
        c.fillStyle = "#16224a";
        c.beginPath(); c.roundRect(MCX - 74, by + bh + 14, 148, 58, 12); c.fill();
        c.font = "900 40px 'Montserrat', sans-serif";
        c.fillStyle = state.phase === "play" ? "#ffffff" : "#facc15";
        c.textAlign = "center";
        c.fillText(minLabel, MCX, by + bh + 45);
        c.restore();

        // Golcüler
        c.save();
        c.font = "800 31px 'Montserrat', sans-serif";
        c.fillStyle = "#ffffff";
        c.shadowColor = "rgba(0,0,0,0.6)"; c.shadowBlur = 8;
        const lineH = 40;
        const listH = state.scorers.home.slice(-4), listA = state.scorers.away.slice(-4);
        c.textAlign = "right";
        listH.forEach((g, i) => c.fillText(`${g.name}${g.og ? " (OG)" : g.pen ? " (P)" : ""} ${g.label}`, MCX - 92, by + bh + 34 + i * lineH, 400));
        c.textAlign = "left";
        listA.forEach((g, i) => c.fillText(`${g.name}${g.og ? " (OG)" : g.pen ? " (P)" : ""} ${g.label}`, MCX + 92, by + bh + 34 + i * lineH, 400));
        c.restore();

        // Saha
        const gapHalf = ((cfg.matchGoalWidth || 46) * Math.PI) / 360;
        c.save();
        c.shadowColor = "rgba(0,0,0,0.55)"; c.shadowBlur = 40;
        c.beginPath(); c.arc(MCX, MCY, MR + 8, 0, Math.PI * 2); c.fillStyle = "#14532d"; c.fill();
        c.restore();
        c.save();
        c.beginPath(); c.arc(MCX, MCY, MR, 0, Math.PI * 2); c.clip();
        // Saha kaleyle birlikte döner (orta çizgi kaleye dik kalır)
        c.translate(MCX, MCY); c.rotate(state.goalAngle + Math.PI / 2); c.translate(-MCX, -MCY);
        const stripes = 12, sh = (MR * 2) / stripes;
        for (let i = 0; i < stripes; i++) {
          c.fillStyle = i % 2 === 0 ? "#2f9e44" : "#37b24d";
          c.fillRect(MCX - MR - 20, MCY - MR + i * sh, MR * 2 + 40, sh + 1);
        }
        const vg = c.createRadialGradient(MCX, MCY - 120, 60, MCX, MCY, MR);
        vg.addColorStop(0, "rgba(255,255,255,0.10)"); vg.addColorStop(1, "rgba(0,0,0,0.28)");
        c.fillStyle = vg; c.fillRect(MCX - MR, MCY - MR, MR * 2, MR * 2);
        c.strokeStyle = "rgba(255,255,255,0.75)";
        c.lineWidth = 5;
        c.beginPath(); c.moveTo(MCX - MR, MCY); c.lineTo(MCX + MR, MCY); c.stroke();
        c.beginPath(); c.arc(MCX, MCY, 96, 0, Math.PI * 2); c.stroke();
        // Kale önündeki ceza sahası ve karşı taraftaki ceza sahası
        c.fillStyle = "rgba(255,255,255,0.85)";
        for (const sgn of [1, -1]) {
          const yEdge = MCY + sgn * MR;
          c.strokeRect(MCX - 150, sgn > 0 ? yEdge - 120 : yEdge, 300, 120);
          c.strokeRect(MCX - 70, sgn > 0 ? yEdge - 50 : yEdge, 140, 50);
          c.beginPath(); c.arc(MCX, yEdge - sgn * 85, 5, 0, Math.PI * 2); c.fill();
        }
        c.fillStyle = "rgba(255,255,255,0.85)";
        c.beginPath(); c.arc(MCX, MCY, 8, 0, Math.PI * 2); c.fill();
        c.restore();

        // Kale ağı (halkanın dışında, dönen)
        const ga = state.goalAngle;
        c.save();
        c.translate(MCX, MCY);
        c.rotate(ga);
        const depth = 118 + state.netPulse * 26;
        const p1 = { x: Math.cos(-gapHalf) * MR, y: Math.sin(-gapHalf) * MR };
        const p2 = { x: Math.cos(gapHalf) * MR, y: Math.sin(gapHalf) * MR };
        const back1 = { x: p1.x + depth, y: p1.y - 26 };
        const back2 = { x: p2.x + depth, y: p2.y + 26 };
        c.beginPath();
        c.moveTo(p1.x, p1.y); c.lineTo(back1.x, back1.y); c.lineTo(back2.x, back2.y); c.lineTo(p2.x, p2.y);
        c.arc(0, 0, MR, gapHalf, -gapHalf, true);
        c.closePath();
        c.fillStyle = "rgba(15, 23, 42, 0.72)";
        c.fill();
        c.save();
        c.clip();
        c.strokeStyle = "rgba(255,255,255,0.62)";
        c.lineWidth = 2.5;
        const wob = state.netPulse * 8;
        for (let x = MR - 60; x < MR + depth + 30; x += 22) {
          c.beginPath(); c.moveTo(x + Math.sin(x * 0.3 + state.simTime * 20) * wob, -400); c.lineTo(x, 400); c.stroke();
        }
        for (let y = -260; y < 260; y += 22) {
          c.beginPath(); c.moveTo(MR - 80, y); c.lineTo(MR + depth + 40, y + Math.sin(y * 0.3 + state.simTime * 20) * wob); c.stroke();
        }
        c.restore();
        c.lineWidth = 6;
        c.strokeStyle = "#ffffff";
        c.beginPath(); c.moveTo(p1.x, p1.y); c.lineTo(back1.x, back1.y); c.lineTo(back2.x, back2.y); c.lineTo(p2.x, p2.y); c.stroke();
        c.restore();

        // Saha çizgisi (kale ağzı hariç)
        c.save();
        c.lineWidth = 12;
        c.strokeStyle = "#ffffff";
        c.shadowColor = "rgba(255,255,255,0.5)"; c.shadowBlur = 10;
        c.beginPath(); c.arc(MCX, MCY, MR, ga + gapHalf, ga - gapHalf + Math.PI * 2); c.stroke();
        c.shadowBlur = 0;
        c.lineWidth = 4;
        c.strokeStyle = "rgba(255,255,255,0.55)";
        for (let k = 1; k < 24; k++) {
          const a = ga + gapHalf + (k / 24) * (Math.PI * 2 - gapHalf * 2);
          c.beginPath();
          c.moveTo(MCX + Math.cos(a) * (MR + 10), MCY + Math.sin(a) * (MR + 10));
          c.lineTo(MCX + Math.cos(a) * (MR + 24), MCY + Math.sin(a) * (MR + 24));
          c.stroke();
        }
        c.fillStyle = "#ffffff";
        for (const s of [-1, 1]) {
          c.beginPath(); c.arc(MCX + Math.cos(ga + s * gapHalf) * MR, MCY + Math.sin(ga + s * gapHalf) * MR, 11, 0, Math.PI * 2); c.fill();
        }
        c.restore();

        // Şok dalgaları & kıvılcımlar
        for (const sw of state.shockwaves) {
          c.save(); c.globalAlpha = Math.max(0, sw.life / sw.maxLife);
          c.strokeStyle = sw.color; c.lineWidth = 8;
          c.beginPath(); c.arc(sw.x, sw.y, sw.r, 0, Math.PI * 2); c.stroke(); c.restore();
        }
        for (const p of state.sparks) {
          c.save(); c.globalAlpha = Math.max(0, p.life / p.maxLife || p.life);
          c.fillStyle = p.color; c.beginPath(); c.arc(p.x, p.y, p.size || 4, 0, Math.PI * 2); c.fill(); c.restore();
        }

        // Takımlar
        const goalHide = state.phase === "goal" ? Math.min(1, state.goalAnim * 1.6) : 0;
        for (const b of state.badges) {
          const scorerHidden = state.phase === "goal" && state.goalInfo && b.side === state.goalInfo.side;
          const alpha = scorerHidden ? 1 - goalHide : state.phase === "goal" ? 0.35 : 1;
          if (alpha <= 0.02) continue;
          const isWinner = state.winner && !state.draw && b === state.winner;
          const scale = isWinner ? 1 + Math.min(1, state.winnerTime * 2) * 0.55 : 1;
          const dr = b.r * scale;
          c.save();
          c.globalAlpha = alpha;
          for (let i = 0; i < b.trail.length; i++) {
            const t = b.trail[i];
            c.globalAlpha = alpha * (i / b.trail.length) * 0.18;
            c.fillStyle = b.club.c1 || "#ffffff";
            c.beginPath(); c.arc(t.x, t.y, dr * 0.8, 0, Math.PI * 2); c.fill();
          }
          c.globalAlpha = alpha;
          c.translate(b.x, b.y);
          c.rotate(b.angle);
          if (isWinner) {
            const gl = c.createRadialGradient(0, 0, dr * 0.6, 0, 0, dr * 2.1);
            gl.addColorStop(0, "rgba(250, 204, 21, 0.55)"); gl.addColorStop(1, "rgba(250, 204, 21, 0)");
            c.fillStyle = gl; c.beginPath(); c.arc(0, 0, dr * 2.1, 0, Math.PI * 2); c.fill();
          }
          c.shadowColor = "rgba(0,0,0,0.55)"; c.shadowBlur = 18; c.shadowOffsetY = 6;
          c.drawImage(b.sprite, -dr, -dr, dr * 2, dr * 2);
          c.restore();
        }

        // Kart bildirimi
        if (state.cardToast && state.phase === "play") {
          const k = state.cardToast;
          const a = Math.min(1, k.t * 3, (2.0 - k.t) * 6);
          c.save();
          c.globalAlpha = Math.max(0, a);
          c.font = "800 34px 'Montserrat', sans-serif";
          const txt = `${k.name} ${k.label}`.toUpperCase();
          const w = Math.min(760, c.measureText(txt).width) + 120;
          const y = MCY + MR - 96;
          c.fillStyle = "rgba(6, 10, 28, 0.82)";
          c.beginPath(); c.roundRect(MCX - w / 2, y - 34, w, 68, 34); c.fill();
          c.fillStyle = k.red ? "#ef4444" : "#facc15";
          c.beginPath(); c.roundRect(MCX - w / 2 + 26, y - 22, 30, 42, 5); c.fill();
          c.fillStyle = "#ffffff"; c.textAlign = "left";
          c.fillText(txt, MCX - w / 2 + 76, y + 2, 740);
          c.restore();
        }

        // GOAL! animasyonu
        if (state.phase === "goal" && state.goalInfo) {
          const t = state.goalAnim;
          const s = t < 0.22 ? 0.4 + (t / 0.22) * 0.75 : t < 0.36 ? 1.15 - ((t - 0.22) / 0.14) * 0.15 : 1;
          const fade = state.phaseTimer < 0.35 ? state.phaseTimer / 0.35 : 1;
          c.save();
          c.globalAlpha = fade;
          c.translate(MCX, MCY - 30);
          c.scale(s, s);
          c.textAlign = "center";
          c.font = "900 208px 'Montserrat', sans-serif";
          c.shadowColor = "rgba(0,0,0,0.55)"; c.shadowBlur = 30; c.shadowOffsetY = 10;
          drawOutlinedText(c, "GOAL!", 0, 0, "#ffffff", "#dc2626", 34);
          c.shadowBlur = 0; c.shadowOffsetY = 0;
          drawOutlinedText(c, "GOAL!", 0, 0, "#ffffff", state.goalInfo.color || "#dc2626", 14);
          c.restore();
          c.save();
          c.globalAlpha = fade * Math.min(1, Math.max(0, (t - 0.25) * 4));
          c.textAlign = "center";
          c.font = "900 70px 'Montserrat', sans-serif";
          const line = `${state.goalInfo.name} ${state.goalInfo.label}`.toUpperCase();
          const ls = fitText(c, line, 940, c.font);
          c.translate(MCX, MCY + 110); c.scale(ls, ls);
          c.shadowColor = "rgba(0,0,0,0.6)"; c.shadowBlur = 18;
          drawOutlinedText(c, line, 0, 0, "#ffffff", "#0f172a", 14);
          c.restore();
        }

        // Kick-off / Devre arası
        if (state.phase === "intro" || state.phase === "halftime") {
          const txt = state.phase === "intro" ? "KICK OFF" : "HALF TIME";
          const a = Math.min(1, state.phaseTimer * 3);
          c.save();
          c.globalAlpha = a;
          c.fillStyle = "rgba(6, 10, 28, 0.55)";
          c.beginPath(); c.arc(MCX, MCY, MR, 0, Math.PI * 2); c.fill();
          c.textAlign = "center";
          c.font = "900 118px 'Montserrat', sans-serif";
          c.shadowColor = "rgba(0,0,0,0.6)"; c.shadowBlur = 20;
          drawOutlinedText(c, txt, MCX, MCY - 10, "#ffffff", "#0f172a", 12);
          if (state.phase === "halftime") {
            c.font = "900 64px 'Montserrat', sans-serif";
            c.fillStyle = "#facc15";
            c.fillText(`${home.club.short} ${state.score.home} - ${state.score.away} ${away.club.short}`, MCX, MCY + 92, 760);
          }
          c.restore();
        }

        // Maç sonu
        if (state.winner) {
          const a = Math.min(1, state.winnerTime * 2.5);
          c.save();
          c.globalAlpha = a * 0.6;
          c.fillStyle = "#060a1c";
          c.beginPath(); c.arc(MCX, MCY, MR, 0, Math.PI * 2); c.fill();
          c.restore();
          // kazanan/beraberlik logoları üstte tekrar çizilir
          for (const b of state.badges) {
            const isWinner = !state.draw && b === state.winner;
            const dr = b.r * (isWinner ? 1 + Math.min(1, state.winnerTime * 2) * 0.55 : 0.8);
            c.save();
            c.globalAlpha = isWinner || state.draw ? 1 : 0.55;
            c.shadowColor = isWinner ? "rgba(250, 204, 21, 0.8)" : "rgba(0,0,0,0.5)"; c.shadowBlur = isWinner ? 40 : 14;
            c.drawImage(b.sprite, b.x - dr, b.y - dr, dr * 2, dr * 2);
            c.restore();
          }
          c.save();
          c.globalAlpha = a;
          c.textAlign = "center";
          c.font = "900 100px 'Montserrat', sans-serif";
          c.shadowColor = "rgba(0,0,0,0.6)"; c.shadowBlur = 20;
          drawOutlinedText(c, "FULL TIME", MCX, MCY - 190, "#facc15", "#0f172a", 12);
          c.font = "900 54px 'Montserrat', sans-serif";
          c.fillStyle = "#ffffff";
          const res = state.draw ? "DRAW" : `${state.winner.club.name} WIN`;
          c.fillText(res, MCX, MCY - 105, 760);
          c.restore();
        }

        // Konfeti
        for (const p of state.confetti) {
          c.save(); c.translate(p.x, p.y); c.rotate(p.rot);
          c.fillStyle = p.color; c.fillRect(-p.w / 2, -p.h / 2, p.w, p.h); c.restore();
        }

        // Alt bilgi
        if (m.footer) {
          c.save();
          c.textAlign = "center";
          c.font = "800 38px 'Montserrat', sans-serif";
          c.fillStyle = "#facc15";
          c.shadowColor = "rgba(0,0,0,0.6)"; c.shadowBlur = 8;
          c.fillText(m.footer.toUpperCase(), MCX, 1540, 940);
          c.restore();
        }
        if (cfg.watermark && cfg.watermark.trim()) drawWatermark(c, cfg.watermark.trim(), theme, 1612);
        if (cfg.showViralHook && cfg.viralHook.trim()) {
          c.save();
          c.textAlign = "center"; c.textBaseline = "middle";
          const hookText = cfg.viralHook.trim();
          c.font = "800 28px 'Inter', sans-serif";
          const pillW = Math.min(960, c.measureText(hookText).width + 70);
          c.fillStyle = "rgba(15, 23, 42, 0.78)";
          c.strokeStyle = "rgba(250, 204, 21, 0.45)"; c.lineWidth = 2.5;
          c.beginPath(); c.roundRect((BASE_W - pillW) / 2, 1765, pillW, 58, 29); c.fill(); c.stroke();
          c.fillStyle = "#fef08a";
          c.fillText(hookText, BASE_W / 2, 1795, 910);
          c.restore();
        }
        c.restore();
      }
