import { chromium } from "playwright";

const START_URL = "https://www.direcional.com.br/encontre-seu-apartamento/";

export default async function extractDirecional() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  console.log("🚀 Iniciando robô Direcional");
  await page.goto(START_URL, { waitUntil: "networkidle" });

  // =================================================
  // 1️⃣ FORÇAR CARREGAMENTO TOTAL SEM CLICAR EM BOTÃO
  // =================================================
  await page.evaluate(async () => {
    function sleep(ms) {
      return new Promise((r) => setTimeout(r, ms));
    }

    while (true) {
      const btn = document.querySelector("#load-more-empreendimentos");
      if (!btn) break;
      if (btn.disabled) break;

      btn.click();
      await sleep(1200);
    }
  });

  // =================================================
  // 2️⃣ COLETAR LINKS
  // =================================================
  const links = await page.evaluate(() =>
    Array.from(
      new Set(
        Array.from(
          document.querySelectorAll("a[href*='/empreendimentos/']")
        ).map((a) => a.href)
      )
    )
  );

  console.log(`📦 Total de empreendimentos: ${links.length}`);

  const empreendimentos = [];

  // =================================================
  // 3️⃣ PROCESSAR CADA EMPREENDIMENTO
  // =================================================
  for (const url of links) {
    try {
      console.log(`➡️ ${url}`);
      await page.goto(url, { waitUntil: "networkidle" });

      const data = await page.evaluate(() => {
        const txt = (sel) =>
          document.querySelector(sel)?.innerText?.trim() || "";

        const images = Array.from(document.images)
          .map((i) => i.src)
          .filter(
            (src) =>
              src &&
              src.includes("direcional.com.br") &&
              !src.match(/icon|logo|svg/i)
          );

        return {
          Title: txt("h1"),
          ListingID: location.pathname.split("/").pop(),
          Price: "A",
          Description:
            document.querySelector("meta[name='description']")?.content || "",
          PropertyType: "Apartamento",
          Status: txt("[class*='status'], [class*='tag']"),
          Location: txt("[class*='endereco'], [class*='address']"),
          Details: txt("body"),
          Media: images,
        };
      });

      if (data.Title) empreendimentos.push(data);
    } catch (e) {
      console.log("⚠️ Erro ao processar:", url);
    }
  }

  await browser.close();
  console.log(`✅ Coletados ${empreendimentos.length} empreendimentos`);

  return empreendimentos;
}
