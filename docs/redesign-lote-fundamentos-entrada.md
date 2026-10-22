# StudyConnect Mobile — fundamentos visuais e entrada

Data: 21/10/2026. Este lote continua a auditoria registrada em
[`redesign-onboarding-diagnostico.md`](./redesign-onboarding-diagnostico.md).
A prancha de 15 telas e a especificação de 26 telas foram usadas como referências
de composição. Seus percentuais, trilhas e outros dados ilustrativos não foram
transferidos para o aplicativo.

## Diagnóstico e decisões

- O Mobile já tinha autenticação, MFA, recuperação, serviços REST, cinco abas e
  funcionalidades de estudo. A marca na interface e nos assets gerados ainda era
  um monograma `S`, e as abas usavam glifos Unicode.
- O Web foi consultado apenas para recuperar a marca oficial transparente de
  `public/icons.png`; o backend foi consultado para confirmar as regras reais de
  senha. Nenhum dos dois projetos foi modificado.
- A base mantém fundo escuro, superfícies discretas e roxo para ações e seleção.
  Foram acrescentados tokens sem trocar contratos ou dados.
- A navegação inferior usa a ordem Início, Explorar, Trilhas, Foco e Perfil. A barra
  ocupa seu espaço no layout; o excesso anterior de padding inferior foi removido.
  StudyMode continua disponível apenas no Android, como antes.

## Telas e componentes deste lote

| Rota ou área | Estado | Alteração |
| --- | --- | --- |
| `/boas-vindas` | Revisada | Logo oficial, propósito claro e ações cadastro/login/Google; tour anterior removido da entrada. |
| `/cadastro` | Revisada | Hierarquia e cinco requisitos de senha, conforme backend. |
| `/verificar-email` | Revisada | Campo único nativo apresentado em seis posições, com colagem e autofill. |
| `/login` | Revisada | Formulário principal, recuperação acessível e Google como opção posterior. |
| `/recuperar-senha` | Revisada | Pedido por e-mail, etapa de token/link e redefinição no mesmo fluxo. |
| `/mfa` | Revisada | Código de seis dígitos e bloqueio de envio duplicado. |
| Tabs | Base revisada | Ícones Ionicons, ordem/rótulos e área inferior. |
| Home, Explorar, Trilhas, Foco, Perfil | Redesign pendente | Conteúdo e dados mantidos; somente ajustes da barra e assinatura textual na Home. |
| Onboarding após cadastro (08–13) | Pendente | Precisa de elegibilidade por conta, persistência e guia sobre controles reais. |
| Detalhes, aulas, estatísticas e perfil editável (14–26) | Pendente | Funcionalidade existente preservada; novo desenho fica para lotes posteriores. |

Componentes compartilhados revisados: `BrandMark`, `AuthScreen`, `FormInput`,
`CodeInput` (no módulo `FormInput`), `PrimaryButton` e a barra de abas. A marca
original foi copiada para `assets/studyconnect-mark.png` por recorte transparente,
sem redesenhar o livro e o capelo. Ícone, splash e imagens adaptativas agora usam
essa marca. `scripts/generate-brand-assets.cjs` foi atualizado para regenerar os
assets a partir da cópia local da marca; a regeneração manteve os mesmos hashes.
A fonte de ícones é pré-carregada e um erro de fonte não prende a
abertura em loading permanente.

Arquivos principais alterados neste lote: `src/app/(auth)/*`,
`src/app/(app)/(tabs)/_layout.js`, `src/app/_layout.js`, componentes citados,
`src/theme/*`, `package.json`/`package-lock.json` e assets `studyconnect-*`.
O trabalho não limpou AsyncStorage, SecureStore nem alterou chaves de StudyMode.

## Navegação, API e dependências

- Cadastro continua usando `POST /usuarios`; verificação usa
  `POST /auth/verify-email`; login, MFA e Google usam os serviços existentes.
  Recuperação continua usando os endpoints atuais de pedido e redefinição.
- O cadastro segue a regra real de no mínimo oito caracteres, maiúscula,
  minúscula, número e símbolo. A redefinição segue a regra real de no mínimo
  seis caracteres. Nenhum DTO ou endpoint foi inventado.
- Foi instalado `@expo/vector-icons` pela CLI do Expo para obter uma família
  consistente de ícones. Expo e Expo Router receberam somente os patches
  recomendados pelo Expo Doctor para o SDK 57.
- O `ProductTour` legado permanece no código, mas não é mais aberto antes do
  cadastro. O onboarding autenticado ainda não foi implementado.

## Validação e limites

- `npx.cmd expo lint`: passou.
- `npm.cmd run test:study-mode`: 21 cenários de analytics e 13 de notificações passaram.
- `node tests/googleButton.test.cjs` e `node tests/accountDeletion.test.cjs`: passaram.
- `npx.cmd expo-doctor`: 21/21 verificações passaram após os patches de dependência.
- `npx.cmd expo export --platform android`: bundle Hermes gerado com 1404 módulos.
- `git diff --check`: passou; apenas avisos LF/CRLF do Git.
- `npx.cmd tsc --noEmit`: não verifica o projeto porque não há `tsconfig.json`.
  Uma checagem direcionada com `--allowJs --checkJs` passou para os layouts raiz
  e de abas. A checagem ampliada das telas JS encontra inferências incompletas
  de props já sem tipagem no projeto; não é um typecheck global aprovado.

Não houve teste visual em aparelho, login real, escrita no backend nem validação
com fonte ampliada ou TalkBack. O ambiente não tem `adb`. Uma falha transitória
na restauração de `AuthContext` ainda pode limpar a sessão; esse comportamento
preexistente precisa ser tratado no lote de estabilidade. A Home e as demais
áreas autenticadas ainda não têm o desenho final da prancha.

## Próxima validação no Android

Em um development build ou APK, conferir: abertura e assets nativos; larguras
320, 360, 393 e 412 dp; teclado com cadastro e login; código de e-mail por
digitação, colagem e autofill; login tradicional, Google e MFA; recuperação por
token/link; retorno e rotação de navegação; troca de conta; escala de fonte e
TalkBack; abas sem conteúdo coberto pela barra do sistema.

Um **novo APK é necessário para conferir o ícone e o splash nativos**. O bundle
JavaScript foi validado, mas nenhum EAS Build foi executado. Não houve commit
nem push.
