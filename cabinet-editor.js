/* Cabinet editing shares the application's state, undo history and translation helpers. */
function cabinetPanel(f) {
  if (!HomeDesign.isCabinet(f)) return '';
  const c = HomeDesign.cabinet(f);
  return `<section><h3>${tr('柜内设计','Cabinet interior')}</h3><p>${Math.round(f.w)} × ${Math.round(f.d)} × ${c.height} mm</p>
    ${c.height>state.view.ceilingHeight?`<p class="cab-warning">${tr('柜高超过当前净高，请核对尺寸。','Cabinet exceeds the ceiling height; check dimensions.')}</p>`:''}
    <div class="form"><label class="full">${tr('3D 查看','3D view')}<select id="cabFront">${cabinetFrontOptions(c.front)}</select></label></div>
    <div class="actions"><button class="btn primary" id="editCabinet">${tr('编辑内部布局','Edit interior')}</button></div>
    <p class="muted">${tr('正面剖视编辑分区、层板、挂衣杆和抽屉；开门展开时可检查前方通道。','Edit bays, shelves, hanging rails and drawers in elevation; open fronts to check clearance.')}</p></section>`;
}
function cabinetFrontOptions(value) {
  return [['closed',tr('关闭柜门','Closed')],['hidden',tr('隐藏柜门 · 查看内部','Hide doors · interior')],['open',tr('开启柜门与抽屉','Open doors and drawers')]].map(([v,t])=>`<option value="${v}" ${v===value?'selected':''}>${t}</option>`).join('');
}
function bindCabinetPanel(f) {
  if (!HomeDesign.isCabinet(f)) return;
  $('#editCabinet').onclick = () => openCabinetEditor(f.id);
  $('#cabFront').onchange = e => editCabinet(f.id, g => g.cabinet.front = e.target.value);
}
function editCabinet(id, fn, resize = false) {
  const original = getF(id); if (!original) return false;
  try {
    const next = structuredClone(original); next.cabinet = structuredClone(HomeDesign.cabinet(next));
    const height = HomeDesign.cavity(next, next.cabinet).height;
    fn(next);
    if (resize) HomeDesign.resizeCabinet(next, next.cabinet, height);
    HomeDesign.validateCabinet(next, next.cabinet);
    mutate(() => state.furniture[state.furniture.findIndex(f=>f.id===id)] = next);
    return true;
  } catch (e) {
    const error = $('#cabError'); if (error && $('#cabinetEditor').open) error.textContent = e.message; else toast(e.message);
    return false;
  }
}
function openCabinetEditor(id) {
  window.View3D?.pause();
  const dialog = $('#cabinetEditor'); dialog.dataset.fid = id; dialog.dataset.bay = '0';
  renderCabinetEditor(); dialog.showModal();
}
function cabinetElevation(f, selected) {
  const c = HomeDesign.cabinet(f), t = c.thickness, scale = 500/Math.max(f.w,c.height), W=f.w*scale, H=c.height*scale;
  const rect = (x,y,w,h,fill,extra='') => `<rect x="${x*scale}" y="${(c.height-y-h)*scale}" width="${w*scale}" height="${h*scale}" fill="${fill}" ${extra}/>`;
  let s = rect(0,0,f.w,c.height,'#e7d5ba') + rect(t,c.plinth+t,f.w-2*t,c.height-c.plinth-2*t,'#fffaf1');
  for (const b of HomeDesign.bays(f)) {
    const x = b.x+f.w/2;
    s += `<g data-bay="${b.index}" tabindex="0" role="button" aria-label="${tr('分区','Bay')} ${b.index+1}">`;
    s += rect(x,b.bottom,b.width,b.height,b.index===selected?'#e1f0eb':'#fffaf1','stroke="#b9ab96" stroke-width="1"');
    s += `<text x="${(x+b.width/2)*scale}" y="${H+20}" text-anchor="middle">${b.index+1} · ${Math.round(b.width)} mm</text>`;
    for (const opening of HomeDesign.openings(f,b)) if (opening.height*scale>23) s += `<text x="${(x+b.width/2)*scale}" y="${(c.height-b.bottom-opening.bottom-opening.height/2)*scale}" text-anchor="middle" class="cab-dimension">${Math.round(opening.height)}</text>`;
    for (const y of b.shelves) s += rect(x,b.bottom+y,b.width,t,'#b99b74');
    if (b.rod!==null) s += rect(x+10,b.bottom+b.rod-10,b.width-20,20,'#778b91');
    for(let j=0;j<b.drawers;j++) {
      s += rect(x+3,b.bottom+j*b.drawerHeight+3,b.width-6,b.drawerHeight-6,'#d5b38b','stroke="#a88863"');
      s += rect(x+b.width*.35,b.bottom+(j+.5)*b.drawerHeight,b.width*.3,8,'#665848');
    }
    s += '</g>' + (b.index<c.columns.length-1 ? rect(x+b.width,c.plinth,t,c.height-c.plinth,'#b99b74') : '');
  }
  return `<svg id="cabElevation" viewBox="-28 -28 ${W+56} ${H+75}" aria-label="${tr('柜体正面剖视图，尺寸单位毫米','Cabinet elevation, dimensions in millimetres')}"><text x="${W/2}" y="-10" text-anchor="middle">${Math.round(f.w)} × ${c.height} mm</text>${s}</svg>`;
}
function renderCabinetEditor() {
  const dialog = $('#cabinetEditor'), f = getF(dialog.dataset.fid);
  if (!f) { if(dialog.open) dialog.close(); return; }
  const c = HomeDesign.cabinet(f), inner = HomeDesign.cavity(f,c), index = Math.min(+dialog.dataset.bay||0,c.columns.length-1), b = c.columns[index];
  dialog.dataset.bay = index;
  const number = (id,label,value,min,max,disabled=false) => `<label>${label}<input id="${id}" type="number" value="${Math.round(value*10)/10}" min="${min}" max="${max}" step="any" ${disabled?'disabled':''} required></label>`;
  dialog.innerHTML = `<div class="dialog-head"><h2>${esc(nm(f.name))} · ${tr('柜内设计','Interior')}</h2><button class="btn" id="cabClose" aria-label="${tr('关闭','Close')}">✕</button></div>
    <div class="cab-layout"><div class="cab-preview">${cabinetElevation(f,index)}
      <p>${tr('点击分区编辑 · 数字为格口净高（mm）','Select a bay · numbers show clear opening heights (mm)')}</p>
      <label>${tr('3D 查看','3D view')} <select id="cabPreviewMode">${cabinetFrontOptions(c.front)}</select></label>
      <p class="muted">${tr('关闭面板后可在 3D 中查看。展开抽屉与柜门会占用前方通道。','Close the editor to inspect in 3D. Open doors and drawers occupy the aisle.')}</p>
      ${drawingReference(f)}
      ${c.height>state.view.ceilingHeight?`<p class="cab-warning">${tr(`柜高超过净高 ${c.height-state.view.ceilingHeight} mm，请核对现场尺寸。`,`Cabinet exceeds the ceiling by ${c.height-state.view.ceilingHeight} mm; verify site dimensions.`)}</p>`:''}
      <button class="btn" id="cabUndo" ${undoStack.length?'':'disabled'}>${tr('撤销上一步','Undo')}</button>
    </div><div class="cab-controls"><form id="cabShell"><h3>${tr('外尺寸与板材','Dimensions and boards')}</h3>
      <label><input id="cabLocked" type="checkbox" ${c.locked?'checked':''}> ${tr('锁定外尺寸','Lock outer dimensions')}</label>
      <div class="form">${number('cabW',tr('宽 mm','Width mm'),f.w,200,6000,c.locked)}${number('cabD',tr('深 mm','Depth mm'),f.d,220,1500,c.locked)}${number('cabH',tr('高 mm','Height mm'),c.height,400,4000,c.locked)}${number('cabDoors',tr('柜门数量','Door count'),c.doorCount,1,12,c.locked)}${number('cabT',tr('板厚 mm','Board mm'),c.thickness,12,30)}${number('cabBack',tr('背板 mm','Back mm'),c.back,5,25)}${number('cabGap',tr('门板及五金预留 mm','Front allowance mm'),c.frontGap,18,80)}${number('cabPlinth',tr('踢脚高 mm','Plinth mm'),c.plinth,0,250)}</div>
      <p class="muted">${tr('柜门数量独立于内部分区。改变尺寸或板厚时，分区宽度及层板位置等比调整。','Doors are independent of interior bays. Resizing scales bay widths and shelf positions.')} ${tr('内部净深','Clear depth')}: ${Math.round(inner.depth)} mm</p>
      <button class="btn primary" type="submit">${tr('应用尺寸','Apply dimensions')}</button></form>
    <form id="cabBay"><h3>${tr('内部布局','Interior layout')}</h3><div class="form">
      <label>${tr('当前分区','Selected bay')}<select id="cabBaySelect">${c.columns.map((_,i)=>`<option value="${i}" ${i===index?'selected':''}>${i+1}</option>`).join('')}</select></label>
      ${number('cabBayWidth',tr('分区净宽 mm','Bay clear width mm'),b.width,150,6000,c.columns.length===1)}
      <label class="full">${tr('层板底面高度 mm（逗号分隔；留空移除）','Shelf underside heights mm (comma separated; empty removes)')}<input id="cabShelves" value="${b.shelves.join(', ')}" inputmode="decimal"></label>
      ${number('cabRod',tr('挂衣杆中心高 mm，0=无','Rail centre mm, 0=none'),b.rod||0,0,inner.height)}
      ${number('cabDrawers',tr('抽屉数量','Drawer count'),b.drawers,0,6)}${number('cabDrawerH',tr('单抽屉模块高 mm','Drawer module height mm'),b.drawerHeight,80,400)}
    </div><p class="muted">${tr('高度从柜内底板上表面起算。层板、挂衣杆、抽屉不可互相穿插。修改分区宽度时，其余分区按比例分配剩余净宽。','Heights start at the inside floor. Components must not overlap. Other bays share the remaining width proportionally.')}</p>
    <button class="btn primary" type="submit">${tr('应用分区布局','Apply bay layout')}</button></form>
    <div class="actions">${[['long','长衣区','Long hanging'],['short','短衣＋抽屉','Short hanging + drawers'],['shelves','层板区','Shelves'],['drawers','抽屉区','Drawers']].map(([k,zh,en])=>`<button class="btn" data-cab-preset="${k}">${tr(zh,en)}</button>`).join('')}</div>
    <p class="muted">${tr('模板会替换当前分区，可撤销。','Presets replace the selected bay and can be undone.')}</p>
    <div class="actions"><button class="btn" id="cabSplit">${tr('拆分当前分区','Split bay')}</button><button class="btn" id="cabMerge" ${c.columns.length<2?'disabled':''}>${tr('合并相邻分区','Merge adjacent')}</button></div>
    <div class="cab-summary"><h3>${tr('尺寸检查','Dimension check')}</h3><p>${tr('格口净宽','Clear bay width')}: ${Math.round(b.width)} mm · ${tr('净深','Depth')}: ${Math.round(inner.depth)} mm</p>
    ${b.rod!==null?`<p>${tr('杆下可用高度','Clear height below rail')}: ${Math.round(b.rod-10-Math.max(b.drawers*b.drawerHeight,...b.shelves.filter(y=>y<b.rod).map(y=>y+c.thickness),0))} mm</p>`:''}
    ${b.drawers?`<p>${tr('抽屉内净宽 × 深 × 高','Drawer internal W × D × H')}: ${Object.values(HomeDesign.drawerSize(f,b)).slice(0,3).map(Math.round).join(' × ')} mm</p>`:''}
    ${HomeDesign.drawerDoorConflicts(f).length?`<p class="cab-warning">${tr(`分区 ${HomeDesign.drawerDoorConflicts(f).join('、')} 的抽屉跨过柜门铰链位置，90° 开门可能干涉；请调整分区或核对铰链开启角度。`,`Drawers in bay(s) ${HomeDesign.drawerDoorConflicts(f).join(', ')} cross a door hinge. Check 90° opening clearance; adjust bays or verify hinge angles.`)}</p>`:''}
    <p class="muted">${tr('抽屉按每侧滑轨 13、侧板 12、前板 18、后板 9、底板 12 mm 估算；下单前按五金型号和现场复尺确认。','Drawer estimate: 13 mm slides, 12 mm sides/bottom, 18 mm front, 9 mm back. Confirm hardware and site measurements before ordering.')}</p></div>
    </div></div><p id="cabError" role="alert"></p>`;
  $('#cabClose').onclick=()=>dialog.close();
  const changeBay = i => { dialog.dataset.bay=i; renderCabinetEditor(); };
  $('#cabBaySelect').onchange=e=>changeBay(e.target.value);
  dialog.querySelectorAll('[data-bay]').forEach(el=>{el.onclick=()=>changeBay(el.dataset.bay);el.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();changeBay(el.dataset.bay);}};});
  const apply = (fn,resize=false) => {const scroll=$('.cab-controls').scrollTop;if(editCabinet(f.id,fn,resize)){renderCabinetEditor();$('.cab-controls').scrollTop=scroll;}};
  $('#cabLocked').onchange=e=>apply(g=>g.cabinet.locked=e.target.checked);
  $('#cabPreviewMode').onchange=e=>apply(g=>g.cabinet.front=e.target.value);
  $('#cabUndo').onclick=()=>{undo();renderCabinetEditor();};
  $('#cabShell').onsubmit=e=>{e.preventDefault();const values={w:+$('#cabW').value,d:+$('#cabD').value,height:+$('#cabH').value,doorCount:+$('#cabDoors').value,thickness:+$('#cabT').value,back:+$('#cabBack').value,frontGap:+$('#cabGap').value,plinth:+$('#cabPlinth').value};apply(g=>{if(!g.cabinet.locked){g.w=values.w;g.d=values.d;g.cabinet.height=values.height;g.cabinet.doorCount=values.doorCount;}for(const k of ['thickness','back','frontGap','plinth'])g.cabinet[k]=values[k];},true);};
  $('#cabBay').onsubmit=e=>{e.preventDefault();const width=+$('#cabBayWidth').value, raw=$('#cabShelves').value.trim(), shelves=raw?raw.split(/[,，]/).map(v=>v.trim()?Number(v):NaN).sort((a,b)=>a-b):[], rod=+$('#cabRod').value||null, drawers=+$('#cabDrawers').value, drawerHeight=+$('#cabDrawerH').value;apply(g=>{Object.assign(g.cabinet.columns[index],{shelves,rod,drawers,drawerHeight});HomeDesign.bayWidths(g,g.cabinet,index,width);});};
  dialog.querySelectorAll('[data-cab-preset]').forEach(el=>el.onclick=()=>apply(g=>{g.cabinet.columns[index]=HomeDesign.presetColumn(el.dataset.cabPreset,g.cabinet.columns[index].width,HomeDesign.cavity(g,g.cabinet).height);}));
  $('#cabSplit').onclick=()=>apply(g=>{const old=g.cabinet.columns[index],w=(old.width-g.cabinet.thickness)/2;g.cabinet.columns.splice(index,1,{...structuredClone(old),width:w},{...structuredClone(old),width:w});});
  $('#cabMerge').onclick=()=>apply(g=>{const i=index===g.cabinet.columns.length-1?index-1:index, first=g.cabinet.columns[i];first.width+=g.cabinet.columns[i+1].width+g.cabinet.thickness;g.cabinet.columns.splice(i+1,1);dialog.dataset.bay=i;});
}
