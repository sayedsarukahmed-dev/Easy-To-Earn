/* ============================================================
   CONFIG.JS
   All tunable numbers live here as DEFAULT_CONFIG. The Admin
   Panel writes overrides to localStorage; REMOTE_CONFIG below
   is DEFAULT_CONFIG merged with those overrides, so every other
   file just reads REMOTE_CONFIG as before.

   IMPORTANT: once the real backend exists, this whole file's
   role moves server-side (Firebase Remote Config / Firestore
   "settings" doc + a real authenticated admin role) — this
   localStorage version is only so the admin-panel UI/flow can
   be built and tested now. adminPassword below is a PLACEHOLDER
   and must never be relied on as real security.
   ============================================================ */

const DEFAULT_CONFIG = {
  adminPassword: "earnly-admin-2026",   // PLACEHOLDER ONLY — replace with real backend auth later

  // Ads
  perAdReward: 0.02,
  dailyOpenBonus: 0.02,
  task100Reward: 0.20,
  task500Reward: 1.00,
  adSkipLockSeconds: 15,
  adGapMinutes: 5,            // forced interstitial gap
  dailyMinAdsGate: 12,        // ads required to unlock main CPA dashboard
  aiToolsGateAds: 3,          // ads required to unlock AI Tools & Extras dashboard

  // Referral
  referralAdsRequired: 50,
  referralDaysRequired: 3,
  referralBonusReferrer: 1.00,
  referralBonusNewUser: 0.50,

  // Wallet / withdrawal
  withdrawMin: 100,
  adsLockDays: 7,
  cpaLockDays: 30,
  userSharePercent: 45,        // default % of advertiser price given to user, per offer override possible

  // Push notifications
  pushPerDay: 3,               // fixed schedule: morning / evening / night, no reward to user

  demoOtp: "123456",

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

  // CPA offers — category is one of: easy | medium | extended | hardest | aitools
  cpaOffers: [
    {
      id: "cpa-quickinstall-1",
      category: "easy",
      title: "Angel One — Install & Open App",
      advertiserPrice: 25,
      reward: 12,
      timeRequired: "2 minutes",
      description: "Install the Angel One app from the link below and open it once to complete this task.",
      steps: [
        "Tap the app link below to open the Play Store listing.",
        "Install the app on your phone.",
        "Open the app at least once after installing.",
        "Come back here and tap \"I've completed this\" to submit.",
      ],
      importantInfo: [
        "Do not uninstall the app for at least 24 hours — early uninstalls are not counted by the advertiser and your submission will be rejected.",
        "Only one submission per person is allowed for this task.",
      ],
      link: "#",
      slots: 200,
      slotsUsed: 0,
    },
    {
      id: "cpa-demat-1",
      category: "hardest",
      title: "Upstox — Open a Demat Account",
      advertiserPrice: 280,
      reward: 140,
      timeRequired: "10-15 minutes",
      description: "Open a new Demat & Trading account with Upstox using the link below, and complete your KYC fully.",
      steps: [
        "Tap the link below to start your Upstox account opening.",
        "Complete your KYC using your PAN and Aadhaar as guided by Upstox.",
        "Make sure your account status shows \"Active\" in the Upstox app.",
        "Come back here and submit your registered mobile number as proof.",
      ],
      importantInfo: [
        "You must not already have an existing Upstox account — duplicate accounts are not eligible.",
        "Your KYC must be fully approved, not just submitted, for this task to be verified.",
        "Reward is credited to your CPA Wallet only after Upstox confirms your account — this can take up to a few weeks.",
      ],
      link: "#",
      slots: 100,
      slotsUsed: 0,
    },
    {
      id: "cpa-aitool-1",
      category: "aitools",
      title: "Install a Free AI Browser Extension",
      advertiserPrice: 15,
      reward: 7,
      timeRequired: "1-2 minutes",
      description: "Install a free AI browser extension and sign in once with your Google account to complete this task.",
      steps: [
        "Tap the link below to open the extension's install page.",
        "Add the extension to your browser.",
        "Sign in once using \"Sign in with Google\" when prompted.",
        "Come back here and submit to complete this task.",
      ],
      importantInfo: [
        "The extension must stay installed for at least 24 hours for this to be verified.",
        "Only one submission per person is allowed for this task.",
      ],
      link: "#",
      slots: 150,
      slotsUsed: 0,
    },
    {
      id: "cpa-crypto-1",
      category: "aitools",
      title: "Join a Telegram Crypto Community",
      advertiserPrice: 60,
      reward: 27,
      timeRequired: "2-3 minutes",
      description: "Join the Telegram channel below and complete a simple sign-up on the linked crypto platform.",
      steps: [
        "Tap the link below to open the Telegram channel.",
        "Join the channel.",
        "Complete the linked sign-up using your email address.",
        "Come back here and submit your registered email as proof.",
      ],
      importantInfo: [
        "Only offers from recognized, established platforms are listed here.",
        "This is a sign-up task only — no payment or deposit of your own money is ever required to complete it.",
      ],
      link: "#",
      slots: 80,
      slotsUsed: 0,
    },
    {
      id: "cpa-social-1",
      category: "aitools",
      title: "Follow a Page on Instagram",
      advertiserPrice: 5,
      reward: 2,
      timeRequired: "30 seconds",
      description: "Follow the Instagram page linked below to complete this task.",
      steps: [
        "Tap the link below to open the Instagram page.",
        "Follow the page.",
        "Come back here and submit your Instagram username as proof.",
      ],
      importantInfo: [
        "Unfollowing within 7 days will make this task ineligible for future rewards from the same advertiser.",
        "Only one submission per person is allowed for this task.",
      ],
      link: "#",
      slots: 300,
      slotsUsed: 0,
    },
  ],
};

const ADMIN_STORE_KEY = "earnly_admin_config_v1";

function loadConfig(){
  let overrides = {};
  try{
    const raw = localStorage.getItem(ADMIN_STORE_KEY);
    if(raw) overrides = JSON.parse(raw);
  }catch(e){ overrides = {}; }
  return Object.assign({}, DEFAULT_CONFIG, overrides);
}

let REMOTE_CONFIG = loadConfig();

// Persist a partial set of changed keys and refresh REMOTE_CONFIG in place
function saveConfig(patch){
  let overrides = {};
  try{
    const raw = localStorage.getItem(ADMIN_STORE_KEY);
    if(raw) overrides = JSON.parse(raw);
  }catch(e){ overrides = {}; }
  Object.assign(overrides, patch);
  localStorage.setItem(ADMIN_STORE_KEY, JSON.stringify(overrides));
  Object.assign(REMOTE_CONFIG, DEFAULT_CONFIG, overrides);
}

function saveCpaOffers(offers){
  saveConfig({ cpaOffers: offers });
}
