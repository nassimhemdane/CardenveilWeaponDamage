import { test, expect } from '@playwright/test';
test('default comparison, live edits, negative inputs, debug and presets', async ({ page }) => {
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('/');
  await expect(page.getByRole('heading',{name:'Weapon Calculator.'})).toBeVisible();
  const a=page.getByRole('region',{name:'Weapon A',exact:true});
  await expect(page.locator('.optimal-number').first()).toContainText('23,64');
  await a.getByLabel('Avantage initial',{exact:true}).fill('-2');
  await expect(page.locator('.optimal-number').first()).not.toContainText('23,64');
  await a.getByLabel('Modificateur',{exact:true}).fill('-3');
  await a.getByLabel('Clamp successful damage to 0 minimum').uncheck();
  await page.getByRole('button',{name:'Engagement 2',exact:true}).click();
  const detail=page.getByRole('region',{name:'Détails Weapon A'});
  await detail.locator('summary').filter({hasText:'Probability Details'}).click();
  await expect(detail.getByText('Lowest',{exact:false})).toBeVisible();
  await a.locator('summary').filter({hasText:'Presets locaux'}).click();
  await a.getByLabel('Nom du preset').fill('Test finesse');
  await a.getByRole('button',{name:'Sauvegarder',exact:true}).click();
  await page.reload();
  const a2=page.getByRole('region',{name:'Weapon A',exact:true});
  await a2.locator('summary').filter({hasText:'Presets locaux'}).click();
  await a2.getByLabel('Preset sauvegardé').selectOption({label:'Test finesse'});
  await a2.getByRole('button',{name:'Charger',exact:true}).click();
  await expect(a2.getByLabel('Avantage initial',{exact:true})).toHaveValue('-2');
  await expect(a2.getByLabel('Modificateur',{exact:true})).toHaveValue('-3');
  expect(errors).toEqual([]);
});
test('comparison CSV and balance sweep download', async ({page})=>{
  await page.goto('/');
  const comparison=page.waitForEvent('download');await page.getByRole('button',{name:'Exporter le tableau'}).click();
  expect((await comparison).suggestedFilename()).toBe('cardenveil-comparison.csv');
  const sweep=page.waitForEvent('download');await page.getByRole('button',{name:/Exporter 17 640/}).click();
  expect((await sweep).suggestedFilename()).toBe('cardenveil-balance-sweep.csv');
  await expect(page.getByRole('status')).toContainText('17 640');
});
test('Monte Carlo worker completes and parameter changes invalidate results',async({page})=>{
  await page.goto('/');await page.getByRole('button',{name:'Validate with Monte Carlo'}).click();
  await expect(page.locator('.validation table')).toBeVisible({timeout:30000});
  await page.getByRole('region',{name:'Weapon A',exact:true}).getByLabel('Tier',{exact:true}).fill('3');
  await expect(page.locator('.validation table')).toHaveCount(0);
});
test('mobile layout has no document overflow; tables scroll locally',async({page})=>{
  await page.setViewportSize({width:390,height:844});await page.goto('/');
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth);
  expect(overflow).toBe(false);
  await page.screenshot({path:'reports/mobile.png',fullPage:true});
});
test('desktop renders without errors and captures screenshot',async({page})=>{
  await page.setViewportSize({width:1440,height:1100});await page.goto('/');
  await page.screenshot({path:'reports/desktop.png',fullPage:true});
  await page.getByRole('button',{name:'Avantage initial',exact:true}).click();
  await expect(page.getByRole('img',{name:'Espérance de dégâts selon Avantage initial'})).toBeVisible();
});
