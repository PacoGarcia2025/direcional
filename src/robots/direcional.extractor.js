import { chromium } from "playwright";

const START_URL =
  "https://www.direcional.com.br/encontre-seu-apartamento/";

export default async function extractDirecional() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  console.log("🌐 Abrindo página principal...");
  await page.goto(START_URL, { waitUntil: "domcontentloaded" });

  // 🔹 Carregar todos os empreendimentos
  while (true) {
    const btn = await page.$("#load-more-empreendimentos");
    if (!btn) break;

    console.log("🔄 Clicando em 'Carregar mais'...");
    await btn.click();
    await page.waitForTimeout(2000);
  }

  // 🔹 Coletar links dos cards
  const links = await page.$$eval("a[href*='/empreendimentos/']", as =>
    [...new Set(as.map(a => a.href))]
  );

  console.log(`🔗 Links encontrados: ${links.length}`);

  const resultados = [];

  for (const url of links) {
    console.log("➡️ Coletando:", url);
    await page.goto(url, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1500);

    const data = await page.evaluate(() => {
      const text = sel =>
        document.querySelector(sel)?.innerText.trim() || "";

      // Title
      const title = text("h1");

      // Status
      const status =
        document.querySelector("#status li.active")?.innerText.trim() || "";

      // Endereço
      const addressRaw = text("#endereco p");

      let city = "";
      let state = "";
      let address = "";

      if (addressRaw.includes("/")) {
        const parts = addressRaw.split(",");
        address = parts.slice(0, -1).join(",").trim();

        const uf = parts.at(-1).trim();
        const [c, s] = uf.split("/");
        city = c?.trim() || "";
        state = s?.trim() || "";
      }

      // Tipologias
      const details = Array.from(
        document.querySelectorAll("#tipologias li")
      ).map(li => li.innerText.trim());

      // Descrição
      const description = Array.from(
        document.querySelectorAll("#descricao li")
      )
        .map(li => li.innerText.trim())
        .join(" • ");

      // Imagens (limpas)
      const images = Array.from(document.images)
        .map(img => img.src)
        .filter(src =>
          src &&
          !src.includes("icon") &&
          !src.includes("logo") &&
          !src.includes("svg")
        );

      return {
        title,
        status,
        city,
        state,
        address,
        details,
        description,
        images,
      };
    });

    resultados.push({
      listingId: url.split("/").filter(Boolean).pop(),
      url,
      ...data,
    });
  }

  await browser.close();
  return resultados;
}
