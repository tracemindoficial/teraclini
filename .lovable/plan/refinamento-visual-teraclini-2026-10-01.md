# Refinamento visual TeraClini

## Objetivo
Transformar a interface atual em um produto mais leve, premium e coerente com a nova marca, sem alterar autenticação, dados ou regras de negócio.

## Auditoria concluída
- A base visual já usa tokens semânticos TeraClini, Manrope/Sora, ícones lineares e componentes compartilhados.
- O logo atual é um ativo antigo; o novo arquivo oficial já possui transparência e pode ser integrado sem moldura branca.
- A navegação desktop atual tem largura fixa e não preserva estado contraído.
- A navegação mobile já possui barra inferior, mas ainda mistura busca e menu e não segue integralmente a hierarquia proposta.
- Meu Dia, Agenda e Pacientes já usam estruturas adaptáveis, porém precisam de hierarquia, densidade e controles próprios para celular.
- O prontuário tem abas, mas a faixa de abas precisa rolagem confortável em telas estreitas.
- Não existe módulo financeiro funcional nesta versão. Ele não será inventado nesta revisão visual; o menu continuará expondo apenas módulos reais.

## Implementação

### 1. Marca e design system
- Publicar o novo logo oficial como ativo do app e substituir todas as versões antigas.
- Gerar um favicon quadrado a partir do símbolo oficial, sem distorcer o logo.
- Ajustar superfícies, bordas, sombras, tipografia, foco e transições usando somente tokens semânticos.
- Usar o logo completo em login/onboarding e uma apresentação compacta na navegação contraída.

### 2. Navegação e cabeçalho
- Reestruturar o shell compartilhado com menu desktop expandido/contraído.
- Manter um trilho estreito com ícones quando contraído; o conteúdo recupera o espaço liberado.
- Persistir a preferência localmente e oferecer botão claro, tooltip e atalho acessível.
- No tablet, iniciar em modo compacto para priorizar conteúdo.
- No celular, manter navegação inferior com Meu Dia, Agenda, Pacientes e Mais; busca fica no cabeçalho.
- “Mais” abre os módulos reais restantes, perfil e saída, com alvos de toque adequados.

### 3. Meu Dia
- Criar indicadores responsivos com agenda do dia, confirmações, pacientes e pendências disponíveis nos dados atuais.
- Priorizar próximos atendimentos, alertas e ações rápidas sem sobrecarregar.
- Reorganizar em uma coluna no celular e preservar o checklist de configuração.

### 4. Agenda, pacientes e prontuário
- Tornar filtros e navegação da agenda confortáveis em telas estreitas, priorizando horário e paciente.
- Refinar linhas de atendimento para leitura mobile sem cortar local, situação ou sessão.
- Manter pacientes como lista adaptativa, com dados essenciais e ações acessíveis.
- Tornar as abas do prontuário roláveis e confortáveis no celular, sem alterar seu conteúdo clínico.

### 5. Telas compartilhadas
- Aplicar o mesmo padrão a login, onboarding, pacotes, documentos, relatórios, locais e configurações.
- Revisar formulários e diálogos para uma coluna, largura útil e altura segura no celular.
- Consolidar estilos repetidos sem alterar comportamento.

## Validação
- Confirmar compilação e ausência de erros de interface.
- Validar menu expandido, contraído, persistência e navegação.
- Revisar 320, 360, 375, 390, 414, 768, 1024, 1366 e 1440 px sem rolagem lateral ou sobreposição.
- Validar login público em desktop/mobile e todas as telas autenticadas quando houver sessão disponível.
- Preservar integralmente autenticação, onboarding, agenda, pacientes, prontuário, documentos, pacotes, pré-cadastro, relatórios e configurações.
