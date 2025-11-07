# ARQUITETURA DO SISTEMA VRVS - DADOS E HISTÓRICO

## VISÃO GERAL

O sistema VRVS trabalha com **duas estruturas de dados principais** que se relacionam:

1. **`dados[]`** - Aba "Dados" (Informações agregadas por TEMA)
2. **`historico[]`** - Aba "Histórico" (Registros individuais de SESSÕES)

---

## 1. ABA DADOS (`dados[]`)

### Propósito
Armazena informações **agregadas e resumidas** sobre cada **TEMA** de estudo.

### Estrutura de um Tema (`dados[]` item):
```javascript
{
    id: Number,                    // ID único do tema
    area: String,                  // Ex: "Ombro e Cotovelo"
    tema: String,                  // Ex: "Sd manguito rotador"
    status: String,                // "Não iniciado" | "Em estudo" | "Planejado" | "Concluído" | "Suspenso"
    prioridade: Number,            // 1-5 (5 = maior prioridade)
    dificuldade: String,           // "Fácil" | "Média" | "Difícil"
    rendimento: Number,            // 0.0 a 1.0 (média das sessões)
    sessoes: Number,               // Total de sessões registradas
    ultEstudo: String,             // Data da última sessão (YYYY-MM-DD)
    agenda: String,                 // Data da próxima revisão (YYYY-MM-DD)
    tempo: Number,                 // Tempo total acumulado (minutos)
    observacoes: String,           // Observações acumuladas
    contador80: Number,             // Contador de sessões consecutivas >= 80%
    sugestao: String,              // Última sugestão recebida
    temaId: String                 // (opcional) ID relacionado
}
```

### Como é Atualizado
- **Quando uma sessão é registrada** (Feedback):
  - `sessoes += 1`
  - `rendimento = média de todas as sessões do histórico deste tema`
  - `ultEstudo = data da sessão`
  - `agenda = calcularProximaRevisao(tema, dataSessao)`
  - `tempo += tempo da sessão`
  - `status = "Em estudo"` (se sessoes === 1)
  - `contador80` é recalculado baseado nas últimas sessões

- **Quando uma sessão é revertida**:
  - Recalcula `rendimento` baseado nas sessões restantes
  - Atualiza `ultEstudo` e `agenda`
  - Se não há mais sessões: `rendimento = 0`, `status = "Planejado"`

---

## 2. ABA HISTÓRICO (`historico[]`)

### Propósito
Armazena **cada sessão individual** de estudo registrada.

### Estrutura de uma Sessão (`historico[]` item):
```javascript
{
    id: Number,                     // ID único da sessão
    temaId: String,                 // ID do tema em dados[] (liga sessão ao tema)
    area: String,                   // Área do tema (duplicado para facilitar)
    tema: String,                    // Nome do tema (duplicado para facilitar)
    rendimento: Number,            // 0.0 a 1.0 (rendimento desta sessão específica)
    tempo: Number,                  // Tempo desta sessão (minutos)
    tempoIntervalo: Number,         // Tempo de intervalos (minutos)
    numeroIntervalos: Number,       // Quantidade de intervalos
    intervalos: String,             // Texto descritivo dos intervalos
    tempoQuestoes: Number,          // Tempo gasto em questões (minutos)
    quantQuestoes: Number,          // Total de questões
    quantQuestoesAcertos: Number,   // Questões acertadas
    tempoFlashcards: Number,        // Tempo gasto em flashcards (minutos)
    quantFlashcards: Number,        // Quantidade de flashcards
    questoes: String,              // Formato "15/20" (acertos/total)
    flashcards: Number,             // Quantidade de flashcards
    data: String,                   // Data da sessão (YYYY-MM-DD)
    observacoes: String,            // Observações desta sessão
    sugestao: String                // Sugestão recebida nesta sessão
}
```

### Como é Criado
- **Quando uma sessão é registrada** (Feedback):
  - Nova entrada é adicionada ao `historico[]`
  - `temaId` liga a sessão ao tema em `dados[]`
  - Todos os campos da sessão são salvos

---

## 3. RELAÇÃO ENTRE DADOS E HISTÓRICO

### Fluxo de Dados:

```
┌─────────────────┐
│  FEEDBACK        │
│  (Registrar      │
│   Sessão)        │
└────────┬─────────┘
         │
         ├──────────────────────────────┐
         │                              │
         ▼                              ▼
┌─────────────────┐          ┌─────────────────┐
│  historico[]    │          │    dados[]       │
│                 │          │                  │
│  + Nova sessão  │          │  Atualiza tema:  │
│  - temaId       │◄─────────┤  - sessoes++     │
│  - rendimento   │          │  - rendimento    │
│  - tempo        │          │  - ultEstudo     │
│  - data         │          │  - agenda        │
│  - etc.         │          │  - status        │
└─────────────────┘          └─────────────────┘
```

### Regras Importantes:

1. **Uma sessão no histórico sempre pertence a um tema em dados**
   - `historico[].temaId` → `dados[].id`

2. **O rendimento em dados é calculado a partir do histórico**
   - `dados[].rendimento = média(historico[].rendimento onde temaId === dados[].id)`

3. **As sessões em dados são contadas do histórico**
   - `dados[].sessoes = count(historico[] onde temaId === dados[].id)`

4. **Status automático**
   - Se `sessoes === 0` → `status = "Não iniciado"` ou `"Planejado"`
   - Se `sessoes === 1` → `status = "Em estudo"`
   - Se `sessoes > 1` → mantém `status` atual (geralmente "Em estudo")

---

## 4. EXPORTAÇÃO

### `exportarDados()` → `VRVS_DADOS_YYYY-MM-DD.csv`
- **ESTRUTURA FIXA**: Ordem de headers garantida e consistente
- **Headers exportados** (nesta ordem):
  - `id`, `area`, `tema`, `status`, `prioridade`, `dificuldade`
  - `rendimento`, `sessoes`, `ultEstudo`, `agenda`, `tempo`
  - `observacoes`, `contador80`, `sugestao`, `data`, `temaId`
- **Garantias**:
  - Todos os campos são sempre exportados (mesmo se vazios)
  - Valores padrão aplicados para campos numéricos (0) e strings ('')
  - Formato consistente para facilitar importação

### `exportarHistorico()` → `VRVS_HISTORICO_YYYY-MM-DD.csv`
- **ESTRUTURA FIXA**: Ordem de headers garantida e consistente
- **Headers exportados** (nesta ordem):
  - `id`, `temaId`, `area`, `tema`, `rendimento`, `tempo`
  - `tempoIntervalo`, `numeroIntervalos`, `intervalos`
  - `tempoQuestoes`, `quantQuestoes`, `quantQuestoesAcertos`
  - `tempoFlashcards`, `quantFlashcards`, `questoes`, `flashcards`
  - `data`, `observacoes`, `sugestao`
- **Garantias**:
  - Todos os campos são sempre exportados (mesmo se vazios)
  - Valores padrão aplicados para campos numéricos (0) e strings ('')
  - Formato consistente para facilitar importação

---

## 5. IMPORTAÇÃO

### Importar `DADOS.csv`
- Deve extrair **TODOS** os campos do CSV de DADOS:
  - `id`, `area`, `tema`, `status`, `prioridade`, `dificuldade`
  - `rendimento`, `sessoes`, `ultEstudo`, `agenda`, `tempo`
  - `observacoes`, `contador80`, `sugestao`, `temaId`
- Salva em `localStorage.getItem('vrvs_dados')`
- Atualiza `window.dados`

### Importar `HISTORICO.csv`
- Deve extrair **TODOS** os campos do CSV de HISTÓRICO:
  - `id`, `temaId`, `area`, `tema`
  - `rendimento`, `tempo`, `tempoIntervalo`, `numeroIntervalos`, `intervalos`
  - `tempoQuestoes`, `quantQuestoes`, `quantQuestoesAcertos`
  - `tempoFlashcards`, `quantFlashcards`, `questoes`, `flashcards`
  - `data`, `observacoes`, `sugestao`
- Salva em `localStorage.getItem('vrvs_historico')`
- Atualiza `window.historico`

---

## 6. REGRAS DE VALIDAÇÃO

### Dados Válidos:
- ✅ `sessoes === 0` E `status === "Não iniciado"` → `rendimento` deve ser `0` ou não exibido
- ✅ `sessoes === 0` E `status === "Planejado"` → `rendimento` deve ser `0` ou não exibido
- ✅ `sessoes > 0` → pode ter `rendimento > 0`
- ✅ `rendimento` sempre entre `0.0` e `1.0` (ou 0% a 100%)

### Histórico Válido:
- ✅ Cada sessão deve ter `temaId` válido (referência a um tema em `dados[]`)
- ✅ `data` deve estar no formato `YYYY-MM-DD`
- ✅ `rendimento` sempre entre `0.0` e `1.0`

---

## 7. FUNÇÕES CRÍTICAS

### `renderDados()`
- **Sempre** recarrega `dados[]` do `localStorage` antes de renderizar
- Aplica limpeza de dados inconsistentes
- Remove duplicatas
- Renderiza tabela com todos os temas

### `renderHistorico()`
- Filtra histórico inválido
- Ordena por data (mais recente primeiro)
- Renderiza tabela com todas as sessões

### `salvarFeedbackDireto()` / `confirmarFeedback()`
- Adiciona nova entrada ao `historico[]`
- Atualiza o tema correspondente em `dados[]`
- Salva ambos no `localStorage`
- Re-renderiza todas as abas

### `parseCSV()`
- **DEVE** detectar se é CSV de DADOS ou HISTÓRICO
- **DEVE** extrair todos os campos específicos de cada tipo
- **DEVE** preservar campos existentes ao invés de sobrescrever

---

## 8. PONTOS DE ATENÇÃO

⚠️ **NUNCA** assuma que `parseCSV()` funciona igual para DADOS e HISTÓRICO
⚠️ **SEMPRE** verifique quais campos estão sendo extraídos do CSV
⚠️ **SEMPRE** preserve campos existentes ao importar
⚠️ **SEMPRE** valide dados inconsistentes antes de renderizar
⚠️ **SEMPRE** recarregue do `localStorage` antes de renderizar (fix para cache)

---

## 9. DEBUGGING

### Logs Importantes:
- `[MACBOOK DEBUG]` - Debug de carregamento
- `[IMPORT DEBUG]` - Debug de importação
- `[CSV DEBUG]` - Debug de parse CSV
- `[MACBOOK FIX]` - Correções aplicadas

### Verificar:
1. Se `localStorage` tem dados (`localStorage.getItem('vrvs_dados')`)
2. Se campos estão sendo extraídos corretamente do CSV
3. Se dados estão sendo salvos após importação
4. Se `renderDados()` está sendo chamada após importação

