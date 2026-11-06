import { defineConfig, devices } from '@playwright/test';
export default defineConfig({
  testDir:'./tests/browser',fullyParallel:false,workers:1,timeout:30000,
  reporter:[['list'],['json',{outputFile:'qa/browser-results.json'}]],
  use:{baseURL:'http://127.0.0.1:3211',trace:'retain-on-failure'},
  webServer:{command:'PORT=3211 DATA_DIR=/tmp/alok-portfolio-browser-inbox node server.js',url:'http://127.0.0.1:3211/api/health',reuseExistingServer:false},
  projects:[
    {name:'chromium-desktop',use:{...devices['Desktop Chrome'],viewport:{width:1440,height:1000}}},
    {name:'firefox-desktop',use:{...devices['Desktop Firefox'],viewport:{width:1280,height:900}}},
    {name:'webkit-mobile',use:{...devices['iPhone 13']}},
  ]
});
