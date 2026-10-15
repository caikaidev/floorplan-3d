function openViewSettings() {
  window.View3D?.pause();
  const dialog = $('#viewSettings'), v = state.view;
  dialog.innerHTML = `<form id="viewForm"><div class="dialog-head"><h2>${tr('视角与尺度校准','View and scale calibration')}</h2><button type="button" class="btn" id="viewClose">✕</button></div>
    <div class="form"><label>${tr('眼睛离地高度 mm','Eye height mm')}<input id="eyeHeight" type="number" min="800" max="2000" value="${v.eyeHeight}" required></label>
    <label>${tr('身体通行宽度 mm','Body clearance width mm')}<input id="bodyWidth" type="number" min="300" max="700" value="${v.bodyWidth}" required></label>
    <label>${tr('水平视野 °','Horizontal field of view °')}<input id="horizontalFov" type="number" min="55" max="100" value="${v.horizontalFov}" required></label>
    <label>${tr('全屋吊顶后净高 mm','Finished ceiling height mm')}<input id="ceilingHeight" type="number" min="2100" max="4000" value="${v.ceilingHeight}" required></label>
    <label class="full">${tr('进入漫游时朝向（0 北 / 90 东 / 180 南 / 270 西）','Starting heading (0 N / 90 E / 180 S / 270 W)')}<input id="walkHeading" type="number" min="0" max="359" value="${v.heading}" required></label></div>
    <div class="actions"><button type="button" class="btn" data-fov="80">${tr('标准 80°','Standard 80°')}</button><button type="button" class="btn" data-fov="95">${tr('广角 95°','Wide 95°')}</button></div>
    <p>${tr('眼高请按实际测量填写，也可设为坐姿眼高。水平视野在横竖屏保持一致，纵向范围随画布变化；默认水平看向前方。','Use your measured standing or seated eye height. Horizontal FOV stays constant across orientations; the vertical view follows the canvas. Start looking level.')}</p>
    <p class="muted">${tr('屏幕大小和观看距离会影响体感。请在常用设备上，对照实际房间的同一站位校准。平面墙位仍沿用原图估算；定制柜下单前需现场复尺。净高设定应用于全屋。','Screen size and viewing distance affect perception. Calibrate from the same position in your real room. Wall positions still follow the estimated plan; verify site dimensions before ordering. Ceiling height applies to the whole home.')}</p>
    <p id="viewError" role="alert"></p><div class="actions"><button type="submit" class="btn primary">${tr('保存校准','Save calibration')}</button></div></form>`;
  $('#viewClose').onclick=()=>dialog.close();
  dialog.querySelectorAll('[data-fov]').forEach(b=>b.onclick=()=>$('#horizontalFov').value=b.dataset.fov);
  $('#viewForm').onsubmit=e=>{e.preventDefault();const settings=HomeDesign.viewSettings({eyeHeight:+$('#eyeHeight').value,bodyWidth:+$('#bodyWidth').value,horizontalFov:+$('#horizontalFov').value,ceilingHeight:+$('#ceilingHeight').value,heading:+$('#walkHeading').value});mutate(()=>state.view=settings);dialog.close();};
  dialog.showModal();
}
