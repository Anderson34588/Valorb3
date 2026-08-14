# ValorB3 — Valuation de Ações da Bolsa Brasileira

- One-line positioning: Ferramenta de valuation para investidores analisarem ações da B3 com métricas fundamentalistas e estimativa de preço justo
- Target users: Investidores pessoa física, analistas amadores e estudantes de finanças interessados na bolsa brasileira
- Core features:
  1. Busca de ação por ticker (ex: PETR4, VALE3, ITUB4) com dados em tempo real via Brapi API
  2. Painel de métricas fundamentalistas: P/L, P/VP, EV/EBITDA, ROE, DY, Margem Líquida, Dívida Líquida
  3. Estimativa de preço justo via Bazin (DY esperado), Graham simplificado, e múltiplos setoriais
  4. Gráfico histórico de preço (6m / 1a) com recharts
  5. Resumo de valuation com veredicto: Subavaliada / Justa / Sobreavaliada
- Important features (P1):
  1. Lista de ações populares da B3 para acesso rápido
  2. Comparativo de múltiplos do setor (médias setoriais embutidas)
- Device strategy: adaptive
- Design style: modern-dark-tech (dark financeiro premium, acentos cyan/verde, mono para números)
- Technical constraints: Brapi API pública (https://brapi.dev) para cotações e fundamentos
- Completed: brief
- Current iteration: implementação inicial completa
