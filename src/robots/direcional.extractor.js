import { chromium } from "playwright";

const START_URL = "https://www.direcional.com.br/encontre-seu-apartamento/";

export default async function extractDirecional() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  console.log("Abrindo página principal...");
  await page.goto(START_URL, { waitUntil: "networkidle" });

  console.log("Carregando todos os empreendimentos...");

  // 🔁 CLICA EM "CARREGAR MAIS" ATÉ SUMIR
  while (true) {
    const botao = await page.$("#load-more-empreendimentos");

    if (!botao) {
      console.log("Botão não encontrado, fim da listagem.");
      break;
    }

    const visivel = await botao.isVisible();
    if (!visivel) {
      console.log("Botão não visível, fim da listagem.");
      break;
    }

    console.log("Clicando em 'Carregar mais'...");
    await botao.click();
    await page.waitForTimeout(1500);
  }

  // 🔗 COLETA TODOS OS LINKS
  const links = await page.$$eval(
    "a[href*='/empreendimentos/']",
    (els) => [...new Set(els.map((e) => e.href))]
  );

  console.log(`Total encontrado: ${links.length}`);

  const empreendimentos = [];

  for (const url of links) {
    try {
      console.log("Processando:", url);
      await page.goto(url, { waitUntil: "networkidle" });

      const data = await page.evaluate(() => {
        const text = (sel) =>
          document.querySelector(sel)?.innerText?.trim() || "";

        const images = Array.from(document.images)
          .map((img) => img.src)
          .filter(
            (src) =>
              src &&
              src.includes("direcional.com.br") &&
              !src.match(/logo|icon|svg/i)
          );

        return {
          Title: document.title.replace("| Direcional", "").trim(),
          ListingID: location.pathname.split("/").pop(),
          Price: "A",
          Description:
            document.querySelector("meta[name='description']")?.content || "",
          PropertyType: "Apartamento",
          Status: text("[class*='status'], [class*='tag']"),
          Location: text("[class*='endereco'], [class*='address']"),
          Details: document.body.innerText.slice(0, 3000),
          Media: images,
        };
      });

      if (data.Title) empreendimentos.push(data);
    } catch (e) {
      console.log("Erro ao processar:", url);
    }
  }

  await browser.close();
  return empreendimentos;
}
