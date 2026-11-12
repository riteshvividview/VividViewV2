import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

const browser=await chromium.launch({args:['--use-angle=d3d11']});
const page=await browser.newPage({viewport:{width:1440,height:1000},reducedMotion:'reduce',hasTouch:true});
const errors=[];
page.on('pageerror',e=>errors.push(e.message));
page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
await fs.mkdir('artifacts/agency',{recursive:true});
try{
  await page.goto('http://localhost:3001',{waitUntil:'networkidle'});
  assert.equal(await page.locator('main>section').count(),5);
  assert.equal(await page.locator('.wordmark img').count(),2);
  assert.equal(await page.locator('.brand-artwork').count(),10);
  assert.equal(await page.locator('.service-toggle').count(),7);
  for(const img of await page.locator('img').evaluateAll(elements=>elements.map(e=>e.getAttribute('src')))){
    const response=await page.request.get('http://localhost:3001'+img);
    assert.equal(response.status(),200,img);
  }
  for(let i=0;i<7;i++){
    const toggle=page.locator('.service-toggle').nth(i);
    if(await toggle.getAttribute('aria-expanded')==='true')await toggle.click();
    await toggle.focus();await page.keyboard.press('Enter');
    assert.equal(await toggle.getAttribute('aria-expanded'),'true');
    assert.equal(await page.locator(`#service-panel-${i}`).isVisible(),true);
    assert.equal(await page.locator('.service-panel:visible').count(),1);
    await page.keyboard.press('Space');
    assert.equal(await page.locator(`#service-panel-${i}`).isVisible(),false);
  }
  await page.locator('.brand-gallery').scrollIntoViewIfNeeded();
  for(const image of await page.locator('.brand-artwork img').all()){
    await image.scrollIntoViewIfNeeded();
    await image.evaluate(img=>img.decode());
    assert.ok(await image.evaluate(img=>Math.abs(img.clientWidth/img.clientHeight-img.naturalWidth/img.naturalHeight)<.025));
  }
  await page.locator('.brand-artwork').first().scrollIntoViewIfNeeded();
  await page.screenshot({path:'artifacts/agency/gallery-desktop.png'});
  const firstStory=await page.locator('.project-story-copy').textContent();
  await page.getByRole('button',{name:'Next story',exact:true}).click();
  assert.notEqual(await page.locator('.project-story-copy').textContent(),firstStory);
  assert.equal(await page.locator('.story-source').getAttribute('href'),'https://thevividview.in/branding/thvani');
  await page.locator('.header-cta').click();
  await page.getByLabel('Your name').fill('Preview Test');
  await page.getByLabel('Email address').fill('preview@example.com');
  await page.getByLabel('Tell us the big idea').fill('Testing the project brief.');
  const download=page.waitForEvent('download');
  await page.getByRole('button',{name:'Create my project brief'}).click();
  assert.equal((await download).suggestedFilename(),'vivid-view-project-brief.txt');
  assert.ok((await page.getByRole('link',{name:'Email my brief'}).getAttribute('href')).startsWith('mailto:contact@thevividview.in?'));
  await page.keyboard.press('Escape');assert.equal(await page.locator('dialog').isVisible(),false);
  await page.setViewportSize({width:390,height:844});
  await page.locator('.brand-gallery').scrollIntoViewIfNeeded();
  await page.screenshot({path:'artifacts/agency/gallery-mobile.png'});
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await page.getByRole('button',{name:'Open navigation',exact:true}).click();
  await page.locator('#main-navigation a[href="#services"]').click();
  assert.equal(await page.locator('.menu-toggle').getAttribute('aria-expanded'),'false');
  await page.locator('.service-toggle').nth(5).click();
  assert.equal(await page.locator('#service-panel-5').isVisible(),true);
  await page.setViewportSize({width:1280,height:900});
  await page.emulateMedia({reducedMotion:'no-preference'});
  await page.waitForFunction(()=>Number(document.querySelector('.journey-canvas')?.dataset.fluidTriangles)>0);
  await page.evaluate(()=>window.scrollTo(0,0));await page.waitForTimeout(1200);
  await page.screenshot({path:'artifacts/agency/hero.png'});
  await page.evaluate(()=>window.scrollTo(0,document.querySelector('.brand-gallery').getBoundingClientRect().top+scrollY-innerHeight*.85));
  await page.waitForTimeout(1000);
  const beforeScroll=await page.locator('.brand-artwork').first().evaluate(e=>e.getBoundingClientRect().left);
  await page.evaluate(()=>window.scrollBy(0,innerHeight*.65));
  await page.waitForTimeout(1200);
  assert.ok(Math.abs(await page.locator('.brand-artwork').first().evaluate(e=>e.getBoundingClientRect().left)-beforeScroll)<1);
  await page.screenshot({path:'artifacts/agency/gallery-motion.png'});
  for(let i=0;i<7;i++){
    const toggle=page.locator('.service-toggle').nth(i);
    if(await toggle.getAttribute('aria-expanded')==='true')await toggle.click();
    await toggle.click();await page.locator(`#service-panel-${i}`).waitFor({state:"visible"});
    await toggle.click();await page.locator(`#service-panel-${i}`).waitFor({state:"hidden"});
  }
  await page.waitForTimeout(600);
  await page.evaluate(()=>window.scrollTo(0,document.querySelector('#people').getBoundingClientRect().top+scrollY+innerHeight*.8));
  await page.waitForFunction(()=>Number(document.querySelector('.journey-canvas')?.dataset.head)>.95);
  await page.waitForTimeout(700);
  assert.ok(Number(await page.locator('.journey-canvas').getAttribute('data-sculpture-dissolve'))<.01);
  await page.screenshot({path:'artifacts/agency/team.png'});
  await page.evaluate(()=>{const el=document.querySelector('#people');window.scrollTo(0,el.getBoundingClientRect().bottom+scrollY-innerHeight*.7)});
  await page.waitForFunction(()=>{const value=Number(document.querySelector('.journey-canvas')?.dataset.sculptureDissolve);return value>.25&&value<.8});
  await page.screenshot({path:'artifacts/agency/sculpture-dissolve.png'});
  await page.evaluate(()=>window.scrollTo(0,document.querySelector('#perspectives').getBoundingClientRect().top+scrollY+innerHeight*.4));
  await page.waitForFunction(()=>document.querySelector('.journey-canvas')?.dataset.sculptureVisible==='false');
  await page.screenshot({path:'artifacts/agency/stories.png'});
  await page.evaluate(()=>window.scrollTo(0,document.querySelector('#people').getBoundingClientRect().top+scrollY+innerHeight*.8));
  await page.waitForFunction(()=>Number(document.querySelector('.journey-canvas')?.dataset.sculptureDissolve)<.01);
  assert.equal(await page.locator('.journey-canvas').getAttribute('data-sculpture-visible'),'true');
  assert.deepEqual(errors,[]);
  await fs.writeFile('artifacts/agency/verification.json',JSON.stringify({status:'passed',errors,checks:['real assets','seven keyboard accordions','ten uncropped project images and stable horizontal position','mobile navigation','brief download and email handoff','stories','shader exit and reverse','desktop and mobile layout']},null,2));
  console.log('PASS: agency content, gallery, accordions, contact, responsive layout and reversible sculpture dissolve');
}finally{await browser.close()}
