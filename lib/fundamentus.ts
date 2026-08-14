// lib/fundamentus.ts — Server-side scraper for Fundamentus.com.br
// Uses native Node.js https module (latin-1 encoded HTML)
// Works for ações (stocks) and FIIs (real estate funds)

import https from 'https';

export interface FundamentusData {
  // Identity
  ticker: string;
  tipo: 'acao' | 'fii';
  nome: string;
  cotacao: number | null;
  dataUltCot: string | null;
  ultBalanco: string | null;

  // Market data
  min52sem: number | null;
  max52sem: number | null;
  volMed2m: number | null;
  valorMercado: number | null;
  valorFirma: number | null;          // EV
  nroAcoes: number | null;

  // ── Valuation multiples (stocks) ─────────────────────────────
  pl: number | null;                  // P/L
  pvp: number | null;                 // P/VP
  psr: number | null;                 // PSR (P/Receita)
  pebit: number | null;               // P/EBIT
  pativos: number | null;             // P/Ativos
  pcapGiro: number | null;            // P/Cap. Giro
  pativCircLiq: number | null;        // P/Ativ Circ Líq
  evEbitda: number | null;            // EV/EBITDA
  evEbit: number | null;              // EV/EBIT
  divYield: number | null;            // Dividend Yield (decimal, e.g. 0.07)

  // ── Per share ─────────────────────────────────────────────────
  lpa: number | null;                 // Lucro por Ação
  vpa: number | null;                 // Valor Patrimonial por Ação

  // ── Margins & returns ─────────────────────────────────────────
  margBruta: number | null;
  margEbit: number | null;
  margLiquida: number | null;
  ebitAtivo: number | null;           // EBIT / Ativo
  roic: number | null;                // ROIC
  roe: number | null;                 // ROE
  giroAtivos: number | null;

  // ── Debt ─────────────────────────────────────────────────────
  liquidezCorr: number | null;
  divLiqPatrim: number | null;        // Dív Líq / Patrim
  crescRec5a: number | null;          // Crescimento Receita 5 anos

  // ── Balance sheet (12m) ───────────────────────────────────────
  ativo: number | null;
  divBruta: number | null;
  disponibilidades: number | null;
  divLiquida: number | null;
  ativoCirculante: number | null;
  patrimLiq: number | null;

  // ── Income statement (12m) ────────────────────────────────────
  receitaLiquida12m: number | null;
  ebit12m: number | null;
  lucroLiquido12m: number | null;

  // ── FII-specific ──────────────────────────────────────────────
  ffoYield: number | null;            // FFO Yield
  ffoCota: number | null;             // FFO / Cota
  dividendoCota: number | null;       // Dividendo / cota
  vpCota: number | null;              // VP / Cota
  receita12m: number | null;          // FII: Receita 12m
  ffo12m: number | null;              // FII: FFO 12m
  rendDistribuido12m: number | null;  // FII: Rendimento distribuído
  ativos: number | null;
  patrimLiqFII: number | null;
}

// ── Parsing helpers ───────────────────────────────────────────────────────────

function parseBR(s: string): number | null {
  if (!s || s === '—' || s.trim() === '') return null;
  // Remove currency prefix, dots as thousand separators, commas as decimal
  const cleaned = s.replace(/R\$\s?/g, '').replace(/\./g, '').replace(',', '.').trim();
  const n = parseFloat(cleaned);
  return isNaN(n) ? null : n;
}

function parsePct(s: string): number | null {
  if (!s || s === '—' || s.trim() === '') return null;
  const n = parseFloat(s.replace('%', '').replace(',', '.').trim());
  return isNaN(n) ? null : n / 100;
}

function parseAny(s: string): number | null {
  if (!s || s === '—' || s.trim() === '') return null;
  if (s.includes('%')) return parsePct(s);
  return parseBR(s);
}

// ── HTTP helper using native https (avoids fetch rate-limiting) ───────────────

function httpsGetLatin1(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const req = https.get(
      {
        hostname: parsed.hostname,
        path: parsed.pathname + parsed.search,
        headers: {
          'User-Agent':
            'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'pt-BR,pt;q=0.9',
          Referer: 'https://www.fundamentus.com.br/',
          Connection: 'close',
        },
      },
      (res) => {
        if ((res.statusCode ?? 0) >= 400) {
          reject(new Error(`HTTP ${res.statusCode}`));
          res.resume();
          return;
        }

        const chunks: Buffer[] = [];
        res.on('data', (chunk: Buffer) => chunks.push(chunk));
        res.on('end', () => {
          try {
            const buf = Buffer.concat(chunks);
            // Fundamentus uses latin-1 encoding
            resolve(buf.toString('latin1'));
          } catch (e) {
            reject(e);
          }
        });
        res.on('error', reject);
      }
    );
    req.setTimeout(12000, () => req.destroy(new Error('timeout')));
    req.on('error', reject);
  });
}

// ── HTML parser ───────────────────────────────────────────────────────────────

function parseHtml(html: string, ticker: string): FundamentusData | null {
  if (html.length < 500) return null; // empty / error page

  // Extract label:value pairs from Fundamentus table structure
  // Pattern: <span class="txt">LABEL</span></td><td ...><span class="txt">VALUE</span>
  const re = /<span class="txt">([^<]+)<\/span><\/td>\s*<td[^>]*><span class="txt">([^<]+)<\/span>/g;
  const map: Record<string, string> = {};
  // Also collect duplicate keys (Receita Líquida appears twice — 12m and 3m)
  const multiMap: Record<string, string[]> = {};
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    const key = m[1].trim();
    const val = m[2].trim();
    map[key] = val; // last value wins for duplicates
    if (!multiMap[key]) multiMap[key] = [];
    multiMap[key].push(val);
  }

  const isFII = !!map['FII'] || !!map['Nome']; // FIIs have "Nome" key, stocks have "Empresa"
  const isFII2 = html.includes('FFO Yield') || html.includes('FFO/Cota');
  const tipo: 'acao' | 'fii' = isFII || isFII2 ? 'fii' : 'acao';

  // Helper to get first occurrence of a key
  const g = (k: string) => map[k] ?? '';

  // FII field names differ slightly
  const cotacao = parseBR(g('Cotação'));
  if (!cotacao) return null; // ticker not found

  return {
    ticker: g('Papel') || g('FII') || ticker,
    tipo,
    nome: g('Empresa') || g('Nome') || ticker,
    cotacao,
    dataUltCot: g('Data últ cot') || null,
    ultBalanco: g('Últ balanço processado') || g('Relatório') || null,

    min52sem: parseBR(g('Min 52 sem')),
    max52sem: parseBR(g('Max 52 sem')),
    volMed2m: parseBR(g('Vol $ méd (2m)')),
    valorMercado: parseBR(g('Valor de mercado')),
    valorFirma: parseBR(g('Valor da firma')),
    nroAcoes: parseBR(g('Nro. Ações') || g('Nro. Cotas')),

    // Valuation multiples
    pl: parseBR(g('P/L')),
    pvp: parseBR(g('P/VP')),
    psr: parseBR(g('PSR')),
    pebit: parseBR(g('P/EBIT')),
    pativos: parseBR(g('P/Ativos')),
    pcapGiro: parseBR(g('P/Cap. Giro')),
    pativCircLiq: parseBR(g('P/Ativ Circ Liq')),
    evEbitda: parseBR(g('EV / EBITDA')),
    evEbit: parseBR(g('EV / EBIT')),
    divYield: parsePct(g('Div. Yield')),

    // Per share
    lpa: parseBR(g('LPA')),
    vpa: parseBR(g('VPA')),

    // Margins & returns
    margBruta: parsePct(g('Marg. Bruta')),
    margEbit: parsePct(g('Marg. EBIT')),
    margLiquida: parsePct(g('Marg. Líquida')),
    ebitAtivo: parsePct(g('EBIT / Ativo')),
    roic: parsePct(g('ROIC')),
    roe: parsePct(g('ROE')),
    giroAtivos: parseBR(g('Giro Ativos')),

    // Debt & liquidity
    liquidezCorr: parseBR(g('Liquidez Corr')),
    divLiqPatrim: parseBR(g('Dív Líq / Patrim')),
    crescRec5a: parsePct(g('Cres. Rec (5a)')),

    // Balance sheet
    ativo: parseBR(g('Ativo')),
    divBruta: parseBR(g('Dív. Bruta')),
    disponibilidades: parseBR(g('Disponibilidades')),
    divLiquida: parseBR(g('Dív. Líquida')),
    ativoCirculante: parseBR(g('Ativo Circulante')),
    patrimLiq: parseBR(g('Patrim. Líq')),

    // Income statement — first occurrence = 12m
    receitaLiquida12m: multiMap['Receita Líquida']?.[0]
      ? parseBR(multiMap['Receita Líquida'][0])
      : null,
    ebit12m: multiMap['EBIT']?.[0] ? parseBR(multiMap['EBIT'][0]) : null,
    lucroLiquido12m: multiMap['Lucro Líquido']?.[0]
      ? parseBR(multiMap['Lucro Líquido'][0])
      : null,

    // FII-specific
    ffoYield: parsePct(g('FFO Yield')),
    ffoCota: parseBR(g('FFO/Cota')),
    dividendoCota: parseBR(g('Dividendo/cota')),
    vpCota: parseBR(g('VP/Cota')),
    receita12m: multiMap['Receita']?.[0] ? parseBR(multiMap['Receita'][0]) : null,
    ffo12m: multiMap['FFO']?.[0] ? parseBR(multiMap['FFO'][0]) : null,
    rendDistribuido12m: multiMap['Rend. Distribuído']?.[0]
      ? parseBR(multiMap['Rend. Distribuído'][0])
      : null,
    ativos: parseBR(g('Ativos')),
    patrimLiqFII: parseBR(g('Patrim Líquido')),
  };
}

// ── Public API ────────────────────────────────────────────────────────────────

export async function fetchFundamentus(ticker: string): Promise<FundamentusData | null> {
  try {
    const url = `https://www.fundamentus.com.br/detalhes.php?papel=${encodeURIComponent(ticker.toUpperCase())}`;
    const html = await httpsGetLatin1(url);
    return parseHtml(html, ticker.toUpperCase());
  } catch (err) {
    console.warn(`Fundamentus fetch failed for ${ticker}:`, err);
    return null;
  }
}
