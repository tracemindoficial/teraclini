# Auditoria e consolidação do cadastro de pacientes

## Diagnóstico confirmado

- A página institucional (`/`) está isolada das áreas protegidas. O acesso institucional leva a `/auth`, o sistema profissional começa em `/meu-dia`, a administração em `/admin` e o pré-cadastro público em `/pre-cadastro/$token`.
- Existe um único roteador, um único conjunto de providers e nenhum conflito, rota curinga indevida ou estrutura React Router antiga no projeto atual.
- O CSS global não contém camada invisível ou regra ampla que bloqueie botões. Os principais controles estão conectados aos seus eventos.
- O cadastro manual e o pré-cadastro público já usam o mesmo conjunto de campos e a mesma validação. A divergência restante está na tela profissional de revisão, que ainda possui um editor próprio e incompleto.
- O banco já preserva paciente, responsável, informações iniciais, origem do cadastro e aprovação transacional. Não é necessário remover tabelas ou dados.

## Implementação

1. **Consolidar o formulário canônico**
   - Evoluir o componente compartilhado para suportar os modos profissional, pré-cadastro público e revisão.
   - Substituir o editor duplicado da revisão pelo mesmo formulário completo e pela mesma validação.
   - Preservar os campos exclusivos do contexto profissional, como situação e observações, fora do núcleo compartilhado.

2. **Completar os controles solicitados**
   - Trocar sexo/gênero livre pelas opções Masculino, Feminino, Outro e Prefiro não informar, com detalhe condicional para Outro.
   - Manter perguntas clínicas condicionais.
   - Adicionar consulta de CEP para preencher logradouro, bairro, cidade e UF, mantendo todos editáveis e permitindo continuidade quando a consulta estiver indisponível.
   - Aplicar máscaras de CPF, CEP e telefone sem alterar os valores normalizados enviados.

3. **Preservar persistência e segurança**
   - Manter os fluxos manual e de aprovação transacionais e isolados por conta.
   - Não apagar, recriar ou migrar dados sem necessidade comprovada.
   - Ajustar o contrato de persistência somente se algum campo canônico não tiver destino atual; qualquer ajuste será aditivo e seguro.

4. **Validar os fluxos reais**
   - Repetir institucional → acesso e acesso direto ao sistema.
   - Testar abertura, preenchimento e validação do cadastro manual.
   - Testar geração e abertura anônima do link de pré-cadastro.
   - Testar revisão usando o formulário canônico e confirmar que os controles de salvar e aprovar aparecem apenas em solicitações pendentes.
   - Executar testes automatizados, verificar a compilação e revisar a interface em desktop e celular.

## Limites de validação

- Não aprovar, recusar ou alterar solicitações reais existentes apenas para teste.
- A aprovação completa será comprovada com um registro descartável autorizado; sem isso, será validada até o ponto anterior à mutação e pelos testes automatizados do contrato transacional.

## Resultado esperado

Um único cadastro completo atende criação manual, preenchimento público e revisão profissional, sem perda de dados e sem interferência da página institucional.
