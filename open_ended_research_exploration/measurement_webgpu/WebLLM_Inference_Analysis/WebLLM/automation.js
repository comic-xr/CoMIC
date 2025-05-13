import puppeteer from 'puppeteer';
import path from 'path';
import { fileURLToPath } from 'url';
import { setTimeout } from "node:timers/promises";
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const models = [
  "Llama-3.2-1B-Instruct-q4f32_1-MLC",
  "Qwen2.5-0.5B-Instruct-q4f32_1-MLC",
  "phi-2-q4f32_1-MLC",
  "TinyLlama-1.1B-Chat-v1.0-q4f32_1-MLC",
  "gemma-2-2b-it-q4f32_1-MLC"
];

const jsonFiles = [
  'test1/alpaca_001.json',
  'test1/alpaca_002.json',
  'test1/alpaca_003.json',
  'test1/alpaca_004.json',
  'test1/alpaca_005.json'
];

(async () => {
  for (const modelName of models) {
    try {
      console.log(`Starting process for model: ${modelName}`);
      const browser = await puppeteer.launch({ 
        headless: false,
        protocolTimeout: 900000,  // 5 minutes timeout
        args: ['--disable-web-security', '--no-sandbox']
      });
      
      const page = await browser.newPage();
      page.setDefaultTimeout(300000); // 5 minutes
      page.setDefaultNavigationTimeout(60000); // 1 minute
    
      await page.goto('http://127.0.0.1:5500/WebLLM/', { waitUntil: 'networkidle2' });
      console.log('Page loaded');
      await page.waitForSelector('#model-selection', { visible: true });
      await page.waitForSelector('#model-selection option');
      const availableOptions = await page.$$eval('#model-selection option', options => 
        options.map(option => option.value)
      );
      console.log('Available model options:', availableOptions);
      
      if (availableOptions.includes(modelName)) {
        await page.select('#model-selection', modelName);
        console.log(`Model "${modelName}" selected.`);
      } else {
        console.error(`Model "${modelName}" not found in the dropdown.`);
        await browser.close();
        continue;
      }
      
      await page.waitForSelector('#download:not([disabled])');
      await page.click('#download');
      console.log('Waiting for model to finish downloading...');
      
      try {
        await page.waitForFunction(
          () => {
            const statusElement = document.querySelector('#download-status');
            return statusElement && statusElement.textContent.includes('Finish loading on WebGPU');
          },
          { timeout: 1200000 } // 10 minutes timeout
        );
        console.log('Model download completed!');
      } catch (error) {
        console.error('Model download timed out or failed:', error.message);
        await browser.close();
        continue;
      }

      for (const file of jsonFiles) {
        try {
          console.log(`Processing file: ${file}`);
          const filePath = path.resolve(__dirname, file);
          
          if (!fs.existsSync(filePath)) {
            console.error(`File not found: ${filePath}`);
            continue;
          }
          await page.waitForSelector('#data-file-input', { visible: true });
          const fileInput = await page.$('#data-file-input');
          
          await fileInput.uploadFile(filePath);
          console.log(`File uploaded: ${file}`);

          await setTimeout(10000);
          await page.waitForSelector('#start-processing:not([disabled])', { timeout: 60000 });
          await page.click('#start-processing');
          console.log('Start processing clicked');
         
          console.log('Waiting for input processing...');
          await page.waitForFunction(
            () => {
              const button = document.querySelector('#download-output');
              return button && !button.disabled;
            }, 
            { timeout: 1200000 } // 15 minutes timeout
          );
          
          await page.click('#download-output');
          console.log('Download output clicked');
        
          await setTimeout(10000);
          console.log(`Download completed for ${file} and model ${modelName}.`);
        } catch (fileError) {
          console.error(`Error processing file ${file}:`, fileError.message);
        }
      }
      
      console.log(`All files processed for model: ${modelName}`);
      await browser.close();
    } catch (modelError) {
      console.error(`Error processing model ${modelName}:`, modelError.message);
      try {
        if (browser) await browser.close();
      } catch (e) { /* ignore */ }
    }
  }
  
  console.log('All models and files have been processed!');
})().catch(err => {
  console.error('Fatal error in main process:', err);
  process.exit(1);
});