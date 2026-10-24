import * as THREE from 'three';
import { OrbitControls } from './vendor/OrbitControls.js';
import { RoundedBoxGeometry } from './vendor/RoundedBoxGeometry.js';

const $ = s => document.querySelector(s);
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const partData = [
  { id:'cover', name:'绿色玻璃背盖', en:'GLASS BACK PANEL', desc:'温润的绿色玻璃与利落轮廓相遇。独立拆开背盖，观察无线充电、电池与影像系统之间的层次关系。', specs:[['7.98 mm','玻璃版厚度'],['189 g','玻璃版整机重量']], offset:[-7,-.3,4.3], anchor:[-1.8,-3.3,.43] },
  { id:'lens', name:'徕卡专业三摄', en:'LEICA CAMERA SYSTEM', desc:'5000 万主摄、1200 万超广角与 1000 万长焦组成徕卡三摄。主摄 23 mm 与长焦 75 mm 均为等效焦距；模组内部为示意。', specs:[['50 MP','主摄像素'],['75 mm','长焦等效焦距']], offset:[-4.2,2.5,2.6], anchor:[-1.5,4.8,.94] },
  { id:'board', name:'主板与第二代骁龙 8', en:'SNAPDRAGON 8 GEN 2', desc:'第二代骁龙 8 移动平台采用 4 nm 制程。主板上的芯片封装、屏蔽罩、前置摄像头与走线均以几何体近似展示。', specs:[['4 nm','处理器制程'],['LPDDR5X','运行内存规格']], offset:[4.6,2.9,.7], anchor:[1.3,5.1,.17] },
  { id:'display', name:'6.36 英寸 AMOLED', en:'AMOLED DISPLAY', desc:'6.36 英寸直屏，2400 × 1080 分辨率，最高 120 Hz 刷新率。中央打孔、窄边框和锁屏山景均由代码生成。', specs:[['120 Hz','最高刷新率'],['2400×1080','屏幕分辨率']], offset:[3.2,0,-5.6], anchor:[.3,0,-.44] },
  { id:'frame', name:'直边金属中框', en:'ALUMINUM MIDFRAME', desc:'按 152.8 × 71.5 mm 的公开外形比例构建直边中框、圆角、按键、天线分隔及底部开孔。内部骨架为近似结构。', specs:[['71.5 mm','机身宽度'],['IP68','防尘防水等级*']], offset:[0,.5,-.8], anchor:[3.58,2.3,0] },
  { id:'battery', name:'4500 mAh 电池', en:'HIGH-DENSITY BATTERY', desc:'4500 mAh 典型容量电池配合小米澎湃电池管理系统，支持 67W 有线充电。电芯外形、排线与电压标识不作工程尺寸依据。', specs:[['4500 mAh','典型容量'],['67 W','有线快充']], offset:[6,-.6,1.4], anchor:[.4,-1.4,.11] },
  { id:'coil', name:'无线充电与 NFC 线圈', en:'WIRELESS CHARGING COIL', desc:'无线充电线圈与 NFC 天线以同心铜线及外围天线示意呈现。小米 13 支持 50W 无线充电与 10W 反向无线充电。', specs:[['50 W','无线充电'],['NFC','近场通信']], offset:[-1.4,0,4.3], anchor:[0,-.6,.28] },
  { id:'cooling', name:'VC 均热板与石墨层', en:'VAPOR CHAMBER', desc:'VC 均热与多层石墨构成散热系统。这里以薄层金属板和热扩散纹理展示层叠关系，具体覆盖区域与厚度为近似示意。', specs:[['VC','均热结构'],['多层石墨','辅助热扩散']], offset:[.4,.1,-3.3], anchor:[-.2,1.3,-.2] },
  { id:'speaker', name:'扬声器与线性马达', en:'SPEAKER & HAPTICS', desc:'双扬声器与 X 轴线性马达分别负责声音和触感。底部扬声器腔体、振动模块与触点由代码生成，布局仅为示意。', specs:[['双扬声器','立体声'],['X 轴','线性马达']], offset:[-3.9,-2.3,1.4], anchor:[-.5,-6.4,.1] },
  { id:'port', name:'USB-C 与充电副板', en:'USB-C & CHARGING BOARD', desc:'底部 USB-C 接口连接充电与数据通路，配合副板及 SIM 卡托。接口、连接器与排线展示功能关系，不代表真实布线。', specs:[['USB-C','连接接口'],['nano-SIM','卡托结构']], offset:[3.9,-2.4,.9], anchor:[.4,-7.1,.05] },
];
const state = { selected:'lens', amounts:partData.map(()=>0), targets:partData.map(()=>0), sequence:false, sequenceTime:0, showLabels:true, visible:true, view:'perspective', ready:false };
const parts = [];
const scene = new THREE.Scene();
const world = new THREE.Group();world.scale.setScalar(.6);world.rotation.z=-.07;scene.add(world);
const camera = new THREE.PerspectiveCamera(36,1,.1,120);
const initialPosition = new THREE.Vector3(10,5.2,23.5);
camera.position.copy(initialPosition);
const stage = $('#stage'), canvas = $('#scene');
let renderer, controls;
let cameraTween = null;

// All artwork, surfaces and micro-detail are generated here. No image or model loader.
function texture(w,h,draw){const c=document.createElement('canvas');c.width=w;c.height=h;draw(c.getContext('2d'),w,h);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return t;}
function screenTexture(){return texture(720,1600,(c,w,h)=>{
 const sky=c.createLinearGradient(0,0,w,h);sky.addColorStop(0,'#b9d2c4');sky.addColorStop(.48,'#58867d');sky.addColorStop(1,'#132f39');c.fillStyle=sky;c.fillRect(0,0,w,h);
 for(const [y,color,seed] of [[.58,'#527d70',2],[.7,'#315c56',6],[.84,'#1c4144',12],[.98,'#102c35',19]]){c.fillStyle=color;c.beginPath();c.moveTo(0,h);for(let x=0;x<=w;x+=w/40)c.lineTo(x,(y+Math.sin(x/w*9+seed)*.1+Math.sin(x/w*17+seed)*.025)*h);c.lineTo(w,h);c.closePath();c.fill();}
 c.fillStyle='rgba(255,255,255,.94)';c.textAlign='center';c.font='200 135px Arial';c.fillText('09:41',w/2,h*.255);c.font='27px Arial';c.fillText('SATURDAY, OCTOBER 24',w/2,h*.295);
 c.font='24px Arial';c.textAlign='left';c.fillText('9:41',45,56);c.textAlign='right';c.fillText('5G   ▮▮▮  89%',w-40,56);
 c.fillStyle='#080e12';c.beginPath();c.arc(w/2,56,15,0,Math.PI*2);c.fill();
 c.strokeStyle='rgba(255,255,255,.6)';c.lineWidth=3;c.beginPath();c.arc(w/2,h*.87,32,0,Math.PI*2);c.stroke();c.beginPath();c.arc(w/2,h*.87,21,0,Math.PI*1.6);c.stroke();
 c.fillStyle='rgba(255,255,255,.9)';c.fillRect(w*.36,h*.976,w*.28,5);c.textAlign='center';c.font='24px Arial';c.fillText('Swipe up to unlock',w/2,h*.94);
 });}
const bodyTex=texture(128,128,(c,w,h)=>{c.fillStyle='#888';c.fillRect(0,0,w,h);let seed=23;for(let i=0;i<14000;i++){seed=(seed*16807)%2147483647;const x=seed%w;seed=(seed*16807)%2147483647;const y=seed%h;c.fillStyle=`rgba(0,0,0,${(seed%10)/70})`;c.fillRect(x,y,1,1);}});bodyTex.wrapS=bodyTex.wrapT=THREE.RepeatWrapping;bodyTex.repeat.set(5,4);
const mats={
 body:new THREE.MeshStandardMaterial({color:0xb5c9ba,metalness:.32,roughness:.2,bumpMap:bodyTex,bumpScale:.001}),
 edge:new THREE.MeshStandardMaterial({color:0x1a1e23,metalness:.7,roughness:.34}),
 rubber:new THREE.MeshStandardMaterial({color:0x101317,roughness:.86}),
 metal:new THREE.MeshStandardMaterial({color:0xc6d3c9,metalness:.98,roughness:.19}),
 darkMetal:new THREE.MeshStandardMaterial({color:0x42494e,metalness:.91,roughness:.26}),
 gold:new THREE.MeshStandardMaterial({color:0xc49a46,metalness:.8,roughness:.34}),
 pcb:new THREE.MeshStandardMaterial({color:0x173e36,metalness:.25,roughness:.65}),
 chip:new THREE.MeshStandardMaterial({color:0x171b22,metalness:.5,roughness:.4}),
 glass:new THREE.MeshPhysicalMaterial({color:0x123447,metalness:.34,roughness:.09,clearcoat:1,clearcoatRoughness:.04,transparent:true,opacity:.89,side:THREE.DoubleSide}),
};
function mesh(g,geo,mat,x=0,y=0,z=0){const m=new THREE.Mesh(geo,mat);m.position.set(x,y,z);g.add(m);return m;}
function box(g,w,h,d,x,y,z,mat=mats.body,r=.1){return mesh(g,new RoundedBoxGeometry(w,h,d,3,Math.min(r,w/2,h/2,d/2)),mat,x,y,z);}
function cyl(g,r,d,x,y,z,mat=mats.darkMetal){const m=mesh(g,new THREE.CylinderGeometry(r,r,d,80),mat,x,y,z);m.rotation.x=Math.PI/2;return m;}
function ring(g,r,t,d,x,y,z,mat=mats.darkMetal){const s=new THREE.Shape();s.absarc(0,0,r,0,Math.PI*2,false);const hole=new THREE.Path();hole.absarc(0,0,r-t,0,Math.PI*2,true);s.holes.push(hole);const geo=new THREE.ExtrudeGeometry(s,{depth:d,bevelEnabled:true,bevelSegments:2,steps:1,bevelSize:.015,bevelThickness:.015,curveSegments:64});return mesh(g,geo,mat,x,y,z);}
function plane(g,w,h,x,y,z,mat){return mesh(g,new THREE.PlaneGeometry(w,h),mat,x,y,z);}
function textPlane(g,text,w,h,x,y,z,color='#c4c9ce',font='bold 76px Arial'){const map=texture(1024,256,(c,cw,ch)=>{c.fillStyle=color;c.textAlign='center';c.textBaseline='middle';c.font=font.replace('76px','185px');c.translate(cw/2,ch/2);c.scale(850/c.measureText(text).width,1);c.fillText(text,0,0);});return plane(g,w,h,x,y,z,new THREE.MeshBasicMaterial({map,transparent:true,depthWrite:false}));}
function screw(g,x,y,z){cyl(g,.055,.025,x,y,z,mats.metal);box(g,.061,.009,.008,x,y,z+.019,mats.edge,.002);box(g,.009,.061,.008,x,y,z+.02,mats.edge,.002);}
function newPart(d,i){const g=new THREE.Group();g.userData.partId=d.id;world.add(g);const p={...d,index:i,group:g,highlight:[],label:document.createElement('div')};p.label.className='part-label';p.label.innerHTML=`<b>${String(i+1).padStart(2,'0')}</b><span>${d.name}</span>`;$('#labels').append(p.label);parts.push(p);return g;}
partData.forEach((d,i)=>newPart(d,i));
const group=id=>parts.find(p=>p.id===id).group;

// Xiaomi 13 glass edition: 152.8 × 71.5 × 7.98 mm. Scale: 10 mm = one local unit.
function roundedPath(w,h,r,x=0,y=0){const s=new THREE.Shape();s.moveTo(x-w/2+r,y-h/2);s.lineTo(x+w/2-r,y-h/2);s.quadraticCurveTo(x+w/2,y-h/2,x+w/2,y-h/2+r);s.lineTo(x+w/2,y+h/2-r);s.quadraticCurveTo(x+w/2,y+h/2,x+w/2-r,y+h/2);s.lineTo(x-w/2+r,y+h/2);s.quadraticCurveTo(x-w/2,y+h/2,x-w/2,y+h/2-r);s.lineTo(x-w/2,y-h/2+r);s.quadraticCurveTo(x-w/2,y-h/2,x-w/2+r,y-h/2);return s;}
function slab(g,w,h,r,d,x,y,z,mat,holes=[]){const shape=roundedPath(w,h,r);for(const [hw,hh,hr,hx,hy] of holes)shape.holes.push(roundedPath(hw,hh,hr,hx,hy));return mesh(g,new THREE.ExtrudeGeometry(shape,{depth:d,bevelEnabled:true,bevelSegments:3,bevelSize:.018,bevelThickness:.018,curveSegments:12,steps:1}),mat,x,y,z);}
const backGlass=new THREE.MeshPhysicalMaterial({color:0x7eaa90,metalness:.08,roughness:.23,clearcoat:1,clearcoatRoughness:.15});
const copper=new THREE.MeshStandardMaterial({color:0x936e47,metalness:.88,roughness:.3});
const graphite=new THREE.MeshStandardMaterial({color:0x272c32,metalness:.43,roughness:.65});
{
 const g=group('frame');slab(g,7.15,15.28,.6,.57,0,0,-.285,mats.metal,[[6.79,14.91,.47,0,0]]);
 // Central support is a separate, thin interior web, not a solid phone-sized block.
 slab(g,6.75,14.88,.48,.045,0,0,-.16,mats.darkMetal);
 for(const side of [-1,1])for(const y of [-5.85,-4.8,4.95,6.4])box(g,.035,.055,.54,side*3.586,y,0,mats.rubber,.01);
 box(g,.09,1.48,.24,-3.62,3.45,0,mats.metal,.04);box(g,.09,.79,.24,-3.62,1.67,0,mats.metal,.04);
 for(let i=0;i<6;i++){const h=cyl(g,.055,.04,1.38+i*.23,-7.66,0,mats.rubber);h.rotation.x=0;}
 for(const x of [-3.03,3.03]){const m=cyl(g,.048,.025,x,-7.66,0,mats.darkMetal);m.rotation.x=0;}
 box(g,1.4,.025,.25,-1.95,-7.66,0,mats.darkMetal,.03);
 const ir=cyl(g,.085,.025,.9,7.66,0,mats.rubber);ir.rotation.x=0;
 for(let i=0;i<4;i++){const m=cyl(g,.04,.025,-.5+i*.15,7.66,0,mats.rubber);m.rotation.x=0;}
}
{
 const g=group('cover');slab(g,7.03,15.15,.59,.13,0,0,.285,backGlass,[[3.83,3.9,.4,-1.43,4.82]]);
 const logo=textPlane(g,'xiaomi',1.45,.33,-2.68,-5.82,.439,'#566d62','76px Arial');logo.rotation.z=Math.PI/2;
 textPlane(g,'5G',.4,.19,-2.68,-4.78,.441,'#6a7f74');
 textPlane(g,'CE',.56,.16,2.55,-6.25,.441,'#83978a','76px Arial');
}
{
 const g=group('lens');slab(g,3.75,3.83,.39,.29,-1.43,4.82,.4,mats.edge);
 slab(g,3.64,3.72,.35,.035,-1.43,4.82,.713,new THREE.MeshBasicMaterial({color:0x0b1116}));
 box(g,3.52,.012,.012,-1.43,4.82,.771,mats.darkMetal,.003);box(g,.012,3.56,.012,-1.43,4.82,.771,mats.darkMetal,.003);
 const rim=new THREE.MeshStandardMaterial({color:0x171e22,metalness:.38,roughness:.35,envMapIntensity:.15});
 for(const [x,y,r] of [[-2.35,5.72,.58],[-.55,5.72,.52],[-2.35,3.94,.55]]){
   cyl(g,r,.055,x,y,.78,rim);ring(g,r,.045,.025,x,y,.815,rim);
   cyl(g,r*.82,.022,x,y,.839,new THREE.MeshPhysicalMaterial({color:0x172a32,metalness:.7,roughness:.08,clearcoat:1}));
   cyl(g,r*.45,.022,x,y,.855,mats.rubber);cyl(g,r*.26,.015,x,y,.87,new THREE.MeshBasicMaterial({color:0x173747}));
   const m=mesh(g,new THREE.CircleGeometry(r*.19,24),new THREE.MeshBasicMaterial({color:0x9fbdcf,transparent:true,opacity:.62}),x-r*.23,y+r*.26,.888);m.scale.y=.46;m.rotation.z=.5;
   const arc=mesh(g,new THREE.TorusGeometry(r*.68,.009,6,40,1.2),new THREE.MeshBasicMaterial({color:0x6e8d9d,transparent:true,opacity:.5}),x,y,.878);arc.rotation.z=3.4;
 }
 textPlane(g,'LEICA',1.12,.3,-.55,4.25,.784,'#d4d5d3');textPlane(g,'VARIO-SUMMICRON',1.23,.12,-.55,3.96,.784,'#929b9e','76px Arial');
 textPlane(g,'1:1.8-2.2 / 15-75 ASPH.',1.27,.1,-.55,3.79,.784,'#929b9e','76px Arial');
 box(g,.82,.2,.023,-.55,3.5,.788,new THREE.MeshStandardMaterial({color:0xe6e4ce,roughness:.4}),.09);
}
{
 const g=group('display');slab(g,7.04,15.15,.6,.1,0,0,-.39,mats.edge);
 const geo=new THREE.ShapeGeometry(roundedPath(6.77,14.8,.48),16);geo.computeBoundingBox();const min=geo.boundingBox.min,max=geo.boundingBox.max;const pos=geo.attributes.position,uv=geo.attributes.uv;for(let i=0;i<pos.count;i++)uv.setXY(i,(pos.getX(i)-min.x)/(max.x-min.x),(pos.getY(i)-min.y)/(max.y-min.y));
 const screen=mesh(g,geo,new THREE.MeshBasicMaterial({map:screenTexture(),side:THREE.FrontSide}),0,0,-.428);screen.rotation.y=Math.PI;
 box(g,.77,.035,.02,0,7.48,-.44,mats.darkMetal,.01);
 // Display ribbon, copper contact and in-screen fingerprint module.
 box(g,.8,3,.025,.2,-4,-.26,copper,.02);box(g,.93,.85,.06,0,-4.9,-.23,mats.chip,.04);
}
{
 const g=group('board');slab(g,6.42,3.37,.2,.09,0,5.44,-.04,mats.pcb);
 const paths=new THREE.LineBasicMaterial({color:0x8c9d74,transparent:true,opacity:.62});
 for(let i=0;i<32;i++){const x=-3+i*.19,y=4.0+(i%5)*.18;g.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(x,6.9,.075),new THREE.Vector3(x,y+.3,.075),new THREE.Vector3(x+.1,y,.075),new THREE.Vector3(x+.1,4.2,.075)]),paths));}
 box(g,1.55,1.65,.12,1.15,5.45,.09,mats.chip,.05);textPlane(g,'Qualcomm',1.28,.24,1.15,5.82,.16,'#a8adb0','76px Arial');textPlane(g,'Snapdragon',1.38,.24,1.15,5.45,.16,'#d3d7d8');textPlane(g,'8 Gen 2',1.13,.24,1.15,5.07,.16,'#abb3b7');
 box(g,1.42,.76,.15,1.15,6.73,.1,mats.metal,.04);box(g,.8,1.38,.14,2.57,5.28,.11,mats.metal,.04);
 for(let i=0;i<22;i++){box(g,.07,.16,.045,.48+i*.065,4.57,.08,mats.metal,.005);box(g,.16,.07,.045,.28,4.72+i*.065,.08,mats.metal,.005);}
 for(let i=0;i<26;i++){const x=-2.9+(i%13)*.47,y=4.14+Math.floor(i/13)*2.82;box(g,.17,.12,.08,x,y,.08,i%3?mats.chip:mats.metal,.014);}
 for(const [x,y] of [[-2.95,4.12],[2.97,4.12],[-2.95,6.88],[2.97,6.88]])ring(g,.08,.035,.01,x,y,.067,mats.gold);
 // The selfie camera faces the display, behind its central punch hole.
 box(g,.52,.52,.12,0,6.94,-.15,mats.chip,.03);const cam=cyl(g,.15,.08,0,6.94,-.24,mats.glass);
 box(g,.56,2.9,.025,-2.4,2.6,.04,copper,.02);
}
{
 const g=group('battery');slab(g,5.86,7.57,.15,.17,.1,-.65,-.03,new THREE.MeshStandardMaterial({color:0x272d32,metalness:.15,roughness:.7}));
 slab(g,5.62,7.27,.12,.012,.1,-.65,.154,new THREE.MeshStandardMaterial({color:0x343b3e,roughness:.7}));
 textPlane(g,'mi',.72,.52,-1.78,2.25,.198,'#dce1df');textPlane(g,'RECHARGEABLE Li-ion BATTERY',4.6,.2,.05,1.34,.198,'#aeb7b2','76px Arial');
 textPlane(g,'4500 mAh',3.45,.59,.1,.39,.198,'#d4ddd7');textPlane(g,'XIAOMI SURGE',2.9,.3,.1,-.51,.198,'#aebcb2');
 for(let i=0;i<5;i++)textPlane(g,i%2?'BATTERY MANAGEMENT SYSTEM':'TYPICAL CAPACITY · NON-REMOVABLE',4.1,.13,.1,-1.5-i*.34,.198,'#738278','76px Arial');
 textPlane(g,'Li-ion     CE',2.9,.26,.1,-3.63,.198,'#a1aea5');box(g,.82,.94,.025,1.32,3.57,.13,copper,.01);
 for(let i=0;i<8;i++)box(g,.055,.198,.025,1.04+i*.08,4.08,.14,mats.gold,.005);
}
{
 const g=group('coil');slab(g,5.7,8.7,.25,.035,0,-.39,.205,graphite);
 for(let i=0;i<20;i++){const m=mesh(g,new THREE.TorusGeometry(1.02+i*.057,.021,5,100),copper,0,-.6,.254);}
 cyl(g,.92,.012,0,-.6,.249,graphite);
 for(const r of [2.49,2.56]){const line=new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.ShapeGeometry(roundedPath(r*2,6.9,.27))),new THREE.LineBasicMaterial({color:0xb19362}));line.position.set(0,-.36,.25);g.add(line);}
 box(g,.51,2.35,.025,1.6,4.9,.25,copper,.02);textPlane(g,'NFC',.72,.18,0,2.62,.264,'#9faea5','76px Arial');
}
{
 const g=group('cooling');slab(g,6.5,13.6,.3,.032,0,.22,-.203,graphite);
 slab(g,4.38,10.4,.25,.025,-.67,.85,-.155,new THREE.MeshStandardMaterial({color:0xa47c51,metalness:.87,roughness:.35}));
 for(let i=0;i<8;i++)box(g,.015,8.3,.009,-2.35+i*.49,.85,-.119,new THREE.MeshStandardMaterial({color:0xb38e60,metalness:.8,roughness:.42}),.002);
 textPlane(g,'VAPOR CHAMBER',3.2,.26,-.67,4.93,-.109,'#d0af80');
 box(g,1.25,5.8,.018,2.1,-.6,-.142,graphite,.07);
}
{
 const g=group('speaker');slab(g,6.4,1.6,.2,.22,0,-6.1,-.01,mats.rubber);
 box(g,2.3,.83,.12,-1.65,-6.03,.2,mats.chip,.12);box(g,1.25,.91,.12,1.34,-6.08,.2,mats.metal,.08);
 for(let i=0;i<6;i++)box(g,.06,.47,.02,-2.2+i*.22,-6.04,.276,mats.darkMetal,.02);
 for(let i=0;i<4;i++)box(g,.13,.13,.025,-.16+i*.24,-5.58,.25,mats.gold,.014);
 textPlane(g,'X-AXIS',1.06,.17,1.34,-6.07,.274,'#606e70');
 const upper=slab(g,2.18,.38,.09,.15,1.42,7.02,.06,mats.rubber);
}
{
 const g=group('port');slab(g,5.91,.95,.1,.07,.12,-7.03,-.03,mats.pcb);
 box(g,1.0,.46,.39,0,-7.29,0,mats.metal,.1);box(g,.75,.05,.24,0,-7.53,0,mats.rubber,.02);
 for(let i=0;i<10;i++)box(g,.031,.035,.04,-.28+i*.062,-7.565,.04,mats.gold,.004);
 box(g,1.3,.35,.1,-2,-7.23,.07,mats.darkMetal,.04);box(g,.42,.26,.1,1.47,-7.05,.07,mats.chip,.03);
 box(g,.48,3.7,.025,2.34,-4.78,.08,copper,.02);
 for(let i=0;i<8;i++)box(g,.14,.11,.06,-2.45+i*.65,-6.69,.064,i%2?mats.metal:mats.chip,.01);
}

// A shared colored silhouette makes selection readable without a postprocessing stack.
parts.forEach(p=>p.group.traverse(o=>{if(!o.isMesh)return;o.userData.partId=p.id;o.material=o.material.clone();const m=o.material;if(m.emissive){o.userData.baseEmissive=m.emissive.clone();o.userData.baseIntensity=m.emissiveIntensity;}}));

function setSelection(id,announce=true){state.selected=id;const p=parts.find(p=>p.id===id);if(!p)return;
 $('#part-detail').innerHTML=`<div class="detail-header"><span class="eyebrow">COMPONENT ${String(p.index+1).padStart(2,'0')} / DETAILS</span><span class="detail-status">${state.targets[p.index]>.02?'已分离':'已装配'}</span></div><h3>${p.name}</h3><p>${p.desc}</p><div class="detail-specs">${p.specs.map(s=>`<div><strong>${s[0]}</strong><small>${s[1]}</small></div>`).join('')}</div>`;
 updateRows();if(innerWidth>=760){const list=$('#parts-list'),row=document.querySelector(`[data-part="${id}"]`);if(row){const a=row.getBoundingClientRect(),b=list.getBoundingClientRect();if(a.top<b.top)list.scrollTop-=b.top-a.top;else if(a.bottom>b.bottom)list.scrollTop+=a.bottom-b.bottom;}}if(announce)$('#announcement').textContent=`已选择${p.name}，${state.targets[p.index]>.02?'已分离':'已装配'}`;
}
function updateRows(){parts.forEach(p=>{const row=document.querySelector(`[data-part="${p.id}"]`);if(!row)return;row.classList.toggle('selected',state.selected===p.id);row.classList.toggle('detached',state.targets[p.index]>.02);row.setAttribute('aria-pressed',String(state.targets[p.index]>.02));row.setAttribute('aria-label',`${p.name}，${state.targets[p.index]>.02?'已分离，点击装回':'已装配，点击拆解'}`);});}
$('#parts-list').innerHTML=parts.map(p=>`<button class="part-row" data-part="${p.id}" aria-pressed="false"><span class="part-number">${String(p.index+1).padStart(2,'0')}</span><span class="part-name">${p.name}<small>${p.en}</small></span><span class="state-dot"></span><span class="row-arrow">↗</span></button>`).join('');
function stopSequence(){state.sequence=false;$('#sequence').innerHTML='<span class="play-symbol">▷</span> 自动演示';$('#sequence').setAttribute('aria-pressed','false');}
function syncProgress(){const n=state.targets.reduce((a,b)=>a+b,0)/parts.length;const v=Math.round(n*100);$('#explode-range').value=v;$('#explode-range').style.setProperty('--progress',`${v}%`);$('#explode-value').innerHTML=`${v}<span>%</span>`;const count=state.targets.filter(v=>v>.02).length;$('#model-state').textContent=count===0?'完整机身':count===parts.length?'全景拆解':`${count} 个部件已分离`;$('#part-counter').textContent=`${parts.length-count} / 10 ASSEMBLED`;$('#explode-all').innerHTML=n>.5?'一键组装 <span>↙</span>':'一键拆解 <span>↗</span>';updateRows();const p=parts.find(p=>p.id===state.selected);const status=$('.detail-status');if(status)status.textContent=state.targets[p.index]>.02?'已分离':'已装配';}
function togglePart(id){stopSequence();const p=parts.find(p=>p.id===id);state.targets[p.index]=state.targets[p.index]>.02?0:1;setSelection(id);syncProgress();}
document.querySelectorAll('[data-part]').forEach(b=>b.addEventListener('click',()=>togglePart(b.dataset.part)));
function explodeAll(){stopSequence();const n=state.targets.reduce((a,b)=>a+b,0)/parts.length;state.targets.fill(n>.5?0:1);syncProgress();}
$('#explode-all').addEventListener('click',explodeAll);
$('#explode-range').addEventListener('input',e=>{stopSequence();state.targets.fill(Number(e.target.value)/100);syncProgress();});
function toggleSequence(){if(state.sequence){stopSequence();return;}state.sequence=true;state.sequenceTime=0;state.targets.fill(0);$('#sequence').innerHTML='<span class="play-symbol">Ⅱ</span> 暂停演示';$('#sequence').setAttribute('aria-pressed','true');syncProgress();}
$('#sequence').addEventListener('click',toggleSequence);
$('#labels-toggle').addEventListener('click',()=>{state.showLabels=!state.showLabels;$('#labels-toggle').setAttribute('aria-pressed',String(state.showLabels));$('#labels-toggle').classList.toggle('enabled',state.showLabels);});
function view(name){state.view=name;document.querySelectorAll('[data-view]').forEach(b=>b.classList.toggle('active',b.dataset.view===name));if(!controls)return;const pos=name==='front'?new THREE.Vector3(0,.2,-25):name==='back'?new THREE.Vector3(0,.2,25):initialPosition.clone();cameraTween={from:camera.position.clone(),to:pos,fromTarget:controls.target.clone(),time:0};controls.autoRotate=false;$('#rotate').setAttribute('aria-pressed','false');}
document.querySelectorAll('[data-view]').forEach(b=>b.addEventListener('click',()=>view(b.dataset.view)));
$('#rotate').addEventListener('click',()=>{if(!controls)return;cameraTween=null;controls.autoRotate=!controls.autoRotate;$('#rotate').setAttribute('aria-pressed',String(controls.autoRotate));});
function reset(){stopSequence();state.targets.fill(0);setSelection('lens');syncProgress();view('perspective');}
$('#reset').addEventListener('click',reset);
$('#fullscreen').addEventListener('click',async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen();}catch{$('#announcement').textContent='此浏览器不支持全屏，请使用浏览器全屏功能。';}});
document.addEventListener('fullscreenchange',()=>$('#fullscreen').setAttribute('aria-label',document.fullscreenElement?'退出全屏':'全屏查看'));
document.querySelectorAll('[data-dialog]').forEach(b=>b.addEventListener('click',()=>{stopSequence();$( '#'+b.dataset.dialog).showModal();}));
document.querySelectorAll('dialog').forEach(d=>{d.querySelectorAll('.close-dialog').forEach(b=>b.addEventListener('click',()=>d.close()));d.addEventListener('click',e=>{if(e.target===d){const r=d.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)d.close();}});});
$('#explore-nav').addEventListener('click',()=>{$('#stage').scrollIntoView({behavior:reducedMotion?'auto':'smooth',block:'center'});canvas.focus({preventScroll:true});});
document.addEventListener('keydown',e=>{if(e.ctrlKey||e.altKey||e.metaKey||e.repeat||e.target.matches('input,textarea,select,button,a')||document.querySelector('dialog[open]'))return;if(e.key.toLowerCase()==='e'){e.preventDefault();explodeAll();}if(e.key.toLowerCase()==='r'){e.preventDefault();reset();}if(e.code==='Space'){e.preventDefault();toggleSequence();}});
setSelection('lens',false);

try{
 renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:true,powerPreference:'high-performance'});
 renderer.setPixelRatio(Math.min(devicePixelRatio,innerWidth<760?1.5:2));renderer.setClearColor(0x000000,0);renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.15;
 controls=new OrbitControls(camera,canvas);controls.enableDamping=true;controls.dampingFactor=.075;controls.minDistance=11;controls.maxDistance=48;controls.target.set(0,-.1,0);controls.autoRotateSpeed=.7;controls.maxPolarAngle=Math.PI*.92;
 controls.addEventListener('start',()=>{cameraTween=null;});
 scene.add(new THREE.HemisphereLight(0xc7dce8,0x1c252e,1.5));
 function light(c,int,x,y,z){const l=new THREE.DirectionalLight(c,int);l.position.set(x,y,z);scene.add(l);}light(0xe5eef6,4,3,8,6);light(0x73b9dc,3,-6,3,-5);light(0xf9dfbd,1.4,5,1,-3);light(0x99bacc,1,-4,0,9);
 // Procedural studio reflections: white panels rendered into a cube map.
 const envScene=new THREE.Scene();envScene.background=new THREE.Color(0x1a222c);
 for(const [x,y,z,w,h,b] of [[-6,4,3,4,7,3],[5,2,-2,3,6,2],[0,8,0,10,8,2],[0,0,9,2,5,1]]){const m=new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshBasicMaterial({color:new THREE.Color(b,b,b),side:THREE.DoubleSide}));m.position.set(x,y,z);m.lookAt(0,0,0);envScene.add(m);}
 const cubeTarget=new THREE.WebGLCubeRenderTarget(128,{type:THREE.HalfFloatType});const cube=new THREE.CubeCamera(.1,50,cubeTarget);cube.update(renderer,envScene);const pmrem=new THREE.PMREMGenerator(renderer);scene.environment=pmrem.fromCubemap(cubeTarget.texture).texture;cubeTarget.dispose();pmrem.dispose();envScene.traverse(o=>{o.geometry?.dispose();o.material?.dispose();});
 const floor=new THREE.GridHelper(28,28,0x2b414d,0x18232c);floor.position.y=-6.24;floor.material.transparent=true;floor.material.opacity=.28;scene.add(floor);
 for(const r of [4.9,5.05]){const m=new THREE.Mesh(new THREE.RingGeometry(r,r+.012,120),new THREE.MeshBasicMaterial({color:0x456c7d,transparent:true,opacity:.24,side:THREE.DoubleSide}));m.rotation.x=-Math.PI/2;m.position.y=-6.22;scene.add(m);}
 const shadowTex=texture(256,256,(c,w,h)=>{const grad=c.createRadialGradient(w/2,h/2,0,w/2,h/2,w/2);grad.addColorStop(0,'rgba(0,0,0,.75)');grad.addColorStop(.6,'rgba(0,0,0,.28)');grad.addColorStop(1,'rgba(0,0,0,0)');c.fillStyle=grad;c.fillRect(0,0,w,h);});
 const shadow=new THREE.Mesh(new THREE.PlaneGeometry(12,9),new THREE.MeshBasicMaterial({map:shadowTex,transparent:true,depthWrite:false}));shadow.rotation.x=-Math.PI/2;shadow.position.y=-6.2;scene.add(shadow);
 function resize(){const r=stage.getBoundingClientRect();camera.aspect=r.width/r.height;camera.updateProjectionMatrix();renderer.setSize(r.width,r.height,false);if(r.width<600){camera.setViewOffset(r.width,r.height,0,-r.height*.14,r.width,r.height);}else{camera.setViewOffset(r.width,r.height,-r.width*.035,-r.height*.025,r.width,r.height);}}
 new ResizeObserver(resize).observe(stage);resize();
 const raycaster=new THREE.Raycaster(),pointer=new THREE.Vector2();let down=null;let maxMove=0;const pointerIds=new Set();let multiTouch=false;
 function hits(e){const r=canvas.getBoundingClientRect();pointer.set((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1);raycaster.setFromCamera(pointer,camera);return raycaster.intersectObjects(world.children,true).find(h=>h.object.userData.partId);}
 canvas.addEventListener('pointerdown',e=>{pointerIds.add(e.pointerId);if(pointerIds.size>1)multiTouch=true;down={x:e.clientX,y:e.clientY,t:performance.now(),id:e.pointerId};maxMove=0;});
 canvas.addEventListener('pointermove',e=>{if(down)maxMove=Math.max(maxMove,Math.hypot(e.clientX-down.x,e.clientY-down.y));});
 canvas.addEventListener('pointerup',e=>{if(down&&down.id===e.pointerId&&maxMove<6&&performance.now()-down.t<550&&!multiTouch&&e.button===0){const hit=hits(e);if(hit)togglePart(hit.object.userData.partId);}pointerIds.delete(e.pointerId);if(pointerIds.size===0)multiTouch=false;down=null;});
 canvas.addEventListener('pointercancel',e=>{pointerIds.delete(e.pointerId);down=null;if(!pointerIds.size)multiTouch=false;});
 canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();$('#loader').classList.remove('finished');$('#loader').innerHTML='<p>图形上下文已暂停，正在等待恢复…</p>';});
 canvas.addEventListener('webglcontextrestored',()=>location.reload());
 new IntersectionObserver(entries=>{state.visible=entries[0].isIntersecting;},{threshold:.01}).observe(stage);
 document.addEventListener('visibilitychange',()=>{lastTime=performance.now();});
 let lastTime=performance.now(),labelTimer=0;
 const v=new THREE.Vector3();
 function animate(now){requestAnimationFrame(animate);const dt=Math.min((now-lastTime)/1000,.05);lastTime=now;if(document.hidden||!state.visible)return;
  if(state.sequence){state.sequenceTime+=dt;const t=state.sequenceTime;const step=Math.floor(t/1.15);if(step<parts.length&&state.targets[step]!==1){state.targets=state.targets.map((_,i)=>i<=step?1:0);setSelection(parts[step].id,false);syncProgress();}else if(t>14){stopSequence();}}
  if(cameraTween){cameraTween.time+=dt;const t=Math.min(cameraTween.time/(reducedMotion?.05:.8),1),s=t*t*(3-2*t);camera.position.lerpVectors(cameraTween.from,cameraTween.to,s);controls.target.lerpVectors(cameraTween.fromTarget,new THREE.Vector3(0,-.1,0),s);if(t===1)cameraTween=null;}
  parts.forEach(p=>{const i=p.index;state.amounts[i]=THREE.MathUtils.damp(state.amounts[i],state.targets[i],reducedMotion?80:6,dt);const n=state.amounts[i];p.group.position.set(p.offset[0]*n,p.offset[1]*n,p.offset[2]*n);const selected=state.selected===p.id;p.group.traverse(o=>{if(o.isMesh&&o.material.emissive){if(selected){o.material.emissive.setHex(0x528f84);o.material.emissiveIntensity=(n>.02?.28:.015);}else{o.material.emissive.copy(o.userData.baseEmissive);o.material.emissiveIntensity=o.userData.baseIntensity;}}});});
  const expansion=state.amounts.reduce((a,b)=>a+b,0)/parts.length;
  const zoom=THREE.MathUtils.lerp(Math.min(1.22,camera.aspect*1.12),Math.min(1,camera.aspect*.95),expansion);if(Math.abs(camera.zoom-zoom)>.0001){camera.zoom=zoom;camera.updateProjectionMatrix();}
  controls.update(dt);renderer.render(scene,camera);
  labelTimer+=dt;if(labelTimer>1/30){labelTimer=0;const placed=[];parts.forEach(p=>{const show=state.showLabels&&(state.amounts[p.index]>.08||(state.selected===p.id&&p.id==='lens'&&camera.position.z>0));p.label.hidden=!show;if(!show)return;p.group.localToWorld(v.set(...p.anchor)).project(camera);p.label.classList.toggle('selected',state.selected===p.id);const w=p.label.offsetWidth,h=p.label.offsetHeight;let x=THREE.MathUtils.clamp((v.x*.5+.5)*stage.clientWidth+12,5,stage.clientWidth-w-5),y=THREE.MathUtils.clamp((-v.y*.5+.5)*stage.clientHeight-6,10,stage.clientHeight-h-45);for(let n=0;n<12;n++){if(!placed.some(r=>x<r.x+r.w+4&&x+w+4>r.x&&y<r.y+r.h+4&&y+h+4>r.y))break;y+=h+4;}y=Math.min(y,stage.clientHeight-h-45);placed.push({x,y,w,h});p.label.style.transform=`translate(${x}px,${y}px)`;p.label.style.opacity=v.z>1||v.z< -1?'0':'1';});}
  if(!state.ready){state.ready=true;$('#loader').classList.add('finished');document.body.dataset.ready='true';}
 }
 requestAnimationFrame(animate);
 // Read-only diagnostics for repeatable local behavior checks.
 window.explorer={getState:()=>({selected:state.selected,targets:[...state.targets],amounts:[...state.amounts],camera:camera.position.toArray(),autoRotate:controls.autoRotate,showLabels:state.showLabels,sequence:state.sequence,ready:state.ready,product:'Xiaomi 13',meshCount:parts.reduce((n,p)=>{p.group.traverse(o=>{if(o.isMesh)n++;});return n;},0)}),projectPart:id=>{const p=parts.find(p=>p.id===id);if(!p)return null;world.updateMatrixWorld(true);const r=canvas.getBoundingClientRect();const v=p.group.localToWorld(new THREE.Vector3(...p.anchor)).project(camera);return {x:r.left+(v.x*.5+.5)*r.width,y:r.top+(-v.y*.5+.5)*r.height};}};
}catch(error){console.error('3D 初始化失败',error);$('#loader').innerHTML='<div class="webgl-error"><p>当前浏览器无法启动 3D 图形。</p><small>请启用硬件加速，或使用支持 WebGL 2 的现代浏览器。</small></div>';$('#scene').hidden=true;document.querySelectorAll('.stage-tools button,#sequence,#explode-all,#explode-range').forEach(b=>b.disabled=true);}
