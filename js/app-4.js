"use strict";
      function createSimState(cfg) {
        if (cfg.mode === "match") return createMatchState(cfg);
        const activeClubs = allClubs.filter((c) => c.enabled);
        const pool = [...activeClubs];
        for (let i = pool.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [pool[i], pool[j]] = [pool[j], pool[i]];
        }

        const count = pool.length;
        // 45+ takımlı Mega Kaos modunda logoların halkaya rahat sığması için akıllı boyut ölçekleme
        const baseR = cfg.logoRadius;
        const r = computeBadgeRadius(baseR, count);
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
          bombs: [], // { holder, timer, max, cooldown, tick }
          tempo: 1,

          // Visual FX
          bgParticles: createBgParticles(),
          sparks: [],
          shockwaves: [],
          confetti: []
        };

        if (cfg.mode === "bomb" && badges.length >= 2) {
          syncBombs(state, cfg);
        }

        return state;
      }

      // Takım sayısına göre aynı anda kaç bomba olacağı (çok takım = çok bomba, final = tek bomba)
      function desiredBombCount(aliveCount) {
        return Math.max(1, Math.min(6, Math.floor(aliveCount / 7)));
      }
      function bombOf(state, badge) {
        return state.bombs.find((bm) => bm.holder === badge) || null;
      }
      function syncBombs(state, cfg) {
        state.bombs = state.bombs.filter((bm) => bm.holder && !bm.holder.eliminated);
        const alive = state.badges.filter((b) => !b.eliminated);
        if (alive.length <= 1) { state.bombs = []; return; }
        const want = Math.min(desiredBombCount(alive.length), alive.length - 1);
        while (state.bombs.length < want) {
          const free = alive.filter((b) => !bombOf(state, b));
          const nonWinners = free.filter((b) => b.club.key !== state.selectedWinnerKey);
          const pool = nonWinners.length > 0 && Math.random() < 0.85 ? nonWinners : free;
          if (!pool.length) break;
          const t = cfg.bombTimer * (state.bombs.length ? 0.75 + Math.random() * 0.6 : 1);
          state.bombs.push({ holder: pool[Math.floor(Math.random() * pool.length)], timer: t, max: t, cooldown: 0.25, tick: 0 });
        }
      }
      function assignNewBomb(state, cfg) { syncBombs(state, cfg); }

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
          state.bombs = [];
          spawnConfettiWave(state, 150);
          emitAudio({ type: "victory" });
        }
      }

      function isAngleInAnyGap(angle, ringAngle, gapHalf, doubleGap) {
        if (Math.abs(angleDiff(angle, ringAngle)) < gapHalf) return true;
        if (doubleGap && Math.abs(angleDiff(angle, ringAngle + Math.PI)) < gapHalf) return true;
        return false;
      }

      function stepSimState(state, rawDt, cfg, emitAudio) {
        if (state.mode === "match") return stepMatchState(state, rawDt, cfg, emitAudio);
        const aliveList = state.badges.filter((b) => !b.eliminated);
        const aliveCount = aliveList.length;

        // Son 2 Ağır Çekim (Slow-Mo Finale)
        state.slowMoActive = !state.winner && cfg.slowMoFinale && aliveCount === 2;
        const slowFactor = state.slowMoActive ? 0.45 : 1.0;

        // OTOMATİK TEMPO: video hedef sürede bitsin diye oyun gerekirse kendini hızlandırır
        if (!state.winner) {
          let desired = 1;
          const target = cfg.targetDuration || 0;
          if (target > 0 && aliveCount > 2) {
            const prePhase = Math.max(12, target - 15); // final düellosu + kutlama payı
            const elimNeeded = Math.max(1, state.totalClubs - 2);
            const elimDone = state.totalClubs - aliveCount;
            const perElimTarget = prePhase / elimNeeded;
            if (elimDone >= 1) {
              const projected = (state.simTime / elimDone) * elimNeeded;
              desired = projected / prePhase;
            } else {
              desired = Math.max(1, state.simTime / (perElimTarget * 1.6));
            }
            if (state.simTime > prePhase) desired = Math.max(desired, 1 + (state.simTime - prePhase) / 4);
            desired = Math.max(0.6, Math.min(3.4, desired)); // çok hızlı bitiyorsa biraz yavaşlar
          } else if (target > 0 && aliveCount === 2 && state.simTime > target - 7) {
            desired = Math.min(1.8, 1 + (state.simTime - (target - 7)) / 5); // final düellosu uzarsa hafifçe hızlan
          }
          state.tempo += (desired - state.tempo) * Math.min(1, rawDt * 0.9);
        }
        const tempo = state.winner ? 1 : state.tempo;
        const dt = state.winner ? rawDt : rawDt * cfg.simSpeed * slowFactor * tempo;
        state.simTime += rawDt;

        // Arka plan parçacıkları
        for (const s of state.bgParticles) {
          s.x += s.vx * rawDt;
          s.y += s.vy * rawDt;
          if (s.y < -20) { s.y = BASE_H + 20; s.x = Math.random() * BASE_W; }
          if (s.x < -20) s.x = BASE_W + 20;
          if (s.x > BASE_W + 20) s.x = -20;
        }

        // Kıvılcımlar
        for (let i = state.sparks.length - 1; i >= 0; i--) {
          const p = state.sparks[i];
          p.life -= rawDt;
          if (p.life <= 0) { state.sparks.splice(i, 1); continue; }
          p.vy += 380 * rawDt;
          p.x += p.vx * rawDt;
          p.y += p.vy * rawDt;
        }

        // Şok dalgaları
        for (let i = state.shockwaves.length - 1; i >= 0; i--) {
          const sw = state.shockwaves[i];
          sw.life -= rawDt;
          if (sw.life <= 0) { state.shockwaves.splice(i, 1); continue; }
          const prog = 1 - sw.life / sw.maxLife;
          sw.r = 24 + prog * (sw.maxR - 24);
        }

        // UI animasyon sönümlemeleri
        if (state.bannerAnim > 0) state.bannerAnim = Math.max(0, state.bannerAnim - rawDt * 2.4);
        if (state.pillPopAnim > 0) state.pillPopAnim = Math.max(0, state.pillPopAnim - rawDt * 3.5);
        if (state.ringFlashAnim > 0) state.ringFlashAnim = Math.max(0, state.ringFlashAnim - rawDt * 2.8);
        if (state.shakeIntensity > 0) state.shakeIntensity = Math.max(0, state.shakeIntensity - rawDt * 34);

        // Şampiyonluk kutlama fazı
        if (state.winner) {
          state.winnerTime += rawDt;
          state.winner.x += (RING_CX - state.winner.x) * Math.min(1, rawDt * 4.2);
          state.winner.y += (RING_CY - 20 - state.winner.y) * Math.min(1, rawDt * 4.2);
          state.winner.angle *= 0.90;
          state.winner.vx = 0;
          state.winner.vy = 0;

          if (!state.confettiWave2Fired && state.winnerTime >= 1.25) {
            state.confettiWave2Fired = true;
            spawnConfettiWave(state, 130);
          }

          for (const p of state.confetti) {
            p.vy += 580 * rawDt;
            p.vx *= 0.992;
            p.x += p.vx * rawDt;
            p.y += p.vy * rawDt;
            p.rot += p.vRot * rawDt;
          }
          return;
        }

        state.timeSinceLastElim += rawDt;

        // Daralan Halka (Ring Modu)
        const targetRingR = (state.mode === "ring" && cfg.shrinkingRing)
          ? Math.max(255, BASE_RING_R - ((state.totalClubs - aliveCount) / Math.max(1, state.totalClubs - 1)) * 155)
          : BASE_RING_R;
        state.ringRadius += (targetRingR - state.ringRadius) * Math.min(1, rawDt * 3.0);

        const subSteps = Math.max(4, Math.ceil(cfg.simSpeed * tempo * 4));

        // Elendikçe kalan logolar seçilen boyuta doğru büyür
        const fitR = computeBadgeRadius(cfg.logoRadius, aliveCount) * (state.mode === "ring" && cfg.growSurvivor ? 1.15 : 1);
        for (const b of aliveList) b.r += (fitR - b.r) * Math.min(1, rawDt * 1.6);
        const subDt = dt / subSteps;

        // Mod bazlı yerçekimi & hız ölçeği
        const modeGravity = state.mode === "ring"
          ? 1100 * cfg.gravityScale
          : 260 * cfg.gravityScale; // Bomb, Blade, Laser modlarında daha serbest arena hareketi

        const escalation = (state.mode === "ring" && cfg.speedEscalation)
          ? 1 + ((state.totalClubs - aliveCount) / Math.max(1, state.totalClubs)) * 0.65
          : 1.0;

        const omega = cfg.ringSpeed * 1.15 * escalation;
        const gapRad = (cfg.gapDegrees * Math.PI) / 180;
        const gapHalf = gapRad / 2;

        // Tıkanma önleyici (Ring modunda son 3 takımda uzun süre kimse elenmezse)
        const ringAntiStall = state.mode === "ring" && (
          (aliveCount <= 3 && state.timeSinceLastElim > 4.2) ||
          (aliveCount <= 6 && state.timeSinceLastElim > 6.5) ||
          state.timeSinceLastElim > 9.0
        );

        // SAATLİ BOMBALAR: GERİ SAYIM, TİK SESİ, PATLAMA (çoklu bomba)
        if (state.mode === "bomb" && state.bombs.length) {
          let tickedThisFrame = false;
          for (const bm of [...state.bombs]) {
            if (!bm.holder || bm.holder.eliminated || state.winner) continue;
            bm.timer -= dt;
            if (bm.cooldown > 0) bm.cooldown = Math.max(0, bm.cooldown - dt);
            const urgency = 1 - Math.max(0, bm.timer / bm.max);
            const tickInterval = Math.max(0.11, 0.52 - urgency * 0.40);
            bm.tick += dt;
            if (bm.tick >= tickInterval) {
              bm.tick = 0;
              if (!tickedThisFrame) { emitAudio({ type: "tick", urgency }); tickedThisFrame = true; }
            }

            // Seçili kazanan bomba tutuyorsa süre bitmeden en yakın boştaki rakibe devreder
            if (state.selectedWinnerKey !== "random" && bm.holder.club.key === state.selectedWinnerKey) {
              let nearest = null, bestD = Infinity;
              for (const other of aliveList) {
                if (other === bm.holder || bombOf(state, other)) continue;
                const d = Math.hypot(other.x - bm.holder.x, other.y - bm.holder.y);
                if (d < bestD) { bestD = d; nearest = other; }
              }
              if (nearest) {
                const nx = (nearest.x - bm.holder.x) / (bestD || 1);
                const ny = (nearest.y - bm.holder.y) / (bestD || 1);
                const boost = bm.timer < 1.1 ? 920 : 420;
                bm.holder.vx += nx * boost * dt;
                bm.holder.vy += ny * boost * dt;
                if (bm.timer <= 0.28) {
                  bm.holder = nearest;
                  bm.cooldown = 0.4;
                  spawnSparks(state, nearest.x, nearest.y, "#facc15", 12, 320);
                }
              }
            }

            if (bm.timer <= 0 && !state.winner) {
              const victim = bm.holder;
              state.bombs.splice(state.bombs.indexOf(bm), 1);
              spawnSparks(state, victim.x, victim.y, "#f97316", 34, 480);
              spawnSparks(state, victim.x, victim.y, "#fef08a", 20, 340);
              spawnShockwave(state, victim.x, victim.y, "#f97316", 260);
              state.shakeIntensity = 20;
              emitAudio({ type: "explode" });
              eliminateBadge(state, victim, cfg, emitAudio, `💥 ${victim.club.name} PATLADI!`, "#fb923c", true);
            }
          }
          if (!state.winner) syncBombs(state, cfg);
        }

        // FİZİK ALT ADIMLARI
        for (let step = 0; step < subSteps; step++) {
          if (state.mode === "ring") {
            state.ringAngle = normalizeAngle(state.ringAngle + omega * subDt);
          } else if (state.mode === "laser") {
            const laserSpd = cfg.laserSpeed * (1.25 + (1 - aliveCount / Math.max(1, state.totalClubs)) * 0.55);
            state.laserAngle = normalizeAngle(state.laserAngle + laserSpd * subDt);
          }

          const R = state.ringRadius;
          const gapTargetX = RING_CX + Math.cos(state.ringAngle) * (R + 40);
          const gapTargetY = RING_CY + Math.sin(state.ringAngle) * (R + 40);

          // 1. Konum, Duvar, Mod Fiziği
          for (const b of state.badges) {
            if (b.removed || b === state.winner) continue;

            if (b.hitCooldown > 0) b.hitCooldown = Math.max(0, b.hitCooldown - subDt);
            if (b.flashTimer > 0) b.flashTimer = Math.max(0, b.flashTimer - subDt);

            const isProtected = state.selectedWinnerKey !== "random" && b.club.key === state.selectedWinnerKey;

            // Kılıç dönüşü
            if (state.mode === "blade" && !b.eliminated) {
              const bSpd = cfg.bladeSpeed * 4.4 * (isProtected ? 1.12 : 1.0);
              b.bladeAngle = normalizeAngle(b.bladeAngle + b.bladeDir * bSpd * subDt);
            }

            // Ring anti-stall
            if (ringAntiStall && !b.eliminated && !isProtected) {
              const gx = gapTargetX - b.x;
              const gy = gapTargetY - b.y;
              const gd = Math.hypot(gx, gy) || 1;
              b.vx += (gx / gd) * (aliveCount <= 3 ? 620 : 360) * subDt;
              b.vy += (gy / gd) * (aliveCount <= 3 ? 620 : 360) * subDt;
            }

            // Bomb / Blade / Laser modlarında enerjik hareketi koru
            if (!b.eliminated && state.mode !== "ring") {
              const minArenaSpd = state.mode === "bomb" ? 360 * cfg.bombChaos : 330;
              const spd = Math.hypot(b.vx, b.vy);
              if (spd < minArenaSpd && spd > 1) {
                const k = (minArenaSpd - spd) * 2.5 * subDt;
                b.vx += (b.vx / spd) * k;
                b.vy += (b.vy / spd) * k;
              }
            }

            b.vx *= 1 - 0.04 * subDt;
            b.vy = b.vy * (1 - 0.04 * subDt) + modeGravity * subDt;
            b.x += b.vx * subDt;
            b.y += b.vy * subDt;
            b.vAngle = Math.max(-3.2, Math.min(3.2, b.vAngle));
            b.angle += b.vAngle * subDt * cfg.spinSpeed;

            if (b.eliminated) {
              if (step === 0) {
                b.trail.unshift({ x: b.x, y: b.y });
                if (b.trail.length > 14) b.trail.pop();
              }
              if (b.y - b.r > BASE_H + 160) b.removed = true;
              continue;
            }

            const dx = b.x - RING_CX;
            const dy = b.y - RING_CY;
            const dist = Math.hypot(dx, dy);
            const ang = Math.atan2(dy, dx);

            if (state.mode === "ring") {
              const inGap = isAngleInAnyGap(ang, state.ringAngle, gapHalf, cfg.doubleGap);
              if (inGap && !isProtected) {
                if (dist > R + b.r * 0.28) {
                  spawnSparks(state, b.x, b.y, "#fb7185", 16, 280);
                  emitAudio({ type: "elim" });
                  eliminateBadge(state, b, cfg, emitAudio, `${b.club.name} ELIMINATED`, "#fb7185", false);
                  continue;
                }
              } else if (dist + b.r > R) {
                const nx = dx / (dist || 1);
                const ny = dy / (dist || 1);
                b.x = RING_CX + nx * (R - b.r);
                b.y = RING_CY + ny * (R - b.r);
                const tx = -ny;
                const ty = nx;
                const wallTang = omega * R;
                const vn = b.vx * nx + b.vy * ny;
                if (vn > 0) {
                  const e = Math.min(0.96, cfg.bounciness * (aliveCount <= 5 ? 1.06 : 1.0));
                  b.vx -= (1 + e) * vn * nx;
                  b.vy -= (1 + e) * vn * ny;
                  if (inGap && isProtected) {
                    b.vx += -nx * 145 + tx * wallTang * 0.12;
                    b.vy += -ny * 145 + ty * wallTang * 0.12;
                  } else {
                    b.vx += tx * wallTang * 0.085;
                    b.vy += ty * wallTang * 0.085;
                  }
                  b.vAngle += wallTang * 0.0016;
                  const spd = Math.hypot(b.vx, b.vy);
                  if (spd < 280) {
                    b.vx += (-nx * 0.6 + tx * 0.8) * 140;
                    b.vy += (-ny * 0.6 + ty * 0.8) * 140;
                  }
                  if (vn > 180) {
                    emitAudio({ type: "bounce", intensity: vn / 750, isWall: true });
                    if (vn > 340 && !inGap) {
                      spawnSparks(state, RING_CX + nx * R, RING_CY + ny * R, THEMES[cfg.theme].sparkColor, 4, 210);
                    }
                  }
                }
              }
            } else {
              // Kapalı Arena Duvarı (Bomb, Blade, Laser)
              if (dist + b.r > R) {
                const nx = dx / (dist || 1);
                const ny = dy / (dist || 1);
                b.x = RING_CX + nx * (R - b.r);
                b.y = RING_CY + ny * (R - b.r);
                const vn = b.vx * nx + b.vy * ny;
                if (vn > 0) {
                  const e = 0.94;
                  b.vx -= (1 + e) * vn * nx;
                  b.vy -= (1 + e) * vn * ny;
                  if (vn > 200) emitAudio({ type: "bounce", intensity: vn / 800, isWall: true });
                }
              }
            }

            // ÖLÜM LAZERİ ÇARPIŞMA KONTROLÜ
            if (state.mode === "laser" && !b.eliminated) {
              const beams = cfg.laserCount === 2 ? [state.laserAngle, state.laserAngle + Math.PI] : [state.laserAngle];
              for (const bAng of beams) {
                const lx2 = RING_CX + Math.cos(bAng) * R;
                const ly2 = RING_CY + Math.sin(bAng) * R;
                const dBeam = distPointToSegment(b.x, b.y, RING_CX, RING_CY, lx2, ly2);

                // Seçili kazanan için doğal lazer kaçışı (plot armor)
                if (isProtected && dBeam < b.r + 48) {
                  const perpX = -Math.sin(bAng);
                  const perpY = Math.cos(bAng);
                  const side = (b.x - RING_CX) * perpX + (b.y - RING_CY) * perpY >= 0 ? 1 : -1;
                  b.vx += perpX * side * 950 * subDt;
                  b.vy += perpY * side * 950 * subDt;
                }

                if (dBeam < b.r + 7 && b.hitCooldown <= 0) {
                  b.hitCooldown = 0.65;
                  b.flashTimer = 0.25;
                  const perpX = -Math.sin(bAng);
                  const perpY = Math.cos(bAng);
                  const side = (b.x - RING_CX) * perpX + (b.y - RING_CY) * perpY >= 0 ? 1 : -1;
                  b.vx += perpX * side * 340;
                  b.vy += perpY * side * 340;

                  if ((isProtected && b.hp <= 1) || (b.hp <= 1 && !lethalHitAllowed(state, cfg))) {
                    // Kalkan kıvılcımıyla sektir
                    spawnSparks(state, b.x, b.y, "#38bdf8", 12, 320);
                    emitAudio({ type: "clang" });
                  } else {
                    b.hp -= 1;
                    spawnSparks(state, b.x, b.y, "#22d3ee", 16, 360);
                    emitAudio({ type: "zap" });
                    state.shakeIntensity = Math.max(state.shakeIntensity, 7);
                    if (b.hp <= 0) {
                      spawnShockwave(state, b.x, b.y, "#22d3ee", 150);
                      eliminateBadge(state, b, cfg, emitAudio, `⚡ ${b.club.name} LAZERLE ELENDİ!`, "#22d3ee", true);
                      break;
                    }
                  }
                }
              }
            }
          }

          // 2. Kulüpler Arası Çarpışmalar + Bomba Devri + Kılıç Savaşı
          for (let i = 0; i < state.badges.length; i++) {
            const a = state.badges[i];
            if (a.eliminated || a === state.winner) continue;
            for (let j = i + 1; j < state.badges.length; j++) {
              const b = state.badges[j];
              if (b.eliminated || b === state.winner) continue;

              const dx = b.x - a.x;
              const dy = b.y - a.y;
              const dSq = dx * dx + dy * dy;
              const minD = a.r + b.r;

              // Gövde-Gövde Çarpışması
              if (dSq < minD * minD && dSq > 0.0001) {
                const dist = Math.sqrt(dSq);
                const nx = dx / dist;
                const ny = dy / dist;
                const overlap = (minD - dist) * 0.51;
                a.x -= nx * overlap; a.y -= ny * overlap;
                b.x += nx * overlap; b.y += ny * overlap;

                const rvx = b.vx - a.vx;
                const rvy = b.vy - a.vy;
                const vn = rvx * nx + rvy * ny;
                if (vn < 0) {
                  const e = state.mode === "ring" ? cfg.bounciness : 0.94;
                  const imp = -(1 + e) * vn * 0.5;
                  a.vx -= imp * nx; a.vy -= imp * ny;
                  b.vx += imp * nx; b.vy += imp * ny;
                  const spin = (rvx * -ny + rvy * nx) * 0.002;
                  a.vAngle -= spin; b.vAngle += spin;

                  if (Math.abs(vn) > 220) {
                    emitAudio({ type: "bounce", intensity: Math.abs(vn) / 850, isWall: false });
                  }
                }

                // SAATLİ BOMBA DEVRİ
                if (state.mode === "bomb") {
                  const ba = bombOf(state, a), bb = bombOf(state, b);
                  if (ba && !bb && ba.cooldown <= 0) {
                    ba.holder = b;
                    ba.cooldown = 0.36;
                    spawnSparks(state, (a.x + b.x) / 2, (a.y + b.y) / 2, "#facc15", 10, 260);
                  } else if (bb && !ba && bb.cooldown <= 0) {
                    bb.holder = a;
                    bb.cooldown = 0.36;
                    spawnSparks(state, (a.x + b.x) / 2, (a.y + b.y) / 2, "#facc15", 10, 260);
                  }
                }
              }

              // KILIÇ SAVAŞI ÇARPIŞMALARI
              if (state.mode === "blade" && dSq < (minD + cfg.bladeLength * 2 + 12) ** 2) {
                const aTipX = a.x + Math.cos(a.bladeAngle) * (a.r + cfg.bladeLength);
                const aTipY = a.y + Math.sin(a.bladeAngle) * (a.r + cfg.bladeLength);
                const bTipX = b.x + Math.cos(b.bladeAngle) * (b.r + cfg.bladeLength);
                const bTipY = b.y + Math.sin(b.bladeAngle) * (b.r + cfg.bladeLength);

                // Kılıç-Kılıç çarpışması (Parry)
                const tipDist = Math.hypot(aTipX - bTipX, aTipY - bTipY);
                if (tipDist < 26) {
                  a.bladeDir *= -1;
                  b.bladeDir *= -1;
                  a.bladeAngle += a.bladeDir * 0.35;
                  b.bladeAngle += b.bladeDir * 0.35;
                  spawnSparks(state, (aTipX + bTipX) / 2, (aTipY + bTipY) / 2, "#fef08a", 9, 320);
                  emitAudio({ type: "clang" });
                }

                // A'nın kılıcı B'nin gövdesine vurursa
                const dAtoB = distPointToSegment(b.x, b.y, a.x + Math.cos(a.bladeAngle) * a.r, a.y + Math.sin(a.bladeAngle) * a.r, aTipX, aTipY);
                if (dAtoB < b.r + 4 && b.hitCooldown <= 0) {
                  applyBladeHit(state, a, b, cfg, emitAudio);
                }

                // B'nin kılıcı A'nın gövdesine vurursa
                if (!a.eliminated && !b.eliminated) {
                  const dBtoA = distPointToSegment(a.x, a.y, b.x + Math.cos(b.bladeAngle) * b.r, b.y + Math.sin(b.bladeAngle) * b.r, bTipX, bTipY);
                  if (dBtoA < a.r + 4 && a.hitCooldown <= 0) {
                    applyBladeHit(state, b, a, cfg, emitAudio);
                  }
                }
              }
            }
          }
        }

        // Hız limiti
        const maxSpd = state.mode === "ring" ? 1350 : 980;
        for (const b of state.badges) {
          if (b.eliminated) continue;
          const spd = Math.hypot(b.vx, b.vy);
          if (spd > maxSpd) {
            const k = maxSpd / spd;
            b.vx *= k; b.vy *= k;
          }
          b.vAngle *= 0.99;
        }
      }

      // Hedef süreye göre iki eleme arasında olması gereken en kısa süre (Kılıç & Lazer modları)
      function lethalHitAllowed(state, cfg) {
        const target = cfg.targetDuration || 0;
        if (!target) return true;
        const alive = state.badges.filter((b) => !b.eliminated).length;
        if (alive <= 2) return true;
        const prePhase = Math.max(12, target - 15);
        const gap = (prePhase / Math.max(1, state.totalClubs - 2)) * 0.78;
        return state.timeSinceLastElim >= gap;
      }

      function applyBladeHit(state, attacker, victim, cfg, emitAudio) {
        victim.hitCooldown = 0.48;
        victim.flashTimer = 0.24;
        const dx = victim.x - attacker.x;
        const dy = victim.y - attacker.y;
        const d = Math.hypot(dx, dy) || 1;
        victim.vx += (dx / d) * 340;
        victim.vy += (dy / d) * 340;
        attacker.bladeDir *= -1;

        const isProtectedVictim = state.selectedWinnerKey !== "random" && victim.club.key === state.selectedWinnerKey;
        if ((isProtectedVictim && victim.hp <= 1) || (victim.hp <= 1 && !lethalHitAllowed(state, cfg))) {
          // Şampiyon kılıç savunması (Parry)
          spawnSparks(state, victim.x, victim.y, "#facc15", 12, 340);
          emitAudio({ type: "clang" });
          return;
        }

        victim.hp -= 1;
        spawnSparks(state, victim.x, victim.y, "#fb7185", 14, 340);
        emitAudio({ type: "slash" });
        state.shakeIntensity = Math.max(state.shakeIntensity, 6);

        if (victim.hp <= 0) {
          attacker.kills += 1;
          spawnShockwave(state, victim.x, victim.y, "#f43f5e", 160);
          eliminateBadge(
            state, victim, cfg, emitAudio,
            `${attacker.club.name} ⚔️ ${victim.club.name}`,
            "#f43f5e", true
          );
        }
      }
