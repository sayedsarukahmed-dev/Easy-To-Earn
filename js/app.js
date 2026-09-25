const routes = { home: viewHome, earn: viewEarn, refer: viewRefer, wallet: viewWallet };
let currentRoute = "home";
let authStep = "phone";
let pendingPhone = "";

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
    document.getElementById("app").innerHTML = adminLoggedIn ? viewAdminPanel() : viewAdminLogin();
    return;
  }

  if(!state.auth.verified){
    nav.style.display = "none";
    document.getElementById("app").innerHTML =
      authStep === "otp" ? viewAuthOtp(pendingPhone) : viewAuthPhone(pendingPhone);
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

window.addEventListener("hashchange", renderRoot);

document.getElementById("bottomnav").addEventListener("click", (e) => {
  const btn = e.target.closest(".navbtn");
  if(btn) goTo(btn.dataset.route);
});

document.body.addEventListener("click", (e) => {
  const btn = e.target.closest("[data-action]");
  if(!btn) return;
  const action = btn.dataset.action;

  // ---- Auth ----
  if(action === "send-otp"){
    const phone = document.getElementById("auth-phone").value.trim();
    if(!/^\d{10}$/.test(phone)){ toast("Enter a valid 10-digit mobile number", "warn"); return; }
    sendOtp(phone);
    pendingPhone = phone;
    authStep = "otp";
    renderRoot();
    toast("OTP sent", "success");
    return;
  }
  if(action === "verify-otp"){
    const code = document.getElementById("auth-otp").value.trim();
    if(verifyOtp(pendingPhone, code)){ toast("Number verified", "success"); renderRoot(); }
    else{ toast("Incorrect OTP", "warn"); }
    return;
  }
  if(action === "change-number"){ authStep = "phone"; renderRoot(); return; }
  if(action === "logout"){ logout(); authStep = "phone"; pendingPhone = ""; renderRoot(); return; }

  // ---- Admin ----
  if(action === "admin-login"){
    const pass = document.getElementById("admin-pass").value;
    if(pass === REMOTE_CONFIG.adminPassword){ adminLoggedIn = true; renderRoot(); toast("Welcome, admin", "success"); }
    else{ toast("Incorrect password", "warn"); }
    return;
  }
  if(action === "admin-logout"){ adminLoggedIn = false; renderRoot(); return; }

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
    saveConfig(patch);
    toast("Settings saved", "success");
    renderRoot();
    return;
  }

  if(action === "admin-new-offer"){ openScreen(viewAdminOfferForm, null); return; }
  if(action === "admin-edit-offer"){ openScreen(viewAdminOfferForm, btn.dataset.offer); return; }
  if(action === "admin-close-offer-form"){ closeScreen(); renderRoot(); return; }

  if(action === "admin-delete-offer"){
    const offers = REMOTE_CONFIG.cpaOffers.filter(o => o.id !== btn.dataset.offer);
    saveCpaOffers(offers);
    toast("Offer deleted", "success");
    renderRoot();
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
      slotsUsed: 0,
    };
    if(!data.title){ toast("Title is required", "warn"); return; }

    let offers = REMOTE_CONFIG.cpaOffers.slice();
    if(existingId){
      const old = offers.find(o => o.id === existingId);
      data.slotsUsed = old ? (old.slotsUsed || 0) : 0;
      offers = offers.map(o => o.id === existingId ? data : o);
    }else{
      offers.push(data);
    }
    saveCpaOffers(offers);
    toast("Offer saved", "success");
    closeScreen();
    renderRoot();
    return;
  }

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
  if(action === "add-demo-referral"){
    state.referrals.push({ id: Date.now(), name: "Demo User " + (state.referrals.length+1), adsWatched: 0, daysActive: 0, completed:false });
    save(); render();
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
    toast("Submitted for verification", "success");
    paintScreen();
    return;
  }
  if(action === "demo-approve-cpa"){
    if(demoApproveCpa(btn.dataset.sub)){
      toast("Advertiser approved — reward added to CPA Wallet (locked)", "success");
      paintScreen();
    }
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

renderRoot();

