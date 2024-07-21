const puppeteer = require('puppeteer');
const fs = require('fs');

async function scrapePage(url, browser) {
  const page = await browser.newPage();
  await page.goto(url, { waitUntil: 'networkidle2' });

  // Wait for the products to load
  await page.waitForSelector('.product-card.mobile', { timeout: 10000 }).catch(() => console.log('Timeout waiting for selector'));

  // Extract data from the page
  const data = await page.evaluate(() => {
    const items = document.querySelectorAll('.product-card.mobile');
    return Array.from(items).map(item => ({
      title: item.querySelector('.product-card__title')?.innerText.trim() || 'No title',
      price: item.querySelector('.product-card__sale-price')?.innerText.trim() || 'No price',
      image: item.querySelector('.product-card__image img')?.src || 'No image',
      link: item.querySelector('.product-card__details-title a')?.href || 'No link',
      players: item.querySelector('.product-card__indicator-text[data-bind*="handleParticipants"]')?.innerText.trim() || 'No players info',
      age: item.querySelector('.product-card__indicator-text[data-bind*="handleAgeGroup"]')?.innerText.trim() || 'No age info',
      duration: item.querySelector('.product-card__indicator-text[data-bind*="handleDepartureTime"]')?.innerText.trim() || 'No duration info',
      style: item.querySelector('.product-card__indicator-text[style="font-size:9px"]')?.innerText.trim() || 'No style info'
    }));
  });

  console.log(`Scraped ${data.length} items from ${url}`);
  await page.close();
  return data;
}

async function getTotalPages(url, browser) {
  const page = await browser.newPage();
  await page.goto(url, { waitUntil: 'networkidle2' });

  // Extract total number of pages
  const totalPages = await page.evaluate(() => {
    const totalResultsText = document.querySelector('.sr-only')?.innerText.trim() || '';
    const totalResultsMatch = totalResultsText.match(/Exibindo \d+ de (\d+) resultados/);
    return totalResultsMatch ? Math.ceil(parseInt(totalResultsMatch[1], 10) / 12) : 1;
  });

  await page.close();
  return totalPages;
}

async function scrapeAllPages(mainUrl, totalPages, browser) {
  let allData = [];
  for (let i = 1; i <= totalPages; i++) {
    const url = `${mainUrl}&page=${i}`;
    console.log(`Scraping page ${i} of ${totalPages}: ${url}`);
    const data = await scrapePage(url, browser);
    allData = allData.concat(data);
  }
  return allData;
}

async function main() {
  const browser = await puppeteer.launch({ headless: true });
  const mainUrl = 'https://www.mundogalapagos.com.br/searchresults?=undefined&N=1267987791&Nr=NOT(product.x_productView:agente)&Nrpp=12&searchType=guided&type=search';

  console.log('Getting total number of pages...');
  const totalPages = await getTotalPages(mainUrl, browser);
  console.log(`Total pages: ${totalPages}`);

  console.log('Scraping all pages...');
  const allData = await scrapeAllPages(mainUrl, totalPages, browser);
  fs.writeFileSync('games.json', JSON.stringify(allData, null, 2));
  console.log('Games data saved to games.json');

  await browser.close();
}

main().catch(console.error);
