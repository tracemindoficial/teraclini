# Cadastros básicos padronizados do TeraClini

## Diagnóstico confirmado

- **Serviços já têm uma base correta:** `appointment_types` possui ID, conta, duração, status e já se relaciona com atendimentos e pacotes. Ela será evoluída, não duplicada.
- **Especialidades ainda são texto solto:** perfil, primeiro acesso e configurações usam uma lista fixa e gravam apenas `profiles.profession`.
- **Valores ainda não são um cadastro:** pacotes guardam valores decimais próprios e atendimentos só possuem um valor eventual de sessão de pacote. Não existe tabela de preços reutilizável.
- **Agenda ainda usa o tipo legado:** o formulário grava o enum `appointments.type`, apesar de `appointments.appointment_type_id` já existir. O único atendimento atual não possui serviço vinculado e será preservado.
- O banco atual contém 4 perfis, 1 atendimento, nenhum serviço configurável e nenhum pacote. Nenhum dado existente será apagado ou reescrito de forma destrutiva.

## Implementação

### 1. Modelo central e isolamento

- Criar especialidades por conta e o relacionamento de múltiplas especialidades com o perfil.
- Reaproveitar `appointment_types` como **Serviços / Atendimentos**, acrescentando descrição e categoria.
- Criar tabela de preços por serviço, em centavos de real, com duração, modalidade, cobrança avulsa ou pacote, quantidade e status.
- Normalizar nomes no banco para impedir duplicidades por maiúsculas, acentos ou espaços extras dentro da mesma conta.
- Aplicar permissões e isolamento por conta em todas as tabelas; profissionais nunca poderão ler ou alterar cadastros de outra conta.
- Semear os conjuntos iniciais de forma idempotente para contas atuais e futuras, sem duplicar registros.

### 2. Compatibilidade e histórico

- Migrar a profissão atual de cada perfil para uma especialidade relacionada, preservando `profiles.profession` como compatibilidade durante a transição.
- Manter o enum legado dos atendimentos antigos, mas fazer novos agendamentos usarem `appointment_type_id` como referência principal.
- Adicionar ao atendimento a referência do preço escolhido e uma fotografia imutável do valor, duração e nome aplicados naquele momento.
- Edições econômicas relevantes criarão uma nova versão de preço; a versão anterior ficará inativa e continuará ligada ao histórico.
- Reaproveitar `care_packages` para pacotes contratados por pacientes e vinculá-los à oferta de preço escolhida; valores antigos serão preservados e espelhados em centavos de forma aditiva.
- Pacotes compostos por serviços diferentes ficam apenas preparados arquiteturalmente, sem implementação nesta versão.

### 3. Área Cadastros Básicos

- Transformar Configurações em uma área com páginas próprias de **Perfil** e **Cadastros Básicos**.
- Criar três visões: **Especialidades**, **Serviços / Atendimentos** e **Valores / Tabela de preços**.
- Incluir pesquisa, filtro ativo/inativo, ordenação, criação, edição e ativação/desativação.
- Usar formulários com validações de nome, duração, valor, modalidade, tipo de cobrança e quantidade de pacote.
- Exibir valores em reais, embora o banco armazene centavos inteiros.

### 4. Integrações

- Perfil profissional: permitir várias especialidades por relacionamento e manter uma principal para compatibilidade visual.
- Primeiro acesso: selecionar especialidade ativa do cadastro central sem aumentar os campos obrigatórios atuais.
- Agenda: selecionar serviço ativo, sugerir duração e mostrar preços compatíveis; ao escolher um preço, preencher valor e duração sem redigitação.
- Atendimentos e histórico: mostrar serviço e valor contratados pela fotografia histórica, mesmo após desativação ou reajuste.
- Pacotes: selecionar serviço e oferta de pacote cadastrada, calcular valor individual em centavos e manter o consumo derivado dos atendimentos realizados.
- Relatórios e filtros existentes passarão a usar os IDs centrais onde já houver suporte, sem criar um módulo financeiro novo.

### 5. Administração global

- Separar modelos iniciais do sistema dos registros privados de cada profissional.
- Permitir que a administração da plataforma mantenha apenas os modelos globais por operações autorizadas no servidor; personalizações permanecem isoladas por conta.
- Alterar um modelo global não mudará retroativamente as cópias nem os históricos dos profissionais.

## Segurança e validação

- Testes unitários para normalização, moeda em centavos, cálculo de pacote, seleção automática e fotografia histórica.
- Testes reais de criar, editar, pesquisar, desativar e reativar especialidades, serviços e preços.
- Confirmar que itens inativos somem de novas seleções, mas continuam visíveis em registros históricos.
- Testar agenda avulsa online/presencial, pacote, reajuste futuro e permanência do valor anterior.
- Validar isolamento com duas contas fictícias autorizadas, além de desktop e celular.
- Não alterar solicitações, pacientes ou atendimentos reais durante os testes; mutações ponta a ponta usarão dados descartáveis.

## Entregável final

- Relatório do que foi encontrado, criado e reutilizado.
- Relação das tabelas e vínculos adotados.
- Explicação da preservação histórica e do isolamento entre profissionais.
- Resultado honesto dos testes executados e de qualquer validação bloqueada por sessão.