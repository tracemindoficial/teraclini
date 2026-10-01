# Pré-cadastro de pacientes por link

## Objetivo
Permitir que cada profissional gere um link privado, receba os dados do futuro paciente, revise a solicitação e somente então aprove a criação do paciente oficial.

## Auditoria do que já existe
- O cadastro oficial de pacientes já reúne identificação, faixa etária, contato, endereço, situação e observações; ele será ampliado, não duplicado.
- Responsáveis já possuem estrutura própria e serão reutilizados para crianças e adolescentes.
- Cada paciente já pertence a uma conta profissional por `account_id`, com isolamento no banco.
- A tela Pacientes, o prontuário, a busca e a agenda já consomem a mesma tabela oficial; uma aprovação passará a aparecer nesses módulos sem caminhos paralelos.
- Há componentes de formulário, diálogos, avisos, progresso e identidade TeraClini reutilizáveis.
- Há auditoria que registra ações e nomes de campos alterados sem copiar conteúdo clínico.

## O que será construído

### 1. Links seguros do profissional
- Criar links com token aleatório forte armazenado somente como hash.
- Definir validade padrão, situação ativa, expirada ou revogada e limite de uso.
- Permitir copiar, compartilhar, gerar novo link e invalidar links existentes.
- Não colocar nome, conta, paciente ou informação clínica na URL.

### 2. Solicitação separada do paciente oficial
- Criar uma solicitação vinculada à conta do profissional com estados: aguardando preenchimento, aguardando aprovação, aprovado, recusado e expirado.
- Guardar os dados enviados em estrutura restrita aos membros da conta.
- Não criar usuário do sistema e não inserir em `patients` durante o preenchimento público.
- Registrar origem, envio, revisão, aprovação, recusa e vínculo final sem registrar conteúdo sensível no histórico técnico.

### 3. Formulário público em seis etapas
- Criar a rota pública `/cadastro/$token`, sem login, com identidade TeraClini e prioridade para celular.
- Etapas: dados pessoais; contato e endereço; sobre você; terapia e saúde; pagamento e origem; revisão e envio.
- Incluir todos os campos pedidos, opções sensíveis não obrigatórias e perguntas condicionais.
- Adaptar o cadastro de menores para dados do responsável.
- Validar CPF, e-mail, CEP, data de nascimento e obrigatórios com mensagens claras.
- Exibir privacidade e consentimento antes do envio; após o envio, mostrar confirmação sem sugerir aprovação.
- Não salvar dados clínicos no navegador.

### 4. Revisão pelo profissional
- Adicionar “Convidar paciente” em Pacientes, com gestão dos links.
- Adicionar “Solicitações de cadastro” com contagem e estados, sem expor dados sensíveis na lista.
- Criar revisão completa para visualizar, corrigir, complementar, salvar, recusar ou aprovar explicitamente.
- Exibir pendências também em Meu Dia com acesso direto à revisão.

### 5. Aprovação e duplicidade
- Executar a aprovação de forma atômica no banco.
- Antes de criar, comparar CPF, e-mail e nome + nascimento dentro da mesma conta.
- Bloquear criação automática quando houver possível duplicidade e oferecer vínculo explícito a um paciente existente.
- Na aprovação sem conflito, criar o paciente oficial, criar o responsável quando aplicável, registrar `pre_registration_link` como origem e vincular a solicitação.
- Garantir que o paciente aprovado apareça normalmente em Pacientes, Busca, Agenda, Atendimentos, Prontuário, Anamnese e Documentos.

## Segurança e privacidade
- Acesso autenticado às solicitações limitado por associação à conta no banco.
- Entrada pública somente por funções controladas; nenhuma tabela sensível terá leitura anônima direta.
- Validação no servidor, expiração/revogação, uso único e limitação de tentativas por link e origem.
- Respostas públicas neutras, sem revelar existência do profissional, conta, pacientes ou duplicidades.
- Auditoria sem nomes, e-mails, CPF, telefone, endereço ou respostas clínicas.

## Estrutura técnica
- Novas tabelas: `patient_registration_links`, `patient_registration_requests` e `patient_registration_rate_limits`, todas com permissões explícitas e proteção por conta.
- Ampliação de `patients` apenas para os dados cadastrais ausentes e a origem do cadastro.
- Funções transacionais para criar/revogar links, validar/submeter formulário, detectar duplicidade, aprovar, vincular e recusar.
- Funções internas do aplicativo em módulos `*.functions.ts`; formulário público não acessará dados privados diretamente.
- Hooks do recurso em `src/lib/data` e chaves compartilhadas em `src/lib/query-keys.ts`.
- Componentes reutilizáveis em `src/components/patient-registration`; rotas apenas compõem as telas.

## Validação
- Gerar, copiar, compartilhar, revogar e expirar link.
- Abrir sem login, preencher no celular, testar condicionais, validações e confirmação.
- Receber, editar, recusar e aprovar; testar possível duplicidade e vínculo existente.
- Confirmar que somente a aprovação cria paciente e que os dados aparecem nos módulos existentes.
- Testar isolamento entre duas contas e ausência de dados sensíveis em URL, listas, erros e auditoria.
- Verificar desktop, tablet e celular, além das funções atuais de pacientes, agenda e prontuário.
