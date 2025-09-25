import { chromium } from "playwright";
import TelegramBot from "node-telegram-bot-api";

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN!;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID!;

const SITE_URL = "https://www.golfclubs4cash.co.uk";
const URL_TO_CHECK =
  "https://www.golfclubs4cash.co.uk/collections/fairway-wood?filters=Dexterity,Left-Handed,Club+Number,7-Wood,Club+Number,9-Wood";

async function main() {
  const bot = new TelegramBot(TELEGRAM_BOT_TOKEN, { polling: false });

  const browser = await chromium.launch();
  const page = await browser.newPage();

  try {
    console.log(`Navigating to ${URL_TO_CHECK}...`);
    await page.goto(URL_TO_CHECK);

    const pageTitle = await page.title();
    console.log(`Page title: ${pageTitle}`);

    try {
      const noresult = await page.getByText(
        "No results found. Showing top popular products you might want to consider..."
      );

      if (await noresult.isVisible()) {
        const message = `😩 <b>${new Date().toLocaleDateString(
          "en-GB"
        )} - GolfClubs4Cash - Nothing today!</b>`;
        await bot.sendMessage(TELEGRAM_CHAT_ID, message, {
          parse_mode: "HTML",
        });

        return;
      }
    } catch {}

    const productList = await page.locator("#products-grid > div");

    const products = await Promise.all(
      (
        await productList.all()
      ).map(async (product) => {
        const productLink = await product
          .locator("a.title-container")
          .getAttribute("href");
        const productImage = await product
          .locator(".image")
          .getAttribute("src");
        const productName = await product.locator(".title").textContent();
        const productPrice = await product.locator(".price").textContent();

        return {
          productLink: `${SITE_URL}${productLink}`,
          productImage,
          productName,
          productPrice,
        };
      })
    );

    const message = `⛳ <b>${new Date().toLocaleDateString(
      "en-GB"
    )} - GolfClubs4Cash - Left Handed 7/9 Wood</b>\n
${products
  .map(
    (product, index) =>
      `${(index + 1).toString()}. <a href="${product.productLink}">${
        product.productName
      }</a> - ${product.productPrice}`
  )
  .join("\n\n")}`;

    await bot.sendMessage(TELEGRAM_CHAT_ID, message, {
      parse_mode: "HTML",
    });
  } catch (error) {
    console.error("❌ An error occurred:", error);

    // Send an error message to Telegram
    const errorMessage = `❌ Error checking ${URL_TO_CHECK} ❌\n\n${
      error instanceof Error ? error.message : String(error)
    }`;
    await bot.sendMessage(TELEGRAM_CHAT_ID, errorMessage);
  } finally {
    await browser.close();
    console.log("Browser closed.");
  }
}

main().catch(console.error);
