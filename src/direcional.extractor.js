import { chromium } from "playwright";

const START_URL = "https://www.direcional.com.br/encontre-seu-apartamento/";

export default async function extractDirecional() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  console.log("🚀 Iniciando robô Direcional");
  console.log("Abrindo página principal...");
  await page.goto(START_URL, { waitUntil: "networkidle" });

  // =========================================
  // 1️⃣ CARREGAR TODOS OS EMPREENDIMENTOS
  // =========================================
  while (true) {
    const hasButton = await page.evaluate(() => {
      const btn = document.querySelector("#load-more-empreendimentos");
      if (!btn) return false;

      const style = window.getComputedStyle(btn);
      return style.display !== "none" && !btn.disabled;
    });

    if (!hasButton) {
      console.log("Botão 'Carregar mais' não disponível. Encerrando.");
      break;
    }

    console.log("Clicando em 'Carregar mais' (JS)...");
    await page.evaluate(() => {
      document.querySelector("#load-more-empreendimentos")?.click();
    });

    await page.waitForTimeout(2000);
  }

  // =========================================
  // 2️⃣ COLETAR LINKS DOS EMPREENDIMENTOS
  // =========================================
  const links = await page.evaluate(() => {
    return Array.from(
      new Set(
        Array.from(
          document.querySelectorAll("a[href*='/empreendimentos/']")
        ).map((a) => a.href)
      )
    );
  });

  console.log(`Total de empreendimentos encontrados: ${links.length}`);

  const empreendimentos = [];

  // =========================================
  // 3️⃣ PROCESSAR CADA EMPREENDIMENTO
  // =========================================
  for (const url of links) {
    try {
      console.log(`Processando: ${url}`);
      await page.goto(url, { waitUntil: "networkidle" });

      const data = await page.evaluate(() => {
        const text = (sel) =>
          document.querySelector(sel)?.innerText?.trim() || "";

        const imagens = Array.from(document.images)
          .map((img) => img.src)
          .filter(
            (src) =>
              src &&
              src.includes("direcional.com.br") &&
              !src.includes("icon") &&
              !src.includes("logo") &&
              !src.includes("svg")
          );

        return {
          Title: text("h1"),
          ListingID: location.pathname.split("/").filter(Boolean).pop(),
          Price: "A",
          Description:
            document.querySelector("meta[name='description']")?.content || "",
          PropertyType: "Apartamento",
          Status: text("[class*='status'], [class*='tag']"),
          Location: {
            Address: text("[class*='endereco'], [class*='address']"),
          },
          Details: {
            Dormitorios: text("[class*='dorm']"),
            Area: text("[class*='area']"),
          },
          Media: imagens,
        };
      });

      if (data.Title) {
        empreendimentos.push(data);
      }
    } catch (err) {
      console.log("Erro ao processar:", url);
    }
  }

  await browser.close();

  console.log(`✅ Total coletado: ${empreendimentos.length}`);
  return empreendimentos;
}
