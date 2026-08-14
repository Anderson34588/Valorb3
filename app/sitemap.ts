import { MetadataRoute } from 'next';

// Tickers mais buscados no Google — pré-incluídos no sitemap
// O Google também vai encontrar as outras páginas via links internos
const POPULAR_TICKERS = [
  // Blue chips
  'PETR4', 'PETR3', 'VALE3', 'ITUB4', 'BBAS3', 'WEGE3', 'ABEV3',
  'RENT3', 'PRIO3', 'EGIE3', 'TAEE11', 'CPLE6', 'ENGI11', 'TRPL4',
  'CMIG4', 'SBSP3', 'SAPR11', 'CSAN3', 'UGPA3', 'RAIZ4',
  // Bancos
  'BBDC4', 'BBDC3', 'SANB11', 'ITSA4', 'BRSR6', 'BPAC11',
  // Varejo / Consumo
  'MGLU3', 'LREN3', 'PCAR3', 'AMER3', 'VIIA3', 'SOMA3',
  // Saúde
  'RDOR3', 'HAPV3', 'FLRY3', 'DASA3', 'HYPE3',
  // Agro
  'SLCE3', 'AGRO3', 'SMTO3', 'CAML3',
  // Tech / Telecom
  'VIVT3', 'TIMS3', 'OIBR3', 'INTB3', 'TOTVS3', 'LWSA3',
  // Indústria
  'EMBR3', 'SUZB3', 'KLBN11', 'DTEX3', 'CSNA3',
  // FIIs populares
  'MXRF11', 'HGLG11', 'XPML11', 'VISC11', 'KNRI11',
  'BCFF11', 'IRDM11', 'RBRF11', 'BTLG11', 'HSML11',
  'BRCO11', 'RBRP11', 'HFOF11', 'RECR11', 'CPTS11',
  // ETFs
  'BOVA11', 'IVVB11', 'SMAL11', 'HASH11', 'NTNB11',
];

const BASE_URL = 'https://valorb3.com.br';

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  // Static pages
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: BASE_URL,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 1.0,
    },
  ];

  // Dynamic ticker pages
  const tickerPages: MetadataRoute.Sitemap = POPULAR_TICKERS.map((ticker) => ({
    url: `${BASE_URL}/acao/${ticker}`,
    lastModified: now,
    changeFrequency: 'daily' as const,
    priority: 0.8,
  }));

  return [...staticPages, ...tickerPages];
}
