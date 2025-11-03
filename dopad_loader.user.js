// ==UserScript==
// @name         Loader - Dopad
// @namespace    twscript
// @version      1.0
// @description  Nacita aktualni verzi skriptu Dopad
// @author       Lajbor
// @match        https://www.twscript.eu/
// @run-at       document-end
// @grant        none
// ==/UserScript==

(function () {
  const SCRIPT_ID = "dopad";
  const CONFIG_B64 = "aHR0cHM6Ly9yYXcuZ2l0aHVidXNlcmNvbnRlbnQuY29tL2xhamJvcmFuZGVsL3R3c2NyaXB0cy9yZWZzL2hlYWRzL21haW4vY29uZmlnLmpzb24=";
  const CONFIG_URL = atob(CONFIG_B64);
  const ACCESS_KEY = window.__ACCESS_KEY__ || "NEURCEN";
  
  function loadCore(url_b64, ver) {
    const MAIN_URL = atob(url_b64);
    const s = document.createElement("script");
    s.src = MAIN_URL + "?v=" + (ver || Date.now());
    document.body.appendChild(s);
    console.log(`[Loader] Loaded ${SCRIPT_ID} v${ver}`);
  }

  fetch(CONFIG_URL + "?t=" + Date.now())
    .then(r => r.json())
    .then(cfg => {
      if (!cfg.allowed_keys.includes(ACCESS_KEY))
        return console.warn(`[Loader] Access denied for ${ACCESS_KEY} on ${SCRIPT_ID}`);

      const scriptCfg = cfg.scripts[SCRIPT_ID];

      if (!scriptCfg || !scriptCfg.enabled) 
        return console.warn(`[Loader] ${SCRIPT_ID} Disabled by config`);

      loadCore(scriptCfg.core_url_b64, scriptCfg.core_version);
    })
    .catch(err => console.error(`[Loader] Config load error for ${SCRIPT_ID}:`, err));
})();
