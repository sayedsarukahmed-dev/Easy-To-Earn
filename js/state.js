const REMOTE_CONFIG = {
  perAdReward: 0.02,
  dailyOpenBonus: 0.02,
  task100Reward: 0.20,
  task500Reward: 1.00,
  adSkipLockSeconds: 15,
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
    wallet: 0,
    bonusWallet: 0,
    adsTotal: 0,
    adsToday: 0,
    lastAdsDayKey: todayKey(),
    dailyBonusClaimedDayKey: null,
    vipClaimed: [],
    referralCode: genReferralCode(),
    referrals: [],
    withdrawals: [],
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
  const day = d.getDay();
  const hour = d.getHours() + d.getMinutes()/60;
  if(day === 6) return hour >= 13 && hour < 16;
  if(day === 0) return hour >= 12 && hour < 15;
  return false;
}

function nextWithdrawWindowLabel(){
  return "Saturday 1:00 PM – 4:00 PM or Sunday 12:00 PM – 3:00 PM";
}

function requestWithdrawal(amount, accountNumber, name){
  const w = {
    id: "WD" + Date.now(),
    amount, accountNumber, name,
    status: "processing",
    date: new Date().toISOString(),
  };
  state.withdrawals.unshift(w);
  state.wallet -= amount;
  save();
  return w;
}
