# Gestão administrativa de usuários e limpeza controlada

## Diagnóstico confirmado

- Existem 10 identidades, todas com perfil e conta correspondentes; não há e-mails duplicados nem registros órfãos.
- A conta master ativa e `eduardocomplex@gmail.com` serão preservadas sem alterações destrutivas.
- Seis contas explicitamente identificadas como teste estão vazias de dados clínicos e financeiros e são candidatas à limpeza; uma conta de teste possui paciente vinculado e será preservada como incerta.
- A edição percorre o formulário e a função protegida, mas depende de uma RPC com tipagem nula frágil e ainda não foi comprovada com uma sessão administrativa real. A remoção de papel administrativo também possui uma assinatura incompatível com `null`.
- A listagem ainda não oferece inclusão segura, prévia de exclusão, pagamento detalhado nem filtros de bloqueio/pagamento.

## Implementação

1. **Corrigir edição e autorização**
   - Normalizar campos opcionais antes do envio e alinhar tipos da função de banco.
   - Confirmar a linha realmente alterada e retornar erro específico quando identidade, perfil ou conta divergirem.
   - Manter autorização administrativa no servidor, auditoria e atualização imediata da lista/detalhe.
   - Corrigir a remoção de papel administrativo sem enfraquecer a proteção do último master.

2. **Completar a gestão de usuários**
   - Adicionar ações claras na listagem e manter o detalhe existente.
   - Incluir filtros de conta bloqueada e situação de pagamento.
   - Mostrar pagamentos e assinatura reais, incluindo origem local e ausência de gateway em tempo real.
   - Criar inclusão por convite seguro, sem senha exposta, com compensação para evitar identidade órfã.
   - Criar prévia de exclusão com dependências e permitir exclusão somente de conta vazia, não administrativa e explicitamente confirmada.

3. **Limpeza seletiva**
   - Gerar exportação mínima de recuperação das seis contas vazias confirmadas como teste.
   - Excluir somente essas contas pelo fluxo seguro implementado.
   - Preservar qualquer conta com paciente, atendimento, documento, pacote, pagamento, assinatura, suporte ou classificação incerta.
   - Recontar identidades, perfis e contas após a limpeza e confirmar as contas prioritárias.

4. **Validação**
   - Executar testes automatizados para validação, autorização e regras de exclusão.
   - Validar como administrador: edição com recarga, inclusão temporária, ativação/inativação, bloqueio, pagamento sem registro e exclusão da conta temporária.
   - Confirmar rejeição para profissional comum, isolamento entre contas, auditoria e proteção do master.
   - Registrar como pendente qualquer cenário que não possa ser exercitado sem sessão ou sem transação fictícia apropriada.

## Segurança e dados

- Nenhum conteúdo clínico será copiado para auditorias ou exportações administrativas.
- Não haverá exclusão em massa, alteração de identidade master ou liberação ampla de RLS.
- Pagamento local será apresentado como registro administrativo; confirmação em tempo real permanecerá indisponível até existir gateway integrado.
