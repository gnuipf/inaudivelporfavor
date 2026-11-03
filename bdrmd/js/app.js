(() => {
  "use strict";
  document.addEventListener("DOMContentLoaded", () => {
  const menuButton = document.querySelector(".nav-toggle");
  const siteLinks = document.querySelector(".site-links");
  if (menuButton && siteLinks) {
    menuButton.addEventListener("click", () => {
      const isOpen = siteLinks.classList.toggle("is-open");
      menuButton.setAttribute("aria-expanded", String(isOpen));
      menuButton.setAttribute("aria-label", isOpen ? "Fechar menu" : "Abrir menu");
      menuButton.textContent = isOpen ? "×" : "☰";
    });
    siteLinks.querySelectorAll("a").forEach(link => link.addEventListener("click", () => {
      siteLinks.classList.remove("is-open");
      menuButton.setAttribute("aria-expanded", "false");
      menuButton.setAttribute("aria-label", "Abrir menu");
      menuButton.textContent = "☰";
    }));
  }
  });
  const $ = id => document.getElementById(id);
  const els = {
    search:$("search"), type:$("type-filter"), year:$("year-filter"), sort:$("sort"),
    clear:$("clear-filters"), rows:$("release-rows"), mobile:$("mobile-results"),
    table:$("table-wrap"), loading:$("loading"), empty:$("empty"), error:$("error"),
    count:$("result-count"), status:$("source-status"), prev:$("prev"), next:$("next"),
    page:$("page-label"), size:$("page-size"), statReleases:$("stat-releases"),
    statBands:$("stat-bands"), statAnniversaries:$("stat-anniversaries"),
    mapToggle:$("mindmap-toggle"), mapPanel:$("mindmap-panel"), map:$("bdrmd-map"), mapLevel:$("mindmap-level"), mapBack:$("mindmap-back"), mapReset:$("mindmap-reset"), mapViewport:document.querySelector(".mindmap-viewport")
  };
  let allReleases = [];
  let currentPage = 1;
  let filtered = [];
  let mapDecade = null, mapMonth = null, mapView = {x:0,y:0,w:1000,h:1000}, mapDrag = null;
  const svgNS = "http://www.w3.org/2000/svg";
  const MAP_MONTHS = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
  const MAP_SHORT = ["JAN","FEV","MAR","ABR","MAI","JUN","JUL","AGO","SET","OUT","NOV","DEZ"];
  const TYPE_LABELS = {album:"Álbum",ep:"EP",single:"Single",compilation:"Compilação",demo:"Demo",live:"Ao vivo"};
  const clean = value => String(value ?? "").replace(/^\uFEFF/, "").trim();
  // Search normalization does not alter the original text shown to the user.
  const normalize = value => clean(value).normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLocaleLowerCase("pt-BR").replace(/[\u200B-\u200D\uFEFF]/g,"").replace(/\s+/g," ");
  const escapeHTML = value => String(value ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const parseDate = value => {
    const s = clean(value);
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
    if (!m) return null;
    const d = new Date(Number(m[1]), Number(m[2])-1, Number(m[3]), 12);
    return d.getFullYear()===Number(m[1]) && d.getMonth()===Number(m[2])-1 && d.getDate()===Number(m[3]) ? d : null;
  };
  const dateText = value => {
    const d = parseDate(value);
    return d ? new Intl.DateTimeFormat("pt-BR",{day:"2-digit",month:"short",year:"numeric"}).format(d).replace(" de "," ") : (value || "Data desconhecida");
  };
  const today = () => { const d = new Date(); return {month:d.getMonth()+1,day:d.getDate()}; };
  const isAnniversaryToday = release => {
    const d = parseDate(release.data);
    if (!d) return false;
    const t = today();
    // 29 February anniversaries are shown on 28 February in non-leap years.
    return d.getMonth()+1===t.month && d.getDate()===t.day ||
      d.getMonth()===1 && d.getDate()===29 && t.month===2 && t.day===28 && !isLeapYear(new Date().getFullYear());
  };
  const isLeapYear = y => y%4===0 && (y%100!==0 || y%400===0);
  const yearsSince = release => {
    const d = parseDate(release.data);
    if (!d) return null;
    const now = new Date();
    let years = now.getFullYear()-d.getFullYear();
    const beforeAnniversary = now.getMonth()<d.getMonth() || (now.getMonth()===d.getMonth() && now.getDate()<d.getDate());
    if (beforeAnniversary) years--;
    return years;
  };
  const typeLabel = type => TYPE_LABELS[String(type||"").toLowerCase()] || (type ? String(type) : "Não informado");
  const normalizeRecord = row => {
    const keys = Object.keys(row || {});
    const find = wanted => {
      const key = keys.find(k => normalize(k).replace(/[_ -]/g,"") === wanted);
      return key === undefined ? "" : row[key];
    };
    const titulo = clean(find("titulo") || find("title"));
    const data = clean(find("data") || find("date"));
    const banda = clean(find("banda") || find("band"));
    const work_type = clean(find("worktype") || find("tipo") || find("type")).toLowerCase();
    if (!titulo && !banda) return null;
    return {titulo, data, banda, work_type:work_type || "unknown"};
  };
  // CSV parser supports quoted commas, escaped quotes and newlines inside quoted cells.
  const parseCSV = input => {
    const rows=[]; let row=[], field="", quoted=false;
    for(let i=0;i<input.length;i++){
      const c=input[i], n=input[i+1];
      if(quoted){
        if(c === '"' && n === '"'){field+='"';i++;}
        else if(c === '"') quoted=false;
        else field+=c;
      } else if(c === '"' && field.length===0) quoted=true;
      else if(c === ","){row.push(field);field="";}
      else if(c === "
"){row.push(field);rows.push(row);row=[];field="";}
      else if(c !== "\r") field+=c;
    }
    if(field.length || row.length){row.push(field);rows.push(row);}
    if(!rows.length) return [];
    const headers=rows.shift().map(h=>clean(h).replace(/^"|"$/g,""));
    return rows.filter(r=>r.some(v=>clean(v))).map(r=>Object.fromEntries(headers.map((h,i)=>[h, r[i] ?? ""])));
  };
  const loadData = async () => {
    const url = window.BDRMD_CONFIG && window.BDRMD_CONFIG.SHEET_CSV_URL;
    if(url){
      if(!/^https:\/\/docs\.google\.com\/spreadsheets\/d\/e\//.test(url) && !/^https:\/\/docs\.google\.com\/spreadsheets\/d\//.test(url))
        throw new Error("A URL configurada não parece ser uma URL pública de CSV do Google Sheets.");
      const response = await fetch(url, {cache:"no-store"});
      if(!response.ok) throw new Error("Não foi possível ler a planilha (HTTP "+response.status+"). Confira se ela foi publicada na web como CSV.");
      const records=parseCSV(await response.text()).map(normalizeRecord).filter(Boolean);
      if(!records.length) throw new Error("A planilha foi acessada, mas nenhum registro foi encontrado. Confira os cabeçalhos: titulo, data, banda, work_type.");
      els.status.textContent="Fonte: IPF";
      return records;
    }
    const response = await fetch("data/releases.json");
    if(!response.ok) throw new Error("Não foi possível carregar data/releases.json.");
    els.status.textContent="Fonte: dados de demonstração";
    return (await response.json()).map(normalizeRecord).filter(Boolean);
  };
  const fillYears = () => {
    const selected=els.year.value;
    const years=[...new Set(allReleases.map(r=>parseDate(r.data)?.getFullYear()).filter(Boolean))].sort((a,b)=>b-a);
    els.year.innerHTML='<option value="">Todos os anos</option>'+years.map(y=>`<option value="${y}">${y}</option>`).join("");
    if(years.includes(Number(selected))) els.year.value=selected;
  };
  const anniversaryText = r => {
    if(isAnniversaryToday(r)){
      const age=yearsSince(r);
      return age>0 ? `Faz ${age} ${age===1?"ano":"anos"} hoje` : "Lançado nesta data";
    }
    return "—";
  };
  const recordHTML = r => `<tr>
    <td class="band-cell">${escapeHTML(r.banda || "—")}</td>
    <td class="title-cell">${escapeHTML(r.titulo || "—")}</td>
    <td class="date-cell">${escapeHTML(dateText(r.data))}</td>
    <td><span class="type-pill">${escapeHTML(typeLabel(r.work_type))}</span></td>
    <td><span class="anniversary ${isAnniversaryToday(r)?"":"none"}">${escapeHTML(anniversaryText(r))}</span></td>
  </tr>`;
  const cardHTML = r => `<article class="release-card">
    <div class="card-top"><span class="card-band">${escapeHTML(r.banda || "Banda não informada")}</span><span class="type-pill">${escapeHTML(typeLabel(r.work_type))}</span></div>
    <h3 class="card-title">${escapeHTML(r.titulo || "Título não informado")}</h3>
    <div class="card-meta"><span>${escapeHTML(dateText(r.data))}</span><span>${escapeHTML((r.data||"").slice(0,4))}</span></div>
    ${isAnniversaryToday(r)?`<div class="card-anniversary">★ ${escapeHTML(anniversaryText(r))}</div>`:""}
  </article>`;
  const sortRecords = records => {
    const collator=new Intl.Collator("pt-BR",{sensitivity:"base",numeric:true});
    const key=els.sort.value;
    return records.sort((a,b)=>{
      if(key==="date-asc" || key==="date-desc"){
        const av=parseDate(a.data)?.getTime() ?? 0, bv=parseDate(b.data)?.getTime() ?? 0;
        return key==="date-asc" ? av-bv : bv-av;
      }
      const av=key==="band-asc"?a.banda:a.titulo, bv=key==="band-asc"?b.banda:b.titulo;
      return collator.compare(av||"",bv||"") || collator.compare(a.titulo||"",b.titulo||"");
    });
  };
  const render = () => {
    const query=normalize(els.search.value), type=els.type.value, year=els.year.value;
    filtered=sortRecords(allReleases.filter(r=>{
      const matchesQuery=!query || normalize([r.banda,r.titulo,r.data,r.work_type].join(" ")).includes(query);
      const matchesType=!type || r.work_type===type;
      const matchesYear=!year || (parseDate(r.data)?.getFullYear()===Number(year));
      return matchesQuery && matchesType && matchesYear;
    }));
    const pageSize=Number(els.size.value), pages=Math.max(1,Math.ceil(filtered.length/pageSize));
    currentPage=Math.min(Math.max(1,currentPage),pages);
    const start=(currentPage-1)*pageSize, pageItems=filtered.slice(start,start+pageSize);
    els.rows.innerHTML=pageItems.map(recordHTML).join("");
    els.mobile.innerHTML=pageItems.map(cardHTML).join("");
    els.table.hidden=pageItems.length===0 || (els.mapPanel && !els.mapPanel.hidden);
    els.mobile.hidden=pageItems.length===0 || (els.mapPanel && !els.mapPanel.hidden);
    if(els.mapPanel && !els.mapPanel.hidden) renderMindMap();
    els.empty.hidden=filtered.length!==0;
    els.loading.hidden=true;
    els.count.textContent=filtered.length===allReleases.length
      ? `${filtered.length.toLocaleString("pt-BR")} registros`
      : `${filtered.length.toLocaleString("pt-BR")} de ${allReleases.length.toLocaleString("pt-BR")} registros`;
    els.page.textContent=`Página ${currentPage} de ${pages}`;
    els.prev.disabled=currentPage<=1; els.next.disabled=currentPage>=pages;
    els.statReleases.textContent=allReleases.length.toLocaleString("pt-BR");
    els.statBands.textContent=new Set(allReleases.map(r=>normalize(r.banda)).filter(Boolean)).size.toLocaleString("pt-BR");
    els.statAnniversaries.textContent=allReleases.filter(isAnniversaryToday).length.toLocaleString("pt-BR");
  };

  const mapEl=(tag,attrs={},text)=>{const n=document.createElementNS(svgNS,tag);Object.entries(attrs).forEach(([k,v])=>n.setAttribute(k,v));if(text!==undefined)n.textContent=text;return n;};
  const mapPoint=(angle,r)=>{const a=angle*Math.PI/180;return{x:500+Math.cos(a)*r,y:500+Math.sin(a)*r};};
  const mapBranch=(a,b,cls="mm-branch")=>els.map.append(mapEl("path",{d:"M"+a.x+","+a.y+" Q"+((a.x+b.x)/2)+","+((a.y+b.y)/2-12)+" "+b.x+","+b.y,class:cls}));
  const mapGroups=()=>{const result=new Map();filtered.forEach(r=>{const d=parseDate(r.data);if(!d)return;const year=d.getFullYear(),decade=Math.floor(year/10)*10,month=d.getMonth()+1,day=d.getDate();if(!result.has(decade))result.set(decade,new Map());const byMonth=result.get(decade);if(!byMonth.has(month))byMonth.set(month,new Map());const byDay=byMonth.get(month);if(!byDay.has(day))byDay.set(day,[]);byDay.get(day).push(r);});return result;};
  const mapRoot=(label,action)=>{const g=mapEl("g",{class:"mm-root-hit",role:"button",tabindex:"0","aria-label":label});g.append(mapEl("circle",{cx:500,cy:500,r:76,class:"mm-root"}),mapEl("text",{x:500,y:493,class:"mm-root-title"},"BDRMD"),mapEl("text",{x:500,y:516,class:"mm-root-sub"},label));g.addEventListener("click",action);g.addEventListener("keydown",e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();action();}});els.map.append(g);};
  const mapNode=(x,y,w,h,cls,title,sub,aria,action)=>{const g=mapEl("g",{role:"button",tabindex:"0","aria-label":aria});g.append(mapEl("rect",{x:x-w/2,y:y-h/2,width:w,height:h,rx:9,class:cls}),mapEl("text",{x,y:y-2,class:cls.startsWith("mm-decade")?"mm-decade-label":"mm-month-label"},title),mapEl("text",{x,y:y+14,class:cls.startsWith("mm-decade")?"mm-decade-count":"mm-month-count"},sub));g.addEventListener("click",action);g.addEventListener("keydown",e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();action();}});els.map.append(g);};
  const renderMindMap=()=>{
    if(!els.mapPanel || els.mapPanel.hidden)return;
    const groups=mapGroups();els.map.replaceChildren();const oldDetails=document.getElementById("mindmap-day-details");if(oldDetails)oldDetails.remove();
    if(!groups.size){mapRoot("SEM LANÇAMENTOS",()=>{});els.mapLevel.textContent="Nenhum lançamento com data válida nos filtros atuais";els.mapBack.disabled=true;return;}
    if(mapDecade!==null&&!groups.has(mapDecade)){mapDecade=null;mapMonth=null;}
    if(mapMonth!==null&&!groups.get(mapDecade)?.has(mapMonth))mapMonth=null;
    if(mapDecade===null){
      const decades=[...groups.keys()].sort((a,b)=>a-b);
      decades.forEach((decade,i)=>{const angle=-90+i*360/decades.length,p=mapPoint(angle,260),count=[...groups.get(decade).values()].reduce((s,days)=>s+[...days.values()].reduce((n,items)=>n+items.length,0),0);mapBranch({x:500,y:500},p);mapNode(p.x,p.y,116,54,"mm-decade",decade+"s",count+" lanç.","Década de "+decade+", "+count+" lançamentos",()=>{mapDecade=decade;mapMonth=null;renderMindMap();});});
      mapRoot("DÉCADAS",()=>{mapDecade=null;mapMonth=null;renderMindMap();});
      els.mapLevel.textContent="Nível 1 · Décadas · "+decades.length+" período(s)";
    }else{
      const months=groups.get(mapDecade),anchor=mapPoint(-90,165);mapBranch({x:500,y:500},anchor);
      mapNode(anchor.x,anchor.y,124,54,"mm-decade selected",mapDecade+"s","DÉCADA","Voltar para todas as décadas",()=>{mapDecade=null;mapMonth=null;renderMindMap();});
      [...months.keys()].sort((a,b)=>a-b).forEach(m=>{const angle=-90+(m-1)*30,p=mapPoint(angle,305),days=months.get(m),count=[...days.values()].reduce((s,a)=>s+a.length,0);mapBranch(anchor,p);mapNode(p.x,p.y,104,48,"mm-month"+(mapMonth===m?" selected":""),MAP_SHORT[m-1],count+" lanç.",MAP_MONTHS[m-1]+", "+count+" lançamentos",()=>{mapMonth=mapMonth===m?null:m;renderMindMap();});});
      if(mapMonth!==null){
        const p=mapPoint(-90+(mapMonth-1)*30,305),days=months.get(mapMonth),arr=[...days.keys()].sort((a,b)=>a-b),spread=Math.min(155,Math.max(70,arr.length*5)),start=-90+(mapMonth-1)*30-spread/2,today=new Date(),todayKey=(today.getMonth()+1)+"-"+today.getDate();
        arr.forEach((day,i)=>{const angle=arr.length===1?-90+(mapMonth-1)*30:start+spread*i/(arr.length-1),dp=mapPoint(angle,445),records=days.get(day),isToday=(mapMonth+"-"+day)===todayKey;mapBranch(p,dp,"mm-month-branch");const node=mapEl("circle",{cx:dp.x,cy:dp.y,r:17,class:"mm-day"+(isToday?" today":""),role:"button",tabindex:"0","aria-label":"Dia "+day+" de "+MAP_MONTHS[mapMonth-1]+", "+records.length+" lançamentos"});const open=()=>showMapDay(mapMonth,day,records);node.addEventListener("click",open);node.addEventListener("keydown",e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();open();}});els.map.append(node,mapEl("text",{x:dp.x,y:dp.y,class:"mm-day-label"},String(day)),mapEl("text",{x:dp.x,y:dp.y+27,class:"mm-day-count"},String(records.length));});
      }
      mapRoot(mapMonth!==null?"VOLTAR AO MÊS":"VOLTAR À DÉCADA",()=>{if(mapMonth!==null)mapMonth=null;else mapDecade=null;renderMindMap();});
      els.mapLevel.textContent=mapMonth!==null?"Nível 3 · "+MAP_MONTHS[mapMonth-1]+" · "+mapDecade+"s":"Nível 2 · "+mapDecade+"s · Meses";
    }
    els.mapBack.disabled=mapDecade===null;
  };
  const showMapDay=(month,day,records)=>{
    const panel=document.getElementById("mindmap-day-details");if(panel)panel.remove();
    const detail=document.createElement("div");detail.id="mindmap-day-details";detail.className="notice";detail.style.marginTop="12px";
    const title=document.createElement("strong");title.textContent=day+" de "+MAP_MONTHS[month-1]+" · "+records.length+" lançamento(s)";
    const list=document.createElement("div");list.className="mindmap-day-list";
    records.slice().sort((a,b)=>(parseDate(b.data)?.getTime()||0)-(parseDate(a.data)?.getTime()||0)).forEach(r=>{const item=document.createElement("div");item.className="mindmap-day-item";const band=document.createElement("b"),album=document.createElement("span"),year=document.createElement("small");band.textContent=r.banda||"Banda não informada";album.textContent=r.titulo||"Título não informado";year.textContent=dateText(r.data)+" · "+typeLabel(r.work_type);item.append(band,album,year);list.append(item);});
    detail.append(title,list);els.mapPanel.append(detail);detail.scrollIntoView({behavior:"smooth",block:"nearest"});
  };
  const setMapView=active=>{els.mapPanel.hidden=!active;els.mapToggle.setAttribute("aria-expanded",String(active));els.mapToggle.textContent=active?"▤ Voltar à Tabela":"✥ Mapa Mental";els.table.hidden=active||!filtered.length;els.mobile.hidden=active||!filtered.length;document.querySelector(".pagination").hidden=active;if(active){renderMindMap();els.mapPanel.scrollIntoView({behavior:"smooth",block:"start"});}};
  const resetMapView=()=>{mapDecade=null;mapMonth=null;renderMindMap();};

  const resetPageAndRender=()=>{currentPage=1;render();};
  [els.search,els.type,els.year,els.sort,els.size].forEach(el=>el.addEventListener(el===els.search?"input":"change",resetPageAndRender));
  els.clear.addEventListener("click",()=>{els.search.value="";els.type.value="";els.year.value="";els.sort.value="date-desc";currentPage=1;render();});
  els.prev.addEventListener("click",()=>{currentPage--;render();});
  els.next.addEventListener("click",()=>{currentPage++;render();});
  if(els.mapToggle){els.mapToggle.addEventListener("click",()=>setMapView(els.mapPanel.hidden));els.mapBack.addEventListener("click",()=>{if(mapMonth!==null)mapMonth=null;else mapDecade=null;renderMindMap();});els.mapReset.addEventListener("click",resetMapView);}
  if(els.mapViewport){els.mapViewport.addEventListener("pointerdown",e=>{if(e.target.closest(".mm-decade")||e.target.closest(".mm-month")||e.target.closest(".mm-day")||e.target.closest(".mm-root-hit"))return;mapDrag={x:e.clientX,y:e.clientY,view:{...mapView}};els.mapViewport.classList.add("dragging");els.mapViewport.setPointerCapture(e.pointerId);});els.mapViewport.addEventListener("pointermove",e=>{if(!mapDrag)return;const rect=els.map.getBoundingClientRect(),dx=(e.clientX-mapDrag.x)*mapDrag.view.w/rect.width,dy=(e.clientY-mapDrag.y)*mapDrag.view.h/rect.height;mapView={...mapDrag.view,x:mapDrag.view.x-dx,y:mapDrag.view.y-dy};els.map.setAttribute("viewBox",Object.values(mapView).join(" "));});const stop=()=>{mapDrag=null;els.mapViewport.classList.remove("dragging")};els.mapViewport.addEventListener("pointerup",stop);els.mapViewport.addEventListener("pointercancel",stop);}
  
  loadData().then(records=>{
    allReleases=records;
    fillYears();
    els.error.hidden=true;
    render();
  }).catch(err=>{
    els.loading.hidden=true; els.error.hidden=false;
    els.error.textContent=err.message+" Para testar sem Google Sheets, deixe SHEET_CSV_URL vazio em config.js.";
    els.status.textContent="Erro ao carregar dados";
    console.error(err);
  });
})();
