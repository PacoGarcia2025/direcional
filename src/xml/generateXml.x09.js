import fs from "fs";

export default async function generateXmlX09(items) {
  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n<empreendimentos>\n`;

  for (const e of items) {
    xml += `
  <empreendimento>
    <Title><![CDATA[${e.title}]]></Title>
    <ListingID>${e.listingId}</ListingID>
    <Price>0</Price>
    <Description><![CDATA[${e.description}]]></Description>
    <PropertyType>Apartamento</PropertyType>
    <Status><![CDATA[${e.status}]]></Status>

    <Location>
      <City><![CDATA[${e.city}]]></City>
      <State><![CDATA[${e.state}]]></State>
      <Address><![CDATA[${e.address}]]></Address>
    </Location>

    <Details>
      ${e.details.map(d => `<Detail><![CDATA[${d}]]></Detail>`).join("\n")}
    </Details>

    <Media>
      ${e.images.map(img => `<Image><![CDATA[${img}]]></Image>`).join("\n")}
    </Media>
  </empreendimento>`;
  }

  xml += `\n</empreendimentos>`;

  fs.writeFileSync("direcional-x09.xml", xml, "utf-8");
}
