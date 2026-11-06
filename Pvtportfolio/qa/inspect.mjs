import { chromium } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { writeFile } from 'node:fs/promises';
const browser = await chromium.launch();
const context = await browser.newContext({viewport:{width:1440,height:1000},deviceScaleFactor:1});
const page = await context.newPage();
const issues = [];
page.on('pageerror',e=>issues.push(e.message));
page.on('console',m=>{if(m.type()==='error')issues.push(m.text())});
const response = await page.goto('http://127.0.0.1:3210');
await page.evaluate(()=>document.fonts.ready);
await page.waitForTimeout(1500);
await page.screenshot({path:'qa/desktop-hero.png'});
await page.locator('#motion-toggle').click();
await page.evaluate(()=>scrollTo(0,0));
await page.screenshot({path:'qa/desktop-full.png',fullPage:true});
const accessibility = await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();
const layout=[];
for(const width of [320,375,390,540,768,1024,1440,1920]){
 await page.setViewportSize({width,height:900});
 layout.push(await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth,overflow:[...document.querySelectorAll('main *')].filter(e=>{const r=e.getBoundingClientRect();return r.width && (r.right>innerWidth+1||r.left< -1) && getComputedStyle(e).position!=='absolute' && !e.closest('.ticker')}).slice(0,8).map(e=>e.className)})));
 if(width===390){await page.screenshot({path:'qa/mobile-full.png',fullPage:true});}
}
console.log(JSON.stringify({http:response.status(),issues,layout,violations:accessibility.violations.map(v=>({id:v.id,impact:v.impact,nodes:v.nodes.map(n=>({target:n.target,summary:n.failureSummary}))}))},null,2));
await writeFile('qa/initial-audit.json',JSON.stringify({issues,layout,violations:accessibility.violations},null,2));
await browser.close();
