const routes = { home: viewHome, earn: viewEarn, tasks: viewTasks, refer: viewRefer, wallet: viewWallet };
let currentRoute = "home";
let activeWalletTab = "ads";
let adminCheckDone = false;

function isAdminHash(){ return window.location.hash === "#admin"; }

function render(){
  document.getElementById("app").innerHTML = routes[currentRoute]();
  document.querySelectorAll(".navbtn").forEach(b => {
    b.classList.toggle("active", b.dataset.route === currentRoute);
  });
}

function renderRoot(){
  const nav = document.getElementById("bottomnav");

  if(isAdminHash()){
    nav.style.display = "none";
    if(!state.auth.verified){
      document.getElementById("app").innerHTML = viewAuthPhone();
      return;
    }
    if(!adminCheckDone){
      document.getElementById("app").innerHTML = `<div class="auth-wrap"><div class="auth-sub">Checking access…</div></div>`;
      checkIsAdmin().then(isAdmin => {
        adminLoggedIn = isAdmin;
        adminCheckDone = true;
        renderRoot();
      }).catch(err => {
        console.error(err);
        adminLoggedIn = false;
        adminCheckDone = true;
        renderRoot();
      });
      return;
    }
    document.getElementById("app").innerHTML = adminLoggedIn ? viewAdminPanel() : viewAdminNotAuthorized();
    return;
  }

  if(!state.auth.verified){
    nav.style.display = "none";
    document.getElementById("app").innerHTML = viewAuthPhone();
  }else{
    nav.style.display = "flex";
    render();
  }
}

function goTo(route){
  currentRoute = route;
  render();
  window.scrollTo(0,0);
}

function toast(msg, type = "success"){
  const root = document.getElementById("toast-root");
  const el = document.createElement("div");
  el.className = `toast ${type}`;
  el.textContent = msg;
  root.appendChild(el);
  setTimeout(() => el.remove(), 2400);
}

// ---- Full-screen overlay helper ----
let activeScreenRenderer = null;
function openScreen(renderFn, ...args){
  activeScreenRenderer = () => renderFn(...args);
  paintScreen();
}
function paintScreen(){
  let overlay = document.getElementById("screen-overlay");
  if(!overlay){
    overlay = document.createElement("div");
    overlay.id = "screen-overlay";
    overlay.className = "screen-overlay";
    document.body.appendChild(overlay);
  }
  overlay.innerHTML = activeScreenRenderer();
}
function closeScreen(){
  const overlay = document.getElementById("screen-overlay");
  if(overlay) overlay.remove();
  activeScreenRenderer = null;
}

window.addEventListener("hashchange", () => { adminCheckDone = false; renderRoot(); });

document.getElementById("bottomnav").addEventListener("click", (e) => {
  const btn = e.target.closest(".navbtn");
  if(btn && state.auth.verified) goTo(btn.dataset.route);
});

document.body.addEventListener("click", async (e) => {
  const btn = e.target.closest("[data-action]");
  if(!btn) return;
  const action = btn.dataset.action;

  // ---- Auth ----
  if(action === "phone-signup" || action === "phone-login"){
    const phone = document.getElementById("auth-phone").value.trim();
    const password = document.getElementById("auth-password").value;
    if(!/^[0-9]{10}$/.test(phone)){ toast("Enter a valid 10-digit phone number", "warn"); return; }
    if(!password || password.length < 6){ toast("Password must be at least 6 characters", "warn"); return; }
    btn.disabled = true;
    try{
      const timeout = new Promise((_, rej) => setTimeout(() => rej(new Error("Request timed out, check your internet")), 12000));
      const call = action === "phone-signup" ? signUpPhone(phone, password) : loginPhone(phone, password);
      const res = await Promise.race([call, timeout]);
      if(res.ok){ toast("Welcome!", "success"); renderRoot(); }
      else{ toast(res.error || "Something went wrong", "warn"); }
    }catch(err){
      toast(err.message || "Network error, please try again", "warn");
    }finally{
      btn.disabled = false;
    }
    return;
  }
  if(action === "logout"){ await logout(); renderRoot(); return; }

  // ---- Admin ----
  if(action === "admin-logout"){ window.location.hash = ""; return; }

  if(action === "save-admin-section"){
    const section = btn.dataset.section;
    const keysBySection = {
      ads: ["perAdReward","dailyOpenBonus","task100Reward","task500Reward","adSkipLockSeconds","adGapMinutes","dailyMinAdsGate","aiToolsGateAds"],
      wallet: ["withdrawMin","adsLockDays","cpaLockDays","userSharePercent"],
      referral: ["referralAdsRequired","referralDaysRequired","referralBonusReferrer","referralBonusNewUser"],
      push: ["pushPerDay"],
    };
    const patch = {};
    for(const key of keysBySection[section]){
      const el = document.getElementById(`cfg-${key}`);
      if(el) patch[key] = parseFloat(el.value);
    }
    if(section === "ads"){
      const linkEl = document.getElementById("cfg-directAdLink");
      if(linkEl) patch.directAdLink = linkEl.value.trim();
    }
    saveConfig(patch);
    toast("Settings saved", "success");
    renderRoot();
    return;
  }

  if(action === "admin-new-offer"){ openScreen(viewAdminOfferForm, null); return; }
  if(action === "admin-edit-offer"){ openScreen(viewAdminOfferForm, btn.dataset.offer); return; }
  if(action === "admin-close-offer-form"){ closeScreen(); renderRoot(); return; }

  if(action === "admin-delete-offer"){
    btn.disabled = true;
    const ok = await adminDeleteOffer(btn.dataset.offer);
    btn.disabled = false;
    if(ok){
      await loadOffersFromDB();
      toast("Offer deleted", "success");
      renderRoot();
    }else{
      toast("Could not delete offer", "warn");
    }
    return;
  }

  if(action === "admin-save-offer"){
    const existingId = btn.dataset.offer;
    const steps = document.getElementById("of-steps").value.split("\n").map(s => s.trim()).filter(Boolean);
    const info = document.getElementById("of-info").value.split("\n").map(s => s.trim()).filter(Boolean);
    const data = {
      id: existingId || ("cpa-" + Date.now()),
      category: document.getElementById("of-category").value,
      title: document.getElementById("of-title").value.trim(),
      advertiserPrice: parseFloat(document.getElementById("of-advprice").value) || 0,
      reward: parseFloat(document.getElementById("of-reward").value) || 0,
      timeRequired: document.getElementById("of-time").value.trim(),
      link: document.getElementById("of-link").value.trim() || "#",
      description: document.getElementById("of-desc").value.trim(),
      steps, importantInfo: info,
      slots: parseInt(document.getElementById("of-slots").value) || 0,
    };
    if(!data.title){ toast("Title is required", "warn"); return; }

    btn.disabled = true;
    const ok = existingId ? await adminUpdateOffer(data) : await adminInsertOffer(data);
    btn.disabled = false;

    if(ok){
      await loadOffersFromDB();
      toast("Offer saved", "success");
      closeScreen();
      renderRoot();
    }else{
      toast("Could not save offer", "warn");
    }
    return;
  }

  if(action === "switch-wallet-tab"){ activeWalletTab = btn.dataset.wallet; render(); return; }

  // ---- Ads ----
  if(action === "watch-ad"){
    openAdPlayer(({ completed }) => {
      if(completed){
        const { bonusMsg, vipMsg } = creditAdWatch();
        toast(`Ad complete — +₹${REMOTE_CONFIG.perAdReward.toFixed(2)} credited`, "success");
        if(bonusMsg) setTimeout(() => toast(bonusMsg, "success"), 500);
        if(vipMsg) setTimeout(() => toast(vipMsg, "success"), 1000);
        render();
      }else{
        toast("Ad skipped — no reward given", "warn");
      }
    });
    return;
  }

  if(action === "watch-gate-ad"){
    openAdPlayer(({ completed }) => {
      if(completed){
        creditGateAdWatch();
        toast(`Ad watched — ${state.gateAdsToday} counted towards unlock`, "success");
        render();
      }else{
        toast("Ad skipped — not counted towards unlock", "warn");
      }
    });
    return;
  }

  if(action === "watch-burst"){
    let completedCount = 0;
    function playNext(){
      openAdPlayer(({ completed }) => {
        if(!completed){ toast("Set skipped — no reward for any of the 3 ads", "warn"); return; }
        completedCount++;
        if(completedCount < 3){ playNext(); }
        else{
          const r1 = creditAdWatch(); const r2 = creditAdWatch(); const r3 = creditAdWatch();
          addLedgerEntry("ads", "3-ad burst bonus", 0.02);
          toast(`3 ads complete — +₹${(REMOTE_CONFIG.perAdReward*3 + 0.02).toFixed(2)} credited`, "success");
          [r1.bonusMsg, r2.bonusMsg, r3.bonusMsg].filter(Boolean).forEach((m,i) => setTimeout(() => toast(m,"success"), 500*(i+1)));
          const vipMsg = r1.vipMsg || r2.vipMsg || r3.vipMsg;
          if(vipMsg) setTimeout(() => toast(vipMsg, "success"), 2000);
          render();
        }
      });
    }
    playNext();
    return;
  }

  if(action === "claim-daily"){
    if(claimDailyBonus()){ toast(`+₹${REMOTE_CONFIG.dailyOpenBonus.toFixed(2)} daily bonus credited`, "success"); render(); }
    return;
  }

  // ---- Referral ----
  if(action === "copy-code"){
    navigator.clipboard?.writeText(state.referralCode).catch(()=>{});
    toast("Referral code copied", "success");
    return;
  }

  // ---- CPA ----
  if(action === "open-cpa"){ openScreen(viewCpaDetail, btn.dataset.offer); return; }
  if(action === "close-screen"){ closeScreen(); render(); return; }
  if(action === "open-history"){ openScreen(viewHistory); return; }

  if(action === "submit-cpa"){
    const offerId = btn.dataset.offer;
    const input = document.getElementById(`cpa-proof-${offerId}`);
    const proof = input ? input.value.trim() : "";
    if(!proof){ toast("Please enter your proof details", "warn"); return; }
    submitCpaTask(offerId, proof);
    toast("Submitted", "success");
    paintScreen();
    return;
  }

  // ---- Withdraw ----
  if(action === "submit-withdraw"){
    const w = btn.dataset.wallet;
    const name = document.getElementById(`wd-name-${w}`).value.trim();
    const account = document.getElementById(`wd-account-${w}`).value.trim();
    const amount = parseFloat(document.getElementById(`wd-amount-${w}`).value);
    const totals = walletTotals(w);

    if(!name || !account){ toast("Please enter name and account number", "warn"); return; }
    if(!amount || amount < REMOTE_CONFIG.withdrawMin){ toast(`Minimum is ₹${REMOTE_CONFIG.withdrawMin}`, "warn"); return; }
    if(amount > totals.available){ toast("Not enough available (unlocked) balance", "warn"); return; }
    if(!isWithinWithdrawWindow()){ toast("Withdrawal window is closed right now", "warn"); return; }

    requestWithdrawal(w, amount, account, name);
    toast("Withdrawal request sent — status is Processing", "success");
    render();
    return;
  }
});

(async () => {
  try { await restoreSession(); } catch(e){ console.error(e); }
  try { await loadOffersFromDB(); } catch(e){ console.error(e); }
  checkPendingCpaVerifications();
  setInterval(checkPendingCpaVerifications, 60000);
  renderRoot();
})();
