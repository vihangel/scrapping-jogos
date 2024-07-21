/** @format */

const puppeteer = require("puppeteer");

async function scrapePage(url, browser) {
  const page = await browser.newPage();

  await page.setViewport({
    width: 1024,
    height: 845,
    deviceScaleFactor: 1,
  });
  await page.goto(url, { waitUntil: "networkidle2" });

  // Wait for the products to load
  await page
    .waitForSelector(".product", { timeout: 20000 })
    .catch(() => console.log("Timeout waiting for selector"));

  // Extract data from the page
  let data = await page.evaluate(() => {
    const items = document.querySelectorAll(".product");
    return Array.from(items).map((item) => ({
      title:
        item.querySelector(".title-product a")?.innerText.trim() || "No title",
      price:
        item
          .querySelector(".area-prices--salePrice .coin ~ span")
          ?.innerText.trim() ||
        item.querySelector(".area-prices .coin ~ span")?.innerText.trim() ||
        "No price",
      image: item.querySelector(".product-cover img")?.src || "No image",
      link: item.querySelector(".title-product a")?.href || "No link",
      players:
        item
          .querySelector(
            ".cc-area__item--tag__text[data-bind*='handleParticipants']"
          )
          ?.innerText.trim() || "No players info",
      age:
        item
          .querySelector(
            ".cc-area__item--tag__text[data-bind*='handleAgeGroup']"
          )
          ?.innerText.trim() || "No age info",
      duration:
        item
          .querySelector(
            ".cc-area__item--tag__text[data-bind*='handleDepartureTime']"
          )
          ?.innerText.trim() || "No duration info",
      style:
        item
          .querySelector(".cc-area__item--tag__text[style='font-size:9px']")
          ?.innerText.trim() || "No style info",
      soldOut: !!item.querySelector(".tag.sold-out"),
    }));
  });

  console.log(`\nScraped ${data.length} items from ${url}`);
  await page.close();
  return data;
}

module.exports = scrapePage;
