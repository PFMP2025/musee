const S = { data: [], filtres: { q:"", annee:null } };

async function load(){
  const resp = await fetch("./data/resistantes.json");
  S.data = await resp.json();
  buildTimeline();
  const q = document.getElementById("q");
  q.addEventListener("input", e => { S.filtres.q = e.target.value; render(); });
  render();
}
function norm(x){ return (x||"").toString().toLowerCase(); }

function buildTimeline(){
  const years = [...new Set(S.data.map(x=>x.annee).filter(Boolean))].sort((a,b)=>a-b);
  const tl = document.getElementById("timeline");
  tl.innerHTML = ["<span class='year active' data-year=''>Toutes</span>"]
    .concat(years.map(y=>`<span class="year" data-year="${y}">${y}</span>`)).join("");
  tl.addEventListener("click", e => {
    const y = e.target.dataset.year;
    if(y !== undefined){
      S.filtres.annee = y? Number(y) : null;
      [...tl.querySelectorAll(".year")].forEach(el=>el.classList.remove("active"));
      e.target.classList.add("active");
      render();
    }
  });
}

function render(){
  const q = norm(S.filtres.q);
  const an = S.filtres.annee;
  const items = S.data.filter(x=>{
    const inText = [x.nom,x.ville,(x.tags||[]).join(" ")].some(v=>norm(v).includes(q));
    const inYear = !an || x.annee===an;
    return inText && inYear;
  });
  const grid = document.getElementById("grid");
  grid.innerHTML = items.map(x=>`
    <article class="card">
      <div class="txt">
        <h3>${x.nom}</h3>
        <div class="badges">
          ${x.ville? `<span class="badge">${x.ville}</span>` : ""}
          ${x.annee? `<span class="badge">${x.annee}</span>` : ""}
          ${(x.tags||[]).slice(0,3).map(t=>`<span class="badge">${t}</span>`).join("")}
        </div>
        <a href="${x.url}" target="_blank" rel="noopener">Ouvrir la page du groupe →</a>
      </div>
    </article>
  `).join("");
}

load();
