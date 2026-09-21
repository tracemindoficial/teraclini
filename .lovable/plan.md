# Auditoria e correção de autenticação e primeiro acesso

## Diagnóstico confirmado

1. **Causa direta do bloqueio na etapa 1**
   - O perfil é criado corretamente no banco e recebe o nome fornecido pelo Google.
   - A tela não hidrata o formulário com esse perfil: o nome aparece somente como `placeholder`.
   - O botão “Continuar” usa o estado local vazio para decidir se fica desabilitado. Portanto, visualmente há um nome, mas para a validação ele não existe.
   - A profissão nem sequer participa da validação atual, embora deva ser obrigatória.

2. **Fluxo Google incompleto fora do editor**
   - O Google retorna para a página inicial, que não decide entre onboarding e Meu Dia.
   - O redirecionamento pós-login existente funciona apenas no ramo em que a página não foi redirecionada.
   - Resultado possível: sessão válida, mas usuário devolvido à página pública sem direção clara.

3. **Onboarding sem retomada confiável**
   - As etapas ficam somente na memória do navegador.
   - Nada é salvo ao concluir a primeira etapa; fechar ou atualizar perde o progresso.
   - Os dados do perfil e o local são salvos apenas ao final.
   - O sistema marca `onboarding_completed = true` antes de confirmar o salvamento opcional do local, podendo deixar estado inconsistente.

4. **Regra de primeiro acesso descentralizada**
   - Apenas “Meu Dia” verifica se o onboarding foi concluído.
   - Um perfil incompleto pode abrir diretamente Agenda, Pacientes ou outras páginas.
   - Login por senha e Google sempre tentam ir para Meu Dia e dependem desse redirecionamento tardio.

5. **Banco e segurança**
   - O modelo atual é individual: um usuário corresponde a um perfil; pacientes, agenda, locais e registros usam o usuário como proprietário. Não existe entidade clínica/equipe.
   - Os 9 perfis atuais foram criados corretamente; não há usuário sem perfil.
   - Todas as tabelas públicas têm isolamento por usuário ativo e nenhuma está aberta a visitantes.
   - O verificador de segurança do banco não encontrou alertas.
   - Há uma lacuna de integridade: registros filhos validam o proprietário da própria linha, mas não garantem que paciente, local e atendimento referenciados pertençam ao mesmo profissional.

6. **Dados do Google**
   - Nome e avatar estão disponíveis nos metadados dos acessos Google reais.
   - O gatilho atual copia apenas `full_name`; não possui fallback para `name` nem guarda o avatar no perfil.
   - O e-mail permanece corretamente associado à identidade de autenticação e não precisa ser duplicado no perfil.

7. **UX e acessibilidade**
   - Nome e profissão obrigatórios não são indicados claramente.
   - Os rótulos não estão associados aos campos, prejudicando acessibilidade e testes automatizados.
   - Não há erro persistente com ação explícita “Tentar novamente”.
   - O botão não mostra “Salvando...” na primeira etapa porque ela atualmente não salva nada.

## Correção proposta

### 1. Tornar o primeiro acesso mínimo e atômico
- Substituir as quatro etapas obrigatórias por uma única configuração inicial: nome, profissão, registro, cidade e estado.
- Exigir somente nome e profissão; indicar registro, cidade e estado como opcionais.
- Salvar perfil e `onboarding_completed` juntos em uma única operação confirmada.
- Somente após a confirmação do banco, abrir “Meu Dia”.
- Em erro, manter os dados, mostrar mensagem clara e botão “Tentar novamente”.
- Mostrar “Salvando...” e bloquear envios duplicados.
- Locais, modalidade de atendimento e primeiro paciente passam a ser configuração progressiva dentro do sistema.

### 2. Aproveitar a identidade Google
- Pré-preencher de verdade o nome no estado do formulário.
- Fortalecer a criação do perfil com fallback seguro entre os campos de nome do provedor.
- Adicionar avatar opcional ao perfil e preenchê-lo quando o Google fornecer foto.
- Manter e-mail exclusivamente na autenticação, evitando duplicação e inconsistência.

### 3. Corrigir direcionamento e retomada
- Fazer o Google retornar por uma página pública que conclui a sessão antes de navegar.
- Centralizar a decisão nas páginas protegidas:
  - sem sessão → Entrar;
  - perfil incompleto → Onboarding;
  - onboarding concluído → Meu Dia ou página solicitada.
- Permitir acesso ao próprio onboarding sem loop.
- Remover a verificação tardia exclusiva de “Meu Dia”.
- Limpar dados em memória no logout para impedir qualquer exibição transitória da conta anterior.

### 4. Profissão flexível
- Manter a lista independente de clínica: Psicologia, Psicanálise, Neuropsicanálise, Psicopedagogia, Neuropsicopedagogia, Fonoaudiologia, Terapia e Outra.
- Ao selecionar “Outra”, exigir um campo livre e persistir o texto informado.
- Não aplicar regra única de registro profissional.
- Aceitar cidade e estado sem diferenciação por maiúsculas/minúsculas; normalizar apenas espaços e UF quando informada.

### 5. Reforçar integridade entre contas
- Adicionar validação no banco para impedir que atendimento, responsável, anamnese, evolução ou documento referencie paciente/local/atendimento de outro profissional.
- Preservar todas as regras atuais de isolamento e armazenamento privado.
- Não criar conta de clínica, equipe, unidade ou relação entre profissionais.

### 6. Testes e validação
- Reproduzir o caso “Carlos Eduardo Silva / Psicanálise / 3348484 / PALHOÇA / SC”.
- Cobrir Google novo e existente, nome vindo do Google, registro vazio/preenchido, cidade/UF vazias/preenchidas, fechamento e retorno, conclusão, logout/login e perfil incompleto.
- Validar persistência real do perfil e do indicador de conclusão.
- Testar tentativa de vínculo cruzado entre duas contas.
- Percorrer Meu Dia, Agenda, Pacientes, Locais, Documentos, Relatórios e Configurações.
- Verificar onboarding em desktop, tablet e celular, incluindo botão, erros e ausência de sobreposição.
- Confirmar console e requisições sem falhas críticas ou carregamento permanente.

## Impacto esperado

O produto permanece um SaaS individual. O profissional é o único proprietário da conta, agenda, pacientes, locais e registros. Nenhuma funcionalidade de clínica, equipe ou administração coletiva será criada.
