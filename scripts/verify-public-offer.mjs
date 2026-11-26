import { pathToFileURL } from "node:url";

const planCode = "teraclini_mensal";
// Acceptance criteria, not a source of price data for the application.
const expectedPrice = "R$ 67,00 / mês";
const paths = ["/", "/planos"];
const entities = {
  "&amp;": "&",
  "&nbsp;": " ",
  "&quot;": '"',
  "&apos;": "'",
  "&lt;": "<",
  "&gt;": ">",
};

function decode(value) {
  return value.replace(
    /&(?:#x([\da-f]+)|#(\d+)|amp|nbsp|quot|apos|lt|gt);/gi,
    (entity, hex, decimal) => {
      if (hex || decimal) {
        return String.fromCodePoint(Number.parseInt(hex ?? decimal, hex ? 16 : 10));
      }
      return entities[entity.toLowerCase()];
    },
  );
}

function text(fragment) {
  return decode(fragment.replace(/<!--[\s\S]*?-->|<[^>]+>/g, ""))
    .replace(/\s+/g, " ")
    .trim();
}

export function inspectOffer(html, pageUrl) {
  // Inspect rendered SSR markup, not values present only in dehydrated loader data.
  const markup = html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "");
  const cards = [...markup.matchAll(/<article\b([^>]*)>([\s\S]*?)<\/article>/gi)]
    .map((match) => ({ code: /\sdata-plan-code="([^"]+)"/.exec(match[1])?.[1], body: match[2] }))
    .filter((card) => card.code);
  if (cards.length !== 1 || cards[0].code !== planCode) {
    const found = cards.map((card) => card.code).join(", ") || "nenhum";
    throw new Error(`Esperava apenas o cartão do Plano Completo; encontrei: ${found}.`);
  }

  const card = cards[0].body;
  const paragraphs = [...card.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/gi)].map((match) => text(match[1]));
  const prices = paragraphs.filter((paragraph) => /^(?:Por\s*)?R\$/.test(paragraph));
  if (prices.length !== 1 || !/^Por\s*/.test(prices[0]) || prices[0].replace(/^Por\s*/, "") !== expectedPrice) {
    throw new Error(`Esperava Por ${expectedPrice}; encontrei ${prices.join(", ") || "nenhum preço"}.`);
  }
  const original = /<s\b[^>]*>([\s\S]*?)<\/s>/i.exec(card);
  if (!original || text(original[1]) !== "R$ 120,00" || !text(card).includes("Economia de R$ 53,00")) {
    throw new Error("Esperava o preço anterior riscado de R$ 120,00 e economia de R$ 53,00.");
  }
  if (text(markup).includes("Licenças em preparação")) {
    throw new Error("O aviso de licenças em preparação aparece junto com a oferta ativa.");
  }

  const cta = [...card.matchAll(/<a\b[^>]*\shref="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi)].filter(
    (match) => text(match[2]).toLowerCase() === "quero assinar agora",
  );
  if (cta.length !== 1) throw new Error("Não encontrei um único link ‘Quero assinar agora’.");
  const target = new URL(decode(cta[0][1]), pageUrl);
  if (
    target.origin !== new URL(pageUrl).origin ||
    target.pathname !== "/auth" ||
    target.searchParams.get("mode") !== "signup" ||
    target.searchParams.get("plan") !== planCode
  ) {
    throw new Error("O link não aponta para o cadastro do Plano Completo no mesmo ambiente.");
  }
  return { price: prices[0], signup: target.pathname + target.search };
}

function parseOrigin(value) {
  const url = new URL(value);
  if (
    !["http:", "https:"].includes(url.protocol) ||
    url.username ||
    url.password ||
    url.pathname !== "/" ||
    url.search ||
    url.hash
  ) {
    throw new Error(
      "Informe somente a origem de cada ambiente, sem caminho, parâmetros ou credenciais.",
    );
  }
  return url.origin;
}

async function verifyPage(origin, path) {
  const url = new URL(path, origin);
  const response = await fetch(url, {
    headers: { accept: "text/html" },
    redirect: "manual",
    signal: AbortSignal.timeout(15_000),
  });
  const cache = ["cache-control", "age", "etag"]
    .map((key) => `${key}=${response.headers.get(key) ?? "—"}`)
    .join(" | ");
  try {
    if (!response.ok || !response.headers.get("content-type")?.includes("text/html")) {
      throw new Error(`Esperava HTML anônimo sem redirecionar; HTTP ${response.status}.`);
    }
    const result = inspectOffer(await response.text(), url);
    console.log(`OK ${url.href} | ${result.price} | ${result.signup} | ${cache}`);
  } catch (error) {
    throw new Error(`${error.message} | ${cache}`, { cause: error });
  }
}

async function main(args) {
  if (args.length !== 2) {
    throw new Error("Uso: node scripts/verify-public-offer.mjs ORIGEM_PREVIEW ORIGEM_PUBLICADA");
  }
  const origins = args.map(parseOrigin);
  if (origins[0] === origins[1]) {
    throw new Error("Informe origens diferentes para o preview e a publicação.");
  }
  for (const origin of origins) {
    for (const path of paths) {
      try {
        await verifyPage(origin, path);
      } catch (error) {
        console.error(`FALHOU ${origin}${path} | ${error.message}`);
        process.exitCode = 1;
      }
    }
  }
  if (!process.exitCode) {
    console.log("Oferta e destino do CTA conferem nas quatro respostas HTML. Confirme a revisão de cada deploy no Lovable.");
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main(process.argv.slice(2)).catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
