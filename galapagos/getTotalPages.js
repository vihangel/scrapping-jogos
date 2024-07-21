/** @format */

const puppeteer = require("puppeteer");

async function getTotalPages(url, browser) {
  const page = await browser.newPage();
  await page.setViewport({
    width: 1024,
    height: 845,
    deviceScaleFactor: 1,
  });
  await page.goto(url, { waitUntil: "networkidle2" });
  await page.setViewport({
    width: 1024,
    height: 845,
    deviceScaleFactor: 1,
  });
  // Extract total number of pages
  const totalPages = await page.evaluate(() => {
    const lastPageElement = document.querySelector(
      ".btn-last-pagination.pageNumber span"
    );
    return lastPageElement ? parseInt(lastPageElement.innerText, 10) : 1;
  });

  await page.close();
  return totalPages;
}

module.exports = getTotalPages;
