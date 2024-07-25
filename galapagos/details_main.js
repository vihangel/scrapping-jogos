/** @format */

const puppeteer = require("puppeteer");
const fs = require("fs");
const path = require("path");
const axios = require("axios");

async function scrapeProductDetails(product, browser) {
  const page = await browser.newPage();

  await page.setViewport({
    width: 1024,
    height: 845,
    deviceScaleFactor: 1,
  });
  await page.goto(product.link, { waitUntil: "networkidle2" });

  await page
    .waitForSelector(".slider-item_image img", { timeout: 20000 })
    .catch(() => console.log("Timeout waiting for images to load"));

  // Extract images
  const images = await page.evaluate(() => {
    return Array.from(document.querySelectorAll(".slider-item_image img")).map(
      (img) => img.src
    );
  });

  // Extract description
  const description = await page.evaluate(() => {
    const descriptionElement = document.querySelector(
      ".content-descrition .line ~ div"
    );
    return descriptionElement
      ? descriptionElement.innerText.trim()
      : "No description";
  });

  // Extract components
  const components = await page.evaluate(() => {
    const componentsElement = document.querySelector(
      ".content-descrition .title"
    );
    return componentsElement
      ? componentsElement.innerText.trim()
      : "No components info";
  });

  // Extract paragraphs
  const paragraphs = await page.evaluate(() => {
    return Array.from(document.querySelectorAll(".content-descrition p")).map(
      (p) => p.innerText.trim()
    );
  });

  // Extract download links
  const downloadLinks = await page.evaluate(() => {
    return Array.from(document.querySelectorAll(".detail-section a")).map(
      (link) => link.href || ""
    );
  });

  // Save images
  const imagesDir = path.join(__dirname, "images");
  if (!fs.existsSync(imagesDir)) {
    fs.mkdirSync(imagesDir);
  }

  const savedImages = [];

  for (const [index, imageUrl] of images.entries()) {
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
    savedImages.push(imageName);
  }

  const mainImage = savedImages[0]; // Assuming the first image is the main image

  // Add R$10 to the product price
  const priceNumber =
    parseFloat(product.price.replace("R$", "").replace(",", ".")) + 10;
  const updatedPrice = `R$ ${priceNumber.toFixed(2).replace(".", ",")}`;

  await page.close();

  return {
    ...product,
    price: updatedPrice,
    image: mainImage,
    images: savedImages,
    description,
    components,
    paragraphs,
    downloadLinks,
    isVisible: true,
    editors: ["Galapagos"],
    quantity: 2,
  };
}

async function main() {
  const browser = await puppeteer.launch({ headless: true });
  const products = JSON.parse(fs.readFileSync("games.json"));
  const detailedProducts = [];

  if (products.length > 0) {
    const product = products[0];
    console.log(`Processing product 1 of ${products.length}: ${product.title}`);
    const detailedProduct = await scrapeProductDetails(product, browser);
    detailedProducts.push(detailedProduct);
  }

  fs.writeFileSync(
    "detailed_products.json",
    JSON.stringify(detailedProducts, null, 2)
  );
  console.log("Detailed products data saved to detailed_products.json");

  await browser.close();
}

main().catch(console.error);
