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
