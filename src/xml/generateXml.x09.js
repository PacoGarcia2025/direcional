import fs from "fs";
import { create } from "xmlbuilder2";

export default async function generateXmlX09(empreendimentos) {
  const root = create({ version: "1.0", encoding: "UTF-8" })
    .ele("empreendimentos");

  empreendimentos.forEach(emp => {
    const node = root.ele("empreendimento");

    node.ele("Title").txt(emp.title || "");
    node.ele("ListingID").txt(emp.id);
    node.ele("Price").txt("0");
    node.ele("Description").txt(
      `Empreendimento Direcional em ${emp.cidade || ""}.`
    );
    node.ele("PropertyType").txt("Apartamento");
    node.ele("Status").txt(emp.status || "");

    // Location
    const loc = node.ele("Location");
    loc.ele("City").txt(emp.cidade || "");
    loc.ele("State").txt(emp.estado || "");
    loc.ele("Address").txt(emp.endereco || "");

    // Details
    const details = node.ele("Details");
    emp.tipologias?.forEach(t => {
      const d = details.ele("Tipologia");
      d.ele("Dormitorios").txt(t.dormitorios);
      d.ele("Area").txt(t.area);
    });

    emp.diferenciais?.forEach(dif => {
      details.ele("Caracteristica").txt(dif);
    });

    // Media
    const media = node.ele("Media");
    emp.imagens?.forEach(img => {
      media.ele("Foto").txt(img);
    });
  });

  const xml = root.end({ prettyPrint: true });
  fs.writeFileSync("direcional-x09.xml", xml);
}
