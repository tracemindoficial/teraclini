# Central de Ajuda interativa TeraClini

## Objetivo

Criar uma Central de Ajuda pesquisável e integrada ao uso diário, com conteúdo inicial fiel às telas atuais, tutoriais guiados e gestão exclusiva pela administração.

## Experiência do profissional

- Adicionar **Ajuda** à navegação lateral, ao menu “Mais” no celular e ao cabeçalho.
- Criar `/ajuda` com busca por título, descrição, categoria, conteúdo, palavras-chave e sinônimos.
- Organizar conteúdos reais em: Primeiros passos, Meu Dia, Agenda e atendimentos, Pacientes e prontuário, Locais, Pacotes, Documentos, Relatórios, Perfil e acesso.
- Criar páginas individuais em `/ajuda/$slug` com objetivo, etapas numeradas, resultado esperado, mídia opcional e ação “Ver como funciona”.
- Incluir FAQ expansível e a opção “Solicitar ajuda” preparada como estado informativo, sem inventar um canal de suporte.
- Adicionar links contextuais nas páginas principais para abrir diretamente o tutorial correspondente.
- Mostrar uma introdução opcional após o primeiro onboarding, com “Começar tutorial” e “Explorar sozinho”, sem bloquear a aplicação.

## Tutorial guiado

- Criar um componente reutilizável de orientação com destaque do elemento real, contador de etapas, Próximo, Voltar, Pular e Fechar.
- Identificar os controles existentes com alvos estáveis e acessíveis, adaptando a posição da orientação para computador e celular.
- Iniciar o guia a partir do conteúdo e levar o usuário à página correta sem perder o contexto.
- Persistir introdução vista, progresso e conclusão por usuário.

## Administração

- Criar `/admin/ajuda` para listar, filtrar, criar, editar, ordenar, ativar e desativar categorias e tutoriais.
- Permitir título, resumo, categoria, palavras-chave/sinônimos, conteúdo estruturado, etapas, ordem, visibilidade e URLs opcionais de imagem ou vídeo.
- Exigir confirmação antes de desativar e registrar alterações na auditoria administrativa.
- Restringir toda gestão ao administrador global no servidor; usuários comuns recebem acesso negado.

## Dados e segurança

- Criar tabelas para categorias, tutoriais, etapas, progresso e eventos de ajuda, com `GRANT`, RLS, índices e validações na mesma migração.
- Usar visibilidade `all`, `professional` ou `admin`; conteúdo inativo nunca aparece ao profissional.
- Registrar apenas tipo do evento, tutorial, termo normalizado, presença de resultados e horário; nunca conteúdo clínico ou dados de pacientes.
- Popular a migração com pelo menos um tutorial por funcionalidade principal já existente, incluindo Agenda, Pacientes, prontuário/evolução, Locais, Documentos, Pacotes, Relatórios, Perfil e recuperação de acesso.

## Organização técnica

- Manter páginas apenas como composição; componentes da ajuda ficam em `src/components/help`.
- Manter consultas e mutações em `src/lib/data/help.ts`, chaves em `src/lib/query-keys.ts` e operações administrativas protegidas em funções de servidor.
- Reutilizar os componentes e tokens visuais existentes, sem alterar regras clínicas ou comerciais.

## Validação

- Testar pesquisa por sinônimos, abertura de conteúdo, FAQ, tutorial guiado, fechamento sem perda de contexto e persistência da conclusão.
- Testar criação/edição/desativação como administrador e bloqueio da mesma área para usuário comum.
- Validar visualmente em computador e celular, além de tipos, testes, lint, build, RLS e ausência de erros no navegador.
