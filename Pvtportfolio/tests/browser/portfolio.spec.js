import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('loads locally served assets, GSAP, and a responsive accessible page',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 await page.emulateMedia({reducedMotion:'reduce'});
 await page.goto('/');await page.evaluate(()=>document.fonts.ready);
 await expect(page).toHaveTitle('Alok Mishra — Cyber Portfolio');
 expect(await page.evaluate(()=>typeof gsap.timeline)).toBe('function');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy();
 expect(await page.evaluate(()=>[...document.images].every(i=>i.complete&&i.naturalWidth>0))).toBeTruthy();
 const result=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();
 expect(result.violations).toEqual([]);expect(errors).toEqual([]);
});

test('Systems Matrix filters, selects modules, and announces results',async({page})=>{
 await page.emulateMedia({reducedMotion:'reduce'});await page.goto('/#systems');
 await page.getByRole('button',{name:'Defend 03',exact:true}).click();
 await expect(page.locator('.matrix-card:visible')).toHaveCount(3);
 await expect(page.locator('#system-title')).toHaveText('Web Security');
 await page.locator('[data-system="linux"]').click();
 await expect(page.locator('#system-title')).toHaveText('Linux');
 await expect(page.locator('[data-system="linux"]')).toHaveAttribute('aria-pressed','true');
 await page.getByRole('button',{name:'Design 02',exact:true}).click();
 await expect(page.locator('.matrix-card:visible')).toHaveCount(2);
 await expect(page.locator('#system-title')).toHaveText('Figma');
 await page.getByRole('button',{name:'All systems 08',exact:true}).click();
 await expect(page.locator('.matrix-card:visible')).toHaveCount(8);
 await page.locator('[data-system="backend"]').focus();await page.keyboard.press('Enter');
 await expect(page.locator('#system-title')).toHaveText('Node & SQLite');
 await expect(page.locator('#matrix-summary')).toContainText('all 8 systems');
});

test('all project dialogs close and restore keyboard focus',async({page})=>{
 await page.emulateMedia({reducedMotion:'reduce'});await page.goto('/#work');
 for(const key of ['portfolio','threat','phish']){
  const trigger=page.locator(`[data-project="${key}"]`);await trigger.click();
  await expect(page.getByRole('dialog')).toBeVisible();
  const result=await new AxeBuilder({page}).include('#project-dialog').withTags(['wcag2a','wcag2aa']).analyze();expect(result.violations).toEqual([]);
  await page.keyboard.press('Escape');await expect(page.getByRole('dialog')).not.toBeVisible();await expect(trigger).toBeFocused();
 }
});

test('terminal supports help, safe unknown commands, history, and clearing',async({page})=>{
 await page.emulateMedia({reducedMotion:'reduce'});await page.goto('/#terminal');
 const input=page.getByLabel('Terminal command');await input.fill('help');await input.press('Enter');
 await expect(page.locator('#terminal-output')).toContainText('Available commands');
 await input.fill('<img src=x onerror=alert(1)>');await input.press('Enter');
 await expect(page.locator('#terminal-output img')).toHaveCount(0);
 await expect(page.locator('#terminal-output')).toContainText('Command not found');
 await input.press('ArrowUp');await expect(input).toHaveValue('<img src=x onerror=alert(1)>');
 await input.fill('clear');await input.press('Enter');await expect(page.locator('#terminal-output')).toHaveText('');
});

test('contact saves a real message and preserves fields when a request fails',async({page})=>{
 await page.emulateMedia({reducedMotion:'reduce'});await page.goto('/#contact');
 await page.getByLabel('Your name', {exact:true}).fill('Browser QA');
 await page.getByLabel('Email address', {exact:true}).fill('qa@example.com');
 await page.getByLabel('What do you have in mind?', {exact:true}).fill('An automated browser validation message.');
 const responsePromise=page.waitForResponse(r=>r.url().endsWith('/api/contact'));
 await page.getByRole('button',{name:'Send message'}).click();
 const response=await responsePromise;expect(response.status()).toBe(201);expect((await response.json()).id).toBeTruthy();
 await expect(page.locator('#form-status')).toContainText('Message received');
 await expect(page.getByLabel('Your name', {exact:true})).toHaveValue('');
 await page.route('**/api/contact',route=>route.fulfill({status:429,contentType:'application/json',body:JSON.stringify({error:'Too many attempts. Please try again in 15 minutes.'})}));
 await page.getByLabel('Your name', {exact:true}).fill('Keep My Input');await page.getByLabel('Email address', {exact:true}).fill('keep@example.com');await page.getByLabel('What do you have in mind?', {exact:true}).fill('Please preserve this message during an error.');await page.getByRole('button',{name:'Send message'}).click();
 await expect(page.locator('#form-status')).toContainText('Too many attempts');await expect(page.getByLabel('Your name', {exact:true})).toHaveValue('Keep My Input');await expect(page.getByRole('button',{name:'Send message'})).toBeEnabled();
 await page.unroute('**/api/contact');await page.route('**/api/contact',route=>route.abort());await page.getByRole('button',{name:'Send message'}).click();await expect(page.locator('#form-status')).toContainText('Connection lost');await expect(page.getByLabel('What do you have in mind?', {exact:true})).toHaveValue('Please preserve this message during an error.');
});

test('motion can be paused and reduced motion is respected',async({page})=>{
 await page.goto('/');await page.waitForTimeout(1200);await page.locator('#motion-toggle').click();
 await expect(page.locator('html')).toHaveAttribute('data-motion','off');
 await page.reload();await expect(page.locator('html')).toHaveAttribute('data-motion','off');
 await page.emulateMedia({reducedMotion:'reduce'});await expect(page.locator('#motion-toggle')).toContainText('reduced');
 await expect(page.locator('h1')).toBeVisible();
});

test('mobile navigation and disclosure controls work',async({page})=>{
 await page.setViewportSize({width:390,height:844});await page.emulateMedia({reducedMotion:'reduce'});await page.goto('/');
 await page.getByRole('button',{name:'Menu',exact:true}).click();await expect(page.locator('#navigation')).toBeVisible();
 await page.locator('#navigation a[href="#systems"]').click();await expect(page.locator('.menu-trigger')).toHaveAttribute('aria-expanded','false');await expect(page).toHaveURL(/#systems$/);
 await page.locator('summary').nth(1).click();await expect(page.locator('details').nth(1)).toHaveAttribute('open','');
});

test('essential content remains visible without JavaScript',async({browser})=>{
 const context=await browser.newContext({javaScriptEnabled:false,viewport:{width:390,height:844}});const page=await context.newPage();await page.goto('http://127.0.0.1:3211/');await expect(page.locator('h1')).toBeVisible();await expect(page.locator('#work h2')).toBeVisible();await expect(page.locator('a[href="https://www.linkedin.com/in/alokmishra621"]').first()).toBeVisible();await context.close();
});
