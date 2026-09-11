function fmtMoney(n){
  return n.toLocaleString("en-IN", { minimumFractionDigits:2, maximumFractionDigits:2 });
}

function viewHome(){
  const lvl = currentVipLevel();
  const next = nextVipTarget();
  const pct = next ? Math.min(100, (state.adsTotal / next.ads) * 100) : 100;
  const dailyClaimed = state.dailyBonusClaimedDayKey === todayKey();

  return `
    <div class="topbar">
      <div class="brand">
        <div class="brand-mark">E</div>
        <div class="brand-name">Earnly</div>
      </div>
      <div class="vip-chip">VIP ${lvl}</div>
    </div>

    <div class="balance-card">
      <div class="balance-label">Total Balance</div>
      <div class="balance-value">₹${fmtMoney(state.wallet + state.bonusWallet)} <small>INR</small></div>
      <div class="balance-sub">Ads Wallet <b>₹${fmtMoney(state.wallet)}</b> · Bonus Wallet <b>₹${fmtMoney(state.bonusWallet)}</b></div>
    </div>

    <div class="stat-row">
      <div class="stat-tile"><div class="n">${state.adsToday}</div><div class="l">Ads today</div></div>
      <div class="stat-tile"><div class="n">${state.adsTotal}</div><div class="l">Ads all-time</div></div>
    </div>

    <div class="section-title">VIP Progress</div>
    <div class="action-card" style="flex-direction:column; align-items:stretch;">
      <div style="display:flex; justify-content:space-between; font-size:13px;">
        <span style="color:var(--text-1); font-weight:600;">VIP ${lvl} → VIP ${next ? next.level : lvl}</span>
        <span style="color:var(--text-2);">${state.adsTotal} / ${next ? next.ads : state.adsTotal}</span>
      </div>
      <div class="progress-track"><div class="progress-fill gold" style="width:${pct}%"></div></div>
    </div>

    <div class="section-title">Today</div>
    <div class="card-list">
      <div class="action-card">
        <div class="action-icon"><svg viewBox="0 0 24 24"><path d="M4 4v16l16-8z"/></svg></div>
        <div class="action-body">
          <div class="action-title">Watch an ad</div>
          <div class="action-meta">₹${REMOTE_CONFIG.perAdReward.toFixed(2)} per ad</div>
        </div>
        <button class="action-cta" data-action="watch-ad">Watch</button>
      </div>
      <div class="action-card">
        <div class="action-icon"><svg viewBox="0 0 24 24"><path d="M12 2v6M12 16v6M2 12h6M16 12h6"/></svg></div>
        <div class="action-body">
          <div class="action-title">Daily open bonus</div>
          <div class="action-meta">₹${REMOTE_CONFIG.dailyOpenBonus.toFixed(2)} • once per day</div>
        </div>
        <button class="action-cta" data-action="claim-daily" ${dailyClaimed ? "disabled" : ""}>${dailyClaimed ? "Claimed" : "Claim"}</button>
      </div>
    </div>
  `;
}

function viewEarn(){
  const task100Done = state.adsToday >= 100;
  const task500Done = state.adsToday >= 500;
  return `
    <div class="topbar">
      <div class="brand"><div class="brand-name">Earn</div></div>
    </div>

    <div class="section-title">Watch & Earn</div>
    <div class="action-card">
      <div class="action-icon"><svg viewBox="0 0 24 24"><path d="M4 4v16l16-8z"/></svg></div>
      <div class="action-body">
        <div class="action-title">Watch 1 ad</div>
        <div class="action-meta">Reward credited instantly</div>
      </div>
      <div class="action-reward">+₹${REMOTE_CONFIG.perAdReward.toFixed(2)}</div>
      <button class="action-cta" data-action="watch-ad">Watch</button>
    </div>

    <div class="section-title">Daily Tasks</div>
    <div class="card-list">
      <div class="action-card" style="flex-direction:column; align-items:stretch;">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <div class="action-title">Watch 100 ads today</div>
          <div class="action-reward">+₹${REMOTE_CONFIG.task100Reward.toFixed(2)}</div>
        </div>
        <div class="progress-track"><div class="progress-fill" style="width:${Math.min(100, state.adsToday)}%"></div></div>
        <div class="action-meta" style="margin-top:6px;">${Math.min(state.adsToday,100)}/100 ${task100Done ? "· Complete ✓" : ""}</div>
      </div>
      <div class="action-card" style="flex-direction:column; align-items:stretch;">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <div class="action-title">Watch 500 ads today</div>
          <div class="action-reward">+₹${REMOTE_CONFIG.task500Reward.toFixed(2)}</div>
        </div>
        <div class="progress-track"><div class="progress-fill" style="width:${Math.min(100, state.adsToday/5)}%"></div></div>
        <div class="action-meta" style="margin-top:6px;">${Math.min(state.adsToday,500)}/500 ${task500Done ? "· Complete ✓" : ""}</div>
      </div>
    </div>

    <div class="section-title">VIP Levels</div>
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
      Each VIP reward is credited only <b>once</b> per level. Skipping an ad before it finishes means it is not counted and gives no reward.
    </div>
  `;
}

function viewRefer(){
  const completedCount = state.referrals.filter(r => r.completed).length;
  return `
    <div class="topbar"><div class="brand"><div class="brand-name">Refer & Earn</div></div></div>

    <div class="balance-card">
      <div class="balance-label">Your referral code</div>
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
      A referral bonus is credited only after your friend:
      <ul>
        <li>watches at least <b>${REMOTE_CONFIG.referralAdsRequired} ads</b>, and</li>
        <li>stays active for at least <b>${REMOTE_CONFIG.referralDaysRequired} days</b></li>
      </ul>
      Once both conditions are met, you get <b>₹${REMOTE_CONFIG.referralBonusReferrer.toFixed(2)}</b> and they get <b>₹${REMOTE_CONFIG.referralBonusNewUser.toFixed(2)}</b>.
    </div>

    <div class="section-title">Your referrals</div>
    <div class="card-list">
      ${state.referrals.length === 0 ? `
        <div class="empty-state">
          <svg viewBox="0 0 24 24"><circle cx="8" cy="8" r="3"/><circle cx="17" cy="14" r="3"/></svg>
          <p>No referrals yet. Share your code to get started.</p>
        </div>
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
  const canWithdraw = state.wallet >= REMOTE_CONFIG.withdrawMin;
  return `
    <div class="topbar">
      <div class="brand"><div class="brand-name">Wallet</div></div>
      <button class="logout-link" data-action="logout">Log out</button>
    </div>

    <div class="balance-card">
      <div class="balance-label">Ads Wallet</div>
      <div class="balance-value">₹${fmtMoney(state.wallet)}</div>
    </div>

    <div class="notice ${inWindow ? "" : "warn"}">
      <b>Withdrawal terms:</b>
      <ul>
        <li>Minimum withdrawal ₹${REMOTE_CONFIG.withdrawMin}</li>
        <li>Withdrawals are only open ${nextWithdrawWindowLabel()}</li>
        <li>Status shows "Processing" until the transfer is verified — it only shows "Success" after the real transfer completes</li>
      </ul>
      ${inWindow ? `<span class="pill pill-success" style="margin-top:6px;">Withdrawal window is open now</span>` : `<span class="pill pill-pending" style="margin-top:6px;">Window is closed right now</span>`}
    </div>

    <div class="section-title">Withdraw</div>
    <div class="field">
      <label>Account holder name</label>
      <input type="text" id="wd-name" placeholder="As per your bank account">
    </div>
    <div class="field">
      <label>Account number</label>
      <input type="text" id="wd-account" placeholder="Bank account number" inputmode="numeric">
    </div>
    <div class="field">
      <label>Amount</label>
      <input type="number" id="wd-amount" placeholder="Min ₹${REMOTE_CONFIG.withdrawMin}" min="${REMOTE_CONFIG.withdrawMin}">
    </div>
    <button class="btn btn-primary" data-action="submit-withdraw" ${(inWindow && canWithdraw) ? "" : "disabled"}>
      ${!canWithdraw ? `Balance below ₹${REMOTE_CONFIG.withdrawMin}` : (inWindow ? "Send Withdrawal Request" : "Window closed")}
    </button>

    <div class="section-title">History</div>
    <div class="card-list">
      ${state.withdrawals.length === 0 ? `
        <div class="empty-state"><p>No withdrawals yet.</p></div>
      ` : state.withdrawals.map(w => `
        <div class="action-card">
          <div class="action-body">
            <div class="action-title">₹${fmtMoney(w.amount)}</div>
            <div class="action-meta">${new Date(w.date).toLocaleString("en-IN")}</div>
          </div>
          <span class="pill ${w.status === "success" ? "pill-success" : (w.status === "failed" ? "pill-fail" : "pill-pending")}">${w.status}</span>
        </div>
      `).join("")}
    </div>
  `;
}

function viewAuthPhone(prefillPhone){
  return `
    <div class="auth-wrap">
      <div class="brand-mark" style="width:52px; height:52px; font-size:24px; margin-bottom:18px;">E</div>
      <div class="auth-title">Welcome to Earnly</div>
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
