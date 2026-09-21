/* eslint-disable @typescript-eslint/no-require-imports -- Optional Playwright browser regression harness. */
const assert = require('node:assert/strict');
const { chromium } = require(process.env.DRN_PLAYWRIGHT_PATH || 'playwright');

// Run against the local production build. Every Supabase request is intercepted;
// no production identity, farm, or record is used by this test.
(async () => {
  const browser = await chromium.launch({ headless: true, channel: 'msedge' });
  try {
    const context = await browser.newContext();
    const user = { id: '11111111-1111-4111-8111-111111111111', aud: 'authenticated', role: 'authenticated', email: 'qa@example.test' };
    const exp = Math.floor(Date.now() / 1000) + 3600;
    const token = Buffer.from(JSON.stringify({ alg: 'HS256' })).toString('base64url') + '.' + Buffer.from(JSON.stringify({ sub: user.id, exp, role: 'authenticated' })).toString('base64url') + '.test';
    await context.addCookies([{ name: 'sb-ttlyvtuswruubhjuntsu-auth-token', value: 'base64-' + Buffer.from(JSON.stringify({ access_token: token, refresh_token: 'test', expires_at: exp, token_type: 'bearer', user })).toString('base64url'), domain: 'localhost', path: '/' }]);
    const page = await context.newPage(), errors = [];
    page.on('pageerror', error => errors.push(error.message));
    const cells = [0,1,2,3,12,13,14,15,24,25,26,27,36,37,38,39];
    let layouts = ['aaaaaa00-0000-4000-8000-000000000001','bbbbbb00-0000-4000-8000-000000000002'].map(id => ({ id, name: 'New physical plot', revision: 1, document: { unit: 'ft', cells, layers: [] } }));
    let crops = [{ id: 'old-crop', name: 'Lettuce spring', crop: 'Lettuce', season: 2026, soil_type: '', notes: '', planted_on: null, planned_harvest_on: null }];
    const harvests = [], revisions = [];
    let failLayout = false, loseCropResponse = true;
    const farms = ['q','other'].map(id => ({ id, slug: id === 'q' ? 'qs-stall' : 'unknown', name: id === 'q' ? 'Q Farm' : 'Other Farm', test_tier: 'T1', inventory_items: [], selling_locations: [], volunteer_opportunities: [], payment_methods: [] }));
    await page.route('https://*.supabase.co/**', async route => {
      const req = route.request(), url = new URL(req.url()), path = url.pathname;
      let data = [], status = 200;
      if(path.endsWith('/user')) data=user;
      else if(path.endsWith('/profiles')) data={role:'owner'};
      else if(path.endsWith('/farms')) data=farms;
      else if(path.endsWith('/drn_can_grow')) data=req.postDataJSON().target_farm==='q';
      else if(path.endsWith('/grow_layouts')) data=layouts;
      else if(path.endsWith('/grow_layout_revisions')) data=revisions;
      else if(path.endsWith('/drn_archive_grow_layout')) {
        const p=req.postDataJSON();const row=layouts.find(item=>item.id===p.target_layout);
        if(row.revision!==p.expected_revision) {status=409;data={code:'40001'};}
        else {data=row.revision+1;Object.assign(row,{revision:data,archived_at:p.archive_plot?new Date().toISOString():null});}
      } else if(path.endsWith('/drn_save_grow_layout')) {
        if(failLayout) { status=409; data={code:'40001',message:'conflict'}; }
        else {
          const p=req.postDataJSON(); data=p.expected_revision+1;
          const row={id:p.layout_id,name:p.layout_name,revision:data,document:p.layout_document,saved_at:new Date().toISOString()};
          layouts=[...layouts.filter(item=>item.id!==row.id),row]; revisions.push(row);
        }
      } else if(path.endsWith('/grow_plots')) {
        if(req.method()==='POST') {
          const row=req.postDataJSON();
          if(crops.some(item=>item.id===row.id)) { status=409; data={code:'23505',message:'duplicate'}; }
          else { crops.push(row); data=row; if(loseCropResponse) { loseCropResponse=false; status=500; data={message:'Simulated lost response'}; } }
        } else if(req.method()==='PATCH') {
          const id=url.searchParams.get('id').slice(3); crops=crops.map(item=>item.id===id?{...item,...req.postDataJSON()}:item); data=crops.find(item=>item.id===id);
        } else if(url.searchParams.has('id')) data=crops.find(item=>item.id===url.searchParams.get('id').slice(3));
        else data=crops;
      } else if(path.endsWith('/grow_harvests')) {
        if(req.method()==='POST') { data={...req.postDataJSON(),id:'harvest-one'};harvests.push(data); }
        else data=harvests;
      }
      await route.fulfill({status,contentType:'application/json',body:JSON.stringify(data)});
    });
    async function openGrow() {
      await page.getByRole('button',{name:'Farmers Sell',exact:true}).click();
      await page.getByRole('button',{name:'Farmers Grow · Beta',exact:true}).click();
    }
    await page.goto('http://localhost:3100'); await openGrow();
    const planner=page.getByRole('region',{name:'Plot planner'});
    const picker=planner.getByLabel('Current plot',{exact:true});
    await planner.getByText('Your saved plot is ready.',{exact:true}).waitFor();
    await picker.waitFor(); assert.equal(await picker.locator('option').count(),2,'no phantom new-plot choice');
    const names=await picker.locator('option').allTextContents();assert.equal(new Set(names).size,2,'legacy duplicate names distinguishable');
    await planner.getByRole('button',{name:'+ Create another plot',exact:true}).click();
    assert.equal(await planner.getByRole('button',{name:'Save this plot',exact:true}).isDisabled(),true);
    await planner.getByLabel('Plot name',{exact:true}).fill('Carrot bed');
    assert.match(await picker.locator('option:checked').textContent(),/Carrot bed.*not saved/);
    await planner.getByLabel('Plot width (ft)',{exact:true}).fill('500');
    await planner.getByLabel('Plot length (ft)',{exact:true}).fill('200');
    await planner.getByRole('button',{name:'Record plot dimensions',exact:true}).click();
    await planner.getByRole('button',{name:'Continue to crops',exact:true}).click();
    await planner.getByRole('button',{name:'+ Add a crop',exact:true}).click();
    await planner.getByLabel('Crop type',{exact:true}).fill('Carrots');
    page.once('dialog',dialog=>dialog.dismiss());
    await page.getByRole('button',{name:'More',exact:true}).click();
    await page.getByRole('button',{name:'Admin',exact:true}).click();
    assert.equal(await planner.getByLabel('Crop type',{exact:true}).inputValue(),'Carrots');
    await planner.getByLabel('Planting date',{exact:true}).fill('2026-09-17');
    await planner.getByLabel('Expected harvest date',{exact:true}).fill('2026-11-01');
    await planner.getByRole('button',{name:'Save crop & add to plot',exact:true}).click();
    await planner.getByText('Could not save crop details.',{exact:false}).waitFor();
    await planner.getByRole('button',{name:'Save crop & add to plot',exact:true}).click();
    await planner.getByText('Carrots added to Carrot bed.',{exact:false}).waitFor();
    assert.equal(crops.filter(crop=>crop.crop==='Carrots').length,1,'retry does not duplicate crop');
    await planner.getByRole('region',{name:'Selected crop'}).waitFor();
    await planner.getByRole('button',{name:'Save this plot',exact:true}).click();
    await planner.getByText('Carrot bed saved with 1 crop.',{exact:true}).waitFor();
    assert.equal(await picker.locator('option').count(),3);
    const carrotId=crops.find(crop=>crop.crop==='Carrots').id;
    assert.equal(layouts.find(row=>row.name==='Carrot bed').document.layers[0].plotId,carrotId);
    await planner.getByRole('button',{name:'Use a saved crop',exact:true}).click();
    await planner.getByLabel('Saved crop',{exact:true}).selectOption('old-crop');
    await planner.getByRole('button',{name:'Add to this plot',exact:true}).click();
    await planner.locator('.planner-layer').filter({hasText:'Carrots'}).click();
    await planner.getByRole('button',{name:'Edit crop details',exact:true}).click();
    await planner.getByLabel('Expected harvest date',{exact:true}).fill('2026-11-02');
    await planner.getByRole('button',{name:'Save crop details',exact:true}).click();
    await planner.getByText('Carrots details saved.',{exact:true}).waitFor();
    failLayout=true;
    await planner.getByRole('button',{name:'Save plot changes',exact:true}).click();
    await planner.getByText('Someone saved a newer version.',{exact:false}).waitFor();
    failLayout=false;
    await planner.getByRole('button',{name:'Save plot changes',exact:true}).click();
    await planner.getByText('Carrot bed saved with 2 crops.',{exact:true}).waitFor();
    const saved=layouts.find(row=>row.name==='Carrot bed');
    assert.equal(saved.document.layers[0].plotId,carrotId,'automatic placement keeps layer numbering');
    assert.deepEqual(saved.document.plot_size,{width_ft:500,length_ft:200},'physical dimensions are saved as metadata');
    await planner.getByRole('button',{name:'Record harvest for this crop',exact:true}).click();
    const harvest=page.getByRole('region',{name:'Harvest records'});
    assert.equal(await harvest.getByLabel('Harvested crop',{exact:true}).inputValue(),carrotId);
    await harvest.getByLabel('Harvest date',{exact:true}).fill('2026-11-03');
    await harvest.getByLabel('Quantity',{exact:true}).fill('2');
    await harvest.getByRole('button',{name:'Save harvest',exact:true}).click();
    await harvest.getByText('Harvest saved privately.',{exact:false}).waitFor();
    assert.equal(harvests[0].plot_id,carrotId);
    await page.reload();await openGrow();
    await planner.getByText('Your saved plot is ready.',{exact:true}).waitFor();
    await picker.selectOption(saved.id);
    assert.match(await picker.locator('option:checked').textContent(),/^Carrot bed$/);
    assert.equal(await planner.locator('.planner-layer').count(),2);
    await planner.getByText('Manage plots · delete or restore',{exact:true}).click();
    page.once('dialog',dialog=>dialog.dismiss());
    await planner.getByRole('button',{name:'Delete this plot',exact:true}).click();
    assert.equal(await picker.locator('option').count(),3,'cancel keeps plot');
    page.once('dialog',dialog=>dialog.accept());
    await planner.getByRole('button',{name:'Delete this plot',exact:true}).click();
    await planner.getByText('Carrot bed deleted from active plots.',{exact:false}).waitFor();
    assert.equal(await picker.locator('option').count(),2,'delete removes from dropdown');
    assert.equal(harvests.length,1,'delete preserves harvest');
    assert.ok(crops.some(crop=>crop.id===carrotId),'delete preserves crop');
    page.once('dialog',dialog=>dialog.accept());
    await planner.getByRole('button',{name:'Restore Carrot bed',exact:true}).click();
    await planner.getByText('Carrot bed restored and selected.',{exact:true}).waitFor();
    assert.equal(await picker.locator('option').count(),3,'restore returns to dropdown');
    assert.equal(await planner.locator('.planner-layer').count(),2,'restore keeps geometry');
    for(const width of [320,390,768,1024,1440]) {
      await page.setViewportSize({width,height:900});
      await planner.locator('.planner-layers').scrollIntoViewIfNeeded();
      await page.waitForTimeout(120);
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'page overflow at '+width);
      const cropButton=await planner.locator('.planner-layer').first().boundingBox();assert.ok(cropButton.height>=48);
      if([390,768,1440].includes(width)) await page.screenshot({path:`tmp/grow-flow-${width}.png`});
    }
    await page.getByLabel('Editable T1 farm').selectOption('other');
    await page.getByText('Grow records are private to this farm’s members.',{exact:false}).waitFor();
    assert.deepEqual(errors,[]);
    console.log('PASS: duplicate plot names, required physical dimensions, crop retry/automatic placement, stable numbering, edit dates, conflict recovery, linked harvest, reload, delete/cancel/restore, denied farm, and five viewport sizes.');
  } finally { await browser.close(); }
})().catch(error=>{console.error(error);process.exitCode=1;});
