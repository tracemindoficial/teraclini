# Refatoração estrutural sem mudança de comportamento

## Diagnóstico confirmado

Os erros `id is not a function` e `items is not a function` não são produzidos por esta base:

- os rastros apontam para `src/pages/Home.tsx`, `src/pages/Index.tsx`, `react-router-dom` e `BrowserRouter`;
- este projeto usa TanStack Start, não possui `src/pages`, não depende de `react-router-dom` e esses endereços retornam 404 no servidor atual;
- a prévia oficial deste projeto é `id-preview--...lovable.app`; o painel de erro está capturando `...lovableproject.com`, vinculado a outra aplicação/revisão;
- o projeto atual compila e a página inicial foi aberta sem erros, falhas de rede ou módulos legados.

Não serão criados arquivos fictícios para mascarar um erro de outra aplicação.

## Objetivo

Refatorar profundamente a base atual para reduzir duplicação, separar interface, regras e acesso a dados, melhorar tipagem e tornar a arquitetura previsível, mantendo exatamente as mesmas rotas, telas, dados e comportamentos.

## Etapas

### 1. Fundamentos compartilhados

- Centralizar chaves de consulta e invalidação para eliminar strings repetidas e reduzir atualizações inconsistentes.
- Substituir coerções duplicadas de respostas por helpers tipados para resposta única, opcional, lista e exclusão.
- Centralizar tratamento de erros apresentados ao usuário sem remover os registros técnicos seguros existentes.
- Criar tipos portáveis de formulário e remover usos de namespace global `React.*`.

### 2. Autenticação e perfil profissional

- Extrair a leitura de sessão e a decisão de destino pós-login para uma única função reutilizada por e-mail, Google e entrada em `/auth`.
- Manter bloqueio de envio duplicado, timeout, mensagens atuais e redirecionamentos de onboarding.
- Compartilhar a transformação de profissão personalizada entre onboarding e configurações.
- Preservar o gate autenticado, isolamento por conta e limpeza de cache no logout.

### 3. Camada de dados por domínio

- Padronizar consultas e mutações em `profile`, `patients`, `locations`, `appointments`, `clinical`, `documents`, `dashboard` e `schedule`.
- Remover duplicação de `currentUserId`, `unwrap`, exclusões e invalidações sem alterar os exports públicos usados pelas telas.
- Manter o cliente do navegador, RLS e os campos de transição `user_id`/`account_id` atuais.
- Corrigir apenas inconsistências seguras encontradas durante a refatoração, sem mudar regras clínicas ou de agenda.

### 4. Formulários e componentes

- Criar blocos pequenos e reutilizáveis para campos, ações de diálogo e atualização imutável de formulário.
- Simplificar `AppointmentDialog`, `PatientDialog`, `LocationDialog`, `AnamnesisDialog`, onboarding e configurações sem alterar rótulos, validações ou disposição visual.
- Extrair o painel de documentos e as seções do perfil de paciente do arquivo de rota, mantendo as mesmas abas e interações.
- Mover a linha de agendamento compartilhada para um componente neutro, evitando que a Agenda importe uma rota de Meu Dia.

### 5. Rotas e estrutura visual

- Extrair metadados repetidos para um helper que preserve títulos e descrições exclusivos de cada rota.
- Substituir controles HTML crus por componentes existentes do sistema de design quando houver equivalente, sem alterar aparência ou comandos.
- Manter TanStack Router, caminhos atuais, navegação móvel/desktop e SSR conforme a arquitetura existente.

### 6. Limpeza controlada

- Remover imports, exports, estados e componentes comprovadamente sem uso.
- Não editar arquivos gerados, integrações geradas, banco ou migrações nesta refatoração.
- Registrar as decisões estruturais permanentes em `AGENTS.md`.

## Validação

- Compilação automática sem erros após cada conjunto de mudanças.
- Verificação de lint e TypeScript nas áreas alteradas.
- Testes no navegador da página pública, autenticação, onboarding, Meu Dia, Agenda, Pacientes, perfil do paciente, Locais, Documentos e Configurações.
- Validação em desktop e celular, sem alterações visuais inesperadas.
- Fluxos autenticados validados com sessão real: persistência, logout/login, criação e edição dos registros existentes.
- Confirmar que nenhum pedido carrega `src/pages/*`, `react-router-dom` ou componentes da aplicação divergente.

## Fora do escopo

- Novas funcionalidades, mudanças visuais, mudanças de banco, alterações nas regras de negócio e conclusão das funcionalidades pendentes da Fase 1.
- Qualquer tentativa de reproduzir dentro deste projeto os arquivos `Home.tsx` ou `Index.tsx` da aplicação divergente.
