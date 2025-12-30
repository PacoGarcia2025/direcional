import { chromium } from "playwright";

const START_URL = "https://www.direcional.com.br/encontre-seu-apartamento/";

export default async function extractDirecional() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  console.log("Abrindo página principal...");
  await page.goto(START_URL, { waitUntil: "networkidle" });

  // ===============================
  // 1️⃣ CLICAR EM "CARREGAR MAIS"
  // ===============================
  while (true) {
    const botao = await page.$("#load-more-empreendimentos");

    if (!botao) {
      console.log("Botão 'Carregar mais' não encontrado. Fim da listagem.");
      break;
    }

    console.log("Clicando em 'Carregar mais'...");
    await botao.scrollIntoViewIfNeeded();
    await botao.click();

    // Aguarda novos cards carregarem
    await page.waitForTimeout(2500);
  }

  // ===============================
  // 2️⃣ COLETAR LINKS DOS CARDS
  // ===============================
  const links = await page.$$eval(
    "a[href*='/empreendimentos/']",
    (els) => [...new Set(els.map((e) => e.href))]
  );

  console.log(`Total de empreendimentos encontrados: ${links.length}`);

  const empreendimentos = [];

  // ===============================
  // 3️⃣ ENTRAR EM CADA EMPREENDIMENTO
  // ===============================
  for (const url of links) {
    try {
      console.log(`Processando: ${url}`);
      await page.goto(url, { waitUntil: "networkidle" });

      const data = await page.evaluate(() => {
        const text = (sel) =>
          document.querySelector(sel)?.innerText?.trim() || "";

        const attr = (sel, att) =>
          document.querySelector(sel)?.getAttribute(att) || "";

        const imagens = [
          ...document.querySelectorAll("img[src*='direcional']"),
        ]
          .map((img) => img.src)
          .filter(
            (src) =>
              src &&
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
          propertyType: text(".tipo-imovel") || "Apartamento",
          status: text(".status, .tag-status"),
          location: {
            address: text(".endereco, .address"),
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

  console.log(`Total coletado com sucesso: ${empreendimentos.length}`);
  return empreendimentos;
}
