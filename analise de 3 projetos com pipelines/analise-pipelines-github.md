# Análise de Pipelines de CI/CD em Repositórios Open Source

> Relatório de análise de três pipelines reais de integração e entrega contínua hospedadas no GitHub,
> com foco em **gatilhos (triggers)**, **jobs e funções**, **características técnicas** e **histórico de evolução**.

---

## Sumário

- [Metodologia](#metodologia)
- [1. home-assistant/core — CI em escala gigante](#1-home-assistantcore--pipeline-de-ci-em-escala-gigante)
- [2. astral-sh/ruff — build e release multiplataforma](#2-astral-shruff--pipeline-de-build-e-release-multiplataforma)
- [3. fastapi/full-stack-fastapi-template — CI/CD de aplicação web](#3-fastapifull-stack-fastapi-template--pipeline-cicd-de-aplicação-web)
- [Quadro comparativo](#quadro-comparativo)
- [Conclusões e boas práticas replicáveis](#conclusões-e-boas-práticas-replicáveis)
- [Referências](#referências)

---

## Metodologia

Foram selecionados três repositórios públicos com pipelines maduras e propósitos distintos, de modo a cobrir
o espectro completo de CI/CD:

| Critério | Justificativa |
| --- | --- |
| Popularidade e manutenção ativa | Garante que a pipeline é exercitada milhares de vezes e revisada por muitos colaboradores |
| Diversidade de propósito | Um caso de **CI puro**, um de **CD/release** e um de **CI + CD de aplicação** |
| Diversidade de stack | Python, Rust/Python e Full Stack (Python + TypeScript + Docker) |

A análise foi feita diretamente sobre os arquivos YAML em `.github/workflows/` de cada repositório.

---

## 1. `home-assistant/core` — pipeline de CI em escala gigante

| Item | Valor |
| --- | --- |
| Repositório | <https://github.com/home-assistant/core> |
| Arquivo | `.github/workflows/ci.yaml` |
| Stack | Python |
| Porte | ~88 mil estrelas · workflow com **1.378 linhas / 51,8 KB** |
| Tipo | **Integração Contínua (CI)** — não realiza deploy |

### 1.1 O que a pipeline faz

Valida cada Pull Request de um monorepo com milhares de integrações de automação residencial.
Executa lint, checagem estática de tipos, auditoria de licenças, validação de metadados e a suíte
completa de testes contra **bancos de dados reais** (MariaDB, MySQL e PostgreSQL).

### 1.2 Gatilhos (triggers)

```yaml
on:
  push:
    branches: [dev, rc, master]
  pull_request: ~
  workflow_dispatch:
    inputs:
      full:                 # Roda a suíte completa independentemente das mudanças
      lint-only:            # Pula o pytest
      skip-coverage:        # Pula a cobertura
      pylint-only:
      mypy-only:
      audit-licenses-only:
```

Além dos gatilhos declarados, existem **gatilhos indiretos** — o ponto mais interessante do design:

| Label no PR | Efeito |
| --- | --- |
| `ci-full-run` | Força a execução da suíte completa, mesmo em PR pequeno |
| `ci-skip-coverage` | Desliga a coleta de cobertura, acelerando o run |

Ou seja, o revisor pode alterar o comportamento da pipeline **sem editar código**, apenas aplicando uma etiqueta.

### 1.3 Jobs e funções

| Job | Função |
| --- | --- |
| `info` | **Cérebro da pipeline.** Usa `dorny/paths-filter` para detectar arquivos alterados, gera dinamicamente `.integration_paths.yaml` com todas as integrações e exporta ~18 *outputs* (grupos de teste, versões de Python, chave de cache, `test_full_suite`, `lint_only`…) consumidos pelos demais jobs |
| `prek` | Lint agregado (ruff, yamllint, codespell, check-json, shebangs) via pre-commit |
| `zizmor` | **Lint de segurança dos próprios workflows** do GitHub Actions |
| `lint-hadolint` | Lint dos Dockerfiles, em matriz (`Dockerfile`, `Dockerfile.dev`, `hassfest/docker/Dockerfile`) |
| `base` | Prepara e cacheia o virtualenv (action local `restore-or-build-venv`, cache de pacotes APT e do `uv`) |
| `hassfest` | Valida metadados e manifests das integrações |
| `gen-requirements-all` | Garante que os requirements gerados estão sincronizados |
| `dependency-review` | Revisão de dependências — só em `pull_request` e se `requirements == 'true'` |
| `audit-licenses` | Extrai e audita licenças de todas as dependências, publicando o JSON como artefato |
| `pylint` / `pylint-tests` | Variantes *fully* e *partially*: em PR pequeno, roda só nas integrações alteradas |
| `mypy` | Checagem de tipos com cache dedicado (`.mypy_cache`) e `--num-workers=4` |
| `prepare-pytest-full` | Divide a suíte em **10 buckets** via `script.split_tests` e publica `pytest_buckets.txt` como artefato |
| `pytest-full` | Matriz `python-version × group`, com `--numprocesses auto`, `--dist=loadfile`, timeout de 60 min |
| `pytest-mariadb` | Sobe MariaDB 10.3 / 10.6 / 10.10 / 10.11 / 11.4 e MySQL 8.0 como `services`, com healthcheck e `tmpfs` |
| `pytest-postgres` | Idem para PostgreSQL 12 e 15 |

### 1.4 Características de destaque

- **Execução parcial inteligente.** PR que toca uma integração roda apenas o teste daquela integração
  (`test_group_count = 1`); PR que toca arquivos de core — ou push em `dev`/`rc`/`master` — força a suíte
  completa com 10 grupos.
- **Princípio do menor privilégio.** `permissions: {}` global, com permissões concedidas job a job;
  `persist-credentials: false` no checkout; **todas as actions pinadas por SHA completo**.
- **Economia de recursos.** `concurrency` com `cancel-in-progress` cancela runs antigos do mesmo PR;
  chave de cache versionada por hash dos arquivos de requirements.
- **Ergonomia para o desenvolvedor.** *Problem matchers* (`::add-matcher::`) fazem erros de pylint, mypy
  e yamllint aparecerem anotados diretamente no diff do Pull Request.
- **Artefatos ricos.** `pip_freeze.txt`, `coverage.xml`, `junit.xml` (formatado com `xmllint`) e os logs
  completos do pytest por grupo.

### 1.5 Histórico

O workflow cresceu de forma expressiva. Em 2020 era consideravelmente mais simples: rodava em Python 3.7/3.8,
com jobs separados de `bandit`, `black`, `flake8`, `isort`, `codespell` e `pyupgrade`, e apenas **4 grupos de teste**.

Evolução observada:

1. Consolidação de múltiplos linters em `ruff` + `prek`.
2. Entrada do `zizmor`, que aplica lint de segurança sobre os próprios arquivos de workflow.
3. Adoção do `uv` no lugar do pip para instalação de dependências.
4. Introdução das matrizes de banco de dados e da auditoria de licenças.
5. Ampliação de 4 para 10 grupos de teste paralelos.

O `ci.yaml` já acumula mais de **287 mil execuções** registradas na aba Actions.

---

## 2. `astral-sh/ruff` — pipeline de build e release multiplataforma

| Item | Valor |
| --- | --- |
| Repositório | <https://github.com/astral-sh/ruff> |
| Arquivo | `.github/workflows/build-binaries.yml` |
| Stack | Rust + Python (PyO3 / maturin) |
| Porte | ~49,7 mil estrelas · workflow com **482 linhas / 17,4 KB** |
| Tipo | **Entrega Contínua (CD)** — build e publicação de artefatos |

### 2.1 O que a pipeline faz

Compila o binário do Ruff para **praticamente todas as plataformas suportadas**, gerando dois tipos de
artefato a partir do mesmo build: *wheels* para o PyPI e binários arquivados para os GitHub Releases.

### 2.2 Gatilhos

```yaml
on:
  workflow_call:          # Subworkflow reutilizável, chamado pelo release.yml (cargo-dist)
    inputs:
      plan:
        required: true
        type: string
  pull_request:
    paths:                # Só dispara se o build puder ter quebrado
      - pyproject.toml
      - .github/workflows/build-binaries.yml
```

Dois padrões relevantes aqui:

- **`workflow_call`** — o arquivo não é uma pipeline autônoma, e sim um *workflow reutilizável* invocado
  pelo `release.yml` como job de artefatos locais do `cargo-dist`.
- **`pull_request` com filtro `paths`** — evita gastar horas de runner em PRs comuns, mas garante que
  mudanças no empacotamento ou no próprio workflow sejam validadas antes do merge.

O workflow pai (`release.yaml`) usa `workflow_dispatch` com inputs `tag` (versão sem o `v` inicial; **se omitido,
executa um dry run sem upload**) e `sha` (commit exato a ser lançado) — um padrão excelente de release manual,
determinístico e auditável.

### 2.3 Jobs e cobertura de plataformas

| Job | Alvos |
| --- | --- |
| `sdist` | Distribuição fonte + teste de instalação |
| `macos-x86_64` | macOS Intel |
| `macos-aarch64` | macOS Apple Silicon |
| `windows` | `x86_64-pc-windows-msvc`, `i686-pc-windows-msvc`, `aarch64-pc-windows-msvc` |
| `linux` | `x86_64-unknown-linux-gnu`, `i686-unknown-linux-gnu` |
| `linux-cross` | `aarch64`, `armv7`, `s390x`, `powerpc64le`, `powerpc64`, `arm-musleabihf`, `riscv64gc` |
| `musllinux` | `x86_64-unknown-linux-musl`, `i686-unknown-linux-musl` |
| `musllinux-cross` | `aarch64-unknown-linux-musl`, `armv7-unknown-linux-musleabihf` |

### 2.4 Anatomia de um job

Todos os jobs seguem o mesmo pipeline interno, o que torna o arquivo previsível apesar do tamanho:

```text
checkout (com submódulos)
   ↓
setup-python
   ↓
transform_readme.py --target pypi     # adapta o README para o formato do PyPI
   ↓
PyO3/maturin-action                   # build da wheel
   ↓
smoke test do artefato                # instala e executa `ruff --help`
   ↓
upload-artifact (wheels-<target>)
   ↓
empacotamento .tar.gz / .zip + SHA-256
   ↓
upload-artifact (artifacts-<target>)
```

### 2.5 Características de destaque

- **Teste real em arquitetura cruzada.** Usa `uraimo/run-on-arch-action` para instalar e executar a wheel
  dentro de uma imagem emulada da arquitetura alvo, e `addnab/docker-run-action` com Alpine para validar
  as builds musl. Compilar não é o mesmo que funcionar — e a pipeline cobre essa diferença.
- **Escape hatch por label.** Todos os jobs carregam:

  ```yaml
  if: ${{ !contains(github.event.pull_request.labels.*.name, 'no-build') }}
  ```

  Uma única etiqueta desliga a matriz inteira.
- **Workarounds documentados no próprio YAML.** Variáveis como `JEMALLOC_SYS_WITH_LG_PAGE=16` aparecem
  comentadas com link direto para a issue que motivou o ajuste.
- **Build reprodutível.** `--locked`, `CARGO_INCREMENTAL: 0`, retries de rede
  (`CARGO_NET_RETRY`, `RUSTUP_MAX_RETRIES`), actions pinadas por SHA e `permissions: {}`.
- **Integridade.** Cada arquivo distribuído é acompanhado do seu `.sha256`.

### 2.6 Histórico

A pipeline migrou de um `release.yaml` escrito manualmente para um modelo em **duas camadas**:
hoje o `release.yml` é autogerado pelo `cargo-dist`, e toda a parte manual e específica do projeto foi
isolada neste subworkflow reutilizável.

Uma execução típica de release produz dezenas de artefatos
(`binaries-aarch64-apple-darwin`, `binaries-s390x-unknown-linux-gnu`, `binaries-powerpc64le-unknown-linux-gnu`…),
além de publicar a imagem Docker em `ghcr.io/astral-sh/ruff` e executar um job **"Update dependents"**,
que propaga a nova versão para projetos dependentes.

---

## 3. `fastapi/full-stack-fastapi-template` — pipeline CI/CD de aplicação web

| Item | Valor |
| --- | --- |
| Repositório | <https://github.com/fastapi/full-stack-fastapi-template> |
| Stack | FastAPI · React · SQLModel · PostgreSQL · Docker Compose · Traefik |
| Tipo | **CI + CD completo** de aplicação |

### 3.1 O que a pipeline faz

É o caso mais próximo de um projeto de aplicação real em ambiente corporativo, com a esteira completa:

```text
lint → testes de backend → teste da stack integrada → contrato backend/frontend → E2E → deploy
```

Em vez de um arquivo monolítico, o template adota **vários workflows pequenos e paralelos**, cada um com
uma responsabilidade única. Todos aparecem como checks independentes no Pull Request.

### 3.2 Workflows e funções

| Workflow | Função |
| --- | --- |
| **Lint Backend** | `ruff` + `mypy`, separados dos testes para falhar rápido e barato |
| **Test Backend** | `pytest` com PostgreSQL, gerando relatório de cobertura |
| **Test Docker Compose** | Sobe a stack inteira via Compose e valida que ela funciona integrada — um teste de *infraestrutura como código* |
| **Generate Client** | Regenera o SDK TypeScript a partir do schema OpenAPI e **falha se o commit estiver desatualizado**: é um check de consistência de contrato entre backend e frontend |
| **Playwright Tests** | Testes end-to-end reais em navegador, em serviço Compose dedicado, com `blob-report` e `test-results` montados como volumes — o que permite paralelizar em *shards* e fundir os relatórios ao final |
| **Labels / Add to Project / Issue Manager** | Automação de comunidade: etiquetagem, board de projeto e fechamento de issues respondidas (este com `schedule`) |
| **Deploy** | Publicação nos ambientes de staging e produção |

### 3.3 Gatilhos

| Evento | Efeito |
| --- | --- |
| `pull_request` | Dispara todos os checks de qualidade em paralelo |
| `push` em `master` | Checks + deploy para **staging** |
| `release: published` | Deploy para **produção** |
| `schedule` | Automação de issues (não relacionada a código) |

Os deploys usam o recurso **`environment`** do GitHub Actions, o que habilita:

- *required reviewers* (aprovação manual obrigatória antes do deploy);
- secrets segregados por ambiente;
- histórico de deployments por ambiente na interface do repositório.

Historicamente, o deploy era executado em **runners auto-hospedados identificados por labels**
(`staging` e `production`), permitindo inclusive que os dois ambientes convivessem no mesmo servidor.
Os workflows de deploy foram configurados para **não rodar no repositório principal**, apenas nos projetos
gerados a partir do template. Atualmente a documentação cobre dois caminhos de publicação:
FastAPI Cloud e self-hosted com Docker Compose.

### 3.4 Características de destaque

- **Separação de responsabilidades.** Quebrar a pipeline em workflows pequenos dá feedback granular:
  o desenvolvedor vê exatamente qual etapa falhou, sem ler um log gigante.
- **Dependabot integrado à esteira.** O bot abre PRs agrupados (`python-packages`, `npm-packages`,
  `github-actions`) que passam por toda a pipeline antes do merge — atualização de dependências vira
  um processo validado, não um ato de fé.
- **Contrato verificado automaticamente.** O job *Generate Client* impede a classe de bug mais comum em
  full stack: backend e frontend fora de sincronia.
- **Pirâmide de testes respeitada.** Lint → unitário → integração (Compose) → E2E (Playwright), do mais
  barato para o mais caro.

### 3.5 Histórico

É o repositório com a trilha de evolução mais legível, porque o arquivo `release-notes.md` documenta cada
mudança de CI com o prefixo 👷. Marcos observados:

| PR | Mudança |
| --- | --- |
| #1128 | Suporte a múltiplos ambientes (staging e produção) no mesmo servidor |
| #1125 | Ajuste do CI para funcionar também em repositórios privados |
| #1284 | Workflows de deploy passam a excluir o repositório principal |
| #1335 | Melhoria do job de Playwright |
| #1358 | Lint do backend extraído para workflow próprio, separado dos testes |
| #1361 | Testes passam a rodar no ambiente Python (`uv`) em vez de dentro do container |
| #1366 | Adoção do cache do `uv` no GitHub Actions |
| #2111 | Geração do SDK movida para pre-commit, removendo o workflow customizado |

---

## Quadro comparativo

| Dimensão | `home-assistant/core` | `astral-sh/ruff` | `full-stack-fastapi-template` |
| --- | --- | --- | --- |
| **Objetivo** | CI (qualidade) | CD (build e release) | CI + CD (aplicação) |
| **Gatilhos** | `push`, `pull_request`, `workflow_dispatch` com 6 inputs, labels | `workflow_call`, `pull_request` filtrado por `paths`, `workflow_dispatch` com `tag`/`sha` | `pull_request`, `push`, `release`, `schedule` |
| **Estratégia de matriz** | **Dinâmica**, gerada em runtime pelo job `info` | **Estática**, ~15 alvos de compilação | Workflows pequenos e paralelos |
| **Serviços externos** | MariaDB, MySQL, PostgreSQL como `services` | Contêineres de cross-arch (QEMU, Alpine) | Stack Compose completa |
| **Artefatos** | Cobertura, JUnit, logs de pytest, licenças | Wheels, binários, checksums, imagem Docker | Relatórios Playwright, cobertura |
| **Segurança** | `permissions: {}`, SHAs pinados, `zizmor` | `permissions: {}`, SHAs pinados, `--locked` | `environment` + secrets segregados |
| **Otimização** | Execução parcial por path, cache versionado, `concurrency` | Filtro `paths`, label `no-build`, `concurrency` | Workflows independentes, cache do `uv` |
| **Complexidade** | Muito alta (1.378 linhas) | Alta (482 linhas) | Média, distribuída em vários arquivos |

---

## Conclusões e boas práticas replicáveis

Três padrões aparecem nos três repositórios e servem como referência de "pipeline bem construída":

### 1. Falhar rápido e falhar barato

Lint antes de testes, testes unitários antes de E2E, build antes de deploy. Combinado a filtros
(`paths`, `dorny/paths-filter`, labels), isso evita consumir minutos de runner com trabalho que não
precisava ser feito. O job `info` do Home Assistant é o exemplo mais sofisticado: ele decide, em tempo
de execução, o **escopo mínimo suficiente** de validação.

### 2. Princípio do menor privilégio

```yaml
permissions: {}          # nega tudo por padrão

jobs:
  meu-job:
    permissions:
      contents: read     # concede apenas o necessário
    steps:
      - uses: actions/checkout@9c091bb21b7c1c1d1991bb908d89e4e9dddfe3e0  # SHA completo, não tag
        with:
          persist-credentials: false
```

Os três repositórios pinam actions por SHA completo — uma tag como `@v4` é mutável e pode ser
reapontada para código malicioso. O Home Assistant vai além e roda `zizmor`, um linter de segurança
sobre os próprios workflows.

### 3. Validar o artefato, não apenas o código

Ruff instala e executa cada wheel na arquitetura alvo antes de publicá-la. O template do FastAPI sobe
a stack Docker Compose inteira. Um build que compila não é necessariamente um build que funciona —
e essa distinção é o que separa uma pipeline de verdade de um script de `npm test`.

### Checklist de aplicação

- [ ] `concurrency` com `cancel-in-progress` para não acumular runs obsoletos
- [ ] `permissions: {}` no topo, concedendo por job
- [ ] Actions pinadas por SHA completo
- [ ] Cache de dependências com chave versionada por hash do lockfile
- [ ] Filtros de `paths` ou detecção de mudanças para execução parcial
- [ ] Testes paralelizados em grupos/shards
- [ ] Artefatos publicados (cobertura, relatórios, binários) com checksum quando aplicável
- [ ] Ambientes (`environment`) com aprovação manual para produção
- [ ] Smoke test do artefato final antes da publicação

---

## Referências

| Repositório | Arquivo analisado |
| --- | --- |
| [home-assistant/core](https://github.com/home-assistant/core) | [`.github/workflows/ci.yaml`](https://github.com/home-assistant/core/blob/dev/.github/workflows/ci.yaml) |
| [astral-sh/ruff](https://github.com/astral-sh/ruff) | [`.github/workflows/build-binaries.yml`](https://github.com/astral-sh/ruff/blob/main/.github/workflows/build-binaries.yml) |
| [fastapi/full-stack-fastapi-template](https://github.com/fastapi/full-stack-fastapi-template) | [`.github/workflows/`](https://github.com/fastapi/full-stack-fastapi-template/tree/master/.github/workflows) · [`release-notes.md`](https://github.com/fastapi/full-stack-fastapi-template/blob/master/release-notes.md) |

Documentação complementar:

- [GitHub Actions — Events that trigger workflows](https://docs.github.com/actions/using-workflows/events-that-trigger-workflows)
- [GitHub Actions — Reusing workflows](https://docs.github.com/actions/using-workflows/reusing-workflows)
- [GitHub Actions — Using environments for deployment](https://docs.github.com/actions/deployment/targeting-different-environments/using-environments-for-deployment)
