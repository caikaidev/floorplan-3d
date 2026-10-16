/* This home's drawing dated 2026-10-16. Millimetres; north is up.
 * Explicit dimensions take precedence over traced furniture symbols.
 * The drawing contains no cabinet elevations or internal layouts. */
(function (root) {
  'use strict';
  const items = [
    {key:'master-bed',room:'master',type:'bed',name:'主卧床',cx:1100,cy:9300,w:1900,d:2200,rot:270,color:'#c9d6df',note:['床头朝西；床架占地暂按 1900 × 2200 mm，需用实物外尺寸替换。','West-facing headboard; provisional bed frame footprint 1900 × 2200 mm. Replace with actual outer dimensions.']},
    {key:'master-nightstand',room:'master',type:'nightstand',name:'主卧床头柜',cx:225,cy:8100,w:450,d:450,rot:270},
    {key:'master-wardrobe',room:'master',type:'wardrobe',name:'主卧衣柜',cx:3280,cy:9980,w:2200,d:600,rot:90,height:2395,note:['图纸标注柜长 2200 mm，靠东墙、柜门朝西。深 600 mm 为图示估算；柜高暂设 2395 mm，距图示净高留 5 mm。柜门数量与内部分格均为初稿。','Drawing: 2200 mm run on east wall, fronts facing west. Depth 600 mm is estimated; provisional height 2395 mm leaves 5 mm below the drawn ceiling. Doors and interiors are provisional.']},
    {key:'master-desk',room:'master',type:'desk',name:'主卧窗边桌',cx:225,cy:10680,w:800,d:450,rot:270,note:['按图示位置放在西南窗边；桌面 800 × 450 mm 为暂估。','Southwest window-side desk; provisional footprint 800 × 450 mm.']},
    {key:'master-chair',room:'master',type:'chair',name:'主卧椅子',cx:730,cy:10680,w:450,d:480,rot:90},
    {key:'kid-bed',room:'kid',type:'bed',name:'儿童房床',cx:2010,cy:850,w:1500,d:2200,rot:270,color:'#e8d5b5',note:['床头朝西；床架占地暂按 1500 × 2200 mm。北侧按图纸作为普通地面，未设置飘窗台。','West-facing headboard; provisional frame footprint 1500 × 2200 mm. The north strip is floor, not a raised bay window.']},
    {key:'kid-wardrobe',room:'kid',type:'wardrobe',name:'儿童房衣柜',cx:1760,cy:2620,w:1700,d:600,rot:180,height:2395,note:['图纸标注柜长 1700 mm，靠南墙、柜门朝北。深 600 mm 为图示估算；高暂设 2395 mm。内部分格待按衣物、玩具需求调整。','Drawing: 1700 mm run on south wall, fronts facing north. Estimated depth 600 mm; provisional height 2395 mm. Interior bays remain editable.']},
    {key:'kid-low-cabinet',room:'kid',type:'cabinet',name:'儿童房床尾矮柜',cx:3385,cy:1150,w:1100,d:390,rot:90,height:750,note:['东侧图示家具暂用矮柜占位：1100 × 390 × 750 mm，具体用途和高度待确认。','East-side furniture is represented by a provisional 1100 × 390 × 750 mm low cabinet; function and height need confirmation.']},
    {key:'living-rug',room:'living',type:'rug',name:'客厅地毯',cx:5660,cy:8400,w:3000,d:2000,rot:90},
    {key:'living-sofa',room:'living',type:'sofa',name:'客厅沙发',cx:4270,cy:8631.5,w:2717,d:900,rot:270,color:'#b7c4b0',note:['图示纵向标注 2717 mm，暂作为沙发占位长度；深度暂估 900 mm，需核对实物外尺寸。','The drawn 2717 mm longitudinal dimension is used for the sofa footprint; depth is provisionally 900 mm. Verify actual outer dimensions.']},
    {key:'living-tv-cabinet',room:'living',type:'cabinet',name:'客厅电视柜',cx:7040,cy:8640,w:2700,d:400,rot:90,height:500,note:['图纸标注柜长 2700 mm。深 400 mm、高 500 mm 暂估；北端邻近次卧门口，需复核柜体收口与门口通行。内部分格可编辑。','Drawing: 2700 mm run. Depth 400 mm and height 500 mm are provisional. Check the north end beside the second-bedroom doorway. Interior bays are editable.']},
    {key:'living-tv',room:'living',type:'tv',name:'客厅电视',cx:7200,cy:8640,w:1450,d:80,rot:90},
    {key:'living-coffee-large',room:'living',type:'coffeetable',name:'客厅圆茶几',cx:5570,cy:8190,w:700,d:700,rot:0,shape:'round'},
    {key:'living-coffee-small',room:'living',type:'coffeetable',name:'客厅小茶几',cx:5570,cy:8830,w:550,d:550,rot:0,shape:'round'},
    {key:'dining-sideboard',room:'living',type:'cabinet',name:'餐边柜',cx:4045,cy:6410,w:1700,d:450,rot:270,height:850,note:['图纸标注总长 1700 mm、最大进深 450 mm；此处用完整外包络表示，高暂估 850 mm，图示局部缩进暂未细分。','Drawing: 1700 mm overall run and 450 mm maximum depth. A full bounding footprint is used; height is provisionally 850 mm. Local recesses are not subdivided.']},
    {key:'dining-table',room:'living',type:'table',name:'餐桌',cx:4970,cy:6100,w:1400,d:800,rot:0,note:['图纸标注桌长 1400 mm；桌深暂估 800 mm。柜前与东侧通道需结合餐椅拉出位置复核。','Drawing: table length 1400 mm; provisional depth 800 mm. Check circulation with chairs pulled out.']},
    {key:'dining-chair-1',room:'living',type:'chair',name:'餐椅',cx:4620,cy:5460,w:450,d:480,rot:0},
    {key:'dining-chair-2',room:'living',type:'chair',name:'餐椅',cx:5320,cy:5460,w:450,d:480,rot:0},
    {key:'dining-chair-3',room:'living',type:'chair',name:'餐椅',cx:4620,cy:6740,w:450,d:480,rot:180},
    {key:'dining-chair-4',room:'living',type:'chair',name:'餐椅',cx:5320,cy:6740,w:450,d:480,rot:180},
  ];
  function furniture(F) {
    return items.map(item => {
      const f = F(item.type,item.name,item.cx,item.cy,item.w,item.d,item.rot,item.color);
      f.drawingKey = item.key;
      if (item.shape) f.shape = item.shape;
      if (item.height) {
        const before = root.HomeDesign.cavity(f,f.cabinet).height;
        f.cabinet.height = item.height;
        root.HomeDesign.resizeCabinet(f,f.cabinet,before);
      }
      return f;
    });
  }
  const api = {revision:'2026-10-16', rooms:['master','kid','living','second'], items, furniture,
    reference:f => items.find(item => item.key === f.drawingKey)};
  root.DrawingPlan = api;
  if (typeof module !== 'undefined') module.exports = api;
})(globalThis);
