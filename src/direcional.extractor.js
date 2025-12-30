import { chromium } from "playwright";

const START_URL = "https://www.direcional.com.br/encontre-seu-apartamento/";

export default async function extractDirecional() {
  const browser = await chromium.launch({
    headless: true,
  });

  const page = await browser.newPage({
    viewport: { width: 1280, height: 800 },
  });

  // 🔒 BLINDAGEM TOTAL CONTRA TIMEOUTS DE SCROLL
  page.setDefaultTimeout(0);
  page.setDefaultNavigationTimeout(0);

  console.log("🚀 Iniciando robô Direcional");
  console.log("Abrindo página principal...");
  await page.goto(START_URL, { waitUntil: "domcontentloaded" });

  // =================================================
  // 1️⃣ CARREGAR TODOS OS EMPREENDIMENTOS (JS PURO)
  // =================================================
  while (true) {
    const canLoadMore = await page.evaluate(() => {
      const btn = document.querySelector("#load-more-empreendimentos");
      if (!btn) return false;

      const style = window.getComputedStyle(btn);
      if (style.display === "none") return false;
      if (btn.disabled) return false;

      return true;
    });

    if (!canLoadMore) {
      console.log("⛔ Botão 'Carregar mais' indisponível. Encerrando.");
      break;
    }

    console.log("Clicando em 'Carregar mais' (JS direto)...");
    await page.evaluate(() => {
      document.querySelector("#load-more-empreendimentos")?.click();
    });

    await page.waitForTimeout(1500);
  }

  // =================================================
  // 2️⃣ COLETAR LINKS DOS EMPREENDIMENTOS
  // =================================================
  const links = await page.evaluate(() => {
    return Array.from(
      new Set(
        Array.from(
          document.querySelectorAll("a[href*='/empreendimentos/']")
        ).map((a) => a.href)
      )
    );
  });

  console.log(`📦 Total de empreendimentos encontrados: ${links.length}`);

  const empreendimentos = [];

  // =================================================
  // 3️⃣ PROCESSAR CADA EMPREENDIMENTO
  // =================================================
  for (const url of links) {
    try {
      console.log(`➡️ Processando: ${url}`);
      await page.goto(url, { waitUntil: "domcontentloaded" });

      const emp = await page.evaluate(() => {
        const getText = (sel) =>
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
          Title: getText("h1"),
          ListingID: location.pathname.split("/").filter(Boolean).pop(),
          Price: "A",
          Description:
            document.querySelector("meta[name='description']")?.content || "",
          PropertyType: "Apartamento",
          Status: getText("[class*='status'], [class*='tag']"),
          Location: {
            Address: getText("[class*='endereco'], [class*='address']"),
          },
          Details: {
            Dormitorios: getText("[class*='dorm']"),
            Area: getText("[class*='area']"),
          },
          Media: imagens,
        };
      });

      if (emp.Title) {
        empreendimentos.push(emp);
      }
    } catch (err) {
      console.log("⚠️ Erro ao processar:", url);
    }
  }

  await browser.close();

  console.log(`✅ Total coletado: ${empreendimentos.length}`);
  return empreendimentos;
}
