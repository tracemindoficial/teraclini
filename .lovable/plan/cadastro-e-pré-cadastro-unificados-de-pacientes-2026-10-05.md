# Cadastro e pré-cadastro unificados de pacientes

## Diagnóstico confirmado

Hoje existem dois formulários e dois contratos diferentes:

- O cadastro manual usa `PatientDialog`, grava primeiro em `patients` e depois, separadamente, em `guardians`.
- O pré-cadastro usa `RegistrationForm`, valida por `registrationPayloadSchema`, grava em `patient_registration_requests` e só depois a operação `approve_patient_registration` cria ou vincula o paciente.
- A aprovação ativa já é transacional e preserva as respostas clínicas em uma anamnese `pre_registration`, mas o cadastro manual não coleta nem grava o mesmo conjunto completo.
- A incompatibilidade dos modelos não é a causa direta comprovada da falha silenciosa de aprovação: a operação ativa aceita a estrutura atual e retorna um UUID. Porém, ela cria uma diferença permanente entre pacientes cadastrados manualmente e pacientes vindos por link.
- Ao vincular um pré-cadastro a um paciente existente, a operação atual preserva a anamnese, mas não completa os dados cadastrais não vazios do paciente.
- Existem 3 pacientes, 2 solicitações e nenhum responsável no banco. A mudança será aditiva e não alterará esses registros durante a implementação.

## Matriz comparativa auditada

| Campo/grupo | Manual atual | Pré-cadastro atual | Destino atual | Situação |
| --- | --- | --- | --- | --- |
| Nome completo | Sim | Sim | `patients.full_name` | Mesmo campo |
| Faixa etária | Sim | Sim | `patients.age_group` | Mesmo campo |
| Nascimento | Opcional | Obrigatório | `patients.birth_date` | Regra diferente |
| Gênero/sexo | Sim | Sim | `patients.gender` | Mesmo campo |
| CPF | Não | Sim | `patients.cpf` | Ausente no manual |
| E-mail | Sim | Obrigatório | `patients.email` | Regra diferente |
| Telefone | Sim | Sim | `patients.phone` | Mesmo campo |
| CEP | Não | Obrigatório | `patients.postal_code` | Ausente no manual |
| Logradouro | Endereço livre | Sim | `patients.address` consolidado | Estrutura diferente |
| Número | Não | Sim | `patients.address_number` | Ausente no manual |
| Complemento | Não | Sim | `patients.address_complement` | Ausente no manual |
| Bairro | Não | Sim | `patients.neighborhood` | Ausente no manual |
| Cidade/UF | Só no endereço livre | Obrigatório | `patients.city/state` | Ausente como campo no manual |
| Estado civil | Não | Sim | `patients.marital_status` | Ausente no manual |
| Escolaridade | Não | Sim | `patients.education` | Ausente no manual |
| Profissão/ocupação | Não | Sim | `patients.occupation` | Ausente no manual |
| Responsável: nome/vínculo/telefone/e-mail | Sim, opcional para novo menor | Sim, nome obrigatório para menor | `guardians` | Regras diferentes |
| Contato de emergência | Não | Sim | anamnese `pre_registration` | Ausente no manual |
| Motivo da busca | Não | Obrigatório | anamnese `pre_registration` | Ausente no manual |
| Terapia anterior e detalhes | Não | Sim | anamnese `pre_registration` | Ausente no manual |
| Diagnóstico informado e detalhes | Não | Sim | anamnese `pre_registration` | Ausente no manual |
| Medicamentos e detalhes | Não | Sim | anamnese `pre_registration` | Ausente no manual |
| Histórico familiar e detalhes | Não | Sim | anamnese `pre_registration` | Ausente no manual |
| Preferência de pagamento | Não | Sim | anamnese + solicitação original | Ausente no manual |
| Origem/indicação | Não | Sim | anamnese + `registration_source` | Ausente no manual |
| Observações internas | Sim | Não | `patients.notes` | Interno do profissional |
| Situação operacional | Sim | Não | `patients.status` | Interno do profissional |
| Consentimento | Não aplicável | Obrigatório | `privacy_consent_at` na solicitação | Exclusivo do processo público |
| Status/revisão do pedido | Não aplicável | Sim | `patient_registration_requests` | Exclusivo do processo público |
| Nome social, WhatsApp, telefone secundário, escola, série, turno, profissionais de saúde, disponibilidade, preferência de modalidade | Não | Não | Sem estrutura atual | Fora do modelo existente; não será inventado |

## Implementação

### 1. Modelo e validação únicos
- Extrair um contrato central de cadastro completo com os campos do paciente, responsável e informações iniciais.
- Derivar desse contrato o modo público, que acrescenta consentimento, e o modo profissional, que acrescenta situação e observações internas.
- Reutilizar as mesmas normalizações de CPF, CEP, e-mail, UF, campos condicionais e responsável de menor.

### 2. Formulário completo compartilhado
- Criar componentes de campos compartilhados sob `src/components/patients`, sem duplicar definições.
- Usá-los no cadastro manual e no formulário público; cada tela manterá apenas sua navegação e ações próprias.
- Manter status e observações apenas no modo profissional, e consentimento apenas no modo público.

### 3. Persistência transacional
- Adicionar uma operação autenticada e transacional para salvar o cadastro manual completo em `patients`, `guardians` e `anamneses`.
- Preservar o `user_id` legado e o `account_id`, validar associação à conta e manter RLS ativa.
- Atualizar a aprovação para mapear o mesmo contrato: cadastro em `patients`, responsável em `guardians` e informações iniciais em `anamneses`.
- Ao vincular paciente existente, preencher somente lacunas cadastrais com valores não vazios; nunca apagar valores existentes nem mesclar sem escolha explícita.
- Manter a solicitação original íntegra após aprovação, garantindo rastreabilidade e ausência de descarte silencioso.

### 4. Revisão e interface
- Exibir todos os campos coletados na revisão antes da confirmação.
- Bloquear “criar novo” quando houver correspondência e exigir a escolha explícita de vincular ou revisar.
- Atualizar listas, detalhes, responsáveis, anamneses, links e tarefas somente após confirmação persistida.
- Traduzir falhas esperadas sem expor dados ou detalhes internos.

### 5. Compatibilidade e segurança
- Não remover tabelas, colunas, pacientes, solicitações ou históricos.
- Aplicar somente migração aditiva para a operação transacional e seus privilégios restritos.
- Manter o formulário público sem acesso direto às tabelas clínicas.
- Confirmar isolamento por conta, uso único da aprovação e proteção contra duplo envio.

## Validação

- Testes unitários do contrato compartilhado, normalização e campos condicionais.
- Teste do cadastro manual completo e leitura após recarregar.
- Teste do pré-cadastro com os mesmos campos, aprovação e comparação dos destinos.
- Teste de vínculo com paciente existente sem sobrescrever valores por vazios.
- Testes de duplicidade, segunda aprovação, conta diferente e acesso público indevido.
- Verificação visual em desktop e celular.
- Os testes autenticados serão marcados como não executados, sem alegar sucesso, caso a sessão profissional não esteja disponível.
