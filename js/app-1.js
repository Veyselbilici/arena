"use strict";
      /* =========================================================================
         1. SABİTLER, TEMALAR VE 36 GERÇEK FUTBOL KULÜBÜ
         ========================================================================= */
      const BASE_W = 1080;
      const BASE_H = 1920;
      const RING_CX = 540;
      const RING_CY = 1005;
      const BASE_RING_R = 415; // Sol/sağ 125px güvenlik boşluğu -> 100% görünür halka

      const THEMES = {
        ucl: {
          name: "UEFA Şampiyonlar Ligi",
          subDefault: "UEFA CHAMPIONS LEAGUE",
          leagueSlug: "uefa.champions",
          bg0: "#162d7d", bg1: "#080e2e", bg2: "#040718", bg3: "#02030c",
          rayColor: "rgba(56, 189, 248, 0.14)",
          auraColor: "rgba(37, 99, 235, 0.28)",
          ringStroke: "#ffffff",
          ringGlow: "rgba(147, 197, 253, 0.92)",
          outerRing: "rgba(191, 219, 254, 0.30)",
          subColor: "#e2e8f0",
          sparkColor: "#bae6fd",
          trophy: "ucl",
          emberMode: false,
          wm: { accent: "#cbd5e1", glyph: "star" },
          sound: { key: 0, wave: "triangle", brass: "sawtooth", fanfare: [293.66, 369.99, 440, 587.33, 739.99, 880], crowd: 0.55 }
        },
        europa: {
          name: "UEFA Avrupa Ligi",
          subDefault: "UEFA EUROPA LEAGUE",
          leagueSlug: "uefa.europa",
          bg0: "#4c1d09", bg1: "#1c0a04", bg2: "#0c0402", bg3: "#050201",
          rayColor: "rgba(249, 115, 22, 0.16)",
          auraColor: "rgba(234, 88, 12, 0.34)",
          ringStroke: "#ffedd5",
          ringGlow: "rgba(249, 115, 22, 0.95)",
          outerRing: "rgba(251, 146, 60, 0.36)",
          subColor: "#fb923c",
          sparkColor: "#fdba74",
          trophy: "europa",
          emberMode: true,
          wm: { accent: "#fb923c", glyph: "bar" },
          sound: { key: -2, wave: "sawtooth", brass: "sawtooth", fanfare: [261.63, 329.63, 392, 523.25, 659.25, 783.99], crowd: 0.5 }
        },
        conference: {
          name: "UEFA Konferans Ligi",
          subDefault: "UEFA CONFERENCE LEAGUE",
          leagueSlug: "uefa.europa.conf",
          bg0: "#0f3d2a", bg1: "#062016", bg2: "#03110b", bg3: "#010805",
          rayColor: "rgba(163, 230, 53, 0.13)",
          auraColor: "rgba(34, 197, 94, 0.28)",
          ringStroke: "#ecfccb",
          ringGlow: "rgba(163, 230, 53, 0.9)",
          outerRing: "rgba(190, 242, 100, 0.32)",
          subColor: "#bef264",
          sparkColor: "#d9f99d",
          trophy: "conference",
          emberMode: false,
          wm: { accent: "#a3e635", glyph: "dot" },
          sound: { key: 3, wave: "square", brass: "square", fanfare: [329.63, 415.3, 493.88, 659.25, 830.61, 987.77], crowd: 0.4 }
        },
        superlig: {
          name: "Süper Lig / Derbi Ateşi",
          subDefault: "TÜRKİYE SÜPER LİG",
          leagueSlug: "tur.1",
          bg0: "#5c0f1d", bg1: "#25060e", bg2: "#120308", bg3: "#070104",
          rayColor: "rgba(250, 204, 21, 0.14)",
          auraColor: "rgba(220, 38, 38, 0.32)",
          ringStroke: "#fef08a",
          ringGlow: "rgba(245, 158, 11, 0.92)",
          outerRing: "rgba(251, 146, 60, 0.34)",
          subColor: "#fde047",
          sparkColor: "#fdba74",
          trophy: "superlig",
          emberMode: true,
          wm: { accent: "#ef4444", glyph: "crescent" },
          sound: { key: 1, wave: "sawtooth", brass: "sawtooth", fanfare: [277.18, 349.23, 415.3, 554.37, 698.46, 830.61], crowd: 0.9, drums: true }
        },
        worldcup: {
          name: "Dünya Kupası / Milli Takımlar",
          subDefault: "WORLD CUP SURVIVAL",
          leagueSlug: "fifa.world",
          bg0: "#0b4632", bg1: "#052219", bg2: "#03120d", bg3: "#010806",
          rayColor: "rgba(250, 204, 21, 0.15)",
          auraColor: "rgba(16, 185, 129, 0.28)",
          ringStroke: "#fef9c3",
          ringGlow: "rgba(250, 204, 21, 0.92)",
          outerRing: "rgba(250, 204, 21, 0.32)",
          subColor: "#facc15",
          sparkColor: "#fde047",
          trophy: "worldcup",
          emberMode: false,
          wm: { accent: "#facc15", glyph: "diamond" },
          sound: { key: 5, wave: "triangle", brass: "sawtooth", fanfare: [349.23, 440, 523.25, 698.46, 880, 1046.5], crowd: 0.75, drums: true }
        },
        league: {
          name: "Ulusal Lig (Premium)",
          subDefault: "LEAGUE SURVIVAL",
          leagueSlug: null,
          bg0: "#1f2937", bg1: "#0d1320", bg2: "#070b14", bg3: "#03050a",
          rayColor: "rgba(45, 212, 191, 0.12)",
          auraColor: "rgba(20, 184, 166, 0.24)",
          ringStroke: "#f1f5f9",
          ringGlow: "rgba(94, 234, 212, 0.85)",
          outerRing: "rgba(153, 246, 228, 0.28)",
          subColor: "#5eead4",
          sparkColor: "#ccfbf1",
          trophy: "league",
          emberMode: false,
          wm: { accent: "#2dd4bf", glyph: "chevron" },
          sound: { key: -1, wave: "triangle", brass: "triangle", fanfare: [246.94, 311.13, 369.99, 493.88, 622.25, 739.99], crowd: 0.6 }
        }
      };

      // Büyük ligler için renk varyasyonlu kendi temaları
      const LEAGUE_THEME_VARIANTS = {
        premier:    { name: "Premier League", sub: "PREMIER LEAGUE", slug: "eng.1", bg: ["#3d0d4f", "#1a0624", "#0c0312", "#050108"], accent: "#e879f9", glow: "rgba(217, 70, 239, 0.9)", key: 2, glyph: "chevron" },
        laliga:     { name: "LaLiga", sub: "LALIGA", slug: "esp.1", bg: ["#5a1408", "#260804", "#130402", "#070101"], accent: "#fb7185", glow: "rgba(244, 63, 94, 0.9)", key: 4, glyph: "dot" },
        seriea:     { name: "Serie A", sub: "SERIE A", slug: "ita.1", bg: ["#0b2e5c", "#061630", "#030b19", "#01050c"], accent: "#38bdf8", glow: "rgba(14, 165, 233, 0.9)", key: -3, glyph: "diamond" },
        bundesliga: { name: "Bundesliga", sub: "BUNDESLIGA", slug: "ger.1", bg: ["#4a0a0a", "#220505", "#110303", "#060101"], accent: "#f87171", glow: "rgba(239, 68, 68, 0.9)", key: -4, glyph: "bar" },
        ligue1:     { name: "Ligue 1", sub: "LIGUE 1", slug: "fra.1", bg: ["#10233f", "#081221", "#040911", "#010307"], accent: "#a3e635", glow: "rgba(132, 204, 22, 0.85)", key: 6, glyph: "star" },
        eredivisie: { name: "Eredivisie", sub: "EREDIVISIE", slug: "ned.1", bg: ["#5a2a05", "#291303", "#140901", "#070300"], accent: "#fb923c", glow: "rgba(249, 115, 22, 0.9)", key: 0, glyph: "bar" },
        liga_pt:    { name: "Liga Portugal", sub: "LIGA PORTUGAL", slug: "por.1", bg: ["#083d2c", "#041d15", "#020e0a", "#010604"], accent: "#facc15", glow: "rgba(250, 204, 21, 0.85)", key: -5, glyph: "diamond" }
      };
      Object.entries(LEAGUE_THEME_VARIANTS).forEach(([k, v]) => {
        const base = THEMES.league;
        THEMES[k] = {
          ...base,
          name: v.name,
          subDefault: v.sub,
          leagueSlug: v.slug,
          bg0: v.bg[0], bg1: v.bg[1], bg2: v.bg[2], bg3: v.bg[3],
          rayColor: v.glow.replace(/[\d.]+\)$/, "0.13)"),
          auraColor: v.glow.replace(/[\d.]+\)$/, "0.26)"),
          ringGlow: v.glow,
          outerRing: v.glow.replace(/[\d.]+\)$/, "0.3)"),
          subColor: v.accent,
          sparkColor: v.accent,
          wm: { accent: v.accent, glyph: v.glyph },
          sound: { ...base.sound, key: v.key }
        };
      });

      const INITIAL_CLUBS = [
        // ===== TÜRKİYE SÜPER LİG & TÜRK KULÜPLERİ (20) =====
        { key: "galatasaray", id: 432,   cat: "superlig", name: "GALATASARAY",      short: "GS",   c1: "#a90432", c2: "#fdb912", ucl: true },
        { key: "fenerbahce",  id: 436,   cat: "superlig", name: "FENERBAHCE",       short: "FB",   c1: "#002d72", c2: "#ffed00", ucl: true },
        { key: "besiktas",    id: 1895,  cat: "superlig", name: "BESIKTAS",         short: "BJK",  c1: "#111111", c2: "#ffffff" },
        { key: "trabzonspor", id: 997,   cat: "superlig", name: "TRABZONSPOR",      short: "TS",   c1: "#6d1b36", c2: "#3b82f6" },
        { key: "basaksehir",  id: 7914,  cat: "superlig", name: "BASAKSEHIR",       short: "IBFK", c1: "#f97316", c2: "#1e3a8a" },
        { key: "samsunspor",  id: 11429,  cat: "superlig", name: "SAMSUNSPOR",       short: "SAM",  c1: "#dc2626", c2: "#ffffff" },
        { key: "goztepe",     id: 789,  cat: "superlig", name: "GOZTEPE",          short: "GOZ",  c1: "#eab308", c2: "#dc2626" },
        { key: "kasimpasa",   id: 6870,  cat: "superlig", name: "KASIMPASA",        short: "KAS",  c1: "#1d4ed8", c2: "#ffffff" },
        { key: "antalyaspor", id: 3794,  cat: "superlig", name: "ANTALYASPOR",      short: "ANT",  c1: "#dc2626", c2: "#ffffff" },
        { key: "alanyaspor",  id: 9078, cat: "superlig", name: "ALANYASPOR",       short: "ALA",  c1: "#f97316", c2: "#15803d" },
        { key: "rizespor",    id: 7656,  cat: "superlig", name: "CAYKUR RIZESPOR",  short: "RIZ",  c1: "#15803d", c2: "#2563eb" },
        { key: "konyaspor",   id: 7648,  cat: "superlig", name: "KONYASPOR",        short: "KON",  c1: "#15803d", c2: "#ffffff" },
        { key: "kayserispor", id: 3643,  cat: "superlig", name: "KAYSERISPOR",      short: "KAY",  c1: "#eab308", c2: "#dc2626" },
        { key: "gaziantep",   id: 20070, cat: "superlig", name: "GAZIANTEP FK",     short: "GFK",  c1: "#b91c1c", c2: "#111111" },
        { key: "sivasspor",   id: 3691,  cat: "superlig", name: "SIVASSPOR",        short: "SIV",  c1: "#dc2626", c2: "#ffffff" },
        { key: "hatayspor",   id: 20737, cat: "superlig", name: "HATAYSPOR",        short: "HAT",  c1: "#7f1d1d", c2: "#ffffff" },
        { key: "adanademir",  id: 20765, cat: "superlig", name: "ADANA DEMIRSPOR",  short: "ADS",  c1: "#1d4ed8", c2: "#38bdf8" },
        { key: "eyupspor",    id: 20729, cat: "superlig", name: "EYUPSPOR",         short: "EYP",  c1: "#6b21a8", c2: "#facc15" },
        { key: "bodrumfk",    id: 22321, cat: "superlig", name: "BODRUM FK",        short: "BOD",  c1: "#15803d", c2: "#ffffff" },
        { key: "bursaspor",   id: 810,   cat: "superlig", name: "BURSASPOR",        short: "BUR",  c1: "#16a34a", c2: "#ffffff" },

        // ===== İNGİLTERE PREMIER LEAGUE (20) =====
        { key: "man_city",    id: 382,   cat: "premier",  name: "MAN CITY",         short: "MCI",  c1: "#6cabdd", c2: "#1c2c5b", ucl: true },
        { key: "arsenal",     id: 359,   cat: "premier",  name: "ARSENAL",          short: "ARS",  c1: "#ef0107", c2: "#d4af37", ucl: true },
        { key: "liverpool",   id: 364,   cat: "premier",  name: "LIVERPOOL",        short: "LFC",  c1: "#c8102e", c2: "#f6eb61", ucl: true },
        { key: "chelsea",     id: 363,   cat: "premier",  name: "CHELSEA",          short: "CFC",  c1: "#034694", c2: "#dba111" },
        { key: "man_united",  id: 360,   cat: "premier",  name: "MAN UNITED",       short: "MUN",  c1: "#da291c", c2: "#fbe122", ucl: true },
        { key: "tottenham",   id: 367,   cat: "premier",  name: "TOTTENHAM",        short: "TOT",  c1: "#132257", c2: "#ffffff" },
        { key: "newcastle",   id: 361,   cat: "premier",  name: "NEWCASTLE",        short: "NEW",  c1: "#111111", c2: "#ffffff" },
        { key: "aston_villa", id: 362,   cat: "premier",  name: "ASTON VILLA",      short: "AVL",  c1: "#670e36", c2: "#95bfe5", ucl: true },
        { key: "west_ham",    id: 371,   cat: "premier",  name: "WEST HAM",         short: "WHU",  c1: "#7a263a", c2: "#1bb1e7" },
        { key: "brighton",    id: 331,   cat: "premier",  name: "BRIGHTON",         short: "BHA",  c1: "#0057b8", c2: "#ffffff" },
        { key: "crystal_pal", id: 384,   cat: "premier",  name: "CRYSTAL PALACE",   short: "CRY",  c1: "#1b458f", c2: "#c4122e" },
        { key: "fulham",      id: 370,   cat: "premier",  name: "FULHAM",           short: "FUL",  c1: "#111111", c2: "#ffffff" },
        { key: "brentford",   id: 337,   cat: "premier",  name: "BRENTFORD",        short: "BRE",  c1: "#e30613", c2: "#ffffff" },
        { key: "everton",     id: 368,   cat: "premier",  name: "EVERTON",          short: "EVE",  c1: "#003399", c2: "#ffffff" },
        { key: "nott_forest", id: 393,   cat: "premier",  name: "NOTT FOREST",      short: "NFO",  c1: "#dd0000", c2: "#ffffff" },
        { key: "wolves",      id: 380,   cat: "premier",  name: "WOLVES",           short: "WOL",  c1: "#fdb913", c2: "#231f20" },
        { key: "bournemouth", id: 349,   cat: "premier",  name: "BOURNEMOUTH",      short: "BOU",  c1: "#da291c", c2: "#111111" },
        { key: "leicester",   id: 375,   cat: "premier",  name: "LEICESTER CITY",   short: "LEI",  c1: "#003090", c2: "#fdbe11" },
        { key: "ipswich",     id: 373,   cat: "premier",  name: "IPSWICH TOWN",     short: "IPS",  c1: "#3a64a3", c2: "#ffffff" },
        { key: "southampton", id: 376,   cat: "premier",  name: "SOUTHAMPTON",      short: "SOU",  c1: "#d71920", c2: "#ffffff" },

        // ===== İSPANYA LA LIGA (16) =====
        { key: "real_madrid", id: 86,    cat: "laliga",   name: "REAL MADRID",      short: "RMA",  c1: "#ffffff", c2: "#f5c542", ucl: true },
        { key: "barcelona",   id: 83,    cat: "laliga",   name: "BARCELONA",        short: "FCB",  c1: "#004d98", c2: "#a50044", ucl: true },
        { key: "atletico",    id: 1068,  cat: "laliga",   name: "ATLETICO MADRID",  short: "ATM",  c1: "#cb3524", c2: "#1e3a8a", ucl: true },
        { key: "bilbao",      id: 93,    cat: "laliga",   name: "ATHLETIC BILBAO",  short: "ATH",  c1: "#ee2523", c2: "#ffffff" },
        { key: "sociedad",    id: 89,    cat: "laliga",   name: "REAL SOCIEDAD",    short: "RSO",  c1: "#0067b1", c2: "#ffffff" },
        { key: "villarreal",  id: 102,   cat: "laliga",   name: "VILLARREAL",       short: "VIL",  c1: "#ffe667", c2: "#005187", ucl: true },
        { key: "betis",       id: 244,   cat: "laliga",   name: "REAL BETIS",       short: "BET",  c1: "#0bb363", c2: "#ffffff", ucl: true },
        { key: "sevilla",     id: 243,   cat: "laliga",   name: "SEVILLA",          short: "SEV",  c1: "#d40026", c2: "#ffffff" },
        { key: "valencia",    id: 94,    cat: "laliga",   name: "VALENCIA",         short: "VAL",  c1: "#ee3524", c2: "#111111" },
        { key: "girona",      id: 9812,  cat: "laliga",   name: "GIRONA",           short: "GIR",  c1: "#cd2534", c2: "#ffffff" },
        { key: "celta_vigo",  id: 85,    cat: "laliga",   name: "CELTA VIGO",       short: "CEL",  c1: "#8ac3ee", c2: "#ffffff" },
        { key: "osasuna",     id: 97,    cat: "laliga",   name: "OSASUNA",          short: "OSA",  c1: "#d91a21", c2: "#0a346f" },
        { key: "mallorca",    id: 84,    cat: "laliga",   name: "MALLORCA",         short: "MLL",  c1: "#e20613", c2: "#111111" },
        { key: "getafe",      id: 2922,  cat: "laliga",   name: "GETAFE",           short: "GET",  c1: "#005999", c2: "#ffffff" },
        { key: "rayo",        id: 101,   cat: "laliga",   name: "RAYO VALLECANO",   short: "RAY",  c1: "#e53027", c2: "#ffffff" },
        { key: "espanyol",    id: 88,    cat: "laliga",   name: "ESPANYOL",         short: "ESP",  c1: "#007fc8", c2: "#ffffff" },

        // ===== İTALYA SERIE A (16) =====
        { key: "inter",       id: 110,   cat: "seriea",   name: "INTER MILAN",      short: "INT",  c1: "#010e80", c2: "#111111", ucl: true },
        { key: "ac_milan",    id: 103,   cat: "seriea",   name: "AC MILAN",         short: "ACM",  c1: "#fb090b", c2: "#111111" },
        { key: "juventus",    id: 111,   cat: "seriea",   name: "JUVENTUS",         short: "JUV",  c1: "#111111", c2: "#ffffff" },
        { key: "napoli",      id: 114,   cat: "seriea",   name: "NAPOLI",           short: "NAP",  c1: "#008fd7", c2: "#003c82", ucl: true },
        { key: "roma",        id: 104,   cat: "seriea",   name: "AS ROMA",          short: "ASR",  c1: "#8e1f2f", c2: "#f0bc42", ucl: true },
        { key: "lazio",       id: 112,   cat: "seriea",   name: "LAZIO",            short: "LAZ",  c1: "#87d8f7", c2: "#ffffff" },
        { key: "atalanta",    id: 105,   cat: "seriea",   name: "ATALANTA",         short: "ATA",  c1: "#1e71b8", c2: "#111111" },
        { key: "fiorentina",  id: 109,   cat: "seriea",   name: "FIORENTINA",       short: "FIO",  c1: "#482e92", c2: "#ffffff" },
        { key: "bologna",     id: 107,   cat: "seriea",   name: "BOLOGNA",          short: "BOL",  c1: "#a21c26", c2: "#1a2f48" },
        { key: "torino",      id: 239,   cat: "seriea",   name: "TORINO",           short: "TOR",  c1: "#8a1e03", c2: "#ffffff" },
        { key: "udinese",     id: 118,   cat: "seriea",   name: "UDINESE",          short: "UDI",  c1: "#111111", c2: "#ffffff" },
        { key: "genoa",       id: 3263,  cat: "seriea",   name: "GENOA",            short: "GEN",  c1: "#991f23", c2: "#00235f" },
        { key: "como",        id: 2572,  cat: "seriea",   name: "COMO",             short: "COM",  c1: "#0055a5", c2: "#ffffff", ucl: true },
        { key: "parma",       id: 115,   cat: "seriea",   name: "PARMA",            short: "PAR",  c1: "#fedd00", c2: "#0033a0" },
        { key: "cagliari",    id: 2925,  cat: "seriea",   name: "CAGLIARI",         short: "CAG",  c1: "#a1172b", c2: "#002350" },
        { key: "lecce",       id: 113,   cat: "seriea",   name: "LECCE",            short: "LEC",  c1: "#f5c518", c2: "#cc0000" },

        // ===== ALMANYA BUNDESLIGA (14) =====
        { key: "bayern",      id: 132,   cat: "bundesliga", name: "BAYERN MUNICH",  short: "BAY",  c1: "#dc052d", c2: "#0066b2", ucl: true },
        { key: "dortmund",    id: 124,   cat: "bundesliga", name: "DORTMUND",       short: "BVB",  c1: "#fde100", c2: "#111827", ucl: true },
        { key: "leverkusen",  id: 131,   cat: "bundesliga", name: "LEVERKUSEN",     short: "B04",  c1: "#e32221", c2: "#111111" },
        { key: "leipzig",     id: 11420, cat: "bundesliga", name: "RB LEIPZIG",     short: "RBL",  c1: "#dd0741", c2: "#001f47", ucl: true },
        { key: "stuttgart",   id: 134,   cat: "bundesliga", name: "VFB STUTTGART",  short: "VFB",  c1: "#e32219", c2: "#ffffff", ucl: true },
        { key: "frankfurt",   id: 125,   cat: "bundesliga", name: "FRANKFURT",      short: "SGE",  c1: "#e1000f", c2: "#111111" },
        { key: "wolfsburg",   id: 138,   cat: "bundesliga", name: "WOLFSBURG",      short: "WOB",  c1: "#65b32e", c2: "#ffffff" },
        { key: "freiburg",    id: 126,   cat: "bundesliga", name: "SC FREIBURG",    short: "SCF",  c1: "#d20515", c2: "#111111" },
        { key: "gladbach",    id: 268,   cat: "bundesliga", name: "GLADBACH",       short: "BMG",  c1: "#111111", c2: "#ffffff" },
        { key: "werder",      id: 137,   cat: "bundesliga", name: "WERDER BREMEN",  short: "SVW",  c1: "#1d9053", c2: "#ffffff" },
        { key: "hoffenheim",  id: 7911,  cat: "bundesliga", name: "HOFFENHEIM",     short: "TSG",  c1: "#1961b5", c2: "#ffffff" },
        { key: "mainz",       id: 2950,  cat: "bundesliga", name: "MAINZ 05",       short: "M05",  c1: "#c3141e", c2: "#ffffff" },
        { key: "union_ber",   id: 598,   cat: "bundesliga", name: "UNION BERLIN",   short: "FCU",  c1: "#eb1923", c2: "#facc15" },
        { key: "augsburg",    id: 3841,  cat: "bundesliga", name: "FC AUGSBURG",    short: "FCA",  c1: "#ba3733", c2: "#166534" },

        // ===== FRANSA & AVRUPA DEVLERİ (29) =====
        { key: "psg",         id: 160,   cat: "europe",   name: "PSG",              short: "PSG",  c1: "#004170", c2: "#da291c", ucl: true },
        { key: "marseille",   id: 176,   cat: "europe",   name: "MARSEILLE",        short: "OM",   c1: "#2faee0", c2: "#ffffff" },
        { key: "monaco",      id: 174,   cat: "europe",   name: "AS MONACO",        short: "ASM",  c1: "#e51b22", c2: "#ffffff" },
        { key: "lyon",        id: 167,   cat: "europe",   name: "LYON",             short: "OL",   c1: "#14387f", c2: "#da001a" },
        { key: "lille",       id: 166,   cat: "europe",   name: "LILLE",            short: "LOSC", c1: "#e01e13", c2: "#16214c", ucl: true },
        { key: "nice",        id: 2502,  cat: "europe",   name: "OGC NICE",         short: "OGC",  c1: "#cc0000", c2: "#111111" },
        { key: "lens",        id: 175,   cat: "europe",   name: "RC LENS",          short: "RCL",  c1: "#ec1c24", c2: "#facc15", ucl: true },
        { key: "rennes",      id: 169,   cat: "europe",   name: "RENNES",           short: "SRFC", c1: "#e30613", c2: "#111111" },
        { key: "ajax",        id: 139,   cat: "europe",   name: "AJAX",             short: "AJA",  c1: "#ffffff", c2: "#d2122e" },
        { key: "psv",         id: 148,   cat: "europe",   name: "PSV EINDHOVEN",    short: "PSV",  c1: "#ed1c24", c2: "#ffffff", ucl: true },
        { key: "feyenoord",   id: 142,   cat: "europe",   name: "FEYENOORD",        short: "FEY",  c1: "#ee1c25", c2: "#111111", ucl: true },
        { key: "benfica",     id: 1929,  cat: "europe",   name: "BENFICA",          short: "SLB",  c1: "#e30613", c2: "#f5c542" },
        { key: "porto",       id: 437,   cat: "europe",   name: "FC PORTO",         short: "FCP",  c1: "#00428c", c2: "#ffffff", ucl: true },
        { key: "sporting",    id: 2250,  cat: "europe",   name: "SPORTING CP",      short: "SCP",  c1: "#008057", c2: "#ffffff", ucl: true },
        { key: "celtic",      id: 256,   cat: "europe",   name: "CELTIC",           short: "CEL",  c1: "#018749", c2: "#ffffff" },
        { key: "rangers",     id: 257,   cat: "europe",   name: "RANGERS",          short: "RAN",  c1: "#1b458f", c2: "#e11d48" },
        { key: "olympiacos",  id: 435,   cat: "europe",   name: "OLYMPIACOS",       short: "OLY",  c1: "#d71920", c2: "#ffffff" },
        { key: "paok",        id: 605,   cat: "europe",   name: "PAOK",             short: "PAOK", c1: "#111111", c2: "#ffffff" },
        { key: "panathinaikos", id: 443, cat: "europe",   name: "PANATHINAIKOS",    short: "PAO",  c1: "#007a33", c2: "#ffffff" },
        { key: "aek_athens",  id: 887,   cat: "europe",   name: "AEK ATHENS",       short: "AEK",  c1: "#facc15", c2: "#111111", ucl: true },
        { key: "brugge",      id: 570,   cat: "europe",   name: "CLUB BRUGGE",      short: "BRU",  c1: "#0072ce", c2: "#111111", ucl: true },
        { key: "shakhtar",    id: 493,   cat: "europe",   name: "SHAKHTAR",         short: "SHK",  c1: "#f36f21", c2: "#111111", ucl: true },
        { key: "salzburg",    id: 2790,  cat: "europe",   name: "RB SALZBURG",      short: "RBS",  c1: "#cc0033", c2: "#ffffff" },
        { key: "dinamo_zag",  id: 597,   cat: "europe",   name: "DINAMO ZAGREB",    short: "DIN",  c1: "#0055a5", c2: "#ffffff" },
        { key: "red_star",    id: 2290,   cat: "europe",   name: "RED STAR",         short: "CZV",  c1: "#e30613", c2: "#ffffff" },
        { key: "bodo_glimt",  id: 2980,  cat: "europe",   name: "BODO/GLIMT",       short: "BOD",  c1: "#facc15", c2: "#111111", ucl: true },
        { key: "copenhagen",  id: 909,   cat: "europe",   name: "FC COPENHAGEN",    short: "FCK",  c1: "#003da5", c2: "#ffffff" },
        { key: "slavia_prg",  id: 494,   cat: "europe",   name: "SLAVIA PRAGUE",    short: "SLA",  c1: "#e30613", c2: "#ffffff", ucl: true },
        { key: "sparta_prg",  id: 433,   cat: "europe",   name: "SPARTA PRAGUE",    short: "SPA",  c1: "#8b0000", c2: "#facc15" },

        // ===== DÜNYA DEVLERİ (MLS, SUUDİ ARABİSTAN, GÜNEY AMERİKA - 10) =====
        { key: "inter_miami", id: 20232, cat: "world",    name: "INTER MIAMI",      short: "MIA",  c1: "#f7b5cd", c2: "#231f20" },
        { key: "al_nassr",    id: 817,   cat: "world",    name: "AL-NASSR",         short: "NAS",  c1: "#facc15", c2: "#1d4ed8" },
        { key: "al_hilal",    id: 929,   cat: "world",    name: "AL-HILAL",         short: "HIL",  c1: "#1d4ed8", c2: "#ffffff" },
        { key: "al_ittihad",  id: 2276,   cat: "world",    name: "AL-ITTIHAD",       short: "ITT",  c1: "#facc15", c2: "#111111" },
        { key: "boca",        id: 5,     cat: "world",    name: "BOCA JUNIORS",     short: "BOC",  c1: "#0033a0", c2: "#facc15" },
        { key: "river",       id: 16,    cat: "world",    name: "RIVER PLATE",      short: "RIV",  c1: "#ffffff", c2: "#e30613" },
        { key: "flamengo",    id: 819,   cat: "world",    name: "FLAMENGO",         short: "FLA",  c1: "#c8102e", c2: "#111111" },
        { key: "palmeiras",   id: 2029,  cat: "world",    name: "PALMEIRAS",        short: "PAL",  c1: "#006437", c2: "#ffffff" },
        { key: "santos",      id: 2674,  cat: "world",    name: "SANTOS",           short: "SAN",  c1: "#ffffff", c2: "#111111" },
        { key: "corinthians", id: 874,   cat: "world",    name: "CORINTHIANS",      short: "COR",  c1: "#111111", c2: "#ffffff" },

        // ===== MİLLİ TAKIMLAR (24 — FlagCDN) =====
        { key: "nat_tr",      iso2: "tr",     cat: "national", name: "TURKIYE",       short: "TUR",  c1: "#e30a17", c2: "#ffffff" },
        { key: "nat_ar",      iso2: "ar",     cat: "national", name: "ARJANTIN",      short: "ARG",  c1: "#75aadb", c2: "#ffffff" },
        { key: "nat_fr",      iso2: "fr",     cat: "national", name: "FRANSA",        short: "FRA",  c1: "#002395", c2: "#ed2939" },
        { key: "nat_br",      iso2: "br",     cat: "national", name: "BREZILYA",      short: "BRA",  c1: "#009c3b", c2: "#ffdf00" },
        { key: "nat_es",      iso2: "es",     cat: "national", name: "ISPANYA",       short: "ESP",  c1: "#aa151b", c2: "#f1bf00" },
        { key: "nat_eng",     iso2: "gb-eng", cat: "national", name: "INGILTERE",     short: "ENG",  c1: "#ffffff", c2: "#cf081f" },
        { key: "nat_de",      iso2: "de",     cat: "national", name: "ALMANYA",       short: "GER",  c1: "#111111", c2: "#ffcc00" },
        { key: "nat_pt",      iso2: "pt",     cat: "national", name: "PORTEKIZ",      short: "POR",  c1: "#006600", c2: "#ff0000" },
        { key: "nat_it",      iso2: "it",     cat: "national", name: "ITALYA",        short: "ITA",  c1: "#009246", c2: "#ce2b37" },
        { key: "nat_nl",      iso2: "nl",     cat: "national", name: "HOLLANDA",      short: "NED",  c1: "#f97316", c2: "#21468b" },
        { key: "nat_be",      iso2: "be",     cat: "national", name: "BELCIKA",       short: "BEL",  c1: "#111111", c2: "#ef3340" },
        { key: "nat_hr",      iso2: "hr",     cat: "national", name: "HIRVATISTAN",   short: "CRO",  c1: "#ff0000", c2: "#171796" },
        { key: "nat_uy",      iso2: "uy",     cat: "national", name: "URUGUAY",       short: "URU",  c1: "#5eb6e4", c2: "#ffffff" },
        { key: "nat_co",      iso2: "co",     cat: "national", name: "KOLOMBIYA",     short: "COL",  c1: "#fcd116", c2: "#003893" },
        { key: "nat_ma",      iso2: "ma",     cat: "national", name: "FAS",           short: "MAR",  c1: "#c1272d", c2: "#006233" },
        { key: "nat_jp",      iso2: "jp",     cat: "national", name: "JAPONYA",       short: "JPN",  c1: "#ffffff", c2: "#bc002d" },
        { key: "nat_kr",      iso2: "kr",     cat: "national", name: "GUNEY KORE",    short: "KOR",  c1: "#cd2e3a", c2: "#0047a0" },
        { key: "nat_us",      iso2: "us",     cat: "national", name: "ABD",           short: "USA",  c1: "#3c3b6e", c2: "#b22234" },
        { key: "nat_mx",      iso2: "mx",     cat: "national", name: "MEKSIKA",       short: "MEX",  c1: "#006847", c2: "#ce1126" },
        { key: "nat_ch",      iso2: "ch",     cat: "national", name: "ISVICRE",       short: "SUI",  c1: "#ff0000", c2: "#ffffff" },
        { key: "nat_at",      iso2: "at",     cat: "national", name: "AVUSTURYA",     short: "AUT",  c1: "#ed2939", c2: "#ffffff" },
        { key: "nat_dk",      iso2: "dk",     cat: "national", name: "DANIMARKA",     short: "DEN",  c1: "#c60c30", c2: "#ffffff" },
        { key: "nat_no",      iso2: "no",     cat: "national", name: "NORVEC",        short: "NOR",  c1: "#ba0c2f", c2: "#00205b" },
        { key: "nat_az",      iso2: "az",     cat: "national", name: "AZERBAYCAN",    short: "AZE",  c1: "#00b5e2", c2: "#ef3340" }
      ];

      let allClubs = INITIAL_CLUBS.map((c) => ({
        ...c,
        enabled: !!c.ucl,
        logoUrl: c.iso2
          ? `https://flagcdn.com/w160/${c.iso2}.png`
          : `https://a.espncdn.com/i/teamlogos/soccer/500/${c.id}.png`,
        isFlag: !!c.iso2,
        tags: [c.cat],
        sprite: null,
        realLoaded: false,
        loadingStarted: false,
        custom: false
      }));

      let activeModalCategory = "selected";
      let localSearchTerm = "";

      /* =========================================================================
         2. DOM REFERANSLARI & MERKEZİ KONFİGÜRASYON
         ========================================================================= */
      const previewCanvas = document.getElementById("simCanvas");
      const previewCtx = previewCanvas.getContext("2d", { alpha: false });

      const toastContainer = document.getElementById("toastContainer");
      const logoStatusPill = document.getElementById("logoStatusPill");
      const encoderBadge = document.getElementById("encoderBadge");
      const btnShareLink = document.getElementById("btnShareLink");

      const modeTabs = document.querySelectorAll(".mode-tab");
      const btnNavClubs = document.getElementById("btnNavClubs");
      const navClubsSub = document.getElementById("navClubsSub");
      const modePanelTitle = document.getElementById("modePanelTitle");
      const modePanelBadge = document.getElementById("modePanelBadge");

      const panelModeRing = document.getElementById("panelModeRing");
      const panelModeBomb = document.getElementById("panelModeBomb");
      const panelModeBlade = document.getElementById("panelModeBlade");
      const panelModeLaser = document.getElementById("panelModeLaser");
      const panelModeMatch = document.getElementById("panelModeMatch");

      // Render overlay
      const renderOverlay = document.getElementById("renderOverlay");
      const renderStageTitle = document.getElementById("renderStageTitle");
      const renderPercentText = document.getElementById("renderPercentText");
      const renderProgressBar = document.getElementById("renderProgressBar");
      const renderDurationText = document.getElementById("renderDurationText");
      const renderClubsText = document.getElementById("renderClubsText");
      const renderSpeedText = document.getElementById("renderSpeedText");
