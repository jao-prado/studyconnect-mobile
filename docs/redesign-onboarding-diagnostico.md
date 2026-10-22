# StudyConnect Mobile — diagnóstico e continuidade

Data: 21/10/2026. Referência: plano “Revisão de UX, Redesign e Onboarding Guiado”.

## Estado desta entrega

**Fase 1 concluída: investigação e arquitetura proposta. Fases 2 e 3 ainda não implementadas.**
Correção adicional entregue: símbolo oficial colorido no botão Google compartilhado
por login e boas-vindas. Não foi alterado nenhum serviço de autenticação.

O escopo completo envolve cadastro/verificação, persistência por conta, navegação,
medição nativa, metas e oito áreas de interface. Conforme a divisão permitida no
plano, esta entrega encerra a investigação sem instalar um segundo tour parcial.
O `ProductTour` anterior permanece funcionando como antes até sua substituição
atômica na fase 2. Não confundir esta entrega com onboarding automático pronto.

Web (`../plutcc`) e backend (`../studyconnect`) foram somente consultados.
Alterações já existentes no mobile foram preservadas; não são novas entregas desta fase.

## 1. Fluxo real do Web

Fontes principais, relativas a `../plutcc`:

- `src/components/AuthForm.jsx`: cadastro como aluno, verificação e login.
- `src/components/dashboard/DashboardPage.jsx`: apresentação, perfil e tour.
- `src/hooks/usePerfilAprendizado.js` e `src/api/services/perfilService.js`: persistência de metas.
- `src/pages/OnboardingPerfilPage.jsx`: opções e cálculo da meta.
- `src/components/ui/SpotlightTour.jsx`: destaque de elementos.
- `src/pages/ExplorarTrilhas.jsx`: tour do catálogo.

### Cadastro e disparo

Após criar a conta, o Web pede código de seis dígitos. Confirma o e-mail e tenta
login usando a senha ainda em memória; o mobile atual confirma o e-mail e pede
que o aluno entre pela tela de login. Não é necessário guardar senha no aparelho
para implementar o novo onboarding.

A Dashboard **não identifica um cadastro novo de forma confiável**: verifica a
ausência de `plut_student_onboarding_done_<id>` no localStorage. Isso também pode
atingir uma conta antiga em outro navegador ou após limpeza de dados. Não copiar
esse critério para o mobile. Candidatos a professor têm uma guarda adicional de
solicitação pendente; o mobile já é exclusivo de alunos.

Sequência observada:

1. Boas-vindas e cinco explicações: explorar, matricular/estudar, progresso,
   dúvidas e desempenho.
2. Formulário de perfil se o recurso não existe.
3. Convite para tour da Dashboard: trilha em andamento, estatísticas e dúvidas respondidas.
4. Convite para Explorar, navegando com `state.startTour`.
5. Tour de Explorar: busca, filtros por disciplina e lista de trilhas.

O Web possui recursos que não estão no mobile. Não prometer dúvidas ou filtros
durante o tutorial mobile sem implementar os recursos correspondentes.

### Metas, conclusão e retomada

O perfil é salvo no backend; o progresso do tour, não. A apresentação e o tour da
Dashboard usam dois marcadores locais diferentes. O botão “Pular” do spotlight
também marca sua chave como concluída. Não há persistência da etapa intermediária
nem das respostas ainda não enviadas; reabrir reinicia a parte não concluída.
O tour do catálogo recebe um estado de navegação transitório.

O spotlight Web usa `data-tour`, `getBoundingClientRect`, `requestAnimationFrame`,
overlay recortado por `clip-path` e borda roxa. É implementação DOM, não reutilizável
diretamente em React Native. Se o alvo não existir, o loop continua esperando;
o mobile precisa de timeout e alternativa acessível.

Outro comportamento que não deve ser reproduzido: `perfilService.getPerfil`
converte **qualquer erro**, não só 404, em `null`. Falha de rede não significa
ausência de perfil e não deve provocar POST/novo onboarding.

## 2. Contratos confirmados no backend

Fontes em `../studyconnect/src/main/java/com/itb/inf3em/studyconnect/`:
`controller/UsuarioController.java`, `controller/EmailVerificationController.java`,
`controller/PerfilAprendizadoController.java`, `model/dto/UsuarioDTO.java`,
`model/dto/LoginResponseDTO.java`, `model/dto/PerfilAprendizadoDTO.java`,
`model/services/UsuarioService.java`, `model/services/EmailVerificationService.java`,
`model/services/AuthService.java`, `model/services/GoogleAuthService.java` e
`model/services/PerfilAprendizadoService.java`.

Todos os caminhos abaixo possuem prefixo `/api/v1` (já aplicado por `apiClient`).

| Operação | Contrato confirmado | Uso previsto |
| --- | --- | --- |
| `POST /usuarios` | `{nome,email,senha}`; 201 com `UsuarioDTO`, incluindo `id` e `email` | Evidência local de cadastro criado com sucesso; conta nasce inativa |
| `POST /auth/verify-email` | `{email,code}`; resposta `{message}` | Só marcar verificação após sucesso; não retorna token |
| `POST /auth/resend-verification` | `{email}` | Preservar fluxo existente |
| `POST /auth/login` / `/auth/google` | `LoginResponseDTO`, ou desafio MFA pendente | Não possui `isNewUser`, data de cadastro ou estado de tour |
| `GET /perfil-aprendizado/{alunoId}` | `PerfilAprendizadoDTO`; 404 quando ausente | Diferenciar 404 de rede/401/403/5xx |
| `POST /perfil-aprendizado` | DTO; 201; 409 se já existe | Criar somente após leitura confirmada e seleção válida |
| `PUT /perfil-aprendizado/{alunoId}` | DTO; 404 se não existe | Editar perfil existente com intenção explícita |

`PerfilAprendizadoDTO` contém exatamente:
`alunoId`, `objetivo`, `nivel`, `horasSemana`, `metaSemanal`, `ritmo`,
`interesses` e `dificuldades`. Os dois últimos são strings separadas por vírgula.
O serviço aplica autorização por aluno, inclusive no POST; não contornar isso.

Opções reais do formulário Web (o DTO usa strings, não enums validados):

- Objetivo: `ENEM`, `VESTIBULAR`, `REFORCO`, `FACULDADE`.
- Nível: `BASICO`, `INTERMEDIARIO`, `AVANCADO`.
- Horas semanais: `1`, `3`, `5`, `10`, apresentadas como “Menos de 1h”,
  “1h a 3h”, “3h a 5h” e “Mais de 5h”.
- Ritmo: `LEVE`, `MODERADO`, `INTENSO`.
- Interesses/dificuldades: Matemática, Português, Física, Química, Biologia,
  História, Geografia, Inglês, Filosofia, Informática; ao menos uma por grupo.
- Meta semanal: base 2/4/6/10 para as quatro faixas; INTENSO acrescenta 2;
  LEVE subtrai 2, mínimo 1; MODERADO mantém a base.

**Meta semanal de aprendizado não é a meta diária em minutos do StudyMode.**
Não sobrescrever a meta local de foco com esse DTO.

Não foi localizado recurso de progresso/conclusão de onboarding no backend.
`GoogleAuthService` encontra ou cria uma conta, mas retorna o mesmo DTO nos dois
casos. Sem mudança de contrato, não disparar tour automaticamente para cadastros
Google. Perfil ausente e primeira instalação também não provam conta nova.

## 3. Arquitetura proposta para a fase 2 (ainda não implementada)

Um único controlador autenticado de onboarding, com estado versionado por `user.id`.
Substituir o `ProductTour` e retirar seu disparo opcional em boas-vindas na mesma
entrega em que o novo fluxo entrar. Manter a apresentação pública curta na própria
tela, sem outro mecanismo de etapas concorrente.

### Elegibilidade e persistência

1. Após 201 de cadastro, aproveitar `id` e `email` devolvidos para persistir a
   origem `email-signup`, sem senha, código, JWT ou idToken.
2. Vincular sucesso da verificação ao mesmo registro. Nunca confiar apenas em
   parâmetro de rota como `novo=true`, nem criar elegibilidade ao reenviar código.
3. Iniciar somente depois de autenticação completa, incluindo MFA, com ID e e-mail
   correspondentes e origem/verificação confirmadas. Restauração de sessão pode
   retomar um registro elegível já existente, não criar um por inferência.
4. Salvar um documento por conta no AsyncStorage, por exemplo
   `studyconnect:onboarding:v1:<id>`, com etapa, rascunho validado de escolhas,
   estado de envio do perfil, pausa e conclusão. Essas são **chaves locais
   propostas**, não campos de API existentes.
5. Serializar gravações; confirmar persistência antes de avançar. Se falhar,
   oferecer tentar novamente e sair com aviso, sem declarar conclusão falsa.
6. Estado em memória isolado por ID, com desmontagem ao trocar conta e descarte
   de respostas assíncronas de uma sessão anterior. Logout não apaga o progresso.
7. Fechar o app retoma a etapa salva; “Continuar depois” e Voltar Android pausam
   sem concluir. Pausa explícita oferece retomada visível no início/perfil, sem
   forçar a abertura repetida. “Começar a estudar” marca conclusão somente após
   persistência bem-sucedida.

Limites: reinstalação/limpeza de armazenamento perde o tour local; não sincroniza
entre aparelhos nem com o Web. Se cadastro/verificação ocorrer fora do aparelho,
ou a gravação local falhar, não adivinhar que a conta é nova. Oferecer início
manual do **mesmo** guia na área de ajuda/perfil; não um segundo tour.
O backend precisaria de sinal explícito para cobrir esses casos automaticamente.

### Jornada e dados reais

Boas-vindas → escolhas do perfil → Explorar real → trilhas/aulas → StudyMode
(Android) → começar. Guardar cada resposta; permitir voltar. Se já houver perfil,
exibi-lo/reutilizá-lo, sem sobrescrever silenciosamente. Em POST 409, reler o
perfil e pedir decisão em vez de repetir criação indefinidamente.

Usar as rotas existentes `/explorar`, `/minhas-trilhas`, `/trilhas/[id]`,
`/trilhas/[trilhaId]/aulas/[aulaId]` e `/study-mode`. Não matricular, concluir aula,
iniciar timer ou pedir permissão de notificação automaticamente durante o tour.

Quando existir uma trilha acessível, explicar seu cartão e detalhes reais;
só abrir aulas publicadas com matrícula válida. Sem trilha/aula, explicar o
estado vazio real e permitir continuar sem inventar um conteúdo demonstrativo.
Dados de progresso vêm dos serviços/contextos já existentes. Não há indicação
de “última aula acessada” no contrato inspecionado de progresso; “continuar” deve
usar primeira aula publicada não concluída ou documentar outro critério real,
sem alegar histórico de último acesso que não existe.

StudyMode é atualmente restrito a Android pelo próprio app. Em outras plataformas,
omitir a etapa de navegação indisponível com uma explicação curta; não ficar preso
em um redirect para `/home`.

### Spotlight nativo

Sem nova biblioteca nativa na primeira implementação. Registro de alvos por ref
de `View` nativa e ID estável; medir alvo **e raiz do overlay** com `measureInWindow`
e converter ao mesmo espaço de coordenadas. Evitar offsets fixos de status bar.
Referências: [medição RN 0.86](https://reactnative.dev/docs/0.86/the-new-architecture/layout-measurements)
e [Safe Area SDK 57](https://docs.expo.dev/versions/v57.0.0/sdk/safe-area-context/).

Quatro áreas escurecidas em volta do alvo permitem manter o elemento real visível.
Borda não interativa, tooltip medido e colocado acima/abaixo dentro da área segura;
se não houver espaço com fonte ampliada, usar explicação alternativa rolável.
Bloquear toques fora do alvo. Nas etapas de ação, permitir o controle real e
avançar após confirmação da rota/ação, não por um temporizador presumido.

Esperar foco da rota, montagem e medidas válidas/estáveis; refazer em `onLayout`,
scroll, mudança de dimensões e retorno do background. Para alvos em listas,
trazer ao viewport antes de medir; não usar o retângulo de uma célula reciclada.
Limpar registros, timers e listeners. Usar prazo limitado para alvo ausente e
fallback com avançar/pausar. Não exigir rede para liberar a saída do tutorial.

Foco de leitor de tela na explicação, anúncio de etapa, rótulos e ações acessíveis,
sem navegação acidental no fundo. Abertura sem animações repetitivas; se houver
transições, respeitar preferência de movimento reduzido. Testar fonte ampliada,
TalkBack, teclado, gestos e botão Voltar em aparelho: bundle não valida geometria.

## 4. Diagnóstico visual e ordem do redesign

Web real: `src/index.css`, `src/components/Navbar.jsx`, `Hero.module.css`.
Fundo `#0D0D0D`, superfícies `#121212`/`#1A1A1A`/`#222222`, roxo `#6C5CE7`,
Inter, bordas brancas de baixa opacidade. O mockup usa linhas compactas, raios
aproximadamente 12px e hierarquia por tamanho/peso. Os números do mockup não
podem ser transportados como dados. Mobile hoje usa roxo `#8B5CF6` e superfícies
mais azuladas; aproximar a marca sem copiar texto pequeno/baixo contraste do site.

| Área | Problema observado | Próxima mudança |
| --- | --- | --- |
| Marca | Letras S genéricas no `BrandMark`, Home e assets de launcher/splash | Assinatura textual compacta do site; marca institucional nos contextos adequados |
| Home | Perfil duplicado, logout no topo, contagem sem continuação | Saudação compacta, próxima aula/trilha real, erros/carregamento e vazio com CTA |
| Tabs | Início no meio; “Minhas Trilhas” e “StudyMode” longos; glifos Unicode | Início, Explorar, Trilhas, Foco, Perfil; ícones consistentes e áreas de toque |
| Explorar | Busca só por nome; acesso privado ocupa grande bloco | Busca clara e acesso privado compacto; manter loading/erro/vazio |
| Trilhas | Cartões altos com metadados dominantes | Nome, disciplina, progresso e próxima ação; professor/nível discretos |
| Detalhes | Metadados antes das aulas; desmatricular dominante; sem CTA continuar | Nome/progresso/continuar/aulas; metadados em linha; saída secundária confirmada |
| StudyMode | Vários cartões e bordas concorrendo com timer | Timer central e indicadores compactos; preservar contexto/cálculos/storage/notificações |
| Perfil | Formulário sempre aberto e identidade repetida | Visão de conta e edição separada; foto por URL só na edição; logout discreto |

### Logo institucional encontrado

`../plutcc/public/icons.png` contém a marca branca em **PNG transparente**, não
um retângulo preto: 1920×1080; conteúdo visível em x=773..1144, y=423..707
(372×285). Foi inspecionada visualmente e pelo canal alpha. Existe, portanto,
uma fonte adequada ao fundo escuro; não é preciso recriar o livro/capelo por IA.
O arquivo completo tem muita margem: obter uma exportação recortada com margem
controlada preservando os pixels/proporções antes de usar em abertura/splash.
Para launcher, validar área segura e legibilidade; não encolher a composição
detalhada no espaço de um ícone de navegação. Essa integração ficou para a fase 3.

## 5. Alterações efetivamente feitas nesta entrega

- `src/components/GoogleButton.js`: troca da letra G por imagem local colorida,
  proporção preservada, sem tint; rótulo acessível mantido durante carregamento.
- `assets/google-g.png`: asset oficial obtido diretamente do Google, sem edição.
- `assets/google-g.README.md`: origem, hash e orientações de uso.
- `src/types/assets.d.ts`: declaração de PNG para checagem do `require` em JS.
- `tests/googleButton.test.cjs`: contratos do componente com primitivas nativas
  simuladas; não é teste de renderização em aparelho.
- Este relatório. Nenhuma tela autenticada foi redesenhada nesta fase.

Fonte do símbolo: [Google](https://developers.google.com/identity/images/g-logo.png).
Referência: [diretrizes de login Google](https://developers.google.com/identity/branding-guidelines).
Não há dependência de rede em runtime, biblioteca nova, mudança de OAuth,
JWT/SecureStore/MFA, matrícula, progresso ou histórico.

## 6. Validação desta entrega

- `node tests/googleButton.test.cjs`: passou; asset/proporção/sem tint,
  acessibilidade/callback, carregamento e desabilitado.
- `npm.cmd run test:study-mode`: 21 cenários de analytics + 13 de notificações
  simuladas passaram.
- `npx.cmd expo lint`: passou.
- `npx.cmd tsc --noEmit`: não verifica o projeto, pois não existe `tsconfig.json`;
  imprime ajuda. **Não é typecheck global aprovado.**
- Checagem direcionada passou:
  `npx.cmd tsc --noEmit --allowJs --checkJs --jsx react-jsx --module preserve --moduleResolution bundler --target es2022 --skipLibCheck --strict false src/types/assets.d.ts src/components/GoogleButton.js`.
- `npx.cmd expo export --platform android --output-dir .expo/google-icon-validation`:
  passou, 1393 módulos, Hermes 3,1 MB e `google-g.png` incluído. Foi necessário
  permitir execução do Hermes fora do sandbox; nenhum EAS Build foi executado.
- `git diff --check`: passou na árvore existente (apenas avisos LF/CRLF).
- `npx.cmd expo-doctor`: 21/21 verificações passaram; acesso ao registro npm
  precisou ser autorizado fora do sandbox.

Não foram realizados login real, criação de contas, chamada autenticada de escrita
ao backend, teste em dispositivo nem avaliação visual do app renderizado. A imagem
foi inspecionada, mas isso não prova layout nativo. Não foi feito commit/push.

## 7. Ponto exato de continuidade

Próxima entrega: **fase 2 inteira, antes do redesign geral**.

Começar por módulos puros de elegibilidade/estado e persistência com testes;
depois serviço de perfil, controlador por conta, formulário, alvos/overlay e
integração com cadastro/verificação/rotas. Remover o tour antigo somente quando
o novo fluxo estiver integrado. Não marcar esta fase como implementada apenas
por existir este plano.

Critérios de aceite obrigatórios da fase 2, ainda pendentes:

- Cadastro novo não abre tutorial antes da verificação/MFA; login antigo e Google
  sem sinal de novidade não são confundidos com cadastro.
- Interromper e reabrir retoma etapa e respostas; concluir não reabre; pausar
  permite navegar normalmente e retomar explicitamente.
- Troca A→B não mostra escolhas/etapas de A; respostas atrasadas não contaminam B.
- Perfil 404 permite criar; erro de rede não; 409 não sobrescreve escolhas sem aviso.
- Catálogo com/sem trilhas, trilha sem aula, aula não publicada, loading/erro e alvo
  ausente têm saída; nenhum dado de demonstração vira dado real.
- Spotlight acompanha scroll, rotação/layout, fontes grandes, Safe Area,
  transição de rota e retorno do background; tooltip não cobre o alvo.
- Ação guiada usa controle real; toques fora são bloqueados; Voltar Android pausa;
  TalkBack consegue avançar e sair.
- Testes unitários/integração viáveis, lint, checagem de tipos com escopo explícito,
  Doctor e bundle; inspeção manual no Dev Client Android antes de afirmar validação visual.

Depois: fase 3 em dois grupos (Home/navegação/trilhas; StudyMode/perfil/marca),
preservando a lógica existente, e revisão final de regressões.
