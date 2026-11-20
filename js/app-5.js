"use strict";
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

      function drawWatermark(c, text, theme, yPos = 1470) {
        const wm = theme.wm || { accent: "#cbd5e1", glyph: "dot" };
        const y = yPos;
        c.save();
        c.globalAlpha = 0.72;
        c.font = "700 25px 'Montserrat', sans-serif";
        c.textBaseline = "middle";
        const label = text.toUpperCase();
        const spacing = 5;
        let tw = 0;
        for (const ch of label) tw += c.measureText(ch).width + spacing;
        tw -= spacing;
        const gW = 26;
        const total = gW + 14 + tw;
        let x = BASE_W / 2 - total / 2;
        const gx = x + gW / 2;
        c.fillStyle = wm.accent;
        c.strokeStyle = wm.accent;
        c.lineWidth = 3;
        c.shadowColor = "rgba(0,0,0,0.7)";
        c.shadowBlur = 8;
        if (wm.glyph === "star") {
          c.beginPath();
          for (let i = 0; i < 10; i++) { const r = i % 2 ? 4.5 : 11; const a = -Math.PI / 2 + (i * Math.PI) / 5; c.lineTo(gx + Math.cos(a) * r, y + Math.sin(a) * r); }
          c.closePath(); c.fill();
        } else if (wm.glyph === "bar") {
          c.fillRect(gx - 12, y - 3, 24, 6);
        } else if (wm.glyph === "crescent") {
          c.beginPath(); c.arc(gx, y, 11, 0, Math.PI * 2); c.fill();
          c.globalCompositeOperation = "destination-out";
          c.beginPath(); c.arc(gx + 4.5, y, 8.6, 0, Math.PI * 2); c.fill();
          c.globalCompositeOperation = "source-over";
        } else if (wm.glyph === "diamond") {
          c.beginPath(); c.moveTo(gx, y - 11); c.lineTo(gx + 9, y); c.lineTo(gx, y + 11); c.lineTo(gx - 9, y); c.closePath(); c.fill();
        } else if (wm.glyph === "chevron") {
          c.beginPath(); c.moveTo(gx - 9, y - 8); c.lineTo(gx + 2, y); c.lineTo(gx - 9, y + 8); c.stroke();
          c.beginPath(); c.moveTo(gx - 1, y - 8); c.lineTo(gx + 10, y); c.lineTo(gx - 1, y + 8); c.stroke();
        } else {
          c.beginPath(); c.arc(gx, y, 7, 0, Math.PI * 2); c.fill();
        }
        x += gW + 14;
        c.fillStyle = "rgba(241, 245, 249, 0.92)";
        for (const ch of label) {
          c.fillText(ch, x, y + 1);
          x += c.measureText(ch).width + spacing;
        }
        c.restore();
      }

      // Lig logoları (ESPN)
      const leagueLogoCache = {};
      function getLeagueLogo(slug) {
        if (!slug) return null;
        const entry = leagueLogoCache[slug];
        if (entry) return entry.ready ? entry.img : null;
        leagueLogoCache[slug] = { ready: false, img: null };
        fetch(`https://sports.core.api.espn.com/v2/sports/soccer/leagues/${slug}`)
          .then((r) => r.json())
          .then((l) => {
            const logos = l.logos || [];
            const pick = logos.find((x) => (x.rel || []).includes("dark")) || logos[0];
            if (!pick) return;
            loadImageWithMirrors(pick.href.replace(/^http:/, "https:"), (img) => {
              leagueLogoCache[slug] = { ready: true, img };
            });
          })
          .catch(() => {});
        return null;
      }

      function renderSimState(c, state, cfg, targetW = BASE_W, targetH = BASE_H) {
        if (state.mode === "match") return renderMatchState(c, state, cfg, targetW, targetH);
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

        // Kupa arkası spot ışığı
        const spot = c.createRadialGradient(RING_CX, RING_CY - 40, 20, RING_CX, RING_CY, R * 0.95);
        spot.addColorStop(0, "rgba(255,255,255,0.10)");
        spot.addColorStop(0.5, theme.auraColor);
        spot.addColorStop(1, "rgba(0,0,0,0)");
        c.fillStyle = spot;
        c.fillRect(RING_CX - R, RING_CY - R, R * 2, R * 2);

        const trophyAlpha = 0.42 + Math.sin(state.simTime * 1.6) * 0.04 + (state.winner ? 0.38 : 0);
        c.save();
        c.globalAlpha = Math.min(0.95, trophyAlpha);
        const customTrophyImg = customTrophies[cfg.theme];
        if (customTrophyImg) {
          const sc = Math.min(500 / customTrophyImg.naturalWidth, 560 / customTrophyImg.naturalHeight);
          const tw = customTrophyImg.naturalWidth * sc;
          const th = customTrophyImg.naturalHeight * sc;
          c.drawImage(customTrophyImg, RING_CX - tw / 2, RING_CY - th / 2 + 12, tw, th);
        } else {
          const tCanv = getTrophyCanvas(theme.trophy);
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

        // Lig logosu
        if (cfg.showLeagueLogo) {
          const lg = getLeagueLogo(cfg.leagueSlug || theme.leagueSlug);
          if (lg) {
            const box = 96;
            const sc = Math.min(box / lg.naturalWidth, box / lg.naturalHeight);
            const w = lg.naturalWidth * sc, h = lg.naturalHeight * sc;
            c.save();
            c.shadowColor = "rgba(0,0,0,0.6)";
            c.shadowBlur = 14;
            c.drawImage(lg, BASE_W / 2 - w / 2, 136 - h / 2, w, h);
            c.restore();
          }
        }

        c.font = "800 34px 'Montserrat', sans-serif";
        c.fillStyle = theme.subColor;
        c.shadowColor = theme.subColor + "66";
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
          const bm = state.mode === "bomb" && !state.winner ? bombOf(state, b) : null;
          if (bm) {
            const frac = Math.max(0, bm.timer / bm.max);
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
            c.fillText(Math.max(0.1, bm.timer).toFixed(1), 0, 1);
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

        // Filigran (tema başına ayrı, abartısız)
        if (cfg.watermark && cfg.watermark.trim()) drawWatermark(c, cfg.watermark.trim(), theme);

        c.restore();
      }

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
          encoderBadge.className = "hidden md:block px-3 py-1.5 rounded-full text-xs font-semibold bg-emerald-950/90 border border-emerald-600/60 text-emerald-300";
        } else if (typeof MediaRecorder !== "undefined") {
          encoderBadge.textContent = "✓ Tarayıcı Video Motoru Hazır";
          encoderBadge.className = "hidden md:block px-3 py-1.5 rounded-full text-xs font-semibold bg-amber-950/90 border border-amber-600/60 text-amber-200";
        } else {
          encoderBadge.textContent = "Video Motoru Desteklenmiyor";
          encoderBadge.className = "hidden md:block px-3 py-1.5 rounded-full text-xs font-semibold bg-rose-950 border border-rose-700 text-rose-200";
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
