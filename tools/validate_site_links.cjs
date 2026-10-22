"use strict";
const fs=require("node:fs"),path=require("node:path"),assert=require("node:assert/strict");
const root=path.resolve(__dirname,"..");
for(const name of ["index.html","lab.html","report.html","summary.html"]){
  const html=fs.readFileSync(path.join(root,name),"utf8");
  const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(x=>x[1]);
  assert.equal(new Set(ids).size,ids.length,name+": duplicate IDs");
  for(const match of html.matchAll(/(?:href|src)="([^"]+)"/g)){
    const url=match[1]; if(/^(https?:|data:|mailto:)/.test(url)) continue;
    const [file,fragment]=url.split("#");const target=path.resolve(root,(file||name).split("?")[0]);
    assert.ok(target.startsWith(root+path.sep)||target===root,name+": escaped root "+url);
    assert.ok(fs.existsSync(target),name+": missing "+url);
    if(fragment && (target.endsWith(".html")||file==="")){
      assert.ok(fs.readFileSync(target,"utf8").includes('id="'+fragment+'"'),name+": missing anchor "+url);
    }
  }
}
const payload=JSON.parse(fs.readFileSync(path.join(root,"data/observations/ciao1_aot_telemetry.json")));
const count=["gradientX","gradientY","subapertureIntensity","hodmPosition"].reduce((sum,key)=>sum+payload.telemetry[key].flat().length,0);
const audit=JSON.parse(fs.readFileSync(path.join(root,"research/generated/telemetry-decimation-audit.json")));
assert.equal(audit.browser_product.retained_telemetry_values,count);
for(const name of ["index.html","lab.html","README.md","PROJECT_REPORT.md","PROJECT_SUMMARY.md"]){
 const text=fs.readFileSync(path.join(root,name),"utf8");
 assert.ok(text.includes(count.toLocaleString("en-US")),name+": count drift");
 assert.ok(!text.includes("103,800"),name+": obsolete count");
}
console.log("PASS four published pages: local links, anchors, unique IDs and evidence counts");
