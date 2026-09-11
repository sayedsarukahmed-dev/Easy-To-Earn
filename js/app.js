const routes = { home: viewHome, earn: viewEarn, refer: viewRefer, wallet: viewWallet };
let currentRoute = "home";

function render(){
  document.getElementById("app").innerHTML = routes[currentRoute]();
  document.querySelectorAll(".navbtn").forEach(b => {
    b.classList.toggle("active", b.dataset.route === currentRoute);
  });
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

document.getElementById("bottomnav").addEventListener("click", (e) => {
  const btn = e.target.closest(".navbtn");
  if(btn) goTo(btn.dataset.route);
});

document.getElementById("app").addEventListener("click", (e) => {
  const btn = e.target.closest("[data-action]");
  if(!btn) return;
  const action = btn.dataset.action;

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
  }

  if(action === "claim-daily"){
    const ok = claimDailyBonus();
    if(ok){
      toast(`+₹${REMOTE_CONFIG.dailyOpenBonus.toFixed(2)} daily bonus credited`, "success");
      render();
    }
  }

  if(action === "copy-code"){
    navigator.clipboard?.writeText(state.referralCode).catch(()=>{});
    toast("Referral code copied", "success");
  }

  if(action === "add-demo-referral"){
    state.referrals.push({ id: Date.now(), name: "Demo User " + (state.referrals.length+1), adsWatched: 0, daysActive: 0, completed:false });
    save();
    render();
  }

  if(action === "submit-withdraw"){
    const name = document.getElementById("wd-name").value.trim();
    const account = document.getElementById("wd-account").value.trim();
    const amount = parseFloat(document.getElementById("wd-amount").value);

    if(!name || !account){ toast("Please enter name and account number", "warn"); return; }
    if(!amount || amount < REMOTE_CONFIG.withdrawMin){ toast(`Minimum is ₹${REMOTE_CONFIG.withdrawMin}`, "warn"); return; }
    if(amount > state.wallet){ toast("Not enough balance", "warn"); return; }
    if(!isWithinWithdrawWindow()){ toast("Withdrawal window is closed right now", "warn"); return; }

    requestWithdrawal(amount, account, name);
    toast("Withdrawal request sent — status is Processing", "success");
    render();
  }
});

render();
