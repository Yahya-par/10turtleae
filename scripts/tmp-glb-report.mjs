import fs from "fs";
const buf = fs.readFileSync("public/Models/Modelv1.glb");
const jsonLen = buf.readUInt32LE(12);
const binStart = 20 + jsonLen;
const bin = buf.slice(binStart + 8, binStart + 8 + buf.readUInt32LE(binStart));
const json = JSON.parse(buf.slice(20, 20 + jsonLen).toString("utf8"));
function mat4Identity(){return new Float32Array([1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]);}
function mat4Multiply(a,b){const o=new Float32Array(16);for(let c=0;c<4;c++)for(let r=0;r<4;r++)o[c*4+r]=a[r]*b[c*4]+a[4+r]*b[c*4+1]+a[8+r]*b[c*4+2]+a[12+r]*b[c*4+3];return o;}
function nodeLocalMatrix(node){if(node.matrix)return new Float32Array(node.matrix);const m=mat4Identity();const t=node.translation||[0,0,0];const r=node.rotation||[0,0,0,1];const s=node.scale||[1,1,1];const [qx,qy,qz,qw]=r;const x2=qx+qx,y2=qy+qy,z2=qz+qz,xx=qx*x2,xy=qx*y2,xz=qx*z2,yy=qy*y2,yz=qy*z2,zz=qz*z2,wx=qw*x2,wy=qw*y2,wz=qw*z2;const m00=1-(yy+zz),m01=xy+wz,m02=xz-wy,m10=xy-wz,m11=1-(xx+zz),m12=yz+wx,m20=xz+wy,m21=yz-wx,m22=1-(xx+yy);m[0]=m00*s[0];m[1]=m10*s[0];m[2]=m20*s[0];m[4]=m01*s[1];m[5]=m11*s[1];m[6]=m21*s[1];m[8]=m02*s[2];m[9]=m12*s[2];m[10]=m22*s[2];m[12]=t[0];m[13]=t[1];m[14]=t[2];return m;}
function tp(m,x,y,z){return [m[0]*x+m[4]*y+m[8]*z+m[12],m[1]*x+m[5]*y+m[9]*z+m[13],m[2]*x+m[6]*y+m[10]*z+m[14]];}
function meshBounds(mi){const mesh=json.meshes[mi];let min=[Infinity,Infinity,Infinity],max=[-Infinity,-Infinity,-Infinity];for(const prim of mesh.primitives){const acc=json.accessors[prim.attributes.POSITION];const bv=json.bufferViews[acc.bufferView];const off=(bv.byteOffset||0)+(acc.byteOffset||0);const stride=bv.byteStride||12;const dv=new DataView(bin.buffer,bin.byteOffset+off,bin.byteLength-off);for(let i=0;i<acc.count;i++){const o=i*stride;const p=[dv.getFloat32(o,true),dv.getFloat32(o+4,true),dv.getFloat32(o+8,true)];for(let k=0;k<3;k++){min[k]=Math.min(min[k],p[k]);max[k]=Math.max(max[k],p[k]);}}}return {min,max,size:[max[0]-min[0],max[1]-min[1],max[2]-min[2]};}
const world=new Map();
function walk(i,p){const w=mat4Multiply(p,nodeLocalMatrix(json.nodes[i]));world.set(i,w);for(const c of json.nodes[i].children||[])walk(c,w);}
for(const ni of json.scenes[json.scene??0].nodes||[])walk(ni,mat4Identity());
function report(i){const n=json.nodes[i],w=world.get(i),lb=n.mesh!==undefined?meshBounds(n.mesh):null;const center=lb?tp(w,(lb.min[0]+lb.max[0])/2,(lb.min[1]+lb.max[1])/2,(lb.min[2]+lb.max[2])/2):tp(w,0,0,0);return {name:n.name,mesh:n.mesh!==undefined?json.meshes[n.mesh].name:null,center,origin:tp(w,0,0,0),localSize:lb?lb.size:null,nodeR:n.rotation,nodeS:n.scale};}
const imageAssets=[];for(let i=0;i<json.nodes.length;i++){const n=json.nodes[i];if(n.name&&/imageasset/i.test(n.name))imageAssets.push(report(i));}
console.log(JSON.stringify({imageAssets,safaricamelLocal:meshBounds(json.meshes.findIndex(m=>m.name==="safaricamel")).size},null,2));
