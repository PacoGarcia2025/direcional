import { chromium } from "playwright";

const START_URL = "https://www.direcional.com.br/encontre-seu-apartamento/";

export default async function extractDirecional() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  console.log("🚀 Iniciando robô Direcional");
  await page.goto(START_URL, { waitUntil: "domcontentloaded" });

  // =================================================
  // 1️⃣ SCROLL ATÉ CARREGAR TODOS OS CARDS
  // =================================================
  console.log("⬇️ Carregando todos os empreendimentos...");
  let lastHeight = 0;

  while (true) {
    const newHeight = await page.evaluate(() => {
      window.scrollTo(0, document.body.scrollHeight);
      return document.body.scrollHeight;
    });

    if (newHeight === lastHeight) break;
    lastHeight = newHeight;
    await page.waitForTimeout(1500);
  }

  // =================================================
  // 2️⃣ COLETAR LINKS ÚNICOS
  // =================================================
  const links = await page.evaluate(() =>
    Array.from(
      new Set(
        Array.from(
          document.querySelectorAll("a[href^='/empreendimentos/']")
        ).map((a) => a.href)
      )
    )
  );

  console.log(`📦 Total de empreendimentos encontrados: ${links.length}`);

  const empreendimentos = [];

  // =================================================
  // 3️⃣ PROCESSAR CADA EMPREENDIMENTO
  // =================================================
  for (const url of links) {
    try {
      console.log(`➡️ Processando: ${url}`);
      await page.goto(url, { waitUntil: "domcontentloaded" });

      const data = await page.evaluate(() => {
        const text = (el) => el?.innerText?.trim() || "";

        const title = text(document.querySelector("h1"));

        // Cidade / Estado
        let city = "";
        let state = "";
        const locationText =
          document.querySelector(".location")?.innerText ||
          document.body.innerText;

        const match = locationText.match(
          /([A-Za-zÀ-ÿ\s]+)\s[-–]\s([A-Z]{2})/
        );
        if (match) {
          city = match[1].trim();
          state = match[2].trim();
        }

        // Status (li ativo)
        const status =
          text(document.querySelector("#status li.active")) ||
          text(document.querySelector("li.active"));

        // Endereço
        const address =
          text(document.querySelector("#endereco p")) ||
          text(document.querySelector("[class*='endereco']"));

        // Tipologias
        const tipologias = Array.from(
          document.querySelectorAll("#tipologias li")
        ).map((li) => li.innerText.trim());

        // Descrição
        const description =
          document.querySelector("meta[name='description']")?.content ||
          text(document.querySelector("#descricao"));

        // Imagens limpas
        const images = Array.from(document.querySelectorAll("img"))
          .map((img) => img.src)
          .filter(
            (src) =>
              src &&
              src.includes("direcional.com.br") &&
              /\.(jpg|jpeg|webp)$/i.test(src) &&
              !/icon|logo|sprite/i.test(src)
          );

        return {
          Title: title,
          ListingID: location.pathname.split("/").pop(),
          Price: "A",
          Description: description,
          PropertyType: "Apartamento",
          Status: status,
          Location: {
            City: city,
            State: state,
            Address: address,
          },
          Details: tipologias.join(" | "),
          Media: images,
        };
      });

      if (data.Title) empreendimentos.push(data);
    } catch (err) {
      console.log("⚠️ Erro ao processar:", url);
    }
  }

  await browser.close();
  console.log(`✅ Coletados ${empreendimentos.length} empreendimentos`);

  return empreendimentos;
}
