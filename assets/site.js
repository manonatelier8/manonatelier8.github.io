/* Manon Atelier · scripts du site */
(function () {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const EMAIL = "manon.atelier8@outlook.fr";
  const IG_DM = "https://ig.me/m/manon.atelier8";
  const euro = n => (Math.round(n * 100) / 100).toString().replace(".", ",") + " €";

  /* ---------- Copier l'adresse e-mail ---------- */
  $$("[data-copy]").forEach(btn => btn.addEventListener("click", () => {
    const txt = btn.getAttribute("data-copy");
    try { navigator.clipboard.writeText(txt).then(() => { btn.textContent = "Adresse copiée"; }, () => {}); } catch (_) {}
  }));

  /* ---------- Sacs en stock (fichier data/stock.json, modifiable dans l'espace admin) ---------- */
  function stockCard(it) {
    const label = `${it.nom} ${it.couleur || ""}`.trim();
    let action;
    if (it.vendu) action = `<span class="btn small ghost" aria-disabled="true">Vendu</span>`;
    else if (it.lien_stripe) action = `<a class="btn small" href="${esc(it.lien_stripe)}" target="_blank" rel="noopener">Acheter</a>`;
    else action = `<a class="btn small" href="${IG_DM}" target="_blank" rel="noopener" aria-label="Réserver ${esc(label)}">Réserver</a>`;
    const old = it.ancien_prix && it.ancien_prix > it.prix ? `<s>${euro(it.ancien_prix)}</s>` : "";
    return `<article class="item${it.vendu ? " sold" : ""}">
      <img src="${esc(it.photo)}" alt="Sac au crochet ${esc(label)}" loading="lazy">
      <h3>${esc(it.nom)}</h3>
      <span class="col">${esc(it.couleur || "")}</span>
      <div class="buy">
        <span class="pr"><b>${euro(it.prix)}</b>${old}</span>
        ${action}
      </div>
    </article>`;
  }

  const stockTargets = $$("[data-stock]");
  if (stockTargets.length) {
    fetch("data/stock.json", { cache: "no-cache" })
      .then(r => r.json())
      .then(items => {
        stockTargets.forEach(el => {
          const saison = el.getAttribute("data-stock");
          const limit = parseInt(el.getAttribute("data-limit") || "0", 10);
          let list = items.filter(it => !saison || saison === "tout" || it.saison === saison);
          if (limit) list = list.filter(it => !it.vendu).slice(0, limit);
          el.innerHTML = list.length ? list.map(stockCard).join("") :
            `<p class="empty">Toutes les pièces de cette collection ont trouvé preneuse. Les prochaines arrivent bientôt sur Instagram.</p>`;
        });
      })
      .catch(() => stockTargets.forEach(el => {
        el.innerHTML = `<p class="empty">Les sacs disponibles n’ont pas pu s’afficher. Rechargez la page ou écrivez-moi sur Instagram.</p>`;
      }));
  }

  /* ---------- Configurateur sur mesure ---------- */
  const cfg = $("#cfg");
  if (!cfg) return;
  const D = window.ATELIER;
  const fModel = $("#f-model"), fSize = $("#f-size");
  fModel.innerHTML = D.models.map(m => `<option value="${m.id}">${esc(m.name)} · dès ${m.price} €</option>`).join("");

  const chip = (name, type, val, label, extra = "", checked = false, add = 0) =>
    `<label class="chip"><input type="${type}" name="${name}" value="${esc(val)}" ${checked ? "checked" : ""}><span>${extra}${esc(label)}${add ? ` <em>+${add} €</em>` : ""}</span></label>`;
  function renderExtras() {
    const m = D.models.find(x => x.id === fModel.value);
    const kept = $$('input[name="extra"]:checked', cfg).map(i => i.value);
    $("#f-extras").innerHTML = D.extras.map(e => chip("extra", "checkbox", e, e, "", kept.includes(e), e === "Doublure" ? m.lining : 0)).join("");
  }
  $("#f-chain").innerHTML = D.chains.map((c, i) => chip("chain", "radio", c.id, c.label, "", i === 0, c.add)).join("");
  $("#f-ship").innerHTML = D.ship.map((x, i) => `<label class="chip"><input type="radio" name="ship" value="${x.id}" ${i === 0 ? "checked" : ""}><span>${esc(x.label)} <em>+${euro(x.add)}</em></span></label>`).join("");
  $("#f-len").innerHTML = D.lens.map((l, i) => chip("len", "radio", l.id, l.label, "", i === 1, l.add)).join("");
  $("#f-flower").innerHTML = D.flowers.map(([n, c], i) => chip("flower", "radio", n, n, `<i class="dot" style="background:${c}"></i>`, i === 0)).join("");

  const val = n => (cfg.querySelector(`input[name="${n}"]:checked`) || {}).value;
  function updateSizes() {
    renderExtras();
    const m = D.models.find(x => x.id === fModel.value);
    $("#size-wrap").hidden = !m.sizes;
    fSize.innerHTML = m.sizes ? m.sizes.map(s => `<option>${esc(s)}</option>`).join("") : "";
  }
  function update() {
    const m = D.models.find(x => x.id === fModel.value);
    const chain = D.chains.find(c => c.id === val("chain"));
    const len = D.lens.find(l => l.id === val("len"));
    const hasChain = chain.id !== "none";
    $("#len-wrap").hidden = !hasChain;
    $("#flower-wrap").hidden = chain.id !== "fleurs";
    const extras = $$('input[name="extra"]:checked', cfg).map(i => i.value);
    const size = m.sizes ? fSize.value : "";
    const ship = D.ship.find(x => x.id === val("ship"));
    const lining = extras.includes("Doublure") ? m.lining : 0;
    const total = Math.round((m.price + (hasChain ? chain.add + len.add : 0) + lining + ship.add) * 100) / 100;
    const colors = $("#f-colors").value.trim();
    const lines = [["Modèle", m.name + (size ? ` · ${size}` : "")], ["Prix de départ", `${m.price} €`], ["Couleurs", colors || "à définir"]];
    if (extras.length) lines.push(["Finitions", extras.map(e => e === "Doublure" ? `Doublure (+${m.lining} €)` : e).join(", ")]);
    if (hasChain) {
      lines.push(["Chaîne", `${chain.label} (+${chain.add} €)`]);
      lines.push(["Longueur", `${len.label}${len.add ? ` (+${len.add} €)` : ""}`]);
      if (chain.id === "fleurs") lines.push(["Fleurs", val("flower")]);
    }
    lines.push(["Livraison", `${ship.label} Mondial Relay (+${euro(ship.add)})`]);
    $("#s-title").textContent = m.name;
    $("#s-lines").innerHTML = lines.map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join("");
    $("#s-total").textContent = euro(total);
    const name = $("#f-name").value.trim(), contact = $("#f-contact").value.trim(), note = $("#f-msg").value.trim();
    const msg = `Bonjour Manon !\n\nJe souhaite créer mon sac sur mesure :\n` +
      lines.map(([k, v]) => `• ${k} : ${v}`).join("\n") + `\n• Estimation, livraison comprise : ${euro(total)}` +
      (note ? `\n\nMon message :\n${note}` : "") + `\n\n${name || "[Prénom]"}${contact ? ` · ${contact}` : ""}`;
    $("#s-msg").textContent = msg;
    $("#send-mail").href = `mailto:${EMAIL}?subject=${encodeURIComponent("Commande sur mesure · " + m.name)}&body=${encodeURIComponent(msg)}`;
    return msg;
  }
  cfg.addEventListener("input", update);
  cfg.addEventListener("change", e => { if (e.target === fModel) updateSizes(); update(); });
  cfg.addEventListener("submit", e => e.preventDefault());
  $("#copy-msg").addEventListener("click", () => {
    const st = $("#status");
    try {
      navigator.clipboard.writeText(update()).then(
        () => { st.textContent = "Message copié. Collez-le dans vos messages Instagram."; },
        () => { st.textContent = "Copie impossible ici : ouvrez « Voir le message » et sélectionnez le texte."; });
    } catch (_) { st.textContent = "Copie impossible ici : ouvrez « Voir le message » et sélectionnez le texte."; }
  });

  /* Modèle présélectionné depuis une page modèle : sur-mesure.html#ova-mini */
  function fromHash() {
    const id = location.hash.slice(1);
    if (D.models.some(m => m.id === id)) fModel.value = id;
  }
  fromHash();
  window.addEventListener("hashchange", () => { fromHash(); updateSizes(); update(); });
  updateSizes(); update();
})();
