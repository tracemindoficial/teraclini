import { expect, test } from "vitest";

import { inspectOffer } from "./verify-public-offer.mjs";

const pageUrl = "https://teraclini.example/planos";
const signup = "/auth?mode=signup&amp;plan=teraclini_mensal";

function card(price = "67,00", href = signup, code = "teraclini_mensal") {
  return `<article data-plan-code="${code}"><h3>Plano Completo</h3>
    <p>De <s>R$&nbsp;120,00</s></p>
    <p><span>Por </span><strong>R$&nbsp;<!-- -->${price}</strong><span> / m&#234;s</span></p>
    <span>Economia de R$&nbsp;53,00</span>
    <a class="button" href="${href}">Quero assinar agora <svg></svg></a></article>`;
}

test("aceita preço anterior, valor mensal, economia e cadastro no HTML anônimo", () => {
  expect(inspectOffer(card(), pageUrl)).toEqual({
    price: "Por R$ 67,00 / mês",
    signup: "/auth?mode=signup&plan=teraclini_mensal",
  });
});

test("rejeita desconto incorreto e aviso de preparação junto da oferta", () => {
  expect(() => inspectOffer(card().replace("120,00", "130,00"), pageUrl)).toThrow(/120,00/);
  expect(() => inspectOffer(card().replace("53,00", "52,00"), pageUrl)).toThrow(/53,00/);
  expect(() => inspectOffer(card() + "<p>Licenças em preparação</p>", pageUrl)).toThrow(/preparação/);
});

test("rejeita oferta antiga, oferta adicional ou rota sem o cartão publicado", () => {
  expect(() => inspectOffer(card("59,90"), pageUrl)).toThrow(/59,90/);
  expect(() => inspectOffer(card() + card("59,90", signup, "old"), pageUrl)).toThrow(/apenas/);
  expect(() => inspectOffer(`<script>${JSON.stringify(card())}</script>`, pageUrl)).toThrow(/nenhum/);
});

test("rejeita link de checkout, cadastro de outro plano ou outro domínio", () => {
  expect(() => inspectOffer(card("67,00", "/checkout"), pageUrl)).toThrow(/cadastro/);
  expect(() => inspectOffer(card("67,00", signup.replace("mensal", "antigo")), pageUrl)).toThrow(
    /cadastro/,
  );
  expect(() => inspectOffer(card("67,00", `https://other.example${signup}`), pageUrl)).toThrow(
    /mesmo ambiente/,
  );
});
