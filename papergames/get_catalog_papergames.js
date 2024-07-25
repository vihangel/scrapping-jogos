/** @format */

const puppeteer = require("puppeteer");
const fs = require("fs");

async function scrapeLinks() {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  await page.setViewport({
    width: 1024,
    height: 845,
    deviceScaleFactor: 1,
  });

  const url = "https://papergames.com.br/todos-os-jogos/";
  await page.goto(url, { waitUntil: "networkidle2" });

  // Esperar um tempo adicional para garantir que todos os elementos carreguem
  await page.waitForTimeout(5000);

  // Extrair links
  const links = await page.evaluate(() => {
    return Array.from(document.querySelectorAll(".fusion-gallery-image a")).map(
      (link) => link.href
    );
  });

  await page.close();
  await browser.close();

  return links;
}

async function main() {
  const links = await scrapeLinks();

  fs.writeFileSync("papergames_catalogo.json", JSON.stringify(links, null, 2));
  console.log("Links saved to papergames_catalogo.json");
}

main().catch(console.error);
