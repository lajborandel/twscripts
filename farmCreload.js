// ==UserScript==
// @name         C – pomocník (Refresh Switch + UI) FUNKCNI
// @namespace    farm C prepinani vesnic by Lajbor
// @version      2.5 // Zvýšena verze pro spolehlivé spuštění z Loaderu
// @description  Bezpečné postupné klikání na „C“ v AM Farm; vynechá napadené řádky; auto-přepínání vesnic s UI.
// @match        https://*/game.php*screen=am_farm*
// @grant        none
// ==/UserScript==

(function () {
  'use strict';

  // ===============================================
  // === OPRAVA PRO LOADER (Code Injection) ===
  // Loader spouští kód všude, proto je nutná manuální kontrola.
  if (!window.location.href.includes('screen=am_farm')) {
    // console.log('[Farm C] Spuštěn, ale není na am_farm. Ukončuji.'); 
    return;
  }
  // ===============================================

  // --- Pevné/Výchozí Nastavení ---
  const MAX_CLICKS = 100;
  const BASE_INTERVAL_MS = 250;
  const JITTER_LOW_MS = 120;
  const JITTER_HIGH_MS = 320;

  const REFRESH_MIN_MS = 8000;
  const REFRESH_MAX_MS = 15000;

  const AUTO_SWITCH = true;

  const LOG_PREFIX = '[AM-FARM V2.5]';

  // --- Nastavení pro UI a Switch (persistují v localStorage) ---
  const SWITCH_STORAGE_KEY = 'farm_c_switch_interval';
  const REFRESH_STORAGE_KEY = 'farm_c_auto_refresh_enabled';
  const DEFAULT_SWITCH_MS = 2500;
  const DEFAULT_REFRESH_ENABLED = true;
  const JITTER_RANGE = 500;

  let switchInterval = parseInt(localStorage.getItem(SWITCH_STORAGE_KEY)) || DEFAULT_SWITCH_MS;
  let isRefreshEnabled = localStorage.getItem(REFRESH_STORAGE_KEY) === 'true' ||
                        (localStorage.getItem(REFRESH_STORAGE_KEY) === null ? DEFAULT_REFRESH_ENABLED : false);

  // --- Proměnné pro počítadlo cílů ---
  let totalButtons = 0;
  let clickedCount = 0;

  // ---------- Pomocné ----------
  const rndInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
  const byQS  = (sel, root = document) => root.querySelector(sel);
  const byQSA = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  const hasOngoingAttack = (row) => {
    return !!byQS('img[src*="attack"]', row);
  };

  const clickSafely = (el) => {
    try {
      el.click();
      clickedCount++;
      updateTargetCounterUI();
      return true;
    } catch (e) {
      console.warn(LOG_PREFIX, 'Click failed:', e);
      return false;
    }
  };

  const schedule = (fn, base, jitterLow, jitterHigh, idx = 0) => {
    const when = base * idx + rndInt(jitterLow, jitterHigh);
    setTimeout(fn, when);
  };

  // ---------- UI: Tvorba ovládacího panelu ----------
  function updateTargetCounterUI() {
    const counterEl = byQS('#target_counter');
    if (counterEl) {
      const remaining = Math.max(0, totalButtons - clickedCount);
      counterEl.textContent = `Zbývá cílů (C): ${remaining} / ${totalButtons}`;
    }
  }

  function createSettingsUI() {
    const mainContent = byQS('#content_value');
    if (!mainContent) return;

    const container = document.createElement('div');
    container.id = 'farm_switch_ui_v2';
    container.style.cssText = 'border: 1px solid #C0C0C0; padding: 5px; margin-top: 5px; margin-bottom: 5px; background: #f0e6c8; display: flex; align-items: center; gap: 10px; font-size: 11px; flex-wrap: wrap;';

    // 1. Počítadlo cílů
    const counter = document.createElement('span');
    counter.id = 'target_counter';
    updateTargetCounterUI();
    container.appendChild(counter);

    // Oddělovač
    container.appendChild(document.createTextNode('|'));

    // 2. Input pro interval přepnutí
    const labelSwitch = document.createElement('span');
    labelSwitch.textContent = 'FarmbyLajbor, Interval (ms):';
    container.appendChild(labelSwitch);

    const input = document.createElement('input');
    input.type = 'number';
    input.id = 'switch_interval_input';
    input.value = switchInterval;
    input.style.width = '60px';
    input.min = '500';
    container.appendChild(input);

    // 3. Checkbox pro Refresh
    const checkboxRefresh = document.createElement('input');
    checkboxRefresh.type = 'checkbox';
    checkboxRefresh.id = 'refresh_checkbox';
    checkboxRefresh.checked = isRefreshEnabled;
    checkboxRefresh.onchange = function() {
      localStorage.setItem(REFRESH_STORAGE_KEY, checkboxRefresh.checked);
      alert(`Auto Refresh je nyní ${checkboxRefresh.checked ? 'zapnutý' : 'vypnutý'}. Obnovte stránku pro okamžité použití.`);
    };

    const labelRefresh = document.createElement('label');
    labelRefresh.htmlFor = 'refresh_checkbox';
    labelRefresh.textContent = 'Auto Refresh (8-15s)';
    container.appendChild(checkboxRefresh);
    container.appendChild(labelRefresh);

    // 4. Tlačítko Uložit
    const button = document.createElement('button');
    button.textContent = 'Uložit a Obnovit';
    button.onclick = function() {
      const newValue = parseInt(input.value);
      if (newValue >= 500) {
        localStorage.setItem(SWITCH_STORAGE_KEY, newValue);
        console.log(LOG_PREFIX, `Interval přepnutí uložen na ${newValue} ms. Obnovuji.`);
        location.reload();
      } else {
        alert('Zadejte hodnotu alespoň 500 ms.');
      }
    };
    button.style.marginLeft = '10px';
    container.appendChild(button);

    mainContent.prepend(container);
    console.log(LOG_PREFIX, 'UI načteno. Aktuální interval přepnutí:', switchInterval, 'ms. Refresh:', isRefreshEnabled);
  }


  // ---------- Auto obnova (řízeno UI) ----------
  if (isRefreshEnabled) {
    const t = rndInt(REFRESH_MIN_MS, REFRESH_MAX_MS);
    console.log(LOG_PREFIX, 'Auto-refresh za', t, 'ms');
    setTimeout(() => location.reload(), t);
  }

  // ---------- Auto přepínání vesnice / skupiny ----------
  function switchVillage() {
    const arrowRight = byQS('#village_switch_right, .arrowRight, a.arrowRight');
    if (arrowRight) {
      clickSafely(arrowRight);
      return;
    }
    const groupRight = byQS('.groupRight, a.groupRight');
    if (groupRight) {
      clickSafely(groupRight);
      return;
    }
    console.warn(LOG_PREFIX, 'Tlačítko pro přepnutí nenalezeno. Rychlý refresh.');
    setTimeout(() => location.reload(), 2000);
  }


  // ---------- Spuštění přepínání (používá Váš interval) ----------
  function scheduleAutoSwitch() {
    const randomJitter = rndInt(-JITTER_RANGE / 2, JITTER_RANGE / 2);
    const switchTime = switchInterval + randomJitter;

    console.log(LOG_PREFIX, 'Auto-switch naplánován na náhodnou dobu:', switchTime, 'ms');
    setTimeout(switchVillage, switchTime);
}


  // ---------- Výběr tlačítek „C“ ----------
  function collectButtons() {
    const rows = byQSA('#plunder_list tbody tr');
    const usable = [];
    for (const tr of rows) {
      if (hasOngoingAttack(tr)) continue;
      const btn = byQS('a.farm_icon_c:not(.farm_icon_disabled)', tr);
      if (btn) usable.push(btn);
      if (usable.length >= MAX_CLICKS) break;
    }

    totalButtons = usable.length;
    return usable;
  }

  function runClicks() {
    const buttons = collectButtons();
    updateTargetCounterUI();

    if (!buttons.length) {
      console.log(LOG_PREFIX, 'Nic k odeslání (žádná povolená „C“).');
    } else {
      console.log(LOG_PREFIX, 'Kliknu na', buttons.length, 'položek.');

      buttons.forEach((btn, i) => {
        schedule(() => clickSafely(btn), BASE_INTERVAL_MS, JITTER_LOW_MS, JITTER_HIGH_MS, i+1);
      });
    }

    // Spustíme přepínání nezávisle na klikání, po nastaveném intervalu
    if (AUTO_SWITCH) {
      scheduleAutoSwitch();
    }
  }


  // ---------- Start ----------
  // 1. Vytvoř UI a načti uložené stavy
  createSettingsUI();
  // 2. Spustit klikání po krátké prodlevě
  setTimeout(runClicks, 300);

})();
