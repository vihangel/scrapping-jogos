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
      const titleElement = document.querySelector(".jogo-top-main h3 a");
      return titleElement ? titleElement.innerText.trim() : null;
    });

    // Extract age
    const age = await page.evaluate(() => {
      const ageElement = document.querySelector(
        ".jogo-top-main ul.list-inline li:nth-child(1)"
      );
      return ageElement
        ? ageElement.innerText.replace("Idade ", "").trim()
        : null;
    });

    // Extract duration
    const duration = await page.evaluate(() => {
      const durationElement = document.querySelector(
        ".jogo-top-main ul.list-inline li:nth-child(2)"
      );
      return durationElement ? durationElement.innerText.trim() : null;
    });

    // Extract number of players
    const players = await page.evaluate(() => {
      const playersElement = document.querySelector(
        ".jogo-top-main ul.list-inline li:nth-child(3)"
      );
      return playersElement ? playersElement.innerText.trim() : null;
    });

    // Extract description paragraphs
    const paragraphs = await page.evaluate(() => {
      const descriptionElement = document.querySelector(
        "#bloco-descricao-sm p"
      );
      return descriptionElement
        ? descriptionElement.innerText
            .split("\n")
            .map((p) => p.trim())
            .filter((p) => p)
        : [];
    });

    // Extract full description
    const description = paragraphs.join("\n\n") || null;

    // Extract cover image
    const coverImage = await page.evaluate(() => {
      const coverImageElement = document.querySelector("#img-capa");
      return coverImageElement ? coverImageElement.src : null;
    });

    // Extract other images and their links
    const otherImages = await page.evaluate(() => {
      return Array.from(
        document.querySelectorAll("#bloco-imagens-sm .jogo-img")
      ).map((img) => ({
        thumb: img.src,
        link: img.parentElement.href,
      }));
    });

    // Extract components
    const components = await page.evaluate(() => {
      const componentsElement = document.querySelector(
        "#bloco-componentes-sm p"
      );
      return componentsElement ? componentsElement.innerText.trim() : null;
    });

    // Extract manuals
    const manuals = await page.evaluate(() => {
      return Array.from(
        document.querySelectorAll("#bloco-anexos-sm .media-body a")
      ).map((a) => a.href);
    });

    // Extract videos
    const videos = await page.evaluate(() => {
      return Array.from(
        document.querySelectorAll("#bloco-videos-sm .box-yt a")
      ).map((a) => a.href);
    });

    // Extract prices from the market section and calculate the average price
    const prices = await page.evaluate(() => {
      return Array.from(
        document.querySelectorAll("#bloco-anuncios-sm .proximo_lance")
      )
        .map((el) =>
          parseFloat(el.innerText.replace("R$", "").replace(",", "."))
        )
        .filter((price) => !isNaN(price));
    });
    const averagePrice =
      prices.length > 0
        ? `R$ ${(prices.reduce((a, b) => a + b, 0) / prices.length)
            .toFixed(2)
            .replace(".", ",")}`
        : null;

    // Save images
    const imagesDir = path.join(__dirname, "copag");
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

    for (const [index, image] of otherImages.entries()) {
      const imagePage = await browser.newPage();
      await imagePage.goto(image.link, { waitUntil: "networkidle2" });

      const highResImage = await imagePage.evaluate(() => {
        const imgElement = document.querySelector("a.fancyimg img.img-anexo");
        return imgElement ? imgElement.src.replace("_m.jpg", ".jpg") : null;
      });

      await imagePage.close();

      if (highResImage) {
        const imageName = `${title.replace(/[^a-z0-9]/gi, "_").toLowerCase()}_${
          index + 1
        }.jpg`;
        const imagePath = path.join(imagesDir, imageName);
        console.log(`Saving image ${imageName} from ${title}`);
        await saveImage(highResImage, imagePath);
        savedImages.push(imageName);
      }
    }

    await page.close();

    return {
      title: title || "No title",
      price: averagePrice || "No price info",
      image: mainImage || "No image",
      link: url,
      players: players || "No player info",
      age: age || "No age info",
      duration: duration || "No duration info",
      style: null,
      soldOut: false,
      images: savedImages,
      description: description,
      paragraphs: paragraphs,
      components: components || "No components info",
      downloadLinks: manuals || [],
      isVisible: true,
      editors: ["Copag"], // Assuming this is fixed
      quantity: 1, // Assuming a fixed value for quantity
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
  const links = JSON.parse(fs.readFileSync("links.json"));
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
          "detailed_copag_brasil.json",
          JSON.stringify(detailedProducts, null, 2)
        );
      }
    } catch (error) {
      console.error(`Error processing ${link}:`, error);
    }
  }

  console.log("Detailed products data saved to detailed_copag_brasil.json");

  await browser.close();
}

main().catch(console.error);
