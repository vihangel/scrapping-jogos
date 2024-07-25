/** @format */

const puppeteer = require("puppeteer");
const fs = require("fs");
const path = require("path");

async function scrapeLinks(url, browser) {
  const page = await browser.newPage();
  await page.goto(url, { waitUntil: "networkidle2" });

  await page.waitForSelector(".media-body h3.mar-no");
  const totalItemsText = await page.evaluate(() => {
    return document.querySelector(".media-body h3.mar-no").innerText;
  });
  const totalItems = parseInt(totalItemsText.match(/\d+/)[0]);
  console.log(`Total de itens a serem lidos: ${totalItems}`);

  let currentPage = 1;
  let totalLinks = [];
  let hasNextPage = true;

  while (hasNextPage) {
    console.log(`Scraping page ${currentPage}`);
    const links = await page.evaluate(() => {
      return Array.from(
        document.querySelectorAll('.media-heading a[href*="/jogo/"]')
      ).map((a) => a.href);
    });

    totalLinks = totalLinks.concat(links);
    console.log(`Page ${currentPage} - Links obtidos: ${links.length}`);

    hasNextPage = await page.evaluate(() => {
      const nextButton = document.querySelector(".pagination li:last-child a");
      return (
        nextButton && !nextButton.parentElement.classList.contains("disabled")
      );
    });

    if (hasNextPage) {
      currentPage++;
      const nextPageUrl = `${url}?pagina=${currentPage}`;
      await page.goto(nextPageUrl, { waitUntil: "networkidle2" });
    }
  }

  console.log(`Total de links coletados: ${totalLinks.length}`);
  if (totalLinks.length !== totalItems) {
    console.warn(
      "O número de links coletados não corresponde ao número total de itens listados."
    );
  }

  await page.close();
  return totalLinks;
}

async function main() {
  const url = "https://ludopedia.com.br/editora/3525/Devir%20Brasil";
  const browser = await puppeteer.launch({ headless: true });

  const links = await scrapeLinks(url, browser);

  const filePath = path.join(__dirname, "links_devir_brasil.json");
  fs.writeFileSync(filePath, JSON.stringify(links, null, 2));
  console.log(`Links salvos em ${filePath}`);

  await browser.close();
}

main().catch(console.error);
