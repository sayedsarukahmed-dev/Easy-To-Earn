/* ============================================================
   STATE.JS
   Per-user state (frontend simulation via localStorage). See
   config.js for tunable settings (REMOTE_CONFIG). In production
   every balance-affecting function here must be mirrored and
   verified on a real backend — the client must never be the
   source of truth for money.
   ============================================================ */

const STORE_KEY = "earnly_state_v1";

function defaultState(){
  return {
    auth: { phone: null, verified: false },
    adsTotal: 0,
    adsToday: 0,
    lastAdsDayKey: todayKey(),
    dailyBonusClaimedDayKey: null,
    vipClaimed: [],
    referralCode: genReferralCode(),
    referrals: [],
    withdrawals: [],
    ledger: [],
    cpaSubmissions: [],
  };
}

function todayKey(d = new Date()){
  return d.toISOString().slice(0,10);
}

function genReferralCode(){
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s = "";
  for(let i=0;i<6;i++) s += chars[Math.floor(Math.random()*chars.length)];
  return "EARN-" + s;
}

let state = load();

function load(){
  try{
    const raw = localStorage.getItem(STORE_KEY);
    if(!raw) return defaultState();
    const parsed = JSON.parse(raw);
    const d = defaultState();
    for(const k in d){ if(!(k in parsed)) parsed[k] = d[k]; }
    if(parsed.lastAdsDayKey !== todayKey()){
      parsed.adsToday = 0;
      parsed.lastAdsDayKey = todayKey();
    }
    return parsed;
  }catch(e){
    return defaultState();
  }
}

function save(){
  localStorage.setItem(STORE_KEY, JSON.stringify(state));
}

// ---- Auth (simulated) ----
function sendOtp(phone){
  console.log("[DEMO] OTP for " + phone + " is " + REMOTE_CONFIG.demoOtp);
  return true;
}
function verifyOtp(phone, code){
  if(code === REMOTE_CONFIG.demoOtp){
    state.auth = { phone, verified: true };
    save();
    return true;
  }
  return false;
}
function logout(){
  state.auth = { phone: null, verified: false };
  save();
}

// ---- Ledger (locked-balance system, shared by both wallets) ----
function addLedgerEntry(wallet, source, amount){
  const now = new Date();
  const lockDays = wallet === "cpa" ? REMOTE_CONFIG.cpaLockDays : REMOTE_CONFIG.adsLockDays;
  const unlockAt = new Date(now.getTime() + lockDays * 24 * 60 * 60 * 1000);
  state.ledger.push({
    id: "LD" + Date.now() + Math.floor(Math.random()*1000),
    wallet, source, amount,
    creditedAt: now.toISOString(),
    unlockAt: unlockAt.toISOString(),
  });
  save();
}

function walletTotals(wallet){
  const now = Date.now();
  const entries = state.ledger.filter(e => e.wallet === wallet);
  const total = entries.reduce((s,e) => s + e.amount, 0);
  const available = entries.filter(e => new Date(e.unlockAt).getTime() <= now).reduce((s,e) => s + e.amount, 0);
  const locked = total - available;
  const lockedEntries = entries.filter(e => new Date(e.unlockAt).getTime() > now)
                                .sort((a,b) => new Date(a.unlockAt) - new Date(b.unlockAt));
  const nextUnlock = lockedEntries[0] || null;
  return { total, available, locked, nextUnlock };
}

function currentVipLevel(){
  let lvl = 0;
  for(const v of REMOTE_CONFIG.vipLevels){
    if(state.adsTotal >= v.ads) lvl = v.level;
  }
  return lvl;
}
function nextVipTarget(){
  return REMOTE_CONFIG.vipLevels.find(v => state.adsTotal < v.ads) || null;
}

function creditAdWatch(){
  state.adsTotal += 1;
  state.adsToday += 1;
  addLedgerEntry("ads", "Ad watched", REMOTE_CONFIG.perAdReward);

  let bonusMsg = null;
  if(state.adsToday === 100){
    addLedgerEntry("ads", "100 ads daily task", REMOTE_CONFIG.task100Reward);
    bonusMsg = `100 ads task complete! +₹${REMOTE_CONFIG.task100Reward.toFixed(2)} bonus`;
  }
  if(state.adsToday === 500){
    addLedgerEntry("ads", "500 ads daily task", REMOTE_CONFIG.task500Reward);
    bonusMsg = `500 ads task complete! +₹${REMOTE_CONFIG.task500Reward.toFixed(2)} bonus`;
  }

  let vipMsg = null;
  const lvl = currentVipLevel();
  if(lvl > 0 && !state.vipClaimed.includes(lvl)){
    const v = REMOTE_CONFIG.vipLevels.find(x => x.level === lvl);
    addLedgerEntry("ads", `VIP ${lvl} reward`, v.reward);
    state.vipClaimed.push(lvl);
    vipMsg = `VIP ${lvl} unlocked! +₹${v.reward} reward`;
  }

  save();
  return { bonusMsg, vipMsg };
}

function claimDailyBonus(){
  if(state.dailyBonusClaimedDayKey === todayKey()) return false;
  addLedgerEntry("ads", "Daily open bonus", REMOTE_CONFIG.dailyOpenBonus);
  state.dailyBonusClaimedDayKey = todayKey();
  save();
  return true;
}

// ---- Gates ----
function isMainCpaUnlockedToday(){
  return state.adsToday >= REMOTE_CONFIG.dailyMinAdsGate;
}
function isAiToolsUnlockedToday(){
  return state.adsToday >= REMOTE_CONFIG.aiToolsGateAds;
}

// ---- CPA offers / submissions ----
function offerHasSlots(offer){
  return (offer.slotsUsed || 0) < (offer.slots || Infinity);
}

function submitCpaTask(offerId, proof){
  const sub = {
    id: "SUB" + Date.now(),
    offerId, proof,
    status: "verifying",
    submittedAt: new Date().toISOString(),
  };
  state.cpaSubmissions.push(sub);
  save();
  return sub;
}

// DEMO ONLY — simulates the advertiser/admin approving a submission.
// In production this must be a real backend action, never client-triggered.
function demoApproveCpa(subId){
  const sub = state.cpaSubmissions.find(s => s.id === subId);
  if(!sub || sub.status !== "verifying") return false;
  const offer = REMOTE_CONFIG.cpaOffers.find(o => o.id === sub.offerId);
  if(!offer) return false;
  sub.status = "approved";
  addLedgerEntry("cpa", offer.title, offer.reward);
  offer.slotsUsed = (offer.slotsUsed || 0) + 1;
  saveCpaOffers(REMOTE_CONFIG.cpaOffers);
  save();
  return true;
}

// ---- Withdrawals ----
function isWithinWithdrawWindow(d = new Date()){
  const day = d.getDay();
  const hour = d.getHours() + d.getMinutes()/60;
  if(day === 6) return hour >= 13 && hour < 16;
  if(day === 0) return hour >= 12 && hour < 15;
  return false;
}
function nextWithdrawWindowLabel(){
  return "Saturday 1:00 PM – 4:00 PM or Sunday 12:00 PM – 3:00 PM";
}

function requestWithdrawal(wallet, amount, accountNumber, name){
  const w = {
    id: "WD" + Date.now(),
    wallet, amount, accountNumber, name,
    status: "processing",
    date: new Date().toISOString(),
  };
  state.withdrawals.unshift(w);

  let remaining = amount;
  const now = Date.now();
  for(const e of state.ledger.filter(x => x.wallet === wallet && new Date(x.unlockAt).getTime() <= now)
                              .sort((a,b) => new Date(a.creditedAt) - new Date(b.creditedAt))){
    if(remaining <= 0) break;
    const take = Math.min(e.amount, remaining);
    e.amount -= take;
    remaining -= take;
  }
  state.ledger = state.ledger.filter(e => e.amount > 0.0001);
  save();
  return w;
}


