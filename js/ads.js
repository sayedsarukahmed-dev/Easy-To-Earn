/* ============================================================
   ADS.JS
   Real ad flow via a Monetag Direct Link (opened in a new tab —
   this format gives us no completion callback, unlike a native
   rewarded-video SDK). To avoid crediting a reward when the ad
   never actually opened (popup blocked, user backed out before
   it loaded, etc.), the reward countdown does NOT start the
   moment "Watch Ad" is tapped — it only starts once we have a
   real signal the ad opened: either window.open() genuinely
   succeeded (checked after a short delay, since some browsers
   return a window object that is immediately closed), or the
   user explicitly tapped the manual fallback link themselves.
   No signal = no countdown = no reward, even if they later hit
   Skip or just close the screen.
   ============================================================ */

function openAdPlayer(onDone){
  const lockSeconds = REMOTE_CONFIG.adSkipLockSeconds;
  let remaining = lockSeconds;
  let completed = false;
  let started = false;
  let tick = null;

  const overlay = document.createElement("div");
  overlay.className = "ad-overlay";
  overlay.innerHTML = `
    <div class="ad-topbar">
      <span class="ad-timer" id="ad-timer">Waiting…</span>
      <button class="ad-skip" id="ad-skip-btn">Skip</button>
    </div>
    <div class="ad-stage">
      <div class="adbox" id="ad-status-box">Opening the ad…</div>
      <a id="ad-manual-link" href="${REMOTE_CONFIG.directAdLink}" target="_blank" rel="noopener" style="display:none; color:var(--mint); font-size:13px; font-weight:600;">Tap here to open the ad</a>
    </div>
  `;
  document.body.appendChild(overlay);

  const timerEl = overlay.querySelector("#ad-timer");
  const skipBtn = overlay.querySelector("#ad-skip-btn");
  const statusBox = overlay.querySelector("#ad-status-box");
  const manualLink = overlay.querySelector("#ad-manual-link");

  function startCountdown(){
    if(started) return;
    started = true;
    statusBox.textContent = "Ad opened in a new tab. Come back here when you're done.";
    manualLink.style.display = "none";
    timerEl.textContent = `0:${String(remaining).padStart(2,"0")}`;

    tick = setInterval(() => {
      remaining -= 1;
      if(remaining <= 0){
        clearInterval(tick);
        completed = true;
        finish();
        return;
      }
      timerEl.textContent = `0:${String(remaining).padStart(2,"0")}`;
    }, 1000);
  }

  function showManualFallback(){
    statusBox.textContent = "Tap the link below to open the ad.";
    manualLink.style.display = "inline-block";
  }

  // Try opening the real ad. Because some mobile browsers return a
  // non-null window that is immediately closed (a "fake success"),
  // we double-check shortly after before trusting it.
  const adWindow = window.open(REMOTE_CONFIG.directAdLink, "_blank", "noopener");
  setTimeout(() => {
    if(adWindow && !adWindow.closed){
      startCountdown();
    }else{
      showManualFallback();
    }
  }, 300);

  // If the automatic open failed, the countdown only begins once the
  // user themselves taps this link — a real signal of intent.
  manualLink.addEventListener("click", () => {
    startCountdown();
  });

  skipBtn.addEventListener("click", () => {
    if(completed) return;
    if(started && remaining > 0){
      showSkipWarning(() => {
        clearInterval(tick);
        cleanup();
        onDone({ completed:false });
      });
    }else if(!started){
      // Nothing was ever counted — safe to exit immediately, no reward.
      cleanup();
      onDone({ completed:false });
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
