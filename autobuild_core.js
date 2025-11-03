// ==UserScript==
// @name         TribalWars AutoBuild (FUNKCNI + UI + Priorita dolů + Auto Sklad/Selský dvůr) FUNGUJE
// @namespace    @lajbor
// @version      2.7-loader-fix-final
// @description  Opravená verze s funkčním UI panelem a prioritami (včetně fixu spouštění přes Loader).
// @match        *://*/game.php*screen=main*
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    console.log("🏗️ AutoBuild: aktivován (UI + priority + kapacitní nouzovka).");

    // ===== PŮVODNÍ NASTAVENÍ =====
    const Min_Tempo_Espera = 1000;
    const Max_Tempo_Espera = 2500;
    const AUTO_FREE_FINISH = true;
    const AUTO_SWITCH_VILLAGE = true;
    const MAX_QUEUE_LENGTH = 5;

    // Zakázané budovy (klíče jako v data-building)
    const BLOCKED_BUILDINGS = new Set(['watchtower']); // Strážní věž

    // ===== UI: KONFIG A ULOŽENÍ (NASTAVENÉ CÍLE) =====
    const BUILDINGS = [
        { key: 'wood',      label: 'Dřevo',              defaultTarget: 30 },
        { key: 'stone',     label: 'Hlína',              defaultTarget: 30 },
        { key: 'iron',      label: 'Železo',             defaultTarget: 30 },
        { key: 'storage',   label: 'Sklad',              defaultTarget: 30 },
        { key: 'farm',      label: 'Selský dvůr',        defaultTarget: 30 },
        { key: 'main',      label: 'Hlavní budova',      defaultTarget: 25 },
        { key: 'barracks',  label: 'Kasárna',            defaultTarget: 25 },
        { key: 'smith',     label: 'Kovárna',            defaultTarget: 20 },
        { key: 'stable',    label: 'Stáj',               defaultTarget: 20 },
        { key: 'garage',    label: 'Dílna',              defaultTarget: 15 },
        { key: 'market',    label: 'Trh',                defaultTarget: 20 },
        { key: 'wall',      label: 'Hradba',             defaultTarget: 20 },
        { key: 'place',     label: 'Shromaždiště',       defaultTarget: 1  },
        { key: 'statue',    label: 'Socha',              defaultTarget: 1  },
        { key: 'hide',      label: 'Skrýš',              defaultTarget: 0  }
    ];
    const MINE_KEYS = ['wood','stone','iron'];

    const getVillageId = () => (location.search.match(/[?&]village=(\d+)/) || [,'global'])[1];
    const SETTINGS_KEY = (prefix => `${prefix}_${getVillageId()}`)('tw_autobuild_ui');

    const asInt = (v, d=0) => { const n = parseInt(v, 10); return Number.isNaN(n) ? d : n; };
    const visible = el => el && el.offsetParent !== null;

    function loadSettings() {
        try { return JSON.parse(localStorage.getItem(SETTINGS_KEY) || 'null'); } catch { return null; }
    }
    function saveSettings(s) {
        try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(s)); } catch {}
    }
    function defaultSettings() {
        const s = { enabled: {}, target: {} };
        for (const b of BUILDINGS) {
            s.enabled[b.key] = true;
            s.target[b.key]  = b.defaultTarget;
        }
        return s;
    }
    function ensureSettings() {
        let s = loadSettings() || defaultSettings();
        for (const b of BUILDINGS) {
            if (!(b.key in s.enabled)) s.enabled[b.key] = true;
            if (!(b.key in s.target))  s.target[b.key]  = b.defaultTarget;
        }
        saveSettings(s);
        return s;
    }

    // ===== UI PANEL A AKTUÁLNÍ ÚROVNĚ =====
    function getLevelsSnapshot(buildKey) {
        const lvlNode = document.querySelector(`#main_buildrow_${buildKey} .level`);
        if (lvlNode) {
            const m = lvlNode.textContent.match(/\d+/);
            const cur = m ? asInt(m[0], 0) : 0;
            
            const btn = document.querySelector(`a.btn.btn-build[data-building="${buildKey}"]`);
            if (btn) {
                const next = asInt(btn.getAttribute('data-level-next'), cur + 1);
                return { current: cur, next: next };
            }

            return { current: cur, next: cur + 1 };
        }
        return { current: 0, next: 1 };
    }

    function renderControlPanel() {
        const host = document.querySelector('#content_value');
        const buildQueue = document.getElementById('buildqueue');
        
        if (!host || document.getElementById('tw-ab-ui-panel')) return;

        const settings = ensureSettings();

        const panel = document.createElement('div');
        panel.id = 'tw-ab-ui-panel';
        panel.style.cssText = 'margin:8px 0 12px 0;padding:10px;border:1px solid #ccc;border-radius:8px;background:#f9f9f9';

        const title = document.createElement('div');
        title.textContent = '⚙️ AutoBuild – by Lajbor/Cameron Diaz';
        title.style.cssText = 'font-weight:bold;margin-bottom:8px';
        panel.appendChild(title);

        const table = document.createElement('table');
        table.style.cssText = 'width:100%;border-collapse:collapse';
        table.innerHTML = `
          <thead>
            <tr>
              <th style="text-align:left;padding:6px;border-bottom:1px solid #ddd;">Budova</th>
              <th style="text-align:center;padding:6px;border-bottom:1px solid #ddd;">Stavět?</th>
              <th style="text-align:right;padding:6px;border-bottom:1px solid #ddd;">Cílový level</th>
              <th style="text-align:right;padding:6px;border-bottom:1px solid #ddd;">Aktuální ➜ Další</th>
            </tr>
          </thead>
          <tbody></tbody>`;
        const tbody = table.querySelector('tbody');

        BUILDINGS.forEach(b => {
            const { current, next } = getLevelsSnapshot(b.key);
            const tr = document.createElement('tr'); tr.style.borderBottom = '1px solid #eee';
            tr.innerHTML = `
              <td style="padding:6px">${b.label}</td>
              <td style="text-align:center;padding:6px"><input type="checkbox"></td>
              <td style="text-align:right;padding:6px"><input type="number" min="0" max="100" step="1" style="width:80px"></td>
              <td class="tw-ab-level-col" style="text-align:right;padding:6px;font-family:monospace">${current} ➜ ${next}</td>`;
            
            const chk = tr.querySelector('input[type="checkbox"]');
            const num = tr.querySelector('input[type="number"]');
            
            chk.checked = !!settings.enabled[b.key];
            num.value = asInt(settings.target[b.key], b.defaultTarget);
            
            chk.addEventListener('change', () => { settings.enabled[b.key] = chk.checked; saveSettings(settings); });
            num.addEventListener('change',  () => { settings.target[b.key]  = asInt(num.value, b.defaultTarget); saveSettings(settings); });
            
            tbody.appendChild(tr);
        });

        panel.appendChild(table);
        
        if (buildQueue && buildQueue.parentNode) {
            buildQueue.parentNode.insertBefore(panel, buildQueue);
        } else {
             host.insertBefore(panel, host.firstChild);
        }
    }

    // ===== PŮVODNÍ FUNKCE + PRIORITA DOLŮ + KAPACITNÍ NOUZOVKA =====
    const randDelay = (min, max) => Math.floor(Math.random() * (max - min) + min);
    function log(msg, color = "#00c853") { console.log(`%c${msg}`, `color:${color}; font-weight:bold`); }

    function switchVillage() {
        const arrow = document.querySelector('#village_switch_right, .arrowRight, a.arrowRight');
        if (arrow) { log("🔁 Přepínám na další vesnici...", "#6a1b9a"); arrow.click(); }
    }

    function isBuildQueueFull() {
        const queueRows = document.querySelectorAll('#buildqueue tr');
        const count = queueRows.length - 1;
        return count >= MAX_QUEUE_LENGTH;
    }

    // text řádku pro doly – kvůli detekci „Skladiště/Selský dvůr je příliš malý“
    function rowText(buildKey){
        const row = document.querySelector(`#main_buildrow_${buildKey}`);
        return (row ? row.textContent : "").toLowerCase();
    }
    function needsStorageFixForMines(){
        // CZ + fallback EN
        const re = /(sklad(iště|iste)|warehouse|storage).*(příliš|prilis|too small|insufficient)/i;
        return MINE_KEYS.some(k => re.test(rowText(k)));
    }
    function needsFarmFixForMines(){
        const re = /(selský|selsky|statek|farm).*(příliš|prilis|too small|insufficient)/i;
        return MINE_KEYS.some(k => re.test(rowText(k)));
    }

    function buildSomething() {
        // --- AKTUALIZACE PANELU (Levels Snapshot) ---
        const panel = document.getElementById('tw-ab-ui-panel');
        if (panel) {
            panel.querySelectorAll('.tw-ab-level-col').forEach((cell, i) => {
                const b = BUILDINGS[i]; if (!b) return;
                const { current, next } = getLevelsSnapshot(b.key);
                cell.textContent = `${current} ➜ ${next}`;
            });
        }
        // --- END AKTUALIZACE PANELU ---

        if (isBuildQueueFull()) { log(`🚫 Fronta plná (${MAX_QUEUE_LENGTH}+), nestavím nic.`); return false; }

        let buttons = Array.from(document.querySelectorAll("a.btn.btn-build")).filter(visible);
        if (!buttons.length) { log("❌ Žádná dostupná stavba."); return false; }

        // 1) Filtrovat zakázané
        buttons = buttons.filter(btn => !BLOCKED_BUILDINGS.has(btn.getAttribute("data-building")));
        if (!buttons.length) { log("⚠️ Vše zakázané (BLOCKED_BUILDINGS)."); return false; }

        // 2) UI filtr (povolené + pod cílem)
        const settings = ensureSettings();
        const isUnderTarget = (btn) => {
            const key = btn.getAttribute("data-building");
            const next = asInt(btn.getAttribute("data-level-next"), 1);
            const current = Math.max(0, next - 1);
            const target = asInt(settings.target[key], 0);
            return current < target;
        };
        const isEnabled = (btn) => !!settings.enabled[btn.getAttribute("data-building")];

        // --- PRIORITA: DOLY ---
        const mineBtns = buttons.filter(btn => MINE_KEYS.includes(btn.getAttribute("data-building")) && isEnabled(btn) && isUnderTarget(btn));
        if (mineBtns.length) {
            // vyber důl s nejnižším „dalším levelem“ – vyrovnává úrovně
            mineBtns.sort((a,b) => asInt(a.getAttribute('data-level-next')) - asInt(b.getAttribute('data-level-next')));
            const chosen = mineBtns[0];
            const bKey = chosen.getAttribute("data-building");
            const next = chosen.getAttribute("data-level-next");
            log(`⛏️ Priorita: ${bKey} → stupeň ${next}`);
            chosen.click();
            return true;
        }

        // --- KAPACITNÍ NOUZOVKA: postav Sklad / Selský dvůr, když doly hlásí limit ---
        if (needsStorageFixForMines()) {
            const st = buttons.find(btn => btn.getAttribute("data-building") === 'storage');
            if (st) { log("📦 Kapacitní fix: stavím Sklad (kvůli dolům)", "#8e24aa"); st.click(); return true; }
        }
        if (needsFarmFixForMines()) {
            const fm = buttons.find(btn => btn.getAttribute("data-building") === 'farm');
            if (fm) { log("👨‍🌾 Kapacitní fix: stavím Selský dvůr (kvůli dolům)", "#8e24aa"); fm.click(); return true; }
        }

        // --- Jinak: respektuj UI a stav cokoliv povoleného pod cílem (původní chování)
        const rest = buttons.filter(btn => isEnabled(btn) && isUnderTarget(btn));
        if (!rest.length) { log("✅ Podle nastavení není nic k výstavbě (cíle dosaženy / vypnuto)."); return false; }

        const first = rest[0];
        const building = first.getAttribute("data-building");
        const nextLevel = first.getAttribute("data-level-next");
        log(`🏠 Stavím: ${building} → stupeň ${nextLevel}`);
        first.click();
        return true;
    }

    function tryFreeFinish() {
        if (!AUTO_FREE_FINISH) return;
        const freeBtn = document.querySelector('.order_feature.btn.btn-btr.btn-instant-free, .btn-instant-free');
        const confirmBtn = document.querySelector('.btn.btn-confirm-yes, .btn-confirm-yes');
        if (freeBtn) { freeBtn.click(); log("⚡ Kliknuto na 'Dokončit zdarma'"); }
        if (confirmBtn) { confirmBtn.click(); log("✅ Potvrzeno dokončení zdarma"); }
    }

    function startLoop() {
        const built = buildSomething();
        tryFreeFinish();
        if (!built && AUTO_SWITCH_VILLAGE) { log("🔄 Nestavěno → přepínám vesnici."); setTimeout(switchVillage, 2000); }
        const delay = Math.max(250, Math.min(10000, randDelay(Min_Tempo_Espera, Max_Tempo_Espera)));
        log(`⏳ Další pokus za ${(delay / 1000).toFixed(1)} s`, "#0277bd");
        setTimeout(startLoop, delay);
    }

    // Stabilní spuštění po načtení DOMu
    function init() {
        // Použijeme zpoždění 500ms, aby měl DOM čas se vykreslit po spuštění Loaderem
        setTimeout(function() {
            // Kontrola, zda jsme na hlavní stránce budovy (dle existence klíčových prvků)
            if (document.getElementById('main_buildrow_wood') || document.getElementById('buildqueue')) {
                renderControlPanel();
                log("✅ Stránka hlavní budovy načtena. Spouštím smyčku.");
                startLoop();
            } else {
                 // Fallback pro případ, že se stránka načítá pomalu
                 console.log("Waiting for build elements...");
                 setTimeout(init, 1500); // Delší čekání, pokud se nenačte hned
            }
        }, 500); // <-- Klíčové zpoždění pro Loader
    }

    // Spustí init
    init();
})();
