/* Run with Playwright installed and Chromium available: node tests/browser-smoke.cjs */
const assert = require('node:assert/strict');
const {spawn} = require('node:child_process');
const path = require('node:path');
const fs = require('node:fs');
const {chromium} = require('playwright');
const root = path.join(__dirname,'..');

(async()=>{
  const server=spawn('python3',['-u','-m','http.server','0','--bind','127.0.0.1'],{cwd:root,stdio:['ignore','pipe','ignore']});
  let browser;
  try {
    const port=await new Promise((resolve,reject)=>{server.stdout.on('data',chunk=>{const m=String(chunk).match(/port (\d+)/);if(m)resolve(m[1]);});server.on('error',reject);server.on('exit',code=>reject(Error('HTTP server exited '+code)));});
    const url=`http://127.0.0.1:${port}/`;
    const executablePath=process.env.CHROMIUM_PATH || (fs.existsSync('/usr/bin/chromium')?'/usr/bin/chromium':undefined);
    browser=await chromium.launch({executablePath,headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
    const page=await browser.newPage({viewport:{width:1280,height:800}}), errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    page.on('response',r=>{if(r.status()>=400&&!r.url().endsWith('favicon.ico'))errors.push(r.status()+' '+r.url());});
    // Read-only runtime probes and deterministic movement calls are injected in this test response only.
    await page.route(url,async route=>{
      const response=await route.fetch();
      const body=(await response.text()).replace('window.View3D = {',`window.__smoke = {
        snapshot:()=>({mode:opt.mode,eye:camera?.position.y,fov:camera?.fov,aspect:camera?.aspect,position:camera?.position.toArray(),direction:camera?.getWorldDirection(new THREE.Vector3()).toArray(),doors:doors.map(d=>d.length),meshes:furnG?.children.length}),
        blocked:(x,y)=>blocked(wx(x),wz(y)),
        approach:(id)=>{const f=getF(id),a=f.rot*Math.PI/180,dist=f.d/2+state.view.bodyWidth/2+100;camera.position.set(wx(f.cx-Math.sin(a)*dist),M(state.view.eyeHeight),wz(f.cy+Math.cos(a)*dist));camera.lookAt(wx(f.cx),camera.position.y,wz(f.cy));touchWalk=true;keys.KeyW=true;for(let i=0;i<40;i++)stepWalk(.05);keys.KeyW=false;touchWalk=false;return {y:HomeDesign.toLocal(camera.position.x*1000+OX,camera.position.z*1000+OY,f).y,min:f.d/2+state.view.bodyWidth/2};}
      }; window.View3D = {`);
      await route.fulfill({response,body});
    });
    await page.goto(url,{waitUntil:'networkidle'});
    assert.equal(await page.locator('#gRooms').evaluate(el=>el.children.length)>0,true);
    const original=await page.evaluate(()=>JSON.stringify(state));
    // Source dimensions, actual floor topology, and wall/furniture intersections.
    const drawing=await page.evaluate(()=>{
      const items=state.furniture.filter(f=>f.drawingKey), issues=[];
      for(const f of items) {
        const room=ROOMS.find(r=>r.id===DrawingPlan.reference(f).room), {hw,hh}=aabb(f);
        for(const dx of [-hw+1,hw-1]) for(const dy of [-hh+1,hh-1]) if(!inPoly(f.cx+dx,f.cy+dy,room.poly)) issues.push(f.name+' outside room');
        if(HomeDesign.furnitureObstacles(f).length) for(const w of WALLS) {
          if(Math.min(f.cx+hw,w[2])-Math.max(f.cx-hw,w[0])>1 && Math.min(f.cy+hh,w[3])-Math.max(f.cy-hh,w[1])>1) issues.push(f.name+' intersects wall');
        }
      }
      const solid=items.filter(f=>HomeDesign.furnitureObstacles(f).length);
      for(let i=0;i<solid.length;i++) for(let j=i+1;j<solid.length;j++) {
        const a=solid[i],b=solid[j],aa=aabb(a),bb=aabb(b);
        if(Math.min(a.cx+aa.hw,b.cx+bb.hw)-Math.max(a.cx-aa.hw,b.cx-bb.hw)>1 && Math.min(a.cy+aa.hh,b.cy+bb.hh)-Math.max(a.cy-aa.hh,b.cy-bb.hh)>1) issues.push(a.name+' overlaps '+b.name);
      }
      const second=ROOMS.find(r=>r.id==='second');
      return {issues,secondCount:state.furniture.filter(f=>inPoly(f.cx,f.cy,second.poly)).length,
        kidNorth:inPoly(2000,300,ROOMS.find(r=>r.id==='kid').poly),secondSouth:inPoly(9000,9800,second.poly),
        raised:ROOMS.filter(r=>r.counted===false).map(r=>r.id),
        dimensions:Object.fromEntries(items.filter(HomeDesign.isCabinet).map(f=>[f.drawingKey,[f.w,f.d,f.cabinet.height]]))};
    });
    assert.deepEqual(drawing.issues,[]);
    assert.equal(drawing.secondCount,0);
    assert.equal(drawing.kidNorth,true);assert.equal(drawing.secondSouth,true);
    assert.deepEqual(drawing.raised,['bay2']);
    assert.deepEqual(drawing.dimensions['master-wardrobe'],[2200,600,2395]);
    assert.deepEqual(drawing.dimensions['kid-wardrobe'],[1700,600,2395]);
    assert.deepEqual(drawing.dimensions['living-tv-cabinet'],[2700,400,500]);
    assert.deepEqual(drawing.dimensions['dining-sideboard'],[1700,450,850]);
    // Existing users explicitly opt in; restore and redo cover the entire replacement.
    const previous=await page.evaluate(()=>{
      state.furniture.find(f=>f.drawingKey==='master-bed').cx+=40;
      state.furniture.push(F('desk','次卧原有家具',8500,8200,1000,500));
      state.furniture.find(f=>f.type==='fridge').color='#123456';
      state.rooms.master.mat='walnut';state.view.eyeHeight=1710;
      state.measures=[{a:{x:100,y:8000},b:{x:1000,y:8000}}];save();return JSON.stringify(state);
    });
    await page.reload({waitUntil:'networkidle'});
    assert.equal(await page.evaluate(()=>JSON.stringify(state)),previous);
    page.once('dialog',d=>d.dismiss());await page.click('#loadDrawingOverview');
    assert.equal(await page.evaluate(()=>JSON.stringify(state)),previous);
    page.once('dialog',d=>d.accept());await page.click('#loadDrawingOverview');
    const loaded=await page.evaluate(()=>JSON.stringify(state)), restored=JSON.parse(loaded), old=JSON.parse(previous);
    assert.equal(restored.furniture.some(f=>f.name==='次卧原有家具'),false);
    assert.equal(restored.furniture.find(f=>f.drawingKey==='master-bed').cx,1100);
    assert.deepEqual(restored.furniture.filter(f=>!f.drawingKey),old.furniture.filter(f=>!f.drawingKey&&f.name!=='次卧原有家具'));
    assert.deepEqual(restored.view,old.view);assert.deepEqual(restored.rooms,old.rooms);assert.deepEqual(restored.measures,old.measures);
    await page.click('#undo');assert.equal(await page.evaluate(()=>JSON.stringify(state)),previous);
    await page.click('#redo');assert.equal(await page.evaluate(()=>JSON.stringify(state)),loaded);
    await page.reload({waitUntil:'networkidle'});assert.equal(await page.evaluate(()=>JSON.stringify(state)),loaded);
    await page.evaluate(json=>{state=JSON.parse(json);save();renderAll();},original);
    console.log('PASS: drawing dimensions, empty second bedroom, corrected floor areas, furniture fit, opt-in replacement, preservation and undo/redo');
    // An old v2 export/local save should acquire a complete usable cabinet structure.
    await page.evaluate(()=>{const legacy=structuredClone(state);delete legacy.version;delete legacy.view;legacy.furniture.forEach(f=>delete f.cabinet);localStorage.removeItem(STORE);localStorage.setItem(LEGACY_STORE,JSON.stringify(legacy));});
    await page.reload({waitUntil:'networkidle'});
    assert.equal(await page.evaluate(()=>state.version),3);
    assert.equal(await page.evaluate(()=>state.furniture.filter(HomeDesign.isCabinet).every(f=>!!f.cabinet)),true);
    assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem(LEGACY_STORE)).version),undefined);
    const id=await page.evaluate(()=>state.furniture.find(f=>f.type==='wardrobe').id);
    await page.evaluate(id=>select({kind:'furn',id}),id);
    await page.click('#editCabinet');
    assert.equal(await page.locator('#cabW').isDisabled(),true);
    await page.click('[data-cab-preset="shelves"]');
    await page.fill('#cabShelves','400, 900, 1500');
    await page.fill('#cabBayWidth','600');
    await page.click('#cabBay button[type=submit]');
    assert.equal(await page.locator('#cabError').innerText(),'');
    assert.deepEqual(await page.evaluate(id=>getF(id).cabinet.columns[0].shelves,id),[400,900,1500]);
    const valid=await page.evaluate(()=>JSON.stringify(state));
    await page.fill('#cabShelves','400, 410');
    await page.click('#cabBay button[type=submit]');
    assert.ok((await page.locator('#cabError').innerText()).length>0);
    assert.equal(await page.evaluate(()=>JSON.stringify(state)),valid);
    await page.selectOption('#cabBaySelect','0');
    await page.click('#cabSplit');
    assert.equal(await page.evaluate(id=>getF(id).cabinet.columns.length,id),4);
    await page.click('#cabMerge');
    assert.equal(await page.evaluate(id=>getF(id).cabinet.columns.length,id),3);
    await page.uncheck('#cabLocked');
    await page.fill('#cabW','2200');await page.fill('#cabD','650');await page.fill('#cabH','2300');
    await page.click('#cabShell button[type=submit]');
    assert.equal(await page.locator('#cabError').innerText(),'');
    await page.check('#cabLocked');
    await page.selectOption('#cabPreviewMode','hidden');
    await page.click('#cabClose');
    const edited=await page.evaluate(id=>structuredClone(getF(id)),id);
    assert.equal(edited.w,2200);assert.equal(edited.cabinet.height,2300);
    await page.click('#aDup');
    const duplicate=await page.evaluate(()=>ui.sel.id);
    await page.click('#editCabinet');
    await page.click('[data-cab-preset="drawers"]');
    await page.click('#cabClose');
    assert.deepEqual(await page.evaluate(id=>getF(id).cabinet,id),edited.cabinet);
    assert.notDeepEqual(await page.evaluate(id=>getF(id).cabinet,duplicate),edited.cabinet);
    await page.click('#undo');
    assert.deepEqual(await page.evaluate(id=>getF(id).cabinet,duplicate),edited.cabinet);
    await page.click('#redo');
    assert.notDeepEqual(await page.evaluate(id=>getF(id).cabinet,duplicate),edited.cabinet);
    await page.click('#aDel'); // Remove overlapping test duplicate before walking.
    const saved=await page.evaluate(()=>JSON.stringify(state));
    await page.reload({waitUntil:'networkidle'});
    assert.equal(await page.evaluate(()=>JSON.stringify(state)),saved);
    await page.click('details.menu summary');
    const downloaded=page.waitForEvent('download');await page.click('#exportJson');
    const stream=await (await downloaded).createReadStream(), chunks=[];for await(const chunk of stream)chunks.push(chunk);
    const exported=Buffer.concat(chunks);
    assert.deepEqual(JSON.parse(exported).furniture.find(f=>f.id===id).cabinet,edited.cabinet);
    await page.evaluate(()=>mutate(()=>state.furniture[0].color='#123456'));
    await page.locator('#fileIn').setInputFiles({name:'plan.json',mimeType:'application/json',buffer:exported});
    await page.waitForFunction(expected=>JSON.stringify(state)===expected,saved);
    const bad=JSON.parse(exported);bad.furniture.find(f=>f.id===id).cabinet.columns[0].width=-1;
    await page.locator('#fileIn').setInputFiles({name:'invalid.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(bad))});
    await page.waitForFunction(()=>document.querySelector('#toast').textContent.includes('格式'));
    assert.equal(await page.evaluate(()=>JSON.stringify(state)),saved);
    await page.click('#viewSettingsBtn');
    for(const [selector,value] of [['eyeHeight','1720'],['bodyWidth','460'],['horizontalFov','82'],['ceilingHeight','2500'],['walkHeading','0']])await page.fill('#'+selector,value);
    await page.click('#viewForm button[type=submit]');
    await page.reload({waitUntil:'networkidle'});
    assert.equal(await page.evaluate(()=>state.view.eyeHeight),1720);
    console.log('PASS: legacy migration, cabinet editor, validation, split/merge, resizing, independent copies, undo/redo, reload and JSON round trip');
    const clickFloor=async(x,y)=>{const pos=await page.evaluate(({x,y})=>{const r=svg.getBoundingClientRect();return {x:r.left+(x-view.x0)*view.s,y:r.top+(y-view.y0)*view.s};},{x,y});await page.mouse.click(pos.x,pos.y);};
    await page.click('[data-tool="stand"]');
    await clickFloor(3280,9980);
    await page.waitForFunction(()=>document.querySelector('#toast').textContent.includes('无法站立'));
    assert.equal(await page.evaluate(()=>viewMode),'2d');
    await clickFloor(8400,4840);
    await page.waitForFunction(()=>window.__smoke.snapshot().mode==='walk'&&!document.body.classList.contains('busy'),null,{timeout:120000});
    const camera=await page.evaluate(()=>window.__smoke.snapshot());
    assert.equal(camera.eye,1.72);assert.ok(Math.abs(camera.direction[1])<1e-8);
    assert.ok(Math.abs(camera.position[0]-3.3)<1e-6);
    assert.deepEqual(camera.doors,[890,900,800,890,1080]);
    for(const [x,y] of [[1000,10130],[3280,9980],[4270,8600]])assert.equal(await page.evaluate(([x,y])=>window.__smoke.blocked(x,y),[x,y]),true);
    for(const [x,y] of [[9840,7366],[9000,9800],[7100,7000]])assert.equal(await page.evaluate(([x,y])=>window.__smoke.blocked(x,y),[x,y]),false);
    const movement=await page.evaluate(id=>window.__smoke.approach(id),id);
    assert.ok(movement.y>=movement.min);assert.ok(movement.y<movement.min+100);
    for(const [width,height] of [[390,844],[844,390],[1280,800]]) {
      await page.setViewportSize({width,height});
      await page.waitForFunction(()=>{const c=window.__smoke.snapshot(),el=document.querySelector('#stage');return Math.abs(c.aspect-el.clientWidth/el.clientHeight)<1e-6;});
      const c=await page.evaluate(()=>window.__smoke.snapshot());
      assert.ok(Math.abs(2*Math.atan(Math.tan(c.fov*Math.PI/360)*c.aspect)*180/Math.PI-82)<1e-6);
    }
    await page.click('[data-view="2d"]');
    await page.waitForFunction(()=>!document.querySelector('#stage').classList.contains('is3d')&&!document.body.classList.contains('busy'),null,{timeout:120000});
    await page.click('[data-view="3d"]');
    await page.waitForFunction(()=>!document.body.classList.contains('busy'),null,{timeout:120000});
    assert.equal((await page.evaluate(()=>window.__smoke.snapshot())).fov,45);
    console.log('PASS: selected standing point, blocked spawn, level eye height, furniture movement collision, actual door lengths, calibrated portrait/landscape FOV and 2D/3D round trip');
    await page.click('[data-view="2d"]');
    await page.waitForFunction(()=>!document.body.classList.contains('busy'),null,{timeout:120000});
    await page.setViewportSize({width:390,height:844});
    await page.evaluate(id=>{select({kind:'furn',id});drawer('panel',true);},id);
    await page.click('#editCabinet');
    assert.equal(await page.locator('#cabinetEditor').evaluate(el=>el.scrollWidth<=el.clientWidth+1),true);
    await page.locator('#cabBaySelect').selectOption('1');
    await page.click('[data-cab-preset="drawers"]');
    await page.fill('#cabDrawers','3');await page.fill('#cabDrawerH','180');
    await page.click('#cabBay button[type=submit]');
    assert.equal(await page.locator('#cabError').innerText(),'');
    await page.click('#cabClose');
    assert.deepEqual(errors,[]);
    console.log('PASS: narrow-screen interior editor; no JavaScript or resource loading errors');
  } finally {if(browser)await browser.close();server.kill();}
})().catch(e=>{console.error(e);process.exitCode=1;});
