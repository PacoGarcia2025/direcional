import extractDirecional from "./robots/direcional.extractor.js";
import generateXmlX09 from "./xml/generateXml.x09.js";

(async () => {
  console.log("🚀 Iniciando robô Direcional");

  const empreendimentos = await extractDirecional();

  console.log(`📦 Total coletado: ${empreendimentos.length}`);

  await generateXmlX09(empreendimentos);

  console.log("✅ XML X09 gerado com sucesso");
})();

