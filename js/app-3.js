"use strict";
      function stepSimState(state, rawDt, cfg, emitAudio) {
        const aliveList = state.badges.filter((b) => !b.eliminated);
        const aliveCount = aliveList.length;

        // Son 2 Ağır Çekim (Slow-Mo Finale)
        state.slowMoActive = !state.winner && cfg.slowMoFinale && aliveCount === 2;
        const slowFactor = state.slowMoActive ? 0.45 : 1.0;
        const dt = state.winner ? rawDt : rawDt * cfg.simSpeed * slowFactor;
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

        const subSteps = Math.max(4, Math.ceil(cfg.simSpeed * 4));
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

        // SAATLİ BOMBA GERİ SAYIM & TİK SESİ
        if (state.mode === "bomb" && state.bombHolder && !state.bombHolder.eliminated) {
          state.bombTimer -= dt;
          if (state.bombTransferCooldown > 0) state.bombTransferCooldown = Math.max(0, state.bombTransferCooldown - dt);

          const urgency = 1 - Math.max(0, state.bombTimer / state.bombMaxTimer);
          const tickInterval = Math.max(0.11, 0.52 - urgency * 0.40);
          state.bombTickAccum += dt;
          if (state.bombTickAccum >= tickInterval) {
            state.bombTickAccum = 0;
            emitAudio({ type: "tick", urgency });
          }

          // Seçili kazanan bomba tutuyorsa süre bitmeden en yakın rakibe doğal devir (plot armor)
          if (state.selectedWinnerKey !== "random" && state.bombHolder.club.key === state.selectedWinnerKey) {
            let nearest = null;
            let bestD = Infinity;
            for (const other of aliveList) {
              if (other === state.bombHolder) continue;
              const d = Math.hypot(other.x - state.bombHolder.x, other.y - state.bombHolder.y);
              if (d < bestD) { bestD = d; nearest = other; }
            }
            if (nearest) {
              const nx = (nearest.x - state.bombHolder.x) / (bestD || 1);
              const ny = (nearest.y - state.bombHolder.y) / (bestD || 1);
              const boost = state.bombTimer < 1.1 ? 920 : 420;
              state.bombHolder.vx += nx * boost * dt;
              state.bombHolder.vy += ny * boost * dt;
              // Son 0.28 saniyede hala elindeyse yıldırım pası
              if (state.bombTimer <= 0.28) {
                state.bombHolder = nearest;
                state.bombTransferCooldown = 0.4;
                spawnSparks(state, nearest.x, nearest.y, "#facc15", 12, 320);
              }
            }
          }

          // Patlama!
          if (state.bombTimer <= 0 && state.bombHolder) {
            const victim = state.bombHolder;
            spawnSparks(state, victim.x, victim.y, "#f97316", 34, 480);
            spawnSparks(state, victim.x, victim.y, "#fef08a", 20, 340);
            spawnShockwave(state, victim.x, victim.y, "#f97316", 260);
            state.shakeIntensity = 20;
            emitAudio({ type: "explode" });
            eliminateBadge(state, victim, cfg, emitAudio, `💥 ${victim.club.name} PATLADI!`, "#fb923c", true);
            if (!state.winner) assignNewBomb(state, cfg);
          }
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
            b.angle += b.vAngle * subDt;

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

                  if (isProtected && b.hp <= 1) {
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
                if (state.mode === "bomb" && state.bombTransferCooldown <= 0) {
                  if (state.bombHolder === a) {
                    state.bombHolder = b;
                    state.bombTransferCooldown = 0.36;
                    spawnSparks(state, (a.x + b.x) / 2, (a.y + b.y) / 2, "#facc15", 10, 260);
                  } else if (state.bombHolder === b) {
                    state.bombHolder = a;
                    state.bombTransferCooldown = 0.36;
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
        if (isProtectedVictim && victim.hp <= 1) {
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

      /* =========================================================================
         8. 1080×1920 YAYIN KALİTESİNDE CANVAS ÇİZİM MOTORU
         ========================================================================= */
      function drawSpacedText(c, text, x, y, spacing) {
        const chars = text.split("");
        let totalW = 0;
        const widths = chars.map((ch) => {
          const w = c.measureText(ch).width;
          totalW += w + spacing;
          return w;
        });
        totalW -= spacing;
        let curX = x - totalW / 2;
        c.textAlign = "left";
        chars.forEach((ch, idx) => {
          c.fillText(ch, curX, y);
          curX += widths[idx] + spacing;
        });
        c.textAlign = "center";
      }

      function renderSimState(c, state, cfg, targetW = BASE_W, targetH = BASE_H) {
        const theme = THEMES[cfg.theme] || THEMES.ucl;
        c.save();
        if (targetW !== BASE_W || targetH !== BASE_H) {
          c.scale(targetW / BASE_W, targetH / BASE_H);
        }

        if (state.shakeIntensity > 0.2) {
          c.translate(
            (Math.random() - 0.5) * state.shakeIntensity,
            (Math.random() - 0.5) * state.shakeIntensity
          );
        }

        // 1. Tema Arka Planı
        const bgGrad = c.createRadialGradient(BASE_W * 0.5, BASE_H * 0.36, 60, BASE_W * 0.5, BASE_H * 0.5, BASE_H * 0.78);
        bgGrad.addColorStop(0.0, theme.bg0);
        bgGrad.addColorStop(0.36, theme.bg1);
        bgGrad.addColorStop(0.76, theme.bg2);
        bgGrad.addColorStop(1.0, theme.bg3);
        c.fillStyle = bgGrad;
        c.fillRect(-25, -25, BASE_W + 50, BASE_H + 50);

        // Üst stadyum ışık huzmeleri
        c.save();
        const rayGrad = c.createLinearGradient(0, 0, 0, 740);
        rayGrad.addColorStop(0, theme.rayColor);
        rayGrad.addColorStop(1, "rgba(0,0,0,0)");
        c.fillStyle = rayGrad;
        for (let i = -1; i <= 1; i++) {
          c.beginPath();
          c.moveTo(BASE_W / 2 + i * 260, -20);
          c.lineTo(BASE_W / 2 + i * 480 + 180, 760);
          c.lineTo(BASE_W / 2 + i * 480 - 180, 760);
          c.closePath();
          c.fill();
        }
        c.restore();

        // Yıldızlar / Ateş Kıvılcımları
        for (const s of state.bgParticles) {
          const tw = 0.5 + 0.5 * Math.sin(state.simTime * 2.4 + s.phase);
          const col = theme.emberMode ? `rgba(251, 146, 60, ${s.alpha * tw})` : `rgba(219, 234, 254, ${s.alpha * tw})`;
          if (s.bokeh) {
            const g = c.createRadialGradient(s.x, s.y, 0, s.x, s.y, s.r * 3.8);
            g.addColorStop(0, col);
            g.addColorStop(1, "rgba(0,0,0,0)");
            c.fillStyle = g;
            c.beginPath();
            c.arc(s.x, s.y, s.r * 3.8, 0, Math.PI * 2);
            c.fill();
          } else {
            c.fillStyle = col;
            c.beginPath();
            c.arc(s.x, s.y, s.r, 0, Math.PI * 2);
            c.fill();
          }
        }

        const R = state.ringRadius;
        const activeCount = state.badges.filter((b) => !b.eliminated).length;
        const finalTension = activeCount <= 2 && !state.winner;

        // Arena Arkası Aura
        const aura = c.createRadialGradient(RING_CX, RING_CY, 80, RING_CX, RING_CY, R + 135);
        aura.addColorStop(0, finalTension ? "rgba(250, 204, 21, 0.30)" : theme.auraColor);
        aura.addColorStop(0.68, "rgba(8, 12, 32, 0.45)");
        aura.addColorStop(1, "rgba(0, 0, 0, 0)");
        c.fillStyle = aura;
        c.beginPath();
        c.arc(RING_CX, RING_CY, R + 135, 0, Math.PI * 2);
        c.fill();

        // Arena İçi Zemin + Merkez Kupa
        c.save();
        c.beginPath();
        c.arc(RING_CX, RING_CY, R, 0, Math.PI * 2);
        c.fillStyle = "rgba(3, 6, 20, 0.65)";
        c.fill();
        c.clip();

        const trophyAlpha = 0.28 + Math.sin(state.simTime * 1.8) * 0.04 + (state.winner ? 0.24 : 0);
        c.save();
        c.globalAlpha = trophyAlpha;
        if (customTrophyImg) {
          const sc = Math.min(480 / customTrophyImg.naturalWidth, 540 / customTrophyImg.naturalHeight);
          const tw = customTrophyImg.naturalWidth * sc;
          const th = customTrophyImg.naturalHeight * sc;
          c.drawImage(customTrophyImg, RING_CX - tw / 2, RING_CY - th / 2 + 12, tw, th);
        } else {
          const tCanv = theme.trophyType === "gold" ? goldTrophyCanvas : silverTrophyCanvas;
          if (tCanv) c.drawImage(tCanv, RING_CX - 280, RING_CY - 310, 560, 640);
        }
        c.restore();

        // Kupa ışık süpürmesi
        const sweepCycle = (state.simTime * 0.35) % 1;
        if (sweepCycle < 0.45) {
          const sweepX = RING_CX - 340 + (sweepCycle / 0.45) * 680;
          const sg = c.createLinearGradient(sweepX - 70, RING_CY - 250, sweepX + 70, RING_CY + 250);
          sg.addColorStop(0, "rgba(255,255,255,0)");
          sg.addColorStop(0.5, "rgba(255,255,255,0.09)");
          sg.addColorStop(1, "rgba(255,255,255,0)");
          c.fillStyle = sg;
          c.fillRect(RING_CX - R, RING_CY - R, R * 2, R * 2);
        }
        c.restore();

        // 2. Üst Başlıklar & Kalan Kulüp Kapsülü
        c.save();
        c.textAlign = "center";

        c.font = "800 34px 'Montserrat', sans-serif";
        c.fillStyle = theme.subColor;
        c.shadowColor = "rgba(250, 204, 21, 0.38)";
        c.shadowBlur = 16;
        drawSpacedText(c, (cfg.subTitle || theme.subDefault).toUpperCase(), BASE_W / 2, 224, 7.2);

        c.font = "900 88px 'Montserrat', sans-serif";
        c.fillStyle = "#ffffff";
        c.shadowColor = "rgba(56, 189, 248, 0.35)";
        c.shadowBlur = 24;
        c.fillText((cfg.mainTitle || "WHO SURVIVES?").toUpperCase(), BASE_W / 2, 326);

        const pillScale = 1 + Math.sin(state.pillPopAnim * Math.PI) * 0.08;
        c.save();
        c.translate(BASE_W / 2, 408);
        c.scale(pillScale, pillScale);
        c.fillStyle = "rgba(9, 15, 42, 0.86)";
        c.strokeStyle = finalTension ? "rgba(250, 204, 21, 0.92)" : "rgba(226, 232, 240, 0.72)";
        c.lineWidth = 3;
        c.beginPath();
        c.roundRect(-245, -34, 490, 68, 34);
        c.fill();
        c.stroke();

        c.font = "800 31px 'Inter', sans-serif";
        c.fillStyle = finalTension ? "#fef08a" : "#f8fafc";
        c.textBaseline = "middle";
        const modeTag = state.slowMoActive ? "⚡ FINAL DUEL • 2 CLUBS" : `REMAINING CLUBS: ${activeCount}`;
        c.fillText(modeTag, 0, 1);
        c.restore();
        c.restore();

        // 3. ÖLÜM LAZERİ IŞINLARI (Laser Modu)
        if (state.mode === "laser" && !state.winner) {
          const beams = cfg.laserCount === 2 ? [state.laserAngle, state.laserAngle + Math.PI] : [state.laserAngle];
          c.save();
          for (const bAng of beams) {
            const lx = RING_CX + Math.cos(bAng) * R;
            const ly = RING_CY + Math.sin(bAng) * R;
            // Dış neon uyarı parlaması
            c.beginPath();
            c.moveTo(RING_CX, RING_CY);
            c.lineTo(lx, ly);
            c.strokeStyle = "rgba(34, 211, 238, 0.35)";
            c.lineWidth = 26;
            c.lineCap = "round";
            c.stroke();
            // İç lazer çekirdeği
            c.beginPath();
            c.moveTo(RING_CX, RING_CY);
            c.lineTo(lx, ly);
            c.strokeStyle = "#ffffff";
            c.lineWidth = 8;
            c.shadowColor = "#06b6d4";
            c.shadowBlur = 24;
            c.stroke();
          }
          // Merkez lazer çekirdeği
          c.beginPath();
          c.arc(RING_CX, RING_CY, 22, 0, Math.PI * 2);
          c.fillStyle = "#06b6d4";
          c.shadowColor = "#22d3ee";
          c.shadowBlur = 28;
          c.fill();
          c.beginPath();
          c.arc(RING_CX, RING_CY, 10, 0, Math.PI * 2);
          c.fillStyle = "#ffffff";
          c.fill();
          c.restore();
        }

        // 4. Şampiyonluk Dönen Altın Işık Huzmeleri
        if (state.winner) {
          c.save();
          c.translate(RING_CX, RING_CY - 20);
          c.rotate(state.winnerTime * 0.45);
          for (let i = 0; i < 14; i++) {
            c.rotate((Math.PI * 2) / 14);
            const g = c.createLinearGradient(0, 0, 0, -390);
            g.addColorStop(0, "rgba(250, 204, 21, 0.38)");
            g.addColorStop(1, "rgba(250, 204, 21, 0)");
            c.fillStyle = g;
            c.beginPath();
            c.moveTo(0, 0); c.lineTo(-28, -390); c.lineTo(28, -390);
            c.closePath();
            c.fill();
          }
          c.restore();
        }

        // 5. Elenenlerin Kuyruklu İzleri (Ring Modu)
        for (const b of state.badges) {
          if (!b.eliminated || b.removed || b.trail.length < 2) continue;
          for (let i = 0; i < b.trail.length; i++) {
            const pt = b.trail[i];
            const ratio = 1 - i / b.trail.length;
            c.fillStyle = `rgba(251, 113, 133, ${ratio * 0.34})`;
            c.beginPath();
            c.arc(pt.x, pt.y, b.r * 0.55 * ratio, 0, Math.PI * 2);
            c.fill();
          }
        }

        // 6. Kulüp Armaları + Mod Özel Görselleri (Kılıçlar, Can Kalkanları, Bomba)
        for (const b of state.badges) {
          if (b.removed) continue;

          // Kılıç Savaşı Enerji Kılıcı
          if (state.mode === "blade" && !b.eliminated && b !== state.winner) {
            c.save();
            c.translate(b.x, b.y);
            c.rotate(b.bladeAngle);
            const bladeLen = cfg.bladeLength;
            // Kılıç kabzası
            c.fillStyle = "#facc15";
            c.fillRect(b.r - 4, -5, 10, 10);
            // Parlayan kılıç namlusu
            const bg = c.createLinearGradient(b.r + 4, 0, b.r + bladeLen, 0);
            bg.addColorStop(0, "#ffffff");
            bg.addColorStop(0.5, b.kills > 0 ? "#fde047" : "#38bdf8");
            bg.addColorStop(1, b.kills > 0 ? "#f97316" : "#818cf8");
            c.fillStyle = bg;
            c.shadowColor = b.kills > 0 ? "#f59e0b" : "#38bdf8";
            c.shadowBlur = 14;
            c.beginPath();
            c.moveTo(b.r + 4, -6);
            c.lineTo(b.r + bladeLen - 8, -4);
            c.lineTo(b.r + bladeLen + 4, 0);
            c.lineTo(b.r + bladeLen - 8, 4);
            c.lineTo(b.r + 4, 6);
            c.closePath();
            c.fill();
            c.restore();
          }

          c.save();
          c.translate(b.x, b.y);

          let drawR = b.r;
          if (b === state.winner) {
            const grow = 1 + Math.min(state.winnerTime * 1.45, 1.85);
            drawR = b.r * grow;
            const halo = c.createRadialGradient(0, 0, drawR * 0.5, 0, 0, drawR * 2.1);
            halo.addColorStop(0, "rgba(250, 204, 21, 0.72)");
            halo.addColorStop(0.55, "rgba(250, 204, 21, 0.2)");
            halo.addColorStop(1, "rgba(250, 204, 21, 0)");
            c.fillStyle = halo;
            c.beginPath();
            c.arc(0, 0, drawR * 2.1, 0, Math.PI * 2);
            c.fill();
          }

          // Hasar / Kalkan Halkaları (Blade & Laser)
          if (!b.eliminated && b !== state.winner && (state.mode === "blade" || state.mode === "laser")) {
            const segs = b.maxHp;
            const gapA = 0.28;
            const segA = (Math.PI * 2) / segs;
            for (let s = 0; s < segs; s++) {
              c.beginPath();
              c.arc(0, 0, drawR + 6, s * segA + gapA / 2 - Math.PI / 2, (s + 1) * segA - gapA / 2 - Math.PI / 2);
              c.lineWidth = 4.5;
              c.lineCap = "round";
              if (s < b.hp) {
                c.strokeStyle = b.hp === 1 ? "#f97316" : (state.mode === "laser" ? "#38bdf8" : "#34d399");
              } else {
                c.strokeStyle = "rgba(148, 163, 184, 0.22)";
              }
              c.stroke();
            }
          }

          // Kulüp Arması
          c.save();
          c.rotate(b.angle);
          c.shadowColor = b.flashTimer > 0 ? "rgba(244, 63, 94, 0.95)" : "rgba(0, 0, 0, 0.62)";
          c.shadowBlur = b.flashTimer > 0 ? 24 : 12;
          c.shadowOffsetY = 4;
          c.drawImage(b.sprite, -drawR, -drawR, drawR * 2, drawR * 2);
          c.restore();

          // Hasar kırmızı flaşı
          if (b.flashTimer > 0) {
            c.fillStyle = `rgba(244, 63, 94, ${b.flashTimer * 2.1})`;
            c.beginPath();
            c.arc(0, 0, drawR, 0, Math.PI * 2);
            c.fill();
          }

          // SAATLİ BOMBA GÖSTERGESİ
          if (state.mode === "bomb" && state.bombHolder === b && !state.winner) {
            const frac = Math.max(0, state.bombTimer / state.bombMaxTimer);
            const pulse = 1 + Math.sin(state.simTime * (12 + (1 - frac) * 24)) * 0.12;
            // Kırmızı/Turuncu geri sayım halkası
            c.beginPath();
            c.arc(0, 0, drawR + 12, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * frac);
            c.strokeStyle = frac < 0.33 ? "#ef4444" : "#facc15";
            c.lineWidth = 7;
            c.lineCap = "round";
            c.shadowColor = "#ef4444";
            c.shadowBlur = 18;
            c.stroke();

            // Bomba ikonu + süre
            c.save();
            c.translate(drawR * 0.72, -drawR * 0.72);
            c.scale(pulse, pulse);
            c.fillStyle = "#111827";
            c.strokeStyle = "#ef4444";
            c.lineWidth = 3;
            c.beginPath();
            c.arc(0, 0, 20, 0, Math.PI * 2);
            c.fill();
            c.stroke();
            c.font = "900 17px 'Inter', sans-serif";
            c.fillStyle = "#fef08a";
            c.textAlign = "center";
            c.textBaseline = "middle";
            c.fillText(Math.max(0.1, state.bombTimer).toFixed(1), 0, 1);
            c.restore();
          }

          c.restore();
        }

        // 7. Şok Dalgaları & Kıvılcımlar
        for (const sw of state.shockwaves) {
          c.save();
          c.globalAlpha = Math.max(0, sw.life / sw.maxLife);
          c.strokeStyle = sw.color;
          c.lineWidth = 8 * (sw.life / sw.maxLife);
          c.beginPath();
          c.arc(sw.x, sw.y, sw.r, 0, Math.PI * 2);
          c.stroke();
          c.restore();
        }
        for (const p of state.sparks) {
          c.fillStyle = p.color;
          c.globalAlpha = Math.max(0, p.life / p.maxLife);
          c.beginPath();
          c.arc(p.x, p.y, p.r, 0, Math.PI * 2);
          c.fill();
        }
        c.globalAlpha = 1;

        // 8. Arena Dış Halkası (Ring Modunda Boşluklu, Diğer Modlarda Kapalı Neon Halka)
        c.save();
        c.beginPath();
        c.arc(RING_CX, RING_CY, R + 18, 0, Math.PI * 2);
        c.strokeStyle = state.ringFlashAnim > 0
          ? `rgba(251, 113, 133, ${0.32 + state.ringFlashAnim * 0.55})`
          : finalTension ? "rgba(250, 204, 21, 0.45)" : theme.outerRing;
        c.lineWidth = 3.5;
        c.stroke();

        c.strokeStyle = state.ringFlashAnim > 0.25 ? "#ffe4e6" : (finalTension ? "#fef08a" : theme.ringStroke);
        c.lineWidth = 11;
        c.lineCap = "round";
        c.shadowColor = state.ringFlashAnim > 0.25 ? "rgba(244, 63, 94, 0.95)" : (finalTension ? "rgba(250, 204, 21, 0.95)" : theme.ringGlow);
        c.shadowBlur = 24 + state.ringFlashAnim * 18;

        if (state.mode === "ring") {
          const gapRad = (cfg.gapDegrees * Math.PI) / 180;
          const half = gapRad / 2;
          if (cfg.doubleGap) {
            // İki yay parçası
            c.beginPath();
            c.arc(RING_CX, RING_CY, R, state.ringAngle + half, state.ringAngle + Math.PI - half);
            c.stroke();
            c.beginPath();
            c.arc(RING_CX, RING_CY, R, state.ringAngle + Math.PI + half, state.ringAngle + Math.PI * 2 - half);
            c.stroke();
          } else {
            const arcStart = state.ringAngle + half;
            const arcEnd = state.ringAngle + Math.PI * 2 - half;
            c.beginPath();
            c.arc(RING_CX, RING_CY, R, arcStart, arcEnd);
            c.stroke();
            for (const ea of [arcStart, arcEnd]) {
              c.beginPath();
              c.arc(RING_CX + Math.cos(ea) * R, RING_CY + Math.sin(ea) * R, 11, 0, Math.PI * 2);
              c.fillStyle = "#ffffff";
              c.fill();
            }
          }
        } else {
          c.beginPath();
          c.arc(RING_CX, RING_CY, R, 0, Math.PI * 2);
          c.stroke();
        }
        c.restore();

        // 9. Son 2 Ağır Çekim Altın Vinyet Efekti
        if (state.slowMoActive) {
          const vig = c.createRadialGradient(BASE_W / 2, BASE_H / 2, BASE_W * 0.35, BASE_W / 2, BASE_H / 2, BASE_H * 0.65);
          vig.addColorStop(0, "rgba(0,0,0,0)");
          vig.addColorStop(1, "rgba(250, 204, 21, 0.24)");
          c.fillStyle = vig;
          c.fillRect(0, 0, BASE_W, BASE_H);
        }

        // 10. Alt Duyuru Alanı (Eleme / Şampiyonluk + Mini Elenenler Şeridi + Viral Hook)
        const feedY = 1585;
        if (state.winner) {
          for (const p of state.confetti) {
            c.save();
            c.translate(p.x, p.y);
            c.rotate(p.rot);
            c.fillStyle = p.color;
            c.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
            c.restore();
          }

          const pop = Math.min(1, state.winnerTime * 3.5);
          c.save();
          c.translate(BASE_W / 2, feedY);
          c.scale(0.84 + 0.16 * pop, 0.84 + 0.16 * pop);
          c.textAlign = "center";

          c.font = "900 54px 'Montserrat', sans-serif";
          c.fillStyle = "#facc15";
          c.shadowColor = "rgba(250, 204, 21, 0.78)";
          c.shadowBlur = 28;
          c.fillText("🏆 CHAMPION! 🏆", 0, -24);

          c.font = "900 62px 'Montserrat', sans-serif";
          c.fillStyle = "#ffffff";
          c.shadowColor = "rgba(56, 189, 248, 0.55)";
          c.shadowBlur = 20;
          c.fillText(state.winner.club.name, 0, 48);
          c.restore();
        } else if (state.bannerSubBadge) {
          const slideY = state.bannerAnim * 24;
          const alpha = Math.min(1, 1.35 - state.bannerAnim * 0.7);
          c.save();
          c.globalAlpha = Math.max(0.28, alpha);
          c.translate(BASE_W / 2, feedY + slideY);

          c.font = "900 42px 'Montserrat', sans-serif";
          const txt = state.bannerText;
          const textW = Math.min(760, c.measureText(txt).width);
          const iconSize = 86;
          const gapX = 22;
          const totalW = iconSize + gapX + textW;
          const startX = -totalW / 2;

          c.shadowColor = "rgba(0,0,0,0.6)";
          c.shadowBlur = 12;
          c.drawImage(state.bannerSubBadge.sprite, startX, -iconSize / 2, iconSize, iconSize);

          c.textAlign = "left";
          c.textBaseline = "middle";
          c.fillStyle = state.bannerAccent;
          c.shadowColor = state.bannerAccent;
          c.shadowBlur = 18;
          c.fillText(txt, startX + iconSize + gapX, 2, 760);
          c.restore();

          // Mini Elenenler Şeridi
          const recent = state.eliminatedList.slice(0, 9);
          if (recent.length > 0) {
            const miniSize = 46;
            const miniGap = 15;
            const rowW = recent.length * miniSize + (recent.length - 1) * miniGap;
            let mx = (BASE_W - rowW) / 2;
            c.save();
            recent.forEach((eb, i) => {
              c.globalAlpha = Math.max(0.22, 0.85 - i * 0.08);
              c.drawImage(eb.sprite, mx, 1672, miniSize, miniSize);
              mx += miniSize + miniGap;
            });
            c.restore();
          }
        }

        // Viral Alt Etkileşim Kancası (Hook)
        if (cfg.showViralHook && cfg.viralHook.trim()) {
          c.save();
          c.textAlign = "center";
          c.textBaseline = "middle";
          const hookText = cfg.viralHook.trim();
          c.font = "800 28px 'Inter', sans-serif";
          const pillW = Math.min(960, c.measureText(hookText).width + 70);
          c.fillStyle = "rgba(15, 23, 42, 0.78)";
          c.strokeStyle = "rgba(250, 204, 21, 0.45)";
          c.lineWidth = 2.5;
          c.beginPath();
          c.roundRect((BASE_W - pillW) / 2, 1765, pillW, 58, 29);
          c.fill();
          c.stroke();

          c.fillStyle = "#fef08a";
          c.fillText(hookText, BASE_W / 2, 1795, 910);
          c.restore();
        }

        // Filigran (@kullaniciadi)
        if (cfg.watermark && cfg.watermark.trim()) {
          c.save();
          c.textAlign = "center";
          c.textBaseline = "middle";
          c.font = "800 27px 'Montserrat', sans-serif";
          c.fillStyle = "rgba(226, 232, 240, 0.62)";
          c.shadowColor = "rgba(0, 0, 0, 0.8)";
          c.shadowBlur = 10;
          c.fillText(cfg.watermark.trim(), BASE_W / 2, 1868);
          c.restore();
        }

        c.restore();
      }
