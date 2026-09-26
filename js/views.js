function fmtMoney(n){
  return n.toLocaleString("en-IN", { minimumFractionDigits:2, maximumFractionDigits:2 });
}

function timeParts(ms){
  ms = Math.max(0, ms);
  const s = Math.floor(ms/1000);
  return { d: Math.floor(s/86400), h: Math.floor((s%86400)/3600), m: Math.floor((s%3600)/60), s: s%60 };
}

function renderCountdown(unlockAtISO, goldStyle){
  const p = timeParts(new Date(unlockAtISO).getTime() - Date.now());
  return `
    <div class="countdown ${goldStyle ? "gold" : ""}" data-unlock="${unlockAtISO}">
      <div class="seg"><div class="val" data-part="d">${String(p.d).padStart(2,"0")}</div><div class="lbl">Days</div></div>
      <div class="seg"><div class="val" data-part="h">${String(p.h).padStart(2,"0")}</div><div class="lbl">Hrs</div></div>
      <div class="seg"><div class="val" data-part="m">${String(p.m).padStart(2,"0")}</div><div class="lbl">Min</div></div>
      <div class="seg"><div class="val" data-part="s">${String(p.s).padStart(2,"0")}</div><div class="lbl">Sec</div></div>
    </div>
  `;
}

function tickCountdowns(){
  document.querySelectorAll(".countdown[data-unlock]").forEach(el => {
    const target = new Date(el.dataset.unlock).getTime();
    const p = timeParts(target - Date.now());
    el.querySelector('[data-part="d"]').textContent = String(p.d).padStart(2,"0");
    el.querySelector('[data-part="h"]').textContent = String(p.h).padStart(2,"0");
    el.querySelector('[data-part="m"]').textContent = String(p.m).padStart(2,"0");
    el.querySelector('[data-part="s"]').textContent = String(p.s).padStart(2,"0");
  });
}
setInterval(tickCountdowns, 1000);

const CATEGORY_LABEL = {
  easy: "Easy Earn",
  medium: "Medium Earn",
  extended: "Extended Earn",
  hardest: "Premium Earn",
  aitools: "AI Tools & Extras",
};

function offerCard(o, showButton){
  const full = !offerHasSlots(o);
  return `
    <div class="action-card">
      <div class="action-icon"><svg viewBox="0 0 24 24"><path d="M12 2 3 7v10l9 5 9-5V7z"/></svg></div>
      <div class="action-body">
        <div class="action-title">${o.title}</div>
        <div class="action-meta">${CATEGORY_LABEL[o.category] || o.category} · ${o.timeRequired}</div>
      </div>
      <div class="action-reward">+₹${o.reward}</div>
      ${showButton ? (full
        ? `<span class="pill pill-fail" style="margin-left:8px;">Full</span>`
        : `<button class="action-cta" data-action="open-cpa" data-offer="${o.id}">View</button>`)
        : ""}
    </div>
  `;
}

function viewHome(){
  const lvl = currentVipLevel();
  const next = nextVipTarget();
  const pct = next ? Math.min(100, (state.adsTotal / next.ads) * 100) : 100;
  const dailyClaimed = state.dailyBonusClaimedDayKey === todayKey();
  const ads = walletTotals("ads");
  const cpa = walletTotals("cpa");

  return `
    <div class="topbar">
      <div class="brand">
        <div class="brand-mark">E</div>
        <div class="brand-name">Earnly</div>
      </div>
      <div class="vip-chip">VIP ${lvl}</div>
    </div>

    <div class="balance-card">
      <div class="balance-label">Total Balance<div class="hi">कुल बैलेंस</div></div>
      <div class="balance-value">₹${fmtMoney(ads.total + cpa.total)} <small>INR</small></div>
      <div class="balance-sub">Ads Wallet <b>₹${fmtMoney(ads.total)}</b> · CPA Wallet <b>₹${fmtMoney(cpa.total)}</b></div>
    </div>

    <div class="stat-row">
      <div class="stat-tile"><div class="n">${state.adsToday}</div><div class="l">Ads today<div class="hi">आज की विज्ञापन</div></div></div>
      <div class="stat-tile"><div class="n">${state.adsTotal}</div><div class="l">Ads all-time<div class="hi">कुल विज्ञापन</div></div></div>
    </div>

    <div class="section-title">VIP Progress<div class="hi">वीआईपी प्रगति</div></div>
    <div class="action-card" style="flex-direction:column; align-items:stretch;">
      <div style="display:flex; justify-content:space-between; font-size:13px;">
        <span style="color:var(--text-1); font-weight:600;">VIP ${lvl} → VIP ${next ? next.level : lvl}</span>
        <span style="color:var(--text-2);">${state.adsTotal} / ${next ? next.ads : state.adsTotal}</span>
      </div>
      <div class="progress-track"><div class="progress-fill gold" style="width:${pct}%"></div></div>
    </div>

    <div class="section-title">Today<div class="hi">आज</div></div>
    <div class="card-list">
      <div class="action-card">
        <div class="action-icon"><svg viewBox="0 0 24 24"><path d="M4 4v16l16-8z"/></svg></div>
        <div class="action-body">
          <div class="action-title">Watch an ad<div class="hi">एक विज्ञापन देखें</div></div>
          <div class="action-meta">₹${REMOTE_CONFIG.perAdReward.toFixed(2)} per ad</div>
        </div>
        <button class="action-cta" data-action="watch-ad">Watch</button>
      </div>
      <div class="action-card">
        <div class="action-icon"><svg viewBox="0 0 24 24"><path d="M12 2v6M12 16v6M2 12h6M16 12h6"/></svg></div>
        <div class="action-body">
          <div class="action-title">Daily open bonus<div class="hi">दैनिक ओपन बोनस</div></div>
          <div class="action-meta">₹${REMOTE_CONFIG.dailyOpenBonus.toFixed(2)} • once per day</div>
        </div>
        <button class="action-cta" data-action="claim-daily" ${dailyClaimed ? "disabled" : ""}>${dailyClaimed ? "Claimed" : "Claim"}</button>
      </div>
    </div>
  `;
}

function lockGateHtml(watched, needed, title, subtitle, previewOffers){
  return `
    <div class="lock-hero">
      <div class="money-fx">
        <span class="coin c1">₹</span><span class="coin c2">₹</span><span class="coin c3">₹</span>
        <span class="coin c4">₹</span><span class="coin c5">₹</span>
      </div>
      <div class="lock-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg></div>
      <div class="lock-big-number">${watched}<span>/${needed} ads</span></div>
      <div class="lock-sub">${title}<div class="hi">${subtitle}</div></div>
      <div class="lock-progress-track"><div class="lock-progress-fill" style="width:${Math.min(100,(watched/needed)*100)}%"></div></div>
      <div class="lock-remaining">${Math.round(Math.min(100,(watched/needed)*100))}% complete</div>
      <button class="btn btn-primary" data-action="watch-gate-ad" style="margin-top:16px;">Watch an Ad</button>
    </div>
    ${previewOffers.length ? `
      <div class="locked-preview-wrap">
        <div class="locked-badge"><span>Unlock to view</span></div>
        <div class="card-list locked-preview">
          ${previewOffers.map(o => offerCard(o, false)).join("")}
        </div>
      </div>
    ` : ""}
  `;
}

function offerListOrEmpty(offers, categoryLabel){
  if(offers.length > 0){
    return `<div class="card-list">${offers.map(o => offerCard(o, true)).join("")}</div>`;
  }
  return `
    <div class="empty-attract">
      <div class="empty-attract-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg></div>
      <div class="empty-attract-title">No ${categoryLabel} tasks right now<div class="hi">अभी कोई कार्य उपलब्ध नहीं है</div></div>
      <div class="empty-attract-sub">New tasks are added regularly through the day — the next one could unlock any time. Check back soon.<div class="hi">नए कार्य दिन भर में लगातार जोड़े जाते हैं — कभी भी जांच लें।</div></div>
    </div>
  `;
}

function viewEarn(){
  const task100Done = state.adsToday >= 100;
  const task500Done = state.adsToday >= 500;

  return `
    <div class="topbar">
      <div class="brand"><div class="brand-name">Earn<div class="hi">कमाएं</div></div></div>
    </div>

    <div class="section-title">Watch & Earn<div class="hi">देखें और कमाएं</div></div>
    <div class="card-list">
      <div class="action-card">
        <div class="action-icon"><svg viewBox="0 0 24 24"><path d="M4 4v16l16-8z"/></svg></div>
        <div class="action-body">
          <div class="action-title">Watch 1 ad<div class="hi">1 विज्ञापन देखें</div></div>
          <div class="action-meta">Reward credited instantly</div>
        </div>
        <div class="action-reward">+₹${REMOTE_CONFIG.perAdReward.toFixed(2)}</div>
        <button class="action-cta" data-action="watch-ad">Watch</button>
      </div>
      <div class="action-card">
        <div class="action-icon"><svg viewBox="0 0 24 24"><path d="M4 4v16l16-8z"/></svg></div>
        <div class="action-body">
          <div class="action-title">Watch 3 ads in a row<div class="hi">लगातार 3 विज्ञापन देखें</div></div>
          <div class="action-meta">Higher combined reward — must finish all 3</div>
        </div>
        <div class="action-reward">+₹${(REMOTE_CONFIG.perAdReward*3 + 0.02).toFixed(2)}</div>
        <button class="action-cta" data-action="watch-burst">Watch</button>
      </div>
    </div>

    <div class="section-title">Daily Tasks<div class="hi">दैनिक कार्य</div></div>
    <div class="card-list">
      <div class="action-card" style="flex-direction:column; align-items:stretch;">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <div class="action-title">Watch 100 ads today<div class="hi">आज 100 विज्ञापन देखें</div></div>
          <div class="action-reward">+₹${REMOTE_CONFIG.task100Reward.toFixed(2)}</div>
        </div>
        <div class="progress-track"><div class="progress-fill" style="width:${Math.min(100, state.adsToday)}%"></div></div>
        <div class="action-meta" style="margin-top:6px;">${Math.min(state.adsToday,100)}/100 ${task100Done ? "· Complete ✓" : ""}</div>
      </div>
      <div class="action-card" style="flex-direction:column; align-items:stretch;">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <div class="action-title">Watch 500 ads today<div class="hi">आज 500 विज्ञापन देखें</div></div>
          <div class="action-reward">+₹${REMOTE_CONFIG.task500Reward.toFixed(2)}</div>
        </div>
        <div class="progress-track"><div class="progress-fill" style="width:${Math.min(100, state.adsToday/5)}%"></div></div>
        <div class="action-meta" style="margin-top:6px;">${Math.min(state.adsToday,500)}/500 ${task500Done ? "· Complete ✓" : ""}</div>
      </div>
    </div>

    <div class="section-title">VIP Levels<div class="hi">वीआईपी स्तर</div></div>
    <div class="card-list">
      ${REMOTE_CONFIG.vipLevels.map(v => {
        const done = state.vipClaimed.includes(v.level);
        const active = currentVipLevel() === v.level;
        return `
        <div class="action-card">
          <div class="action-icon"><svg viewBox="0 0 24 24"><path d="M12 2 3 7v10l9 5 9-5V7z"/></svg></div>
          <div class="action-body">
            <div class="action-title">VIP ${v.level}</div>
            <div class="action-meta">${v.ads.toLocaleString("en-IN")} total ads</div>
          </div>
          <div class="action-reward">+₹${v.reward}</div>
          ${done ? `<span class="pill pill-success" style="margin-left:8px;">Done</span>` : (active ? `<span class="pill pill-pending" style="margin-left:8px;">Active</span>` : "")}
        </div>`;
      }).join("")}
    </div>
    <div class="notice" style="margin-top:14px;">
      Each VIP reward is credited only once per level. Skipping any ad — including inside the 3-ad set — before it finishes means it is not counted and gives no reward.
      <div class="hi">हर वीआईपी रिवॉर्ड हर स्तर पर केवल एक बार मिलता है। किसी भी विज्ञापन को पूरा होने से पहले स्किप करने पर वह गिना नहीं जाएगा और कोई रिवॉर्ड नहीं मिलेगा।</div>
    </div>
  `;
}

function viewTasks(){
  const mainOffers = REMOTE_CONFIG.cpaOffers.filter(o => o.category !== "aitools");
  const aiOffers = REMOTE_CONFIG.cpaOffers.filter(o => o.category === "aitools");

  return `
    <div class="topbar">
      <div class="brand"><div class="brand-name"><span class="cpa-brand">CPA</span> Earn<div class="hi">सीपीए अर्न</div></div></div>
    </div>

    <div class="section-title"><span class="cpa-brand">CPA</span> Earn — Premium Wallet<div class="hi">सीपीए अर्न — प्रीमियम वॉलेट</div></div>
    ${isMainCpaUnlockedToday()
      ? offerListOrEmpty(mainOffers, "CPA")
      : lockGateHtml(state.gateAdsToday, REMOTE_CONFIG.dailyMinAdsGate, "Watch a few ads to unlock CPA Earn", "सीपीए अर्न अनलॉक करने के लिए कुछ विज्ञापन देखें", mainOffers)
    }

    <div class="section-title">AI Tools & Extras<div class="hi">एआई टूल्स और अतिरिक्त</div></div>
    ${isAiToolsUnlockedToday()
      ? offerListOrEmpty(aiOffers, "AI Tools")
      : lockGateHtml(state.gateAdsToday, REMOTE_CONFIG.aiToolsGateAds, "Watch a few ads to unlock AI Tools & Extras", "एआई टूल्स अनलॉक करने के लिए कुछ विज्ञापन देखें", aiOffers)
    }
    <div class="notice" style="margin-top:14px;">
      Ads watched here to unlock <span class="cpa-brand">CPA</span> Earn are separate from your Ads Wallet — they don't add any reward on their own, they only unlock access to <span class="cpa-brand">CPA</span> Earn and AI Tools tasks.
      <div class="hi">यहां देखे गए विज्ञापनों से कोई इनाम नहीं मिलता — ये सिर्फ सीपीए अर्न और एआई टूल्स को अनलॉक करते हैं।</div>
    </div>
  `;
}

function viewRefer(){
  const completedCount = state.referrals.filter(r => r.completed).length;
  return `
    <div class="topbar"><div class="brand"><div class="brand-name">Refer & Earn<div class="hi">रेफर करें और कमाएं</div></div></div></div>

    <div class="balance-card">
      <div class="balance-label">Your referral code<div class="hi">आपका रेफरल कोड</div></div>
      <div class="ref-code-box" style="margin-top:10px; margin-bottom:0;">
        <span class="code">${state.referralCode}</span>
        <button class="btn btn-ghost" style="width:auto; padding:9px 16px;" data-action="copy-code">Copy</button>
      </div>
    </div>

    <div class="stat-row">
      <div class="stat-tile"><div class="n">${state.referrals.length}</div><div class="l">Total invited</div></div>
      <div class="stat-tile"><div class="n">${completedCount}</div><div class="l">Completed</div></div>
    </div>

    <div class="notice">
      A referral bonus is credited only after your friend watches at least <b>${REMOTE_CONFIG.referralAdsRequired} ads</b> and stays active for at least <b>${REMOTE_CONFIG.referralDaysRequired} days</b>. You then get ₹${REMOTE_CONFIG.referralBonusReferrer.toFixed(2)} and they get ₹${REMOTE_CONFIG.referralBonusNewUser.toFixed(2)}.
      <div class="hi">रेफरल बोनस तभी मिलेगा जब आपका दोस्त कम से कम ${REMOTE_CONFIG.referralAdsRequired} विज्ञापन देखे और कम से कम ${REMOTE_CONFIG.referralDaysRequired} दिन सक्रिय रहे।</div>
    </div>

    <div class="section-title">Your referrals<div class="hi">आपके रेफरल</div></div>
    <div class="card-list">
      ${state.referrals.length === 0 ? `
        <div class="empty-state"><p>No referrals yet. Share your code to get started.</p></div>
      ` : state.referrals.map(r => `
        <div class="ref-item">
          <div class="ref-avatar">${r.name.charAt(0).toUpperCase()}</div>
          <div class="ref-body">
            <div class="ref-name">${r.name}</div>
            <div class="ref-sub">${r.adsWatched}/${REMOTE_CONFIG.referralAdsRequired} ads · ${r.daysActive}/${REMOTE_CONFIG.referralDaysRequired} days</div>
          </div>
          ${r.completed ? `<span class="pill pill-success">Complete</span>` : `<span class="pill pill-pending">Pending</span>`}
        </div>
      `).join("")}
    </div>
    <button class="btn btn-ghost" style="margin-top:16px;" data-action="add-demo-referral">+ Add demo referral (testing)</button>
  `;
}

function viewWallet(){
  const inWindow = isWithinWithdrawWindow();
  const ads = walletTotals("ads");
  const cpa = walletTotals("cpa");

  function walletBlock(w, totals, title, hi, goldStyle){
    const canWithdraw = totals.available >= REMOTE_CONFIG.withdrawMin;
    return `
      <div class="wallet-card ${w}">
        <div class="wallet-head"><span class="tag ${goldStyle ? "gold" : ""}">${title}</span></div>
        <div class="balance-value">₹${fmtMoney(totals.total)}</div>
        <div class="wallet-breakdown">
          <div>Available<b>₹${fmtMoney(totals.available)}</b></div>
          <div>Locked<b>₹${fmtMoney(totals.locked)}</b></div>
        </div>
        ${totals.nextUnlock ? `
          <div class="unlock-note">Next ₹${fmtMoney(totals.nextUnlock.amount)} unlocks in</div>
          ${renderCountdown(totals.nextUnlock.unlockAt, goldStyle)}
        ` : `<div class="unlock-note">Nothing currently locked</div>`}
      </div>
      <div class="section-title">Withdraw from ${title}</div>
      <div class="field"><label>Account holder name</label><input type="text" id="wd-name-${w}" placeholder="As per your bank account"></div>
      <div class="field"><label>Account number</label><input type="text" id="wd-account-${w}" placeholder="Bank account number" inputmode="numeric"></div>
      <div class="field"><label>Amount</label><input type="number" id="wd-amount-${w}" placeholder="Min ₹${REMOTE_CONFIG.withdrawMin}" min="${REMOTE_CONFIG.withdrawMin}"></div>
      <button class="btn btn-primary" data-action="submit-withdraw" data-wallet="${w}" ${(inWindow && canWithdraw) ? "" : "disabled"} style="margin-bottom:24px;">
        ${!canWithdraw ? `Available balance below ₹${REMOTE_CONFIG.withdrawMin}` : (inWindow ? "Send Withdrawal Request" : "Window closed")}
      </button>
    `;
  }

  return `
    <div class="topbar">
      <div class="brand"><div class="brand-name">Wallet<div class="hi">वॉलेट</div></div></div>
      <button class="logout-link" data-action="logout">Log out</button>
    </div>
    <div class="seg-toggle">
      <button class="seg-btn ${activeWalletTab === "ads" ? "active" : ""}" data-action="switch-wallet-tab" data-wallet="ads">Ads Wallet</button>
      <button class="seg-btn ${activeWalletTab === "cpa" ? "active gold" : ""}" data-action="switch-wallet-tab" data-wallet="cpa"><span class="cpa-brand ${activeWalletTab === "cpa" ? "on-gold" : ""}">CPA</span> Wallet</button>
    </div>
    <div class="notice ${inWindow ? "" : "warn"}" style="margin-bottom:18px;">
      <b>Withdrawal terms:</b>
      <ul>
        <li>Minimum withdrawal ₹${REMOTE_CONFIG.withdrawMin} per wallet</li>
        <li>Withdrawals are only open ${nextWithdrawWindowLabel()}</li>
        <li>Only "Available" balance can be withdrawn — locked amounts unlock automatically over time</li>
        <li>Status shows "Processing" until verified — it only shows "Success" after the real transfer completes</li>
      </ul>
      <div class="hi">न्यूनतम निकासी ₹${REMOTE_CONFIG.withdrawMin}। केवल "उपलब्ध" राशि ही निकाली जा सकती है। असली ट्रांसफर पूरा होने के बाद ही "Success" दिखेगा।</div>
    </div>
    ${activeWalletTab === "ads"
      ? walletBlock("ads", ads, "Ads Wallet", "एड्स वॉलेट", false)
      : walletBlock("cpa", cpa, "CPA Premium Wallet", "सीपीए प्रीमियम वॉलेट", true)}
    <button class="btn btn-ghost" data-action="open-history">View Transaction History</button>
  `;
}

function viewAuthPhone(prefillPhone){
  return `
    <div class="auth-wrap">
      <div class="brand-mark" style="width:52px; height:52px; font-size:24px; margin-bottom:18px;">E</div>
      <div class="auth-title">Welcome to Earnly<div class="hi" style="font-size:14px;">Earnly में आपका स्वागत है</div></div>
      <div class="auth-sub">Enter your mobile number to continue</div>
      <div class="field" style="margin-top:22px; width:100%;">
        <label>Mobile number</label>
        <div class="phone-input">
          <span class="phone-prefix">+91</span>
          <input type="tel" id="auth-phone" placeholder="98765 43210" maxlength="10" inputmode="numeric" value="${prefillPhone || ""}">
        </div>
      </div>
      <button class="btn btn-primary" data-action="send-otp" style="margin-top:6px;">Send OTP</button>
      <div class="notice" style="margin-top:20px; text-align:left;">
        By continuing, you agree that your account and wallet are linked to this mobile number.
      </div>
    </div>
  `;
}

function viewAuthOtp(phone){
  return `
    <div class="auth-wrap">
      <div class="brand-mark" style="width:52px; height:52px; font-size:24px; margin-bottom:18px;">E</div>
      <div class="auth-title">Verify your number</div>
      <div class="auth-sub">Code sent to +91 ${phone}</div>
      <div class="field" style="margin-top:22px; width:100%;">
        <label>Enter OTP</label>
        <input type="tel" id="auth-otp" placeholder="6-digit code" maxlength="6" inputmode="numeric" style="width:100%; padding:13px 14px; border-radius:10px; background:var(--bg-1); border:1px solid var(--line); color:var(--text-0); font-size:18px; letter-spacing:4px; text-align:center; font-family:var(--font-num);">
      </div>
      <button class="btn btn-primary" data-action="verify-otp" style="margin-top:6px;">Verify & Continue</button>
      <button class="btn btn-ghost" data-action="change-number" style="margin-top:10px;">Change number</button>
      <div class="notice" style="margin-top:20px; text-align:left;">
        Demo mode: use code <b>${REMOTE_CONFIG.demoOtp}</b> to continue. Real SMS delivery is not connected yet.
      </div>
    </div>
  `;
}

function viewCpaDetail(offerId){
  const o = REMOTE_CONFIG.cpaOffers.find(x => x.id === offerId);
  const existing = state.cpaSubmissions.find(s => s.offerId === offerId);
  return `
    <div class="screen-back" data-action="close-screen">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M15 18l-6-6 6-6"/></svg> Back
    </div>
    <div class="task-header">
      <span class="task-tag ${o.category}">${CATEGORY_LABEL[o.category] || o.category}</span>
      <div class="task-title">${o.title}</div>
      <div class="task-meta-row"><span>Reward: <b style="color:var(--gold);">₹${o.reward}</b></span><span>Time: ${o.timeRequired}</span></div>
    </div>
    <div class="section-title">Description</div>
    <div class="notice" style="text-align:left;">${o.description}</div>
    <div class="section-title">Steps</div>
    ${o.steps.map((s,i) => `<div class="step-item"><div class="step-num">${i+1}</div><div class="step-text">${s}</div></div>`).join("")}
    <div class="section-title">Important Info</div>
    <div class="notice warn" style="text-align:left;"><ul>${o.importantInfo.map(i => `<li>${i}</li>`).join("")}</ul></div>
    ${!existing ? `
      <div class="section-title">Submit your proof</div>
      <div class="field"><label>Registered number / proof link</label><input type="text" id="cpa-proof-${o.id}" placeholder="e.g. your registered mobile number"></div>
      <button class="btn btn-primary" data-action="submit-cpa" data-offer="${o.id}">Submit for Verification</button>
    ` : `
      <div class="section-title">Your submission</div>
      <div class="action-card">
        <div class="action-body">
          <div class="action-title">Submitted ${new Date(existing.submittedAt).toLocaleDateString("en-IN")}</div>
          <div class="action-meta">Proof: ${existing.proof}</div>
        </div>
        <span class="pill ${existing.status === "approved" ? "pill-success" : (existing.status === "rejected" ? "pill-fail" : "pill-pending")}">${existing.status}</span>
      </div>
      ${existing.status === "verifying" ? `
        <div class="notice" style="margin-top:12px;">Verification is done by the advertiser and can take time. You'll see this update to "approved" once confirmed, and the reward will then appear in your CPA Wallet as locked balance.</div>
        <button class="btn btn-ghost" style="margin-top:12px;" data-action="demo-approve-cpa" data-sub="${existing.id}">Simulate advertiser approval (testing)</button>
      ` : ""}
    `}
  `;
}

function viewHistory(){
  const items = [
    ...state.ledger.map(e => ({ title:e.source, sub:`${e.wallet === "cpa" ? "CPA Wallet" : "Ads Wallet"} · unlocks ${new Date(e.unlockAt).toLocaleDateString("en-IN")}`, amount:e.amount, date:e.creditedAt, positive:true })),
    ...state.withdrawals.map(w => ({ title:`Withdrawal — ${w.wallet === "cpa" ? "CPA" : "Ads"} Wallet`, sub:w.status, amount:w.amount, date:w.date, positive:false })),
  ].sort((a,b) => new Date(b.date) - new Date(a.date));
  return `
    <div class="screen-back" data-action="close-screen">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M15 18l-6-6 6-6"/></svg> Back
    </div>
    <div class="task-title" style="margin-bottom:16px;">Transaction History</div>
    ${items.length === 0 ? `<div class="empty-state"><p>No transactions yet.</p></div>` :
      `<div class="card-list" style="background:var(--bg-1); border:1px solid var(--line); border-radius:var(--radius-m); padding:4px 16px;">
        ${items.map(i => `
          <div class="history-row">
            <div class="history-left"><div class="t">${i.title}</div><div class="d">${new Date(i.date).toLocaleString("en-IN")} · ${i.sub}</div></div>
            <div class="history-amt ${i.positive ? "pos" : "neg"}">${i.positive ? "+" : "-"}₹${fmtMoney(i.amount)}</div>
          </div>
        `).join("")}
      </div>`
    }
  `;
}

/* ================= ADMIN PANEL ================= */

let adminLoggedIn = false;

function viewAdminLogin(){
  return `
    <div class="auth-wrap">
      <div class="brand-mark" style="width:52px; height:52px; font-size:24px; margin-bottom:18px;">A</div>
      <div class="auth-title">Admin Access</div>
      <div class="auth-sub">This area is for site management only</div>
      <div class="field" style="margin-top:22px; width:100%;">
        <label>Admin password</label>
        <input type="password" id="admin-pass" placeholder="Password">
      </div>
      <button class="btn btn-primary" data-action="admin-login">Enter</button>
    </div>
  `;
}

function settingField(key, label, step){
  return `
    <div class="field">
      <label>${label}</label>
      <input type="number" step="${step || "0.01"}" id="cfg-${key}" value="${REMOTE_CONFIG[key]}">
    </div>
  `;
}

function viewAdminPanel(){
  return `
    <div class="topbar">
      <div class="brand"><div class="brand-name">Admin Panel</div></div>
      <button class="logout-link" data-action="admin-logout">Exit</button>
    </div>

    <div class="section-title">Ads & Gates</div>
    <div class="admin-card">
      ${settingField("perAdReward", "Reward per ad (₹)")}
      ${settingField("dailyOpenBonus", "Daily open bonus (₹)")}
      ${settingField("task100Reward", "100-ads task bonus (₹)")}
      ${settingField("task500Reward", "500-ads task bonus (₹)")}
      ${settingField("adSkipLockSeconds", "Ad skip-lock (seconds)", "1")}
      ${settingField("adGapMinutes", "Forced interstitial gap (minutes)", "1")}
      ${settingField("dailyMinAdsGate", "Ads to unlock main CPA dashboard", "1")}
      ${settingField("aiToolsGateAds", "Ads to unlock AI Tools & Extras", "1")}
      <button class="btn btn-primary" data-action="save-admin-section" data-section="ads">Save Ads Settings</button>
    </div>

    <div class="section-title">Wallet & Withdrawal</div>
    <div class="admin-card">
      ${settingField("withdrawMin", "Minimum withdrawal (₹)", "1")}
      ${settingField("adsLockDays", "Ads Wallet lock period (days)", "1")}
      ${settingField("cpaLockDays", "CPA Wallet lock period (days)", "1")}
      ${settingField("userSharePercent", "Default user share of CPA price (%)", "1")}
      <button class="btn btn-primary" data-action="save-admin-section" data-section="wallet">Save Wallet Settings</button>
    </div>

    <div class="section-title">Referral</div>
    <div class="admin-card">
      ${settingField("referralAdsRequired", "Ads required from referred user", "1")}
      ${settingField("referralDaysRequired", "Days active required", "1")}
      ${settingField("referralBonusReferrer", "Bonus to referrer (₹)")}
      ${settingField("referralBonusNewUser", "Bonus to new user (₹)")}
      <button class="btn btn-primary" data-action="save-admin-section" data-section="referral">Save Referral Settings</button>
    </div>

    <div class="section-title">Push Notifications</div>
    <div class="admin-card">
      ${settingField("pushPerDay", "Notifications per day", "1")}
      <button class="btn btn-primary" data-action="save-admin-section" data-section="push">Save</button>
    </div>

    <div class="section-title">CPA Offers</div>
    <div class="card-list" style="margin-bottom:14px;">
      ${REMOTE_CONFIG.cpaOffers.map(o => `
        <div class="action-card">
          <div class="action-body">
            <div class="action-title">${o.title}</div>
            <div class="action-meta">${CATEGORY_LABEL[o.category]} · ₹${o.reward} · ${(o.slotsUsed||0)}/${o.slots} used</div>
          </div>
          <button class="btn btn-ghost" style="width:auto; padding:8px 12px; margin-right:6px;" data-action="admin-edit-offer" data-offer="${o.id}">Edit</button>
          <button class="btn btn-danger-outline" style="width:auto; padding:8px 12px;" data-action="admin-delete-offer" data-offer="${o.id}">Delete</button>
        </div>
      `).join("")}
    </div>
    <button class="btn btn-ghost" data-action="admin-new-offer">+ Add New CPA Offer</button>
  `;
}

function viewAdminOfferForm(offerId){
  const o = offerId ? REMOTE_CONFIG.cpaOffers.find(x => x.id === offerId) : null;
  return `
    <div class="screen-back" data-action="admin-close-offer-form">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M15 18l-6-6 6-6"/></svg> Back
    </div>
    <div class="task-title" style="margin-bottom:16px;">${o ? "Edit Offer" : "Add New CPA Offer"}</div>

    <div class="field"><label>Title</label><input type="text" id="of-title" value="${o ? o.title : ""}"></div>
    <div class="field">
      <label>Category</label>
      <select id="of-category" style="width:100%; padding:13px 14px; border-radius:10px; background:var(--bg-1); border:1px solid var(--line); color:var(--text-0); font-size:14.5px;">
        ${Object.keys(CATEGORY_LABEL).map(c => `<option value="${c}" ${o && o.category===c ? "selected" : ""}>${CATEGORY_LABEL[c]}</option>`).join("")}
      </select>
    </div>
    <div class="field"><label>Advertiser price paid to us (₹) — reference only</label><input type="number" id="of-advprice" value="${o ? o.advertiserPrice : ""}"></div>
    <div class="field"><label>User reward (₹) — what the user actually gets</label><input type="number" id="of-reward" value="${o ? o.reward : ""}"></div>
    <div class="field"><label>Time required</label><input type="text" id="of-time" value="${o ? o.timeRequired : ""}" placeholder="e.g. 5 minutes"></div>
    <div class="field"><label>Link</label><input type="text" id="of-link" value="${o ? o.link : "#"}"></div>
    <div class="field"><label>Description</label><input type="text" id="of-desc" value="${o ? o.description : ""}"></div>
    <div class="field">
      <label>Steps (one per line)</label>
      <textarea id="of-steps" rows="5" style="width:100%; padding:13px 14px; border-radius:10px; background:var(--bg-1); border:1px solid var(--line); color:var(--text-0); font-size:13.5px; font-family:inherit;">${o ? o.steps.join("\n") : ""}</textarea>
    </div>
    <div class="field">
      <label>Important info (one per line)</label>
      <textarea id="of-info" rows="4" style="width:100%; padding:13px 14px; border-radius:10px; background:var(--bg-1); border:1px solid var(--line); color:var(--text-0); font-size:13.5px; font-family:inherit;">${o ? o.importantInfo.join("\n") : ""}</textarea>
    </div>
    <div class="field"><label>Slots (max completions)</label><input type="number" id="of-slots" value="${o ? o.slots : 100}"></div>

    <button class="btn btn-primary" data-action="admin-save-offer" data-offer="${o ? o.id : ""}">Save Offer</button>
  `;
}

