/** @format */

const puppeteer = require("puppeteer");
const fs = require("fs");
const path = require("path");
const axios = require("axios");

async function scrapeProductDetails(url, browser) {
  const page = await browser.newPage();

  await page.setViewport({
    width: 1024,
    height: 845,
    deviceScaleFactor: 1,
  });

  try {
    await page.goto(url, { waitUntil: "networkidle2" });

    // Extract title
    const title = await page.evaluate(() => {
      const titleElement = document.querySelector(
        ".fusion-column-content .fusion-title-heading strong"
      );
      return titleElement ? titleElement.innerText.trim() : null;
    });

    // Extract description
    const description = await page.evaluate(() => {
      const descriptionElement = document.querySelector(
        ".reading-box-additional"
      );
      return descriptionElement ? descriptionElement.innerText.trim() : null;
    });

    // Extract rules link
    const rulesLink = await page.evaluate(() => {
      const rulesLinkElement = document.querySelector(
        ".fusion-text-3 a[href*='regras']"
      );
      return rulesLinkElement ? rulesLinkElement.href : null;
    });

    // Extract components
    const components = await page.evaluate(() => {
      const componentsElement = document.querySelector(
        ".fusion-title-5 + .fusion-text"
      );
      return componentsElement ? componentsElement.innerText.trim() : null;
    });

    // Extract tutorial video link
    const tutorialLink = await page.evaluate(() => {
      const tutorialLinkElement = document.querySelector(
        "a[href*='ludopedia']"
      );
      return tutorialLinkElement ? tutorialLinkElement.href : null;
    });

    // Extract cover image
    const coverImage = await page.evaluate(() => {
      const coverImageElement = document.querySelector(
        ".fusion-imageframe img"
      );
      return coverImageElement ? coverImageElement.src : null;
    });

    // Extract other images
    const otherImages = await page.evaluate(() => {
      return Array.from(document.querySelectorAll(".swiper-wrapper img")).map(
        (img) => img.src
      );
    });

    // Extract technical sheet
    const technicalSheet = await page.evaluate(() => {
      const technicalSheetElement = document.querySelector(".fusion-text-3 p");
      return technicalSheetElement
        ? technicalSheetElement.innerText.trim()
        : null;
    });

    // Extract price
    const priceNumber = await page.evaluate(() => {
      const priceElement = document.querySelector(".fusion-text-3 p strong");
      return priceElement
        ? priceElement.innerText.trim().replace("R$", "").replace(",", ".")
        : null;
    });

    const updatedPrice = priceNumber
      ? `R$ ${(parseFloat(priceNumber) + 10).toFixed(2).replace(".", ",")}`
      : "No price";

    // Save images
    const imagesDir = path.join(__dirname, "papergames");
    if (!fs.existsSync(imagesDir)) {
      fs.mkdirSync(imagesDir);
    }

    const savedImages = [];
    let mainImage = null;

    if (coverImage) {
      const coverImageName = `${title
        .replace(/[^a-z0-9]/gi, "_")
        .toLowerCase()}_cover.jpg`;
      const coverImagePath = path.join(imagesDir, coverImageName);
      console.log(`Saving cover image ${coverImageName} from ${title}`);
      await saveImage(coverImage, coverImagePath);
      savedImages.push(coverImageName);
      mainImage = coverImageName;
    }

    for (const [index, imageUrl] of otherImages.entries()) {
      const imageName = `${title.replace(/[^a-z0-9]/gi, "_").toLowerCase()}_${
        index + 1
      }.jpg`;
      const imagePath = path.join(imagesDir, imageName);
      console.log(`Saving image ${imageName} from ${title}`);
      await saveImage(imageUrl, imagePath);
      savedImages.push(imageName);
    }

    await page.close();

    return {
      title: title || "No title",
      price: updatedPrice,
      image: mainImage || "No image",
      link: url,
      players: null,
      age: null,
      duration: null,
      style: "No style info",
      soldOut: false,
      description: description || null,
      components: components || null,
      tutorialLink: tutorialLink || null,
      rulesLink: rulesLink || null,
      otherImages: savedImages,
      technicalSheet: technicalSheet || null,
    };
  } catch (error) {
    console.error(`Error scraping ${url}:`, error);
    await page.close();
    return null;
  }
}

async function saveImage(url, path) {
  const writer = fs.createWriteStream(path);
  const response = await axios({
    url,
    method: "GET",
    responseType: "stream",
  });
  response.data.pipe(writer);
  return new Promise((resolve, reject) => {
    writer.on("finish", resolve);
    writer.on("error", reject);
  });
}

async function main() {
  const links = JSON.parse(fs.readFileSync("papergames_catalogo.json"));
  console.log(`Total de itens a serem lidos: ${links.length}`);

  const browser = await puppeteer.launch({ headless: true });
  const detailedProducts = [];

  for (let i = 0; i < links.length; i++) {
    const link = links[i];
    console.log(`Processing product ${i + 1} of ${links.length}: ${link}`);
    try {
      const detailedProduct = await scrapeProductDetails(link, browser);
      if (detailedProduct) {
        detailedProducts.push(detailedProduct);
        console.log(detailedProduct); // Log the detailed product to ensure it's correct
        // Save the JSON after each iteration to avoid data loss
        fs.writeFileSync(
          "detailed_papergames.json",
          JSON.stringify(detailedProducts, null, 2)
        );
      }
    } catch (error) {
      console.error(`Error processing ${link}:`, error);
    }
  }

  console.log("Detailed products data saved to detailed_papergames.json");

  await browser.close();
}

main().catch(console.error);
