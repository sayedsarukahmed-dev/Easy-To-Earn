/* ============================================================
   ADS.JS
   Simulated rewarded-ad player. In the real native/web SDK:
     - onAdCompleted()  -> only THIS path may call creditAdWatch()
     - onAdSkipped() / onAdFailedToShow() -> no credit, no count
   ============================================================ */

function openAdPlayer(onDone){
  const lockSeconds = REMOTE_CONFIG.adSkipLockSeconds;
  let remaining = lockSeconds;
  let completed = false;

  const overlay = document.createElement("div");
  overlay.className = "ad-overlay";
  overlay.innerHTML = `
    <div class="ad-topbar">
      <span class="ad-timer" id="ad-timer">0:${String(lockSeconds).padStart(2,"0")}</span>
      <button class="ad-skip" id="ad-skip-btn">Skip</button>
    </div>
    <div class="ad-stage">
      <div class="adbox" id="ad-status-box">Ad opened in a new tab.<br>Come back here when you're done.</div>
      <a id="ad-manual-link" href="${REMOTE_CONFIG.directAdLink}" target="_blank" rel="noopener" style="display:none; color:var(--mint); font-size:13px; font-weight:600;">Tap here to open the ad</a>
    </div>
  `;
  document.body.appendChild(overlay);

  // Open the real Monetag ad. Since this runs synchronously inside the
  // user's tap on "Watch Ad", browsers generally allow it — but some
  // mobile browsers block it anyway, so show a manual link as a fallback.
  const adWindow = window.open(REMOTE_CONFIG.directAdLink, "_blank", "noopener");
  if(!adWindow){
    overlay.querySelector("#ad-status-box").textContent = "Tap the link below to open the ad.";
    overlay.querySelector("#ad-manual-link").style.display = "inline-block";
  }

  const timerEl = overlay.querySelector("#ad-timer");
  const skipBtn = overlay.querySelector("#ad-skip-btn");

  const tick = setInterval(() => {
    remaining -= 1;
    if(remaining <= 0){
      clearInterval(tick);
      completed = true;
      finish();
      return;
    }
    timerEl.textContent = `0:${String(remaining).padStart(2,"0")}`;
  }, 1000);

  skipBtn.addEventListener("click", () => {
    if(completed) return;
    if(remaining > 0){
      showSkipWarning(() => {
        clearInterval(tick);
        cleanup();
        onDone({ completed:false });
      });
    }
  });

  function finish(){ cleanup(); onDone({ completed:true }); }
  function cleanup(){ overlay.remove(); }
}

function showSkipWarning(onConfirmSkip){
  const modal = document.createElement("div");
  modal.className = "ad-overlay";
  modal.style.background = "rgba(5,8,15,.92)";
  modal.innerHTML = `
    <div style="flex:1; display:flex; align-items:center; justify-content:center; padding:24px;">
      <div style="background:var(--bg-1); border:1px solid var(--line); border-radius:var(--radius-l); padding:22px; max-width:340px; width:100%;">
        <div style="font-weight:700; font-size:15.5px; margin-bottom:8px;">This ad isn't finished yet</div>
        <div style="font-size:13px; color:var(--text-1); line-height:1.5; margin-bottom:18px;">
          If you skip now, you won't get the reward for this ad — and it won't count towards your total.
        </div>
        <div style="display:flex; gap:10px;">
          <button class="btn btn-ghost" id="stay-btn" style="flex:1;">Keep watching</button>
          <button class="btn btn-danger-outline" id="skip-confirm-btn" style="flex:1;">Skip anyway</button>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
  modal.querySelector("#stay-btn").addEventListener("click", () => modal.remove());
  modal.querySelector("#skip-confirm-btn").addEventListener("click", () => {
    modal.remove();
    onConfirmSkip();
  });
}
