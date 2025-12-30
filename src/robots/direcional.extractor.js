import { chromium } from "playwright";

const START_URL = "https://www.direcional.com.br/empreendimentos";

export default async function extractDirecional() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  console.log("🌐 Abrindo listagem Direcional");
  await page.goto(START_URL, { waitUntil: "domcontentloaded", timeout: 60000 });

  // 🔁 Carregar todos os empreendimentos
  let lastCount = 0;
  while (true) {
    const { count, hasMore } = await page.evaluate(() => {
      const cards = document.querySelectorAll('a[href*="/empreendimentos/"]');
      const btn = [...document.querySelectorAll("button,a")].find(b =>
        b.innerText?.toLowerCase().includes("carregar")
      );
      return { count: cards.length, hasMore: !!btn };
    });

    if (!hasMore || count === lastCount) break;
    lastCount = count;

    await page.evaluate(() => {
      const btn = [...document.querySelectorAll("button,a")].find(b =>
        b.innerText?.toLowerCase().includes("carregar")
      );
      if (btn) btn.click();
    });

    await page.waitForTimeout(2500);
  }

  // 🔗 Coletar URLs
  const urls = await page.evaluate(() => {
    const set = new Set();
    document.querySelectorAll('a[href*="/empreendimentos/"]').forEach(a => {
      if (a.href.includes("/empreendimentos/")) {
        set.add(a.href.split("?")[0]);
      }
    });
    return [...set];
  });

  console.log(`🔗 URLs encontradas: ${urls.length}`);

  const results = [];

  for (const url of urls) {
    console.log("➡️ Processando:", url);

    try {
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });
      await page.waitForTimeout(2000);

      const data = await page.evaluate(() => {
        const getText = sel =>
          document.querySelector(sel)?.innerText.trim() || null;

        const title = getText(".highlight-title, h1");
        const status = getText(".highlight-label");

        // Localização
        let cidade = null;
        let estado = null;
        const loc = document.body.innerText.match(/([A-Za-zÀ-ú\s]+)\s*-\s*([A-Z]{2})/);
        if (loc) {
          cidade = loc[1].trim();
          estado = loc[2].trim();
        }

        // Endereço
        let endereco = null;
        document.querySelectorAll("#fichatecnica p").forEach(p => {
          if (p.innerText.includes("Rua") || p.innerText.includes("Av")) {
            endereco = p.innerText.trim();
          }
        });

        // Tipologias
        const tipologias = [];
        document.querySelectorAll("#fichatecnica li").forEach(li => {
          const dorm = li.innerText.match(/(\d+)\s*Quartos?/i)?.[1];
          const area = li.innerText.match(/([\d.,]+)\s*m²/i)?.[1];
          if (dorm && area) {
            tipologias.push({
              dormitorios: dorm,
              area: area.replace(",", ".")
            });
          }
        });

        // Diferenciais
        const diferenciais = [...document.querySelectorAll("#diferenciais li span")]
          .map(el => el.innerText.trim())
          .filter(Boolean);

        // Imagens (refino)
        const imagens = [...document.images]
          .map(img => img.src)
          .filter(src =>
            src &&
            src.includes("/imagens/") &&
            !src.includes("icon") &&
            !src.includes("logo") &&
            !src.endsWith(".svg")
          );

        return {
          title,
          status,
          cidade,
          estado,
          endereco,
          tipologias,
          diferenciais,
          imagens: [...new Set(imagens)]
        };
      });

      results.push({
        id: url.split("/").filter(Boolean).pop(),
        url,
        ...data
      });
    } catch (e) {
      console.error("❌ Erro:", url);
    }
  }

  await browser.close();
  return results;
}
