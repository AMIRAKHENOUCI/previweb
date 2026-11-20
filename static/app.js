// ---------- Partie A : lire et afficher le CSV ----------

function lireCSV(texte) {
  const lignes = texte.replace(/^\uFEFF/, "").split(/\r?\n/);
  if (lignes[0].trim().toLowerCase() !== "date,valeur") {
    throw new Error("En-tête attendu : date,valeur");
  }
  const observations = [];
  const erreurs = [];

  for (let i = 1; i < lignes.length; i++) {
    const brut = lignes[i];
    if (brut.trim() === "") continue;           // ligne vide ignorée
    const numero = i + 1;                       // l'en-tête est la ligne 1
    const [date = "", valeur = ""] = brut.split(",").map(s => s.trim());

    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(date))) {
      erreurs.push(`Ligne ${numero} : date invalide (${date})`);
    } else if (valeur === "" || Number.isNaN(Number(valeur))) {
      erreurs.push(`Ligne ${numero} : valeur invalide (${valeur})`);
    } else {
      observations.push({ date, valeur: Number(valeur) });
    }
  }
  observations.sort((a, b) => a.date.localeCompare(b.date));
  return { observations, erreurs };
}

function afficherTableau(observations) {
  const tbody = document.querySelector("#tableau-observations tbody");
  tbody.replaceChildren();                      // vide le tableau
  for (const obs of observations) {
    const tr = document.createElement("tr");
    const tdDate = document.createElement("td");
    const tdValeur = document.createElement("td");
    tdDate.textContent = obs.date;              // textContent : pas d'injection HTML
    tdValeur.textContent = obs.valeur;
    tr.append(tdDate, tdValeur);
    tbody.appendChild(tr);
  }
}

function afficherMessage(texte, type) {
  const message = document.getElementById("message");
  message.textContent = texte;
  message.className = "message " + type;        // type = "succes" ou "erreur"
}

// ---------- Partie B : API Flask et graphique ----------

async function analyser(observations) {
  const reponse = await fetch("/api/analyse", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ donnees: observations })
  });
  const resultat = await reponse.json();
  if (!reponse.ok) throw new Error(resultat.erreur);
  return resultat;
}

let graphique = null;
function tracerSerie(resultat) {
  if (graphique) graphique.destroy();           // un seul graphique à la fois
  document.querySelector("#zone-serie .attente").hidden = true;
  graphique = new Chart(document.getElementById("graphique-serie"), {
    type: "line",
    data: {
      labels: resultat.dates,
      datasets: [
        { label: "Ventes mensuelles", data: resultat.valeurs, borderColor: "#2A6F97", tension: 0.2 },
        { label: "Moyenne mobile (3)", data: resultat.moyenne_mobile, borderColor: "#E76F51", pointRadius: 0 }
      ]
    },
    options: { responsive: true, maintainAspectRatio: false }
  });
}

function afficherResume(resultat) {
  const mm = resultat.moyenne_mobile.filter(v => v !== null);
  const derniere = mm[mm.length - 1];
  document.getElementById("resume-serie").textContent =
    `${resultat.valeurs.length} observations — dernière MM3 : ${derniere}`;
}

document.getElementById("form-import").addEventListener("submit", async (evenement) => {
  evenement.preventDefault();
  const fichier = document.getElementById("fichier-csv").files[0];
  const texte = await fichier.text();
  try {
    const { observations, erreurs } = lireCSV(texte);
    const resultat = await analyser(observations);   // calcul côté serveur
    afficherTableau(observations);
    tracerSerie(resultat);
    afficherResume(resultat);

    let bilan = `${observations.length} observations importées`;
    if (erreurs.length > 0) {
      bilan += `, ${erreurs.length} lignes rejetées : ` + erreurs.slice(0, 5).join(" ; ");
    }
    afficherMessage(bilan, erreurs.length > 0 ? "erreur" : "succes");
  } catch (e) {
    afficherMessage(e.message, "erreur");            // erreurs du CSV et du serveur
  }
});