import * as THREE from 'three';
import { OrbitControls } from './vendor/OrbitControls.js';
import { RoundedBoxGeometry } from './vendor/RoundedBoxGeometry.js';

const $ = s => document.querySelector(s);
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const partData = [
  { id:'cover', name:'镜头保护盖', en:'LENS PROTECTOR', desc:'可拆卸玻璃保护盖与金属镜圈，共同守护镜头。拆开保护盖，观察光学系统的第一道防线。', specs:[['玻璃','保护镜片'],['可拆卸','旋转式结构']], offset:[.5,.6,2.7], anchor:[1.7,.2,1.9] },
  { id:'lens', name:'超广角镜头', en:'ULTRA-WIDE LENS', desc:'155° 超广视角搭配 f/2.8 光圈，容纳更广阔的世界。多层镜片与镀膜以程序化几何示意呈现。', specs:[['155°','超广视角'],['f/2.8','镜头光圈']], offset:[1.2,.15,1.5], anchor:[1.7,.25,1.4] },
  { id:'sensor', name:'CMOS 影像传感器', en:'IMAGE SENSOR', desc:'1/1.3 英寸 CMOS 传感器，是 Action 4 影像系统的核心。传感器封装与连接位置为结构示意。', specs:[['1/1.3″','CMOS 规格'],['4K/120','最高帧率']], offset:[1.8,.15,.2], anchor:[1.7,.25,.5] },
  { id:'front', name:'前置触摸屏', en:'FRONT TOUCHSCREEN', desc:'1.4 英寸全彩触摸屏，让自拍构图、模式切换和参数查看更加直观。屏幕画面由 Canvas 实时绘制。', specs:[['1.4″','屏幕尺寸'],['320²','像素分辨率']], offset:[-2.2,.25,1.8], anchor:[-1.9,.25,1.18] },
  { id:'shell', name:'机身与前面板', en:'BODY & FRONT PANEL', desc:'紧凑机身容纳完整影像系统。按官方尺寸比例构建圆角轮廓、按键与防水接缝，内部支撑结构为近似示意。', specs:[['145 g','整机重量'],['18 m','裸机防水*']], offset:[0,1.8,.4], anchor:[-.3,1.7,.9] },
  { id:'board', name:'主板与影像系统', en:'MAINBOARD', desc:'主板连接影像、显示和供电系统。芯片、铜箔走线、连接器与屏蔽罩均由代码生成，布局为原理示意。', specs:[['10-bit','D-Log M'],['4K','影像处理']], offset:[0,0,-2.5], anchor:[.2,.6,-.15] },
  { id:'battery', name:'耐寒长续航电池', en:'EXTREME BATTERY', desc:'1770 mAh 可更换电池，为持续探索提供能量。电池外形及触点位置为近似展示，实际性能请参阅官方说明。', specs:[['1770','容量 / mAh'],['6.8 Wh','额定能量']], offset:[3.0,-.5,-.3], anchor:[2.1,-.6,-.3] },
  { id:'rear', name:'后置触摸屏', en:'REAR TOUCHSCREEN', desc:'2.25 英寸后置全彩触摸屏提供更宽阔的取景与回放空间。旋转至背面，查看屏幕与机身的层叠关系。', specs:[['2.25″','屏幕尺寸'],['640×360','像素分辨率']], offset:[-.3,.6,-3.9], anchor:[0,0,-1.25] },
  { id:'door', name:'接口与密封仓盖', en:'PORT & SEALED COVER', desc:'USB-C 接口用于充电和数据连接，密封仓盖与机身配合。microSD 插槽位于电池仓内。内部接口位置作示意。', specs:[['USB-C','连接接口'],['512 GB','microSD 上限']], offset:[-2.8,-.3,-.1], anchor:[-3.5,-.1,0] },
  { id:'mount', name:'磁吸快拆底座', en:'MAGNETIC QUICK RELEASE', desc:'磁吸定位与卡扣结合，让拍摄设备在不同安装位置之间快速切换。本模型展示底部连接结构与快拆配件。', specs:[['磁吸','快速定位'],['双卡扣','连接结构']], offset:[0,-2.2,0], anchor:[0,-2.45,0] },
];
const state = { selected:'lens', amounts:partData.map(()=>0), targets:partData.map(()=>0), sequence:false, sequenceTime:0, showLabels:true, visible:true, view:'perspective', ready:false };
const parts = [];
const scene = new THREE.Scene();
const world = new THREE.Group();scene.add(world);
const camera = new THREE.PerspectiveCamera(36,1,.1,120);
const initialPosition = new THREE.Vector3(10,6.5,17.5);
camera.position.copy(initialPosition);
const stage = $('#stage'), canvas = $('#scene');
let renderer, controls;
let cameraTween = null;

// All artwork, surfaces and micro-detail are generated here. No image or model loader.
function texture(w,h,draw){const c=document.createElement('canvas');c.width=w;c.height=h;draw(c.getContext('2d'),w,h);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return t;}
function screenTexture(rear=false){return texture(rear?960:640,rear?540:640,(c,w,h)=>{
 const sky=c.createLinearGradient(0,0,0,h);sky.addColorStop(0,'#3b7789');sky.addColorStop(.5,'#82b7be');sky.addColorStop(1,'#b8c2b7');c.fillStyle=sky;c.fillRect(0,0,w,h);
 c.fillStyle='#e1d9b6';c.beginPath();c.arc(w*.73,h*.24,h*.065,0,Math.PI*2);c.fill();
 const mountains=[{y:.5,color:'#436b71',seed:2},{y:.64,color:'#30545b',seed:6},{y:.77,color:'#173f49',seed:12},{y:.92,color:'#0d2d38',seed:19}];
 for(const m of mountains){c.fillStyle=m.color;c.beginPath();c.moveTo(0,h);for(let x=0;x<=w;x+=w/35){let n=Math.sin(x/w*14+m.seed)*.07+Math.sin(x/w*29+m.seed)*.04;c.lineTo(x,(m.y+n)*h);}c.lineTo(w,h);c.closePath();c.fill();}
 c.strokeStyle='rgba(191,224,220,.28)';c.lineWidth=2;c.beginPath();c.moveTo(w*.52,h);c.bezierCurveTo(w*.58,h*.88,w*.38,h*.82,w*.49,h*.72);c.stroke();
 c.fillStyle='#f3f8f9';c.font=`${h*.031}px Arial`;c.fillText('4K / 120',w*.055,h*.09);c.textAlign='right';c.fillText('89%',w*.93,h*.09);c.textAlign='left';
 c.fillStyle='#ef6b53';c.beginPath();c.arc(w*.075,h*.92,h*.011,0,Math.PI*2);c.fill();c.fillStyle='#fff';c.font=`${h*.034}px Arial`;c.fillText('00:04:28',w*.11,h*.934);
 c.strokeStyle='rgba(255,255,255,.5)';c.lineWidth=1;let cx=w*.5,cy=h*.5;c.beginPath();c.moveTo(cx-12,cy);c.lineTo(cx+12,cy);c.moveTo(cx,cy-12);c.lineTo(cx,cy+12);c.stroke();
 });}
const bodyTex=texture(128,128,(c,w,h)=>{c.fillStyle='#888';c.fillRect(0,0,w,h);let seed=23;for(let i=0;i<14000;i++){seed=(seed*16807)%2147483647;const x=seed%w;seed=(seed*16807)%2147483647;const y=seed%h;c.fillStyle=`rgba(0,0,0,${(seed%10)/70})`;c.fillRect(x,y,1,1);}});bodyTex.wrapS=bodyTex.wrapT=THREE.RepeatWrapping;bodyTex.repeat.set(5,4);
const mats={
 body:new THREE.MeshStandardMaterial({color:0x33383c,metalness:.55,roughness:.56,bumpMap:bodyTex,bumpScale:.017}),
 edge:new THREE.MeshStandardMaterial({color:0x1a1e23,metalness:.7,roughness:.34}),
 rubber:new THREE.MeshStandardMaterial({color:0x101317,roughness:.86}),
 metal:new THREE.MeshStandardMaterial({color:0x9aa5ad,metalness:.94,roughness:.27}),
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
function bezel(g,w,h,r,hole,d,x,y,z,mat){const s=new THREE.Shape();s.moveTo(-w/2+r,-h/2);s.lineTo(w/2-r,-h/2);s.quadraticCurveTo(w/2,-h/2,w/2,-h/2+r);s.lineTo(w/2,h/2-r);s.quadraticCurveTo(w/2,h/2,w/2-r,h/2);s.lineTo(-w/2+r,h/2);s.quadraticCurveTo(-w/2,h/2,-w/2,h/2-r);s.lineTo(-w/2,-h/2+r);s.quadraticCurveTo(-w/2,-h/2,-w/2+r,-h/2);const p=new THREE.Path();p.absarc(0,0,hole,0,Math.PI*2,true);s.holes.push(p);return mesh(g,new THREE.ExtrudeGeometry(s,{depth:d,bevelEnabled:true,bevelSize:.025,bevelThickness:.025,bevelSegments:3,curveSegments:64,steps:1}),mat,x,y,z);}
function screw(g,x,y,z){cyl(g,.055,.025,x,y,z,mats.metal);box(g,.061,.009,.008,x,y,z+.019,mats.edge,.002);box(g,.009,.061,.008,x,y,z+.02,mats.edge,.002);}
function newPart(d,i){const g=new THREE.Group();g.userData.partId=d.id;world.add(g);const p={...d,index:i,group:g,highlight:[],label:document.createElement('div')};p.label.className='part-label';p.label.innerHTML=`<b>${String(i+1).padStart(2,'0')}</b><span>${d.name}</span>`;$('#labels').append(p.label);parts.push(p);return g;}
partData.forEach((d,i)=>newPart(d,i));
const group=id=>parts.find(p=>p.id===id).group;

// 70.5 × 44.2 × 32.8 mm exterior proportions, 10 mm = one scene unit.
{
 const g=group('shell');
 // Hollow structural chassis, allowing the PCB and optical system to become visible.
 box(g,7.05,.34,2.34,0,2.04,0,mats.body,.15);box(g,7.05,.35,2.34,0,-2.04,0,mats.body,.15);
 box(g,.28,3.85,2.34,-3.38,0,0,mats.body,.12);box(g,.3,3.85,2.34,3.37,0,0,mats.body,.12);
 // Front face is created with openings for the front screen and optical assembly.
 box(g,7.03,.48,.18,0,1.96,1.2,mats.body,.09);box(g,7.03,.9,.18,0,-1.76,1.2,mats.body,.09);
 box(g,.4,2.85,.18,-3.31,.27,1.2,mats.body,.08);box(g,.48,2.85,.18,-.28,.27,1.2,mats.body,.08);
 box(g,.48,2.85,.18,3.27,.27,1.2,mats.body,.08);
 box(g,7.01,.16,.18,0,1.67,1.2,mats.body,.05);box(g,7.01,.16,.18,0,-1.23,1.2,mats.body,.05);
 box(g,.19,2.8,.18,-.69,.24,1.2,mats.body,.04);
 box(g,2.95,.43,.18,1.48,1.53,1.2,mats.body,.07);box(g,2.95,.58,.18,1.48,-1.12,1.2,mats.body,.06);
 // Top shutter, record ring and side quick-switch key.
 const topKey=box(g,1.13,.15,.65,1.8,2.26,-.05,mats.edge,.07);
 ring(g,.15,.037,.02,0,0,0,new THREE.MeshStandardMaterial({color:0x9f3a2b,metalness:.4,roughness:.4})).rotation.x=-Math.PI/2;
 const record=mesh(g,new THREE.TorusGeometry(.13,.025,10,40),new THREE.MeshStandardMaterial({color:0xb95540}),1.8,2.35,-.05);record.rotation.x=-Math.PI/2;
 box(g,.12,.65,.9,-3.56,.85,-.1,mats.edge,.05);
 textPlane(g,'OSMO',1.12,.27,-2.32,-1.7,1.31,'#c5c9cc');textPlane(g,'ACTION',1.35,.24,-.69,-1.7,1.31,'#c5c9cc');textPlane(g,'4',.35,.36,.28,-1.68,1.32,'#df8e3e');
 textPlane(g,'dji',.48,.25,2.69,-1.68,1.31,'#a4adb4','italic bold 76px Arial');
 cyl(g,.075,.025,-2.97,1.64,1.32,new THREE.MeshStandardMaterial({color:0x74c4a6,emissive:0x295a43,emissiveIntensity:.7}));
 cyl(g,.075,.025,.35,-.81,1.32,mats.rubber);
 for(let x=0;x<4;x++)for(let y=0;y<2;y++)cyl(g,.022,.015,-.56+x*.1,1.88+y*.09,1.31,mats.rubber);
 for(const [x,y] of [[-3.15,-1.97],[3.13,-1.97],[-3.15,1.95],[3.13,1.95]])screw(g,x,y,1.31);
 box(g,6.5,.025,.035,0,-1.98,1.31,mats.edge,.009);
}
{
 const g=group('front');box(g,2.61,2.75,.2,-1.87,.18,1.21,mats.edge,.14);
 const screen=plane(g,2.34,2.36,-1.87,.23,1.325,new THREE.MeshBasicMaterial({map:screenTexture()}));
 box(g,2.4,.04,.02,-1.87,1.43,1.35,mats.darkMetal,.015);
}
{
 const g=group('cover');bezel(g,2.99,3.02,.17,1.19,.24,1.62,.24,1.43,mats.edge);
 ring(g,1.35,.18,.13,1.62,.24,1.65,mats.darkMetal);ring(g,1.33,.1,.11,1.62,.24,1.77,mats.edge);
 const glass=cyl(g,1.17,.015,1.62,.24,1.9,new THREE.MeshPhysicalMaterial({color:0x24464c,metalness:.05,roughness:.05,clearcoat:1,transparent:true,opacity:.12,depthWrite:false}));
 ring(g,1.16,.014,.005,1.62,.24,1.93,mats.metal);
 const shine=new THREE.MeshBasicMaterial({color:0xb4deee,transparent:true,opacity:.25});
 const arc=mesh(g,new THREE.TorusGeometry(1.13,.016,8,70,Math.PI*.55),shine,1.62,.24,1.947);arc.rotation.z=.6;
 textPlane(g,'F/2.8 · FOV 155°',1.23,.15,1.62,1.43,1.82,'#b4bbc3');
}
{
 const g=group('lens');cyl(g,1.07,.8,1.62,.24,1.02,mats.rubber);
 for(let i=0;i<5;i++)ring(g,1.09-i*.012,.07,.035,1.62,.24,.72+i*.14,mats.darkMetal);
 cyl(g,.92,.07,1.62,.24,1.44,mats.edge);cyl(g,.79,.035,1.62,.24,1.5,mats.glass);
 ring(g,.81,.05,.025,1.62,.24,1.5,mats.darkMetal);cyl(g,.43,.025,1.62,.24,1.53,new THREE.MeshPhysicalMaterial({color:0x081823,metalness:.7,roughness:.06,clearcoat:1}));
 cyl(g,.19,.01,1.62,.24,1.55,new THREE.MeshBasicMaterial({color:0x123b47}));
 const glint=new THREE.MeshBasicMaterial({color:0x82bccc,transparent:true,opacity:.48});const m=mesh(g,new THREE.CircleGeometry(.22,32),glint,1.35,.5,1.57);m.scale.y=.36;m.rotation.z=.7;
 const arc=mesh(g,new THREE.TorusGeometry(.7,.022,8,56,1.3),new THREE.MeshBasicMaterial({color:0x516da6,transparent:true,opacity:.55}),1.62,.24,1.57);arc.rotation.z=3.7;
}
{
 const g=group('sensor');box(g,1.78,1.73,.11,1.62,.24,.27,mats.pcb,.03);box(g,1.2,1.12,.13,1.62,.24,.39,mats.gold,.02);
 box(g,.99,.88,.04,1.62,.24,.48,new THREE.MeshPhysicalMaterial({color:0x69506e,metalness:.8,roughness:.16,clearcoat:1,iridescence:1}),.01);
 for(let i=0;i<14;i++){box(g,.045,.09,.02,.86+i*.116,1.055,.34,mats.gold,.003);box(g,.045,.09,.02,.86+i*.116,-.58,.34,mats.gold,.003);}
 for(let i=0;i<7;i++)box(g,.06,.045,.04,2.47,-.35+i*.18,.36,mats.metal,.006);
}
{
 const g=group('board');box(g,6.25,3.6,.12,0,0,-.3,mats.pcb,.08);
 // Deterministic PCB traces, not random per animation frame.
 const lineMat=new THREE.LineBasicMaterial({color:0x81976c,transparent:true,opacity:.6});
 for(let i=0;i<38;i++){let x=-2.95+(i%19)*.33,y=-1.55+Math.floor(i/19)*2.7;const points=[new THREE.Vector3(x,y,-.225),new THREE.Vector3(x,y*.6,-.225),new THREE.Vector3(x+.15,y*.6+.1,-.225),new THREE.Vector3(x+.15,(i%7-3)*.23,-.225)];g.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(points),lineMat));}
 box(g,1.45,1.35,.18,-.27,.3,-.13,mats.chip,.035);textPlane(g,'IMAGE PROCESSOR',1.17,.22,-.27,.3,-.025,'#a8adb3');
 box(g,.95,.75,.16,-1.88,.58,-.12,mats.chip,.03);box(g,1.15,.8,.2,.18,-1.08,-.09,mats.metal,.035);
 for(let i=0;i<18;i++){for(const sign of [-1,1])box(g,.024,.12,.05,-.9+i*.075,.3+sign*.75,-.08,mats.metal,.003);}
 for(let i=0;i<30;i++){const x=-2.8+(i%10)*.59,y=-1.4+Math.floor(i/10)*1.3;box(g,.16,.1,.09,x,y,-.16,i%3?mats.chip:mats.metal,.01);}
 for(const [x,y] of [[-2.85,-1.53],[2.85,-1.53],[-2.85,1.53],[2.85,1.53]])ring(g,.09,.04,.02,x,y,-.22,mats.gold);
 // Flexible amber ribbon from optical module to mainboard.
 box(g,.44,1.3,.035,1.62,-.58,-.16,new THREE.MeshStandardMaterial({color:0xa56624,metalness:.5,roughness:.4}),.01);
}
{
 const g=group('battery');box(g,1.58,3.45,1.22,2.13,-.05,-.47,mats.chip,.14);
 box(g,1.43,3.1,.025,2.13,-.05,.155,new THREE.MeshStandardMaterial({color:0x30353a,roughness:.6}),.04);
 textPlane(g,'dji',.63,.3,2.13,1.12,.18,'#a9b0b6','italic bold 76px Arial');textPlane(g,'EXTREME BATTERY',1.25,.17,2.13,.37,.18,'#a3abb0');textPlane(g,'1770 mAh',1.06,.24,2.13,-.05,.18,'#c3c8cb');textPlane(g,'3.85V   6.8Wh',1.06,.16,2.13,-.45,.18,'#919ba3');
 textPlane(g,'LiPo   CE',.8,.16,2.13,-1.1,.18,'#707e87');
 for(let i=0;i<4;i++)box(g,.16,.08,.4,1.73+i*.25,1.71,-.4,mats.gold,.012);
}
{
 const g=group('rear');box(g,6.92,4.27,.26,0,0,-1.25,mats.edge,.17);
 const m=plane(g,6.24,3.51,0,0,-1.397,new THREE.MeshBasicMaterial({map:screenTexture(true)}));m.rotation.y=Math.PI;
 textPlane(g,'OSMO ACTION',1.5,.18,0,-1.98,-1.4,'#8e9ca4').rotation.y=Math.PI;
 for(const [x,y] of [[-3.2,-1.9],[3.2,-1.9],[-3.2,1.9],[3.2,1.9]]){const s=new THREE.Group();s.position.set(x,y,-1.39);s.rotation.y=Math.PI;screw(s,0,0,0);g.add(s);}
}
{
 const g=group('door');box(g,.17,2.95,1.92,-3.51,-.1,0,mats.edge,.075);
 box(g,.21,.58,1.18,-3.63,-.2,.05,mats.body,.04);
 const port=box(g,.09,.38,.75,-3.39,.5,0,mats.metal,.12);box(g,.12,.22,.54,-3.45,.5,0,mats.rubber,.09);
 for(let i=0;i<8;i++)box(g,.025,.035,.03,-3.52,.45,-.2+i*.055,mats.gold,.004);
 const s=textPlane(g,'USB-C',.74,.19,0,0,0,'#adb5bb');s.position.set(-3.62,.95,0);s.rotation.y=-Math.PI/2;
}
{
 const g=group('mount');box(g,2.8,.2,1.7,0,-2.29,0,mats.edge,.09);
 box(g,2.32,.38,1.25,0,-2.57,0,mats.darkMetal,.1);
 for(const x of [-1.22,1.22])box(g,.2,.56,.66,x,-2.49,0,mats.metal,.05);
 for(const x of [-.7,0,.7]){box(g,.22,.67,.92,x,-3.05,0,mats.edge,.1);const m=mesh(g,new THREE.CylinderGeometry(.16,.16,.25,24),mats.rubber,x,-3.03,0);m.rotation.z=Math.PI/2;}
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
function view(name){state.view=name;document.querySelectorAll('[data-view]').forEach(b=>b.classList.toggle('active',b.dataset.view===name));if(!controls)return;const pos=name==='front'?new THREE.Vector3(0,1,22):name==='back'?new THREE.Vector3(0,1,-22):initialPosition.clone();cameraTween={from:camera.position.clone(),to:pos,fromTarget:controls.target.clone(),time:0};controls.autoRotate=false;$('#rotate').setAttribute('aria-pressed','false');}
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
 renderer.setPixelRatio(Math.min(devicePixelRatio,innerWidth<760?1.5:2));renderer.setClearColor(0x000000,0);renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.4;
 controls=new OrbitControls(camera,canvas);controls.enableDamping=true;controls.dampingFactor=.075;controls.minDistance=11;controls.maxDistance=36;controls.target.set(0,-.1,0);controls.autoRotateSpeed=.7;controls.maxPolarAngle=Math.PI*.92;
 controls.addEventListener('start',()=>{cameraTween=null;});
 scene.add(new THREE.HemisphereLight(0xc7dce8,0x1c252e,2.4));
 function light(c,int,x,y,z){const l=new THREE.DirectionalLight(c,int);l.position.set(x,y,z);scene.add(l);}light(0xe5eef6,4,3,8,6);light(0x73b9dc,3,-6,3,-5);light(0xf9dfbd,1.4,5,1,-3);light(0x99bacc,1,-4,0,9);
 // Procedural studio reflections: white panels rendered into a cube map.
 const envScene=new THREE.Scene();envScene.background=new THREE.Color(0x1a222c);
 for(const [x,y,z,w,h,b] of [[-6,4,3,4,7,3],[5,2,-2,3,6,2],[0,8,0,10,8,2],[0,0,9,2,5,1]]){const m=new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshBasicMaterial({color:new THREE.Color(b,b,b),side:THREE.DoubleSide}));m.position.set(x,y,z);m.lookAt(0,0,0);envScene.add(m);}
 const cubeTarget=new THREE.WebGLCubeRenderTarget(128,{type:THREE.HalfFloatType});const cube=new THREE.CubeCamera(.1,50,cubeTarget);cube.update(renderer,envScene);const pmrem=new THREE.PMREMGenerator(renderer);scene.environment=pmrem.fromCubemap(cubeTarget.texture).texture;cubeTarget.dispose();pmrem.dispose();envScene.traverse(o=>{o.geometry?.dispose();o.material?.dispose();});
 const floor=new THREE.GridHelper(28,28,0x2b414d,0x18232c);floor.position.y=-4.03;floor.material.transparent=true;floor.material.opacity=.28;scene.add(floor);
 for(const r of [4.9,5.05]){const m=new THREE.Mesh(new THREE.RingGeometry(r,r+.012,120),new THREE.MeshBasicMaterial({color:0x456c7d,transparent:true,opacity:.24,side:THREE.DoubleSide}));m.rotation.x=-Math.PI/2;m.position.y=-4.01;scene.add(m);}
 const shadowTex=texture(256,256,(c,w,h)=>{const grad=c.createRadialGradient(w/2,h/2,0,w/2,h/2,w/2);grad.addColorStop(0,'rgba(0,0,0,.75)');grad.addColorStop(.6,'rgba(0,0,0,.28)');grad.addColorStop(1,'rgba(0,0,0,0)');c.fillStyle=grad;c.fillRect(0,0,w,h);});
 const shadow=new THREE.Mesh(new THREE.PlaneGeometry(12,9),new THREE.MeshBasicMaterial({map:shadowTex,transparent:true,depthWrite:false}));shadow.rotation.x=-Math.PI/2;shadow.position.y=-3.99;scene.add(shadow);
 function resize(){const r=stage.getBoundingClientRect();camera.aspect=r.width/r.height;camera.updateProjectionMatrix();renderer.setSize(r.width,r.height,false);if(r.width<600){camera.setViewOffset(r.width,r.height,0,-r.height*.075,r.width,r.height);}else{camera.setViewOffset(r.width,r.height,-r.width*.035,-r.height*.025,r.width,r.height);}}
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
  if(state.sequence){state.sequenceTime+=dt;const t=state.sequenceTime;const step=Math.floor(t/1.15);if(step<10){state.targets=state.targets.map((_,i)=>i<=step?1:0);if(state.selected!==parts[step].id)setSelection(parts[step].id,false);}else if(t>14){stopSequence();}syncProgress();}
  if(cameraTween){cameraTween.time+=dt;const t=Math.min(cameraTween.time/(reducedMotion?.05:.8),1),s=t*t*(3-2*t);camera.position.lerpVectors(cameraTween.from,cameraTween.to,s);controls.target.lerpVectors(cameraTween.fromTarget,new THREE.Vector3(0,-.1,0),s);if(t===1)cameraTween=null;}
  parts.forEach(p=>{const i=p.index;state.amounts[i]=THREE.MathUtils.damp(state.amounts[i],state.targets[i],reducedMotion?80:6,dt);const n=state.amounts[i];p.group.position.set(p.offset[0]*n,p.offset[1]*n,p.offset[2]*n);const selected=state.selected===p.id;p.group.traverse(o=>{if(o.isMesh&&o.material.emissive){if(selected){o.material.emissive.setHex(0x1a7897);o.material.emissiveIntensity=(n>.02?.3:.1);}else{o.material.emissive.copy(o.userData.baseEmissive);o.material.emissiveIntensity=o.userData.baseIntensity;}}});});
  const expansion=state.amounts.reduce((a,b)=>a+b,0)/parts.length;
  const zoom=THREE.MathUtils.lerp(Math.min(1.22,camera.aspect*1.12),Math.min(1,camera.aspect*.95),expansion);if(Math.abs(camera.zoom-zoom)>.0001){camera.zoom=zoom;camera.updateProjectionMatrix();}
  controls.update(dt);renderer.render(scene,camera);
  labelTimer+=dt;if(labelTimer>1/30){labelTimer=0;const placed=[];parts.forEach(p=>{const show=state.showLabels&&(state.amounts[p.index]>.08||(state.selected===p.id&&p.id==='lens'));p.label.hidden=!show;if(!show)return;v.set(...p.anchor).add(p.group.position).project(camera);p.label.classList.toggle('selected',state.selected===p.id);const w=p.label.offsetWidth,h=p.label.offsetHeight;let x=THREE.MathUtils.clamp((v.x*.5+.5)*stage.clientWidth+12,5,stage.clientWidth-w-5),y=THREE.MathUtils.clamp((-v.y*.5+.5)*stage.clientHeight-6,10,stage.clientHeight-h-45);for(let n=0;n<12;n++){if(!placed.some(r=>x<r.x+r.w+4&&x+w+4>r.x&&y<r.y+r.h+4&&y+h+4>r.y))break;y+=h+4;}y=Math.min(y,stage.clientHeight-h-45);placed.push({x,y,w,h});p.label.style.transform=`translate(${x}px,${y}px)`;p.label.style.opacity=v.z>1||v.z< -1?'0':'1';});}
  if(!state.ready){state.ready=true;$('#loader').classList.add('finished');document.body.dataset.ready='true';}
 }
 requestAnimationFrame(animate);
 // Read-only diagnostics for repeatable local behavior checks.
 window.action4={getState:()=>({selected:state.selected,targets:[...state.targets],amounts:[...state.amounts],camera:camera.position.toArray(),autoRotate:controls.autoRotate,showLabels:state.showLabels,sequence:state.sequence,ready:state.ready,meshCount:parts.reduce((n,p)=>{p.group.traverse(o=>{if(o.isMesh)n++;});return n;},0)}),projectPart:id=>{const p=parts.find(p=>p.id===id);if(!p)return null;world.updateMatrixWorld(true);const r=canvas.getBoundingClientRect();const v=new THREE.Vector3(...p.anchor).add(p.group.position).project(camera);return {x:r.left+(v.x*.5+.5)*r.width,y:r.top+(-v.y*.5+.5)*r.height};}};
}catch(error){console.error('3D 初始化失败',error);$('#loader').innerHTML='<div class="webgl-error"><p>当前浏览器无法启动 3D 图形。</p><small>请启用硬件加速，或使用支持 WebGL 2 的现代浏览器。</small></div>';$('#scene').hidden=true;document.querySelectorAll('.stage-tools button,#sequence,#explode-all,#explode-range').forEach(b=>b.disabled=true);}
