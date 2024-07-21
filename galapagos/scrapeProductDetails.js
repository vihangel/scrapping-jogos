/** @format */

const puppeteer = require("puppeteer");
const fs = require("fs");
const path = require("path");
const axios = require("axios");

async function scrapeProductDetails(product, browser) {
  const page = await browser.newPage();
  await page.goto(product.link, { waitUntil: "networkidle2" });

  await page.waitForTimeout(10000); // Espera de 5 segundos para garantir o carregamento

  const details = await page.evaluate(() => {
    const description =
      document.querySelector(".content-descrition .title")?.innerText.trim() ||
      "No description";
    const imageElements = document.querySelectorAll(".slider-item_image img");
    const images = Array.from(imageElements).map((img) => img.src);
    return { description, images };
  });

  const imagesDir = path.join(__dirname, "images");
  if (!fs.existsSync(imagesDir)) {
    fs.mkdirSync(imagesDir);
  }

  for (const [index, imageUrl] of details.images.entries()) {
    const imageName = `${product.title
      .replace(/[^a-z0-9]/gi, "_")
      .toLowerCase()}-${index + 1}.jpg`;
    const imagePath = path.join(imagesDir, imageName);
    console.log(`Saving image ${imageName} from ${product.title}`);
    const writer = fs.createWriteStream(imagePath);
    const response = await axios({
      url: imageUrl,
      method: "GET",
      responseType: "stream",
    });
    response.data.pipe(writer);
    await new Promise((resolve, reject) => {
      writer.on("finish", resolve);
      writer.on("error", reject);
    });
  }

  await page.close();

  return {
    ...product,
    description: details.description,
    images: details.images,
  };
}

module.exports = scrapeProductDetails;
