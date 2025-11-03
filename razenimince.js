// ==UserScript==
// @name         Panský dvůr - RAZENI MINCI /FUNGUJE - SINGLE VILLAGE
// @namespace    Lajbor/Nykso/Cameron
// @version      1.5 // Cílený fix pro tlačítko "Razit"
// @description  Automaticky klikne na tlačítko "Razit mince" s přesnou detekcí. Zobrazuje stav v malém UI.
// @match        https://*/game.php*screen=snob*
// @grant        none
// ==/UserScript==

(function () {
  'use strict';

  // ---------- Nastavení ----------
  const LOG_PREFIX = '[MINT AUTOCLICK]';

  // Náhodná prodleva PŘED KLIKNUTÍM / ODESLÁNÍM
  const CLICK_DELAY_MIN_MS = 1000;
  const CLICK_DELAY_MAX_MS = 3000;

  // Náhodná prodleva PO KLIKNUTÍ, než se obnoví stránka
  const REFRESH_DELAY_MIN_MS = 10000;
  const REFRESH_DELAY_MAX_MS = 25000;

  // ---------- UI Elementy ----------
  let uiDiv = null;
  let refreshTimerId = null; // Uchování ID pro časovač obnovy

  // ---------- Pomocné ----------
  const rndInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
  const byQS = (sel, root = document) => root.querySelector(sel);

  // Zde jsou funkce updateUI, createUI a setUIState (kód je ponechán pro přehlednost)

  function updateUI(statusText, nextActionTime = null) {
    if (!uiDiv) return;

    let timerText = '';
    if (nextActionTime) {
      const remainingSeconds = Math.ceil((nextActionTime - Date.now()) / 1000);
      timerText = ` (za ${remainingSeconds}s)`;
    }

    uiDiv.innerHTML = `
      <strong>[Razítko]</strong>
      <span style="color: green;">Aktivní</span><br>
      Stav: ${statusText}${timerText}
    `;
  }

  function createUI() {
    uiDiv = document.createElement('div');
    uiDiv.id = 'mint-autoclick-ui';
    uiDiv.style.cssText = `
      position: fixed; bottom: 10px; right: 10px; background-color: #2c3e50; color: #ecf0f1;
      border: 2px solid #3498db; padding: 8px 10px; z-index: 10000; font-size: 12px;
      text-align: left; border-radius: 5px; opacity: 0.9; user-select: none;
    `;
    document.body.appendChild(uiDiv);

    setInterval(() => {
      if (uiDiv && uiDiv.dataset.nextaction) {
        updateUI(uiDiv.dataset.statustext, parseInt(uiDiv.dataset.nextaction, 10));
      }
    }, 1000);
  }

  function setUIState(statusText, nextActionTime = null) {
    if (uiDiv) {
        uiDiv.dataset.statustext = statusText;
        if (nextActionTime) {
            uiDiv.dataset.nextaction = nextActionTime;
        } else {
            delete uiDiv.dataset.nextaction;
        }
        updateUI(statusText, nextActionTime);
    }
    console.log(LOG_PREFIX, statusText);
  }

  const clickSafely = (el) => {
    try {
      el.click();
      setUIState('Kliknuto na "Razit" (Tlačítko).');
      return true;
    } catch (e) {
      console.warn(LOG_PREFIX, 'Click failed:', e);
      setUIState('Chyba při kliknutí.');
      return false;
    }
  };

  // ---------- Hlavní funkce ražení ----------
  function autoMint() {

    // 1. Primární pokus: Cílený selektor z HTML kódu
    const mintButton = byQS('input[type="submit"][value="Razit"]');

    if (mintButton) {
      const clickDelay = rndInt(CLICK_DELAY_MIN_MS, CLICK_DELAY_MAX_MS);
      const nextAction = Date.now() + clickDelay;

      setUIState('Tlačítko "Razit" nalezeno. Spouštím ražení...', nextAction);

      setTimeout(() => {
        clickSafely(mintButton);
        scheduleNextRefresh();
      }, clickDelay);

    } else {

      // 2. Záložní pokus: Odeslat celý formulář (jako Verze 1.4)
      const mintForm = byQS('form[action*="screen=snob"]');

      if (mintForm) {
          setUIState('Tlačítko nenalezeno. Hledám formulář pro automatické odeslání...');

          // Pokud je formulář, ale není tlačítko, znamená to, že se razit nemůže (nedostatek surovin).
          // Přesto spustíme obnovu, ale s informací, že nebylo co dělat.
          setUIState('❌ Nelze razit (Nedostatek surovin?). Obnova za chvíli.');

      } else {
          // 3. Poslední záloha: Nic nenalezeno
          setUIState('❌ Formulář/tlačítko nenalezeno. Obnova za chvíli.');
      }

      // Vždy naplánujeme obnovu, pokud nebylo co klikat.
      scheduleNextRefresh();
    }
  }

  // ---------- Auto obnova ----------
  function scheduleNextRefresh() {
    // Pokud je již spuštěn, nedělat nic
    if (refreshTimerId) return;

    const refreshDelay = rndInt(REFRESH_DELAY_MIN_MS, REFRESH_DELAY_MAX_MS);
    const nextAction = Date.now() + refreshDelay;

    setUIState(uiDiv.dataset.statustext.includes('Obnova') ? uiDiv.dataset.statustext : 'Obnova stránky...', nextAction);

    refreshTimerId = setTimeout(() => location.reload(), refreshDelay);
  }

  // ---------- Start ----------
    createUI();
  setTimeout(autoMint, 500);

})();
