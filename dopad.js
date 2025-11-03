// ==UserScript==
// @name         Poslat nebo dopad v čas (opraveno 2025)
// @description  Nastaví požadovaný čas dopadu nebo odeslání a automaticky odešle útok ve zvolený moment
// @author       lajbor
// @version      3.3.0
// @namespace    dk-time-sender
// @match        https://*/game.php?village=*&screen=place&try=confirm*
// @grant        none
// ==/UserScript==

(function() {
  'use strict';

  const delayStored = localStorage.getItem('delayTime');
  let delayTime = delayStored ? parseInt(delayStored) : 0;

  // UI doplnění
  const offsetHtml = `
    <tr>
      <td>
        Offset
        <span class="tooltip" title="Upraví zpoždění (ms). Pokud dorazí s +30ms, zadej -30.">
          <img src="https://dsen.innogamescdn.com/asset/2661920a/graphic/questionmark.png" style="max-width:13px"/>
        </span>
      </td>
      <td>
        <input id="delayInput" value="${delayTime}" style="width:50px">
        <a id="delayButton" class="btn">OK</a>
      </td>
    </tr>`;

  const setArrivalHtml = `
    <tr><td>Nastavený čas dopadu:</td><td id="showArrTime"></td></tr>`;
  const sendAttackHtml = `
    <tr><td>Nastavený čas odeslání:</td><td id="showSendTime"></td></tr>`;

  const buttonsHtml = `
    <a id="arrTime" class="btn" style="cursor:pointer;">Nastavit čas dopadu</a>
    <a id="sendTime" class="btn" style="cursor:pointer;">Nastavit čas odeslání</a>`;

  // Vložení UI pod potvrzovací tlačítko
  const confirmBtn = document.querySelector("#troop_confirm_submit");
  if (!confirmBtn) return console.warn("❌ Nenalezeno potvrzovací tlačítko #troop_confirm_submit");

  confirmBtn.insertAdjacentHTML("afterend", buttonsHtml);
  const parentTable = document.querySelector("#date_arrival")?.closest("table");
  if (parentTable) parentTable.insertAdjacentHTML("beforeend", offsetHtml + setArrivalHtml + sendAttackHtml);

  // Pomocné funkce
  const sleep = ms => new Promise(res => setTimeout(res, ms));
  const clickConfirm = () => {
    const btn = document.getElementById("troop_confirm_submit");
    if (btn) btn.click();
    else console.warn("❌ Nelze odeslat — tlačítko nenalezeno");
  };

  let input, inputMs, delay;
  let arrInterval, attInterval;

  function setArrivalTime() {
    arrInterval = setInterval(() => {
      const rel = document.querySelector(".relative_time");
      if (!rel) return;
      const arrTime = rel.textContent.trim().slice(-8);
      if (arrTime >= input) {
        setTimeout(clickConfirm, delay);
        clearInterval(arrInterval);
      }
    }, 5);
  }

  function setSendTime() {
    attInterval = setInterval(() => {
      const serverTime = document.querySelector("#serverTime")?.textContent?.trim();
      if (serverTime >= input) {
        setTimeout(clickConfirm, delay);
        clearInterval(attInterval);
      }
    }, 5);
  }

  // Nastavit čas dopadu
  document.getElementById("arrTime").onclick = function() {
    clearInterval(attInterval);
    const defaultTime = document.querySelector(".relative_time")?.textContent?.slice(-8) || "00:00:00";
    input = prompt("Nastav čas dopadu (hh:mm:ss)", defaultTime);
    if (!input) return;
    inputMs = parseInt(prompt("Zadej milisekundy (0–999)", "500")) || 0;
    delay = delayTime + inputMs;
    document.getElementById("showArrTime").textContent = `${input}:${inputMs.toString().padStart(3, "0")}`;
    document.getElementById("showSendTime").textContent = "";
    setArrivalTime();
  };

  // Nastavit čas odeslání
  document.getElementById("sendTime").onclick = function() {
    clearInterval(arrInterval);
    const defaultTime = document.getElementById("serverTime")?.textContent || "00:00:00";
    input = prompt("Nastav čas odeslání (hh:mm:ss)", defaultTime);
    if (!input) return;
    inputMs = parseInt(prompt("Zadej milisekundy (0–999)", "500")) || 0;
    delay = delayTime + inputMs;
    document.getElementById("showSendTime").textContent = `${input}:${inputMs.toString().padStart(3, "0")}`;
    document.getElementById("showArrTime").textContent = "";
    setSendTime();
  };

  // Nastavení offsetu
  document.getElementById("delayButton").onclick = function() {
    delayTime = parseInt(document.getElementById("delayInput").value) || 0;
    localStorage.setItem("delayTime", delayTime);
    delay = delayTime + (parseInt(inputMs) || 0);
    if (delay < 0) delay = 0;
    alert(`Offset uložen: ${delayTime} ms`);
  };

  console.log("✅ Skript 'Poslat nebo dopad v čas' úspěšně načten (verze 3.3.0)");
})();
