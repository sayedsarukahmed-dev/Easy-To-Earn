/* ============================================================
   STATE.JS
   Local state layer. In production, replace the REMOTE_CONFIG
   object with a real Firebase Remote Config fetch, and replace
   localStorage persistence with real backend API calls (the
   wallet balance must NEVER be trusted from the client alone —
   the backend must be the source of truth before real money
   moves). This file is a working frontend simulation so the
   full flow can be tested end-to-end before backend wiring.
   ============================================================ */

// ---- Remote-config-style values (admin would edit these) ----
const REMOTE_CONFIG = {
  perAdReward: 0.02,        // ₹ per completed ad
  dailyOpenBonus: 0.02,     // ₹ for opening app once per day
  task100Reward: 0.20,      // ₹ bonus for 100 ads in a day
  task500Reward: 1.00,      // ₹ bonus for 500 ads in a day
  adSkipLockSeconds: 15,    // seconds before skip button unlocks
  referralAdsRequired: 50,
  referralDaysRequired: 3,
  referralBonusReferrer: 1.00,
  referralBonusNewUser: 0.50,
  withdrawMin: 100,
  vipLevels: [
    { level: 1, ads: 2000,  reward: 5   },
    { level: 2, ads: 4000,  reward: 10  },
    { level: 3, ads: 7500,  reward: 20  },
    { level: 4, ads: 9000,  reward: 31  },
    { level: 5, ads: 12500, reward: 40  },
    { level: 6, ads: 20000, reward: 100 },
    { level: 7, ads: 25000, reward: 150 },
    { level: 8, ads: 30000, reward: 170 },
  ],
};

const STORE_KEY = "earnly_state_v1";

function defaultState(){
  return {
    wallet: 0,            // main ads wallet
    bonusWallet: 0,       // separate CPA/task wallet
    adsTotal: 0,
    adsToday: 0,
    lastAdsDayKey: todayKey(),
    dailyBonusClaimedDayKey: null,
    vipClaimed: [],        // level numbers already claimed
    referralCode: genReferralCode(),
    referrals: [],          // {id, name, adsWatched, daysActive, completed}
    withdrawals: [],         // {id, amount, status, date}
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
    // reset daily counters on a new day
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

// Credit an ad reward — only called after ad-player confirms FULL completion
function creditAdWatch(){
  state.adsTotal += 1;
  state.adsToday += 1;
  state.wallet += REMOTE_CONFIG.perAdReward;

  let bonusMsg = null;
  if(state.adsToday === 100){
    state.wallet += REMOTE_CONFIG.task100Reward;
    bonusMsg = `100 ads task complete! +₹${REMOTE_CONFIG.task100Reward.toFixed(2)} bonus`;
  }
  if(state.adsToday === 500){
    state.wallet += REMOTE_CONFIG.task500Reward;
    bonusMsg = `500 ads task complete! +₹${REMOTE_CONFIG.task500Reward.toFixed(2)} bonus`;
  }

  // VIP check
  let vipMsg = null;
  const lvl = currentVipLevel();
  if(lvl > 0 && !state.vipClaimed.includes(lvl)){
    const v = REMOTE_CONFIG.vipLevels.find(x => x.level === lvl);
    state.wallet += v.reward;
    state.vipClaimed.push(lvl);
    vipMsg = `VIP ${lvl} unlocked! +₹${v.reward} reward`;
  }

  save();
  return { bonusMsg, vipMsg };
}

function claimDailyBonus(){
  if(state.dailyBonusClaimedDayKey === todayKey()) return false;
  state.wallet += REMOTE_CONFIG.dailyOpenBonus;
  state.dailyBonusClaimedDayKey = todayKey();
  save();
  return true;
}

function isWithinWithdrawWindow(d = new Date()){
  const day = d.getDay(); // 0 = Sunday, 6 = Saturday
  const hour = d.getHours() + d.getMinutes()/60;
  if(day === 6) return hour >= 13 && hour < 16;   // Sat 1PM–4PM
  if(day === 0) return hour >= 12 && hour < 15;   // Sun 12PM–3PM
  return false;
}

function nextWithdrawWindowLabel(){
  return "Saturday 1:00 PM – 4:00 PM or Sunday 12:00 PM – 3:00 PM";
}

function requestWithdrawal(amount, accountNumber, name){
  const w = {
    id: "WD" + Date.now(),
    amount, accountNumber, name,
    status: "processing", // becomes "success" or "failed" only via real payout API + admin approval
    date: new Date().toISOString(),
  };
  state.withdrawals.unshift(w);
  state.wallet -= amount;
  save();
  return w;
}
