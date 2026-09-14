# PROJETO PRÁTICA — Auditoria e Plano de Construção

## 1. Auditoria do que existe hoje

O projeto está **vazio**: é o template inicial, sem nenhuma regra de negócio.

Já existe (aproveitável):
- Estrutura de aplicação web moderna com páginas, navegação e renderização no servidor.
- Sistema de design com cores/temas centralizados e biblioteca de componentes de interface (botões, formulários, cartões, diálogos, tabelas, calendário, abas).
- Página inicial ainda com o marcador do template (será substituída).
- Nenhum banco de dados, nenhum login, nenhum arquivo de TreinaMente HUB. Nada a reaproveitar de clínicas.

Precisa ser criado: backend (banco, login, armazenamento de arquivos), todos os módulos, o layout do produto e a identidade visual neutra.

## 2. Arquitetura proposta

Entidade central é o **profissional (a conta)**. Nenhum dado nasce de uma clínica.

```text
CONTA (profissional)
  ├── perfil profissional (profissão, registro, cidade)
  ├── locais de atendimento
  ├── pacientes
  │     ├── responsáveis
  │     ├── anamneses
  │     ├── documentos
  │     └── linha do tempo clínica
  └── agendamentos ──► evolução (1 por atendimento)
```

Isolamento total por conta: cada linha de cada tabela carrega o dono, e o banco só devolve dados de quem está logado. Locais são apenas um atributo do atendimento — trocar de clínica não move nem perde nada.

## 3. Banco de dados proposto

- `profiles` — dados do profissional, profissão, registro, cidade/UF, estado do onboarding.
- `locations` — nome, tipo (consultório próprio, clínica, instituição, domiciliar, online, outro), endereço, contato, observações.
- `patients` — nome, faixa etária (criança/adolescente/adulto), nascimento, sexo, contato, endereço, status.
- `guardians` — responsáveis vinculados ao paciente (nome, parentesco, telefone, e-mail).
- `appointments` — paciente, local, data, início, fim, tipo, modalidade, status, observações.
- `anamneses` — vinculada ao paciente, com conteúdo em blocos flexíveis (preparado para modelos por profissão).
- `evolutions` — sempre vinculada a um atendimento, com autor e data/hora.
- `documents` — arquivos do paciente, categoria (clínico/administrativo/anexo/outro), guardados em área privada.
- `activity_log` — registro de ações relevantes, sem conteúdo clínico.

Separação explícita entre registro administrativo e registro clínico por categoria em cada tabela.

## 4. Navegação proposta

Desktop: menu lateral — Meu Dia, Agenda, Pacientes, Locais, Documentos, Relatórios, Configurações.
Mobile: barra inferior — Meu Dia, Agenda, Pacientes, Busca, Mais.
Prontuário/histórico vive dentro do perfil do paciente (é onde ele faz sentido), com acesso também pela busca global.

## 5. UX proposta

Aparência de SaaS moderno e acolhedor: muito espaço em branco, tipografia com hierarquia clara, cartões leves, paleta serena (verde-azulado profundo + neutros quentes), nada de cara de sistema hospitalar. Sem gráficos decorativos. Tudo desenhado primeiro para o celular.

## 6. Riscos técnicos

- **Conflitos de agenda**: precisa ser validado no servidor, não só na tela — mesmo profissional e mesmo paciente não podem ter dois horários sobrepostos; locais diferentes podem ter horários simultâneos entre si.
- **Arquivos sensíveis**: área de arquivos privada, com link temporário, tipos permitidos e limite de tamanho.
- **Anamnese flexível** sem virar bagunça: conteúdo em blocos versionáveis desde o começo.
- **Privacidade**: nenhum dado clínico em endereço de página, mensagem de erro ou registro de log.
- **Escala futura (assistente, plano clínica)**: a conta já é a unidade de isolamento, então adicionar membros depois não exige refazer o banco.

## 7. Plano de fases

**FASE 1 — Fundação**: backend, cadastro/login, perfil profissional, onboarding em 4 etapas, layout responsivo com menus, dashboard "Meu Dia".
**FASE 2 — Pacientes**: listagem, cadastro adaptativo por faixa etária, responsáveis, perfil do paciente, busca global.
**FASE 3 — Locais e agenda**: meus locais, agenda dia/semana/mês com filtros, novo agendamento, regras de conflito.
**FASE 4 — Clínico**: prontuário cronológico, anamnese por modelos, evolução vinculada ao atendimento, documentos.
**FASE 5 — Refino**: UX, segurança, responsividade, testes de fluxo completo, performance.

Cada fase termina com revisão, teste no desktop e no celular e verificação de permissões antes de avançar.

## 8. O que não será feito

Sublocação, aluguel de salas, repasse, financeiro de clínica, estoque, funcionários, secretária como núcleo, planos/cobrança, e qualquer regra do TreinaMente.

---

Aprovando este plano, começo pela **FASE 1**.
