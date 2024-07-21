const scrapePage = require('./scrapePage.js');

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

module.exports = scrapeAllPages;
