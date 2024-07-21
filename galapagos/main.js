/** @format */

const puppeteer = require("puppeteer");
const fs = require("fs");
const scrapePage = require("./scrapePage");
const getTotalPages = require("./getTotalPages");

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

  const mainUrl =
    "https://www.mundogalapagos.com.br/searchresults?=undefined&N=1267987791&Nr=NOT(product.x_productView:agente)&Nrpp=12&searchType=guided&type=search";

  console.log("Getting total number of pages...");
  const totalPages = await getTotalPages(mainUrl, browser);
  console.log(`Total pages: ${totalPages}`);

  console.log("Scraping all pages...");
  const allData = await scrapeAllPages(mainUrl, totalPages, browser);
  fs.writeFileSync("games.json", JSON.stringify(allData, null, 2));
  console.log("Games data saved to games.json, quantity:", allData.length);

  await browser.close();
}

main().catch(console.error);
