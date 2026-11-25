# TeraClini

Quero iniciar a construção de um NOVO PRODUTO SaaS, completamente independente de qualquer sistema de gestão de clínicas já existente.

IMPORTANTE:

Este projeto NÃO é uma continuação do TreinaMente HUB.

Não reutilize regras de negócio específicas de clínicas, sublocação, salas alugadas, gestão de unidades ou administração de clínicas.

O conceito deste novo produto é diferente:

O SISTEMA PERTENCE AO PROFISSIONAL.

O profissional pode trabalhar em uma ou várias clínicas, consultórios, espaços, instituições ou também atender online.

As clínicas podem mudar.

Os locais onde ele atende podem mudar.

Mas sua prática profissional, seus pacientes, seus registros, seu histórico clínico e sua organização devem permanecer com ele.

O produto deve funcionar como um ambiente pessoal e profissional de gestão da prática clínica.

CONCEITO CENTRAL:

"A clínica muda. Sua prática continua com você."

ou

"Sua prática clínica, onde você estiver."

O nome comercial ainda NÃO está definido. Portanto, utilize temporariamente um nome neutro no projeto, como:

PROJETO PRÁTICA

Não criar branding definitivo neste momento.

==================================================

1. OBJETIVO DO PRODUTO

==================================================

Construir uma plataforma SaaS moderna para profissionais que atuam na prática clínica e precisam organizar sua atividade profissional de forma independente.

O profissional deve conseguir:

- cadastrar seus dados profissionais;

- cadastrar seus pacientes;

- registrar pacientes de diferentes faixas etárias;

- cadastrar diferentes locais onde atende;

- trabalhar em várias clínicas ao mesmo tempo;

- ter uma agenda única, independentemente do local;

- registrar atendimentos;

- registrar anamneses;

- registrar evoluções;

- manter prontuário/histórico do paciente;

- anexar documentos;

- acompanhar a trajetória clínica do paciente;

- organizar sua rotina profissional;

- acessar seus dados pelo celular;

- levar sua organização profissional para qualquer local onde passe a atuar.

A plataforma NÃO deve depender da existência de uma clínica.

O profissional é a entidade central do sistema.

==================================================

2. PÚBLICO-ALVO

==================================================

Construir a arquitetura pensando inicialmente em profissionais como:

- Psicólogos

- Psicopedagogos

- Neuropsicopedagogos

- Fonoaudiólogos

- Psicanalistas

- Neuropsicanalistas

- Terapeutas e outros profissionais compatíveis com a proposta

IMPORTANTE:

Não assumir que todas as profissões possuem exatamente as mesmas exigências legais ou documentais.

A estrutura deve permitir futuramente configurar campos, formulários, documentos e fluxos específicos por profissão.

Neste primeiro momento, criar uma estrutura suficientemente flexível.

==================================================

3. PRINCÍPIO FUNDAMENTAL DE ARQUITETURA

==================================================

A estrutura principal NÃO deve ser:

CLÍNICA

  ↓

PROFISSIONAL

  ↓

PACIENTE

A estrutura principal deve ser:

PROFISSIONAL

  ↓

PACIENTES

  ↓

LOCAIS DE ATENDIMENTO

  ↓

AGENDA

  ↓

ATENDIMENTOS

  ↓

REGISTROS CLÍNICOS

O profissional pode possuir:

1 ou vários locais de atendimento.

Exemplo:

Profissional:

Eduardo

Locais:

- Consultório próprio

- Clínica A

- Clínica B

- Atendimento online

Todos esses locais pertencem à organização do profissional.

A agenda deve conseguir mostrar tudo em uma única visão.

==================================================

4. PRINCÍPIO DE PORTABILIDADE

==================================================

Este é um dos principais diferenciais do produto.

O sistema deve ser pensado desde o início para que os dados profissionais pertençam ao profissional dentro da sua conta.

Exemplo:

Um profissional atende:

Segunda:

Clínica A

Terça:

Clínica B

Quarta:

Consultório próprio

Quinta:

Online

Ele NÃO deve precisar manter quatro sistemas diferentes.

Deve existir uma única:

AGENDA

PACIENTE

PRONTUÁRIO

HISTÓRIA CLÍNICA

EVOLUÇÃO

DOCUMENTAÇÃO

O local é apenas uma característica do atendimento.

==================================================

5. PRIMEIRO OBJETIVO: CONSTRUIR UMA BASE SÓLIDA

==================================================

Antes de sair implementando todos os módulos:

1. Analise a estrutura atual do projeto.

2. Identifique:

- framework;

- arquitetura;

- banco de dados;

- autenticação;

- componentes;

- rotas;

- padrões de UI;

- gerenciamento de estado;

- APIs;

- estrutura de dados;

- segurança.

3. Se o projeto estiver vazio, crie uma arquitetura limpa e escalável.

4. Não criar código desnecessário.

5. Não instalar bibliotecas sem necessidade.

6. Não criar funcionalidades fictícias apenas para preencher telas.

7. Priorizar componentes reutilizáveis.

8. Priorizar mobile-first.

9. Garantir que a arquitetura permita evolução futura para SaaS multiusuário/multitenant.

==================================================

6. PRIMEIRA EXPERIÊNCIA DO USUÁRIO

==================================================

Depois do cadastro/login, o profissional deve passar por um onboarding simples.

Não criar um formulário enorme.

O onboarding deve perguntar apenas o necessário para começar.

Exemplo:

ETAPA 1

"Vamos configurar seu espaço profissional"

Nome

Profissão

Registro profissional, quando aplicável

Cidade/Estado

ETAPA 2

"Como você atende?"

[ ] Presencial

[ ] Online

[ ] Presencial e online

ETAPA 3

"Onde você atende?"

Permitir cadastrar:

Nome do local

Tipo:

- Consultório próprio

- Clínica

- Instituição

- Atendimento domiciliar

- Online

- Outro

Endereço opcional.

ETAPA 4

"Você quer começar cadastrando seu primeiro paciente?"

[ Cadastrar paciente ]

[ Fazer isso depois ]

O onboarding deve ser rápido e agradável.

==================================================

7. DASHBOARD PRINCIPAL

==================================================

Após o onboarding, criar uma dashboard chamada:

"Meu Dia"

Essa deve ser a tela principal do sistema.

Não quero uma dashboard cheia de gráficos sem utilidade.

O foco deve ser a rotina real do profissional.

Mostrar:

- próximos atendimentos;

- quantidade de atendimentos do dia;

- pacientes aguardando registro/evolução;

- próximos compromissos;

- alertas importantes;

- atalhos rápidos.

Exemplo:

BOM DIA, EDUARDO

Seu dia

09:00

Maria

Psicologia

Clínica A

10:30

João

Psicopedagogia

Consultório próprio

14:00

Ana

Atendimento online

18:00

Carlos

Clínica B

Criar botão destacado:

+ NOVO AGENDAMENTO

E atalhos:

+ NOVO PACIENTE

+ NOVO LOCAL

BUSCAR PACIENTE

==================================================

8. AGENDA

==================================================

Criar uma agenda moderna.

A agenda deve permitir:

- dia;

- semana;

- mês.

Filtros:

- todos os locais;

- local específico;

- tipo de atendimento;

- status.

Quando estiver em "Todos os locais":

mostrar os atendimentos em uma única agenda.

Exemplo:

09:00

Maria

Clínica A

10:00

João

Clínica B

11:00

Carlos

Online

12:00

Livre

O local deve aparecer claramente no compromisso.

==================================================

9. CONFLITOS DE AGENDA

==================================================

Criar regras desde o início.

O mesmo profissional NÃO pode possuir dois atendimentos simultâneos.

O mesmo paciente NÃO pode possuir dois atendimentos simultâneos.

Se futuramente existirem salas vinculadas a locais, uma mesma sala não pode ser utilizada simultaneamente.

IMPORTANTE:

O sistema deve permitir que diferentes locais tenham atendimentos simultâneos quando isso não representar conflito para o profissional.

Não criar uma regra que bloqueie todo o horário simplesmente porque outro local possui disponibilidade.

==================================================

10. NOVO AGENDAMENTO

==================================================

Criar um fluxo simples:

+ NOVO AGENDAMENTO

Campos:

Paciente

Data

Horário inicial

Horário final

Local de atendimento

Tipo de atendimento

Modalidade

Observações

Tipos inicialmente:

- Atendimento clínico

- Devolutiva

- Reunião com pais/responsáveis

- Reunião escolar

- Anamnese

- Outro

Modalidade:

- Presencial

- Online

- Domiciliar

- Outro

Permitir selecionar:

Paciente existente

ou

+ Novo paciente

==================================================

11. PACIENTES

==================================================

Criar módulo:

PACIENTES

Listagem com:

Nome

Idade

Contato

Último atendimento

Próximo atendimento

Status

Busca rápida.

Filtros.

Acesso rápido ao prontuário.

Criar botão:

+ NOVO PACIENTE

==================================================

12. CADASTRO ADAPTATIVO DO PACIENTE

==================================================

Esse ponto é importante.

O sistema deve perguntar:

"Quem será atendido?"

Faixas:

- Criança

- Adolescente

- Adulto

O formulário deve se adaptar.

Para crianças/adolescentes permitir dados do responsável.

Exemplo:

Paciente

Nome

Data de nascimento

Sexo

Contato

Endereço

Responsável:

Nome

Parentesco

Telefone

Email

Criar estrutura preparada para consentimentos e informações específicas de menores.

NÃO criar regras jurídicas rígidas neste momento.

A estrutura deve ser configurável.

==================================================

13. PERFIL DO PACIENTE

==================================================

Criar uma tela central:

"Perfil do paciente"

Com:

- dados cadastrais;

- responsáveis;

- contatos;

- locais/forma de atendimento;

- próximos atendimentos;

- histórico de atendimentos;

- anamneses;

- evoluções;

- documentos;

- registros;

- observações pertinentes.

Criar uma linha do tempo clínica.

Exemplo:

15/09/2026

Atendimento clínico

Profissional

Local

10/09/2026

Evolução registrada

01/09/2026

Anamnese concluída

20/08/2026

Documento anexado

A experiência deve ser muito organizada.

==================================================

14. PRONTUÁRIO / HISTÓRICO CLÍNICO

==================================================

Criar um espaço organizado para o histórico do paciente.

Não quero apenas uma lista de arquivos.

Quero uma estrutura cronológica e contextual.

Organizar:

- cadastro;

- anamnese;

- atendimentos;

- evoluções;

- documentos;

- encaminhamentos;

- observações;

- histórico.

O sistema deve diferenciar claramente:

REGISTRO ADMINISTRATIVO

de

REGISTRO CLÍNICO.

Isso será importante para segurança e evolução futura.

==================================================

15. ANAMNESE

==================================================

Criar módulo de anamnese.

Inicialmente utilizar estrutura flexível.

Categorias possíveis:

Identificação

Queixa principal

Histórico

Desenvolvimento

Contexto familiar

Contexto escolar/profissional

Aspectos relevantes

Observações

Encaminhamentos

IMPORTANTE:

Não criar uma única anamnese rígida para todas as profissões.

Criar arquitetura preparada para templates.

Futuramente:

Anamnese Psicologia

Anamnese Psicopedagogia

Anamnese Fonoaudiologia

etc.

==================================================

16. EVOLUÇÃO

==================================================

Após um atendimento, deve existir uma ação clara:

"Registrar evolução"

A evolução deve estar vinculada ao atendimento correspondente.

Fluxo:

Agenda

↓

Abrir atendimento

↓

Atendimento realizado

↓

Registrar evolução

Não permitir que a evolução fique solta sem contexto.

Criar data/hora e autor.

==================================================

17. DOCUMENTOS

==================================================

Permitir anexar documentos ao paciente.

Organizar por:

- documentos clínicos;

- documentos administrativos;

- anexos;

- outros.

Preparar estrutura para:

- PDF;

- imagens;

- documentos.

Criar limites e validações.

Não permitir arquivos perigosos.

==================================================

18. LOCAIS DE ATENDIMENTO

==================================================

Criar módulo:

"Meus locais"

Permitir cadastrar vários.

Exemplo:

Clínica TreinaMente

Consultório particular

Clínica B

Atendimento online

Cada local deve possuir:

Nome

Tipo

Endereço

Contato opcional

Observações

O local NÃO é o proprietário dos pacientes.

O paciente pertence à conta do profissional.

==================================================

19. PACIENTE NÃO PERTENCE À CLÍNICA

==================================================

Essa regra deve estar refletida na arquitetura.

O paciente pertence ao profissional.

O local pertence ao atendimento.

Exemplo:

Paciente Maria:

2025 → Clínica A

2026 → Clínica B

2026 → Consultório próprio

A história clínica deve permanecer unificada.

Isso é FUNDAMENTAL para o produto.

==================================================

20. RESPONSIVIDADE

==================================================

Construir mobile-first.

O profissional provavelmente utilizará o sistema pelo celular durante sua rotina.

No celular deve ser possível:

- consultar agenda;

- criar atendimento;

- cadastrar paciente;

- buscar paciente;

- abrir prontuário;

- registrar evolução;

- consultar anamnese;

- anexar documento;

- alterar agenda;

- consultar locais.

Não criar uma versão mobile simplificada demais.

Mobile deve ter paridade funcional com desktop nos recursos essenciais.

==================================================

21. BUSCA GLOBAL

==================================================

Criar uma busca global.

O profissional deve conseguir pesquisar:

Paciente

Atendimento

Documento

Local

Exemplo:

Pesquisar:

"Maria"

Resultado:

Maria Silva

Próximo atendimento: hoje 14:00

Local: Clínica A

Ao clicar:

abrir perfil do paciente.

==================================================

22. SEGURANÇA E PRIVACIDADE

==================================================

Como o sistema poderá armazenar informações clínicas sensíveis:

Desde o início estruturar:

- autenticação segura;

- autorização por usuário;

- isolamento dos dados;

- controle de acesso;

- logs de ações relevantes;

- proteção de arquivos;

- não expor dados clínicos em URLs;

- validação de inputs;

- proteção contra acesso indevido;

- estrutura preparada para LGPD.

Não criar informações clínicas em logs desnecessariamente.

Nunca exibir conteúdo clínico sensível em mensagens de erro.

==================================================

23. ARQUITETURA MULTI-TENANT

==================================================

Mesmo sendo inicialmente utilizado por um profissional individual, construir a arquitetura pensando em SaaS.

Cada conta deve ter seus dados isolados.

Estrutura conceitual:

ACCOUNT

  ↓

PROFESSIONAL

  ↓

PATIENTS

  ↓

LOCATIONS

  ↓

APPOINTMENTS

  ↓

CLINICAL RECORDS

  ↓

DOCUMENTS

Não criar dados globais compartilhados entre contas, exceto estruturas realmente globais.

O sistema deve estar preparado para futuramente oferecer planos e recursos diferentes.

==================================================

24. FUTUROS MÓDULOS

==================================================

NÃO IMPLEMENTAR AGORA.

Apenas deixar a arquitetura preparada.

Futuro:

- financeiro;

- cobrança;

- pagamentos;

- confirmação de consultas;

- lembretes;

- lista de espera;

- integração Google Calendar;

- WhatsApp;

- assinatura digital;

- teleatendimento;

- portal do paciente;

- formulários inteligentes;

- documentos personalizados;

- relatórios;

- indicadores;

- inteligência artificial assistiva;

- automações;

- integração com plataformas externas.

A IA futuramente poderá ajudar na organização dos registros, mas NÃO deve assumir diagnóstico ou decisão clínica.

==================================================

25. DESIGN / UX

==================================================

Quero um produto com aparência de SaaS moderno.

Evitar aparência de:

- sistema hospitalar antigo;

- ERP;

- software administrativo;

- sistema burocrático.

A sensação deve ser:

- profissional;

- moderno;

- limpo;

- acolhedor;

- confiável;

- rápido;

- premium;

- simples.

Priorizar:

espaçamento;

tipografia;

hierarquia;

cards leves;

boa visualização da agenda;

ações rápidas;

mobile-first.

Não exagerar em gráficos.

O produto deve parecer uma ferramenta que o profissional gosta de usar.

==================================================

26. NAVEGAÇÃO PRINCIPAL

==================================================

Criar inicialmente:

MEU DIA

AGENDA

PACIENTES

LOCAIS

PRONTUÁRIO / HISTÓRICO

DOCUMENTOS

RELATÓRIOS

CONFIGURAÇÕES

Pode existir um menu lateral no desktop e navegação inferior/compacta no mobile.

No mobile priorizar:

Meu Dia

Agenda

Pacientes

Busca

Mais

==================================================

27. PRINCÍPIO DE SIMPLICIDADE

==================================================

Não transformar o sistema em um ERP.

A pergunta para cada funcionalidade deve ser:

"Isso ajuda o profissional a atender melhor e organizar sua prática?"

Se não:

não implementar agora.

O objetivo é que um profissional consiga abrir o sistema e entender como usar em poucos minutos.

==================================================

28. PREPARAR O PRODUTO PARA ESCALA

==================================================

Embora o MVP seja para profissionais individuais, a arquitetura deve permitir futuramente:

Plano individual

Plano profissional

Plano profissional + assistente

Plano clínica

Plano clínica avançada

Mas NÃO implementar cobrança ou planos agora.

A arquitetura deve apenas evitar decisões que impeçam essa evolução.

==================================================

29. O QUE NÃO FAZER

==================================================

NÃO criar:

- sublocação;

- controle de aluguel de salas;

- repasse para clínicas;

- gestão financeira de clínicas;

- estoque;

- gestão hospitalar;

- funcionários de clínica;

- secretária como núcleo do produto;

- múltiplas clínicas proprietárias dos mesmos pacientes;

- regras específicas do TreinaMente;

- módulos administrativos desnecessários.

Este produto é:

PROFISSIONAL → PACIENTE → PRÁTICA CLÍNICA.

==================================================

30. METODOLOGIA DE IMPLEMENTAÇÃO

==================================================

NÃO tente criar tudo de uma vez.

Primeiro faça uma AUDITORIA da estrutura atual.

Depois apresente:

1. arquitetura proposta;

2. banco de dados;

3. entidades;

4. relacionamentos;

5. rotas;

6. componentes principais;

7. regras de negócio;

8. estratégia de segurança;

9. estratégia mobile;

10. plano de implementação.

Depois comece pela fundação:

FASE 1

- autenticação;

- conta/profissional;

- onboarding;

- dashboard Meu Dia;

- estrutura de banco;

- navegação;

- layout responsivo.

FASE 2

- pacientes;

- cadastro adaptativo;

- perfil do paciente;

- busca.

FASE 3

- locais;

- agenda;

- agendamento;

- conflitos.

FASE 4

- prontuário;

- anamnese;

- evolução;

- histórico;

- documentos.

FASE 5

- refinamento de UX;

- segurança;

- responsividade;

- testes;

- performance.

Após cada fase:

- revisar código;

- eliminar duplicações;

- corrigir inconsistências;

- testar desktop;

- testar mobile;

- verificar persistência no banco;

- verificar permissões;

- verificar fluxos completos.

NÃO avançar deixando funcionalidades quebradas.

==================================================

31. REGRA IMPORTANTE PARA O LOVABLE

==================================================

Antes de modificar qualquer coisa existente:

AUDITE.

Antes de criar uma nova tabela:

verifique se já existe estrutura equivalente.

Antes de criar um componente:

verifique se já existe componente reutilizável.

Antes de instalar dependência:

verifique se a funcionalidade pode ser implementada com o que já existe.

Evitar código duplicado.

Evitar componentes gigantes.

Evitar lógica de negócio diretamente espalhada pelas telas.

Separar:

UI

↓

lógica

↓

serviços

↓

persistência

==================================================

32. CRITÉRIO DE SUCESSO DO PRIMEIRO MVP

==================================================

Um profissional novo deve conseguir:

1. Criar sua conta.

2. Informar sua profissão.

3. Cadastrar um ou mais locais.

4. Cadastrar um paciente.

5. Agendar esse paciente.

6. Visualizar sua agenda.

7. Abrir o paciente.

8. Registrar uma anamnese.

9. Realizar um atendimento.

10. Registrar a evolução.

11. Consultar o histórico.

12. Anexar um documento.

13. Fazer tudo isso pelo celular.

E, principalmente:

Se amanhã esse profissional deixar uma clínica e começar a atender em outra, seus pacientes e registros continuam pertencendo à sua conta e sua história permanece organizada.

Esse é o conceito central do produto.

==================================================

33. AGORA EXECUTE

==================================================

Comece pela AUDITORIA.

Não implemente tudo imediatamente.

Primeiro me mostre:

- arquitetura atual;

- o que já existe;

- o que pode ser aproveitado;

- o que precisa ser criado;

- proposta de banco;

- proposta de navegação;

- proposta de UX;

- riscos técnicos;

- plano das fases.

Depois da auditoria, aguarde minha aprovação para iniciar a implementação da FASE 1.

IMPORTANTE:

Não invente funcionalidades que não foram solicitadas.

Não simplifique retirando requisitos importantes.

Não altere a lógica sem explicar.

Priorize código limpo, segurança, performance, escalabilidade e experiência de uso.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://teraclini.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/60bfaf44-f776-4359-b347-9f629b072d10).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
