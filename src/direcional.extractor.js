import { chromium } from "playwright";

const START_URL = "https://www.direcional.com.br/encontre-seu-apartamento/";

export default async function extractDirecional() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  console.log("🚀 Iniciando robô Direcional");
  console.log("Abrindo página principal...");
  await page.goto(START_URL, { waitUntil: "networkidle" });

  // ===============================
  // 1️⃣ CARREGAR TODOS OS CARDS
  // ===============================
  while (true) {
    const exists = await page.$("#load-more-empreendimentos");
    if (!exists) {
      console.log("Botão não existe mais.");
      break;
    }

    const visible = await page.isVisible("#load-more-empreendimentos");
    const enabled = await page.isEnabled("#load-more-empreendimentos");

    if (!visible || !enabled) {
      console.log("Botão não está mais visível/habilitado.");
      break;
    }

    console.log("Clicando em 'Carregar mais'...");
    try {
      await page.click("#load-more-empreendimentos");
      await page.waitForTimeout(2000);
    } catch (err) {
      console.log("Falha ao clicar, encerrando loop.");
      break;
    }
  }

  // ===============================
  // 2️⃣ COLETAR LINKS DOS EMPREENDIMENTOS
  // ===============================
  const links = await page.$$eval(
    "a[href*='/empreendimentos/']",
    (els) => [...new Set(els.map((e) => e.href))]
  );

  console.log(`Total de empreendimentos encontrados: ${links.length}`);

  const empreendimentos = [];

  // ===============================
  // 3️⃣ PROCESSAR CADA EMPREENDIMENTO
  // ===============================
  for (const url of links) {
    try {
      console.log(`Processando: ${url}`);
      await page.goto(url, { waitUntil: "networkidle" });

      const data = await page.evaluate(() => {
        const text = (sel) =>
          document.querySelector(sel)?.innerText?.trim() || "";

        const imagens = [...document.images]
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
          title: text("h1"),
          listingId: location.pathname.split("/").filter(Boolean).pop(),
          price: "A",
          description:
            document.querySelector("meta[name='description']")?.content || "",
          propertyType: "Apartamento",
          status: text("[class*='status'], [class*='tag']"),
          location: {
            address: text("[class*='endereco'], [class*='address']"),
          },
          details: {
            dormitorios: text("[class*='dorm']"),
            area: text("[class*='area']"),
          },
          media: imagens,
        };
      });

      if (data.title) {
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

