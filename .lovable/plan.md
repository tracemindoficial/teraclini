# Camada comercial e aquisição TeraClini

## Objetivo

Transformar a página inicial atual na porta comercial do TeraClini, preservando integralmente o SaaS, a autenticação, a área profissional e a administração já existentes. A comunicação será voltada a profissionais independentes e usará somente recursos comprovados no produto.

## O que será construído

- Nova página inicial responsiva com navegação fixa, apresentação clara, problema, solução, recursos reais, funcionamento, benefícios, experiência do sistema, público atendido, diferenciais, licenças, confiança, FAQ, chamada final e rodapé.
- Representação visual fiel das telas atuais usando a identidade e os padrões do próprio produto, sem dados clínicos reais.
- Entrada permanente para usuários existentes em `/auth` e início de cadastro para novos usuários no modo correto.
- Área de licenças alimentada apenas por planos ativos cadastrados pela administração; enquanto não houver plano real, será exibido um estado transparente, sem preço ou oferta inventados.
- Página de contratação preparada para selecionar uma licença, criar a conta e continuar para pagamento quando um provedor real for configurado. Nenhuma cobrança ou ativação fictícia será criada.
- Termos de uso públicos e integração dos links de privacidade e suporte já existentes.
- Eventos de conversão sem conteúdo clínico ou dados sensíveis: visualização da página e dos planos, cliques de acesso/cadastro, seleção de licença e início do cadastro. Eventos de checkout e compra só serão registrados quando houver gateway real.

## Integração com o produto existente

```text
Página inicial
  ├─ Acessar minha conta → login → área profissional
  │                                  └─ Administração, se autorizado
  └─ Começar agora → licenças ativas
                       ├─ sem licença ativa → cadastro + aviso transparente
                       └─ licença escolhida → cadastro com seleção preservada
                                              └─ checkout real, quando configurado
```

- A criação da conta continuará usando o fluxo atual de autenticação e onboarding.
- O papel administrativo continuará adicional ao papel profissional e validado no servidor.
- A landing não terá acesso a prontuários, pacientes ou qualquer conteúdo clínico.

## Dados e segurança

- Expor publicamente somente nome, preço, periodicidade e descrição comercial de licenças marcadas como ativas.
- Criar armazenamento mínimo para eventos comerciais, com tipos permitidos, sem e-mail, nome, IP, conteúdo clínico ou identificadores de pacientes.
- Manter alterações de licença e configurações restritas à administração autorizada.
- Não ativar pagamento, assinatura ou licença automaticamente sem provedor e regras comerciais reais.

## Interface e conteúdo

- Reutilizar logo, paleta, tipografia, botões e componentes TeraClini.
- Priorizar leitura rápida, espaço em branco, contraste, microinterações discretas e navegação móvel acessível.
- Usar textos específicos para psicólogos, psicopedagogos, fonoaudiólogos, psicanalistas e terapeutas independentes.
- Não incluir depoimentos, quantidade de clientes, resultados, valores, contato empresarial ou parceiros sem dados fornecidos.

## Validação

- Verificar página inicial, navegação, cadastro, login, seleção de licença, estados sem planos e proteção das áreas internas.
- Testar desktop e celular, teclado, foco, títulos/descrições sociais e ausência de erros no navegador.
- Executar tipagem, lint, testes automatizados, compilação e verificação de segurança do banco.

## Dependências externas que permanecerão explícitas

- Domínio informado: ilustrativo; manter os endereços atuais do projeto.
- Gateway de pagamento: ainda não configurado.
- Licenças e preços: nenhum plano ativo existe hoje; precisam ser cadastrados pela administração.
- Depoimentos, números públicos, contato e dados institucionais: não fornecidos.
