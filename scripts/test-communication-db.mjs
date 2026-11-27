// Run only against a local QA database with the communication migrations applied.
// All operations execute in one rolled-back transaction; no HTTP or email is sent.
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import postgres from "postgres";

const { COMMUNICATION_QA_DB, COMMUNICATION_QA_ADMIN, COMMUNICATION_QA_A,
  COMMUNICATION_QA_B, COMMUNICATION_QA_INACTIVE } = process.env;
const ids = [COMMUNICATION_QA_ADMIN, COMMUNICATION_QA_A, COMMUNICATION_QA_B, COMMUNICATION_QA_INACTIVE];
const uuid = /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;
assert(ids.every((id) => uuid.test(id ?? "")) && new Set(ids.map((id) => id.toLowerCase())).size === 4,
  "Informe quatro UUIDs distintos de contas de teste.");
const url = new URL(COMMUNICATION_QA_DB);
assert(["postgres:", "postgresql:"].includes(url.protocol) && ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname),
  "Use um PostgreSQL de homologação local, sem usuários reais.");
const [admin, a, b, inactive] = ids.map((id) => id.toLowerCase());
const db = postgres(COMMUNICATION_QA_DB, { max: 1 });
const rollback = new Error("Rollback deliberado dos testes");

try {
  await db.begin("isolation level repeatable read", async (sql) => {
    const targets = await sql`select user_id, on_trial from public.communication_targets() order by user_id`;
    assert.deepEqual(targets.map((t) => t.user_id), [a, b].sort(), "Somente A e B podem estar elegíveis.");
    assert.equal(targets.find((t) => t.user_id === a).on_trial, true);
    assert.equal(targets.find((t) => t.user_id === b).on_trial, false);
    const excluded = await sql`select 1 from public.accounts where owner_user_id = ${inactive} and (status <> 'active' or blocked_at is not null)`;
    assert.equal(excluded.length, 1, "C deve ser uma conta de teste bloqueada/inativa.");

    await sql`set local role authenticated`;
    async function as(id) {
      await sql`select set_config('request.jwt.claim.sub', ${id}, true),
        set_config('request.jwt.claims', ${JSON.stringify({ sub: id, role: "authenticated" })}, true)`;
      const [{ uid }] = await sql`select auth.uid() as uid`;
      assert.equal(uid, id);
    }
    const value = async (query) => (await query)[0].value;
    const marker = `QA-COM-${randomUUID()}`;
    function operations(query) {
      return {
        send: (request, audience, recipient, subject, priority = false) => value(query`
          select public.communication_send(${request}, ${audience}, ${recipient}, ${subject}, 'update', ${priority}, 'Mensagem fictícia de teste') as value`),
        list: (isAdmin, filter = "all", search = marker) => value(query`
          select public.communication_list(${isAdmin}, ${filter}, ${search}, 0) as value`),
        unread: (isAdmin) => value(query`select public.communication_unread(${isAdmin}) as value`),
        open: (id, isAdmin) => value(query`select public.communication_open(${id}, ${isAdmin}) as value`),
        reply: (id, isAdmin, text, request = randomUUID()) => value(query`
          select public.communication_reply(${id}, ${isAdmin}, ${request}, ${text}) as value`),
        archive: (id, archived) => value(query`select public.communication_archive(${id}, ${archived}) as value`),
      };
    }
    const { send, list, unread, open, reply, archive } = operations(sql);
    const denied = (action, code = "42501") => assert.rejects(
      sql.savepoint((scoped) => action(operations(scoped), scoped)), { code },
    );

    await as(a);
    const unreadA = await unread(false);
    await as(admin);
    const unreadAdmin = await unread(true);
    const recipients = await value(sql`select public.communication_recipients('') as value`);
    assert.deepEqual(recipients.map((person) => person.id).sort(), [a, b].sort());
    await denied(({ send }) => send(randomUUID(), "individual", inactive, `${marker} inativo`), "22023");
    const individual = randomUUID();
    assert.equal(await send(individual, "individual", a, `${marker} individual`, true), 1);
    assert.equal(await send(individual, "individual", a, `${marker} individual`, true), 1);
    await denied(({ send }) => send(individual, "individual", b, `${marker} individual`, true), "22023");
    assert.equal(await send(randomUUID(), "all", null, `${marker} geral`), 2);
    assert.equal(await send(randomUUID(), "trial", null, `${marker} grupo`), 1);
    const sent = await list(true);
    assert.equal(sent.length, 4);
    assert.equal(new Set(sent.filter((r) => r.audience === "all").map((r) => r.id)).size, 2);
    const [conversation] = await list(true, "priority");
    assert.equal(conversation.priority, true);
    assert.equal(conversation.recipient_id, a);
    assert.equal(conversation.initial_read_at, null);
    const { id } = conversation;

    await as(b);
    assert.deepEqual((await list(false)).map((r) => r.audience), ["all"]);
    await denied(({ open }) => open(id, false));
    await denied(({ reply }) => reply(id, false, "Resposta indevida"));
    await denied(({ list }) => list(true));
    await denied(({ archive }) => archive(id, true));
    await denied(({ send }) => send(randomUUID(), "individual", a, marker));
    await denied(async (_ops, scoped) => scoped`select id from public.communication_messages limit 1`);
    const otherNotices = await sql`select id from public.professional_notifications
      where kind = 'admin_communication' and recipient_user_id = ${a}`;
    assert.equal(otherNotices.length, 0, "A caixa de notificações respeita o destinatário.");
    await as(inactive);
    assert.deepEqual(await list(false), []);
    await as(a);
    assert.equal((await list(false, "unread")).length, 3);
    assert.equal(await unread(false), unreadA + 3);
    const first = (await open(id, false)).messages[0];
    assert(first.read_at);
    assert.equal(await unread(false), unreadA + 2);
    assert.equal((await open(id, false)).messages[0].read_at, first.read_at);
    const response = randomUUID();
    assert.equal(await reply(id, false, "Resposta da conta A", response), response);
    assert.equal(await reply(id, false, "Resposta da conta A", response), response);

    await as(admin);
    assert.equal(await unread(true), unreadAdmin + 1);
    assert.equal((await list(true, "waiting"))[0].id, id);
    assert.equal((await list(true, "priority"))[0].initial_read_at, first.read_at);
    const adminView = await open(id, true);
    assert.equal(adminView.messages.length, 2);
    assert.equal(adminView.messages[1].body, "Resposta da conta A");
    assert(adminView.messages[1].read_at);
    assert.equal(await unread(true), unreadAdmin);
    await reply(id, true, "Resposta da administração");
    assert.equal(await archive(id, true), true);
    assert.equal((await list(true, "archived"))[0].id, id);
    assert.equal((await list(true)).some((r) => r.id === id), false);

    await as(a);
    assert.equal(await unread(false), unreadA + 3);
    const history = await open(id, false);
    assert.equal(history.archived, true);
    assert.deepEqual(history.messages.map((m) => m.author), ["admin", "professional", "admin"]);
    assert(history.messages.every((m, index, all) => index === 0 || m.created_at >= all[index - 1].created_at));
    await denied(({ reply }) => reply(id, false, "Conversa arquivada"), "22023");
    await as(admin);
    assert.equal(await archive(id, false), false);
    await as(a);
    assert.equal((await open(id, false)).archived, false);
    await reply(id, false, "Conversa restaurada");
    throw rollback;
  });
  assert.fail("A transação deveria ter sido revertida.");
} catch (error) {
  if (error !== rollback) throw error;
  console.log("Cenários de comunicação aprovados; nenhuma alteração gravada.");
} finally {
  await db.end();
}
