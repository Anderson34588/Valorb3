'use client';

import { useState } from 'react';
import { FileDown, Loader2 } from 'lucide-react';
import type { StockData } from '@/lib/valuation';
import type { calculateValuation } from '@/lib/valuation';

type ValuationResult = ReturnType<typeof calculateValuation>;

interface Props {
  stock: StockData;
  valuation: ValuationResult;
}

// ── Helpers ───────────────────────────────────────────────────
const brl = (v: number | null | undefined) =>
  v == null ? '—' : `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const pct = (v: number | null | undefined) =>
  v == null ? '—' : `${(v * 100).toFixed(1)}%`;
const num = (v: number | null | undefined, dec = 2) =>
  v == null ? '—' : v.toFixed(dec);
const dateStr = () =>
  new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });

// Conviction → texto
function verdictText(v: string | undefined) {
  if (v === 'subavaliada') return 'Possivelmente Subavaliada';
  if (v === 'sobreavaliada') return 'Possivelmente Sobreavaliada';
  if (v === 'justa') return 'Próxima do Valor Justo';
  return 'Inconclusivo';
}

// ── Component ─────────────────────────────────────────────────
export function PdfExportButton({ stock, valuation }: Props) {
  const [loading, setLoading] = useState(false);

  const handleExport = async () => {
    setLoading(true);
    try {
      // Dynamic import — keeps bundle small; loaded only when clicked
      const { default: jsPDF } = await import('jspdf');
      const { default: autoTable } = await import('jspdf-autotable');

      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const PAGE_W = 210;
      const MARGIN = 14;
      const COL_W = PAGE_W - MARGIN * 2;
      const ticker = stock.symbol.replace('.SA', '').toUpperCase();
      const nome = stock.longName ?? stock.shortName ?? ticker;

      // ── Palette ─────────────────────────────────────────────
      const CYN: [number, number, number] = [0, 212, 255];
      const GRN: [number, number, number] = [0, 255, 136];
      const DARK: [number, number, number] = [10, 10, 10];
      const CARD: [number, number, number] = [18, 18, 18];
      const BORD: [number, number, number] = [35, 35, 35];
      const WHITE: [number, number, number] = [255, 255, 255];
      const GREY: [number, number, number] = [160, 160, 160];
      const LGREY: [number, number, number] = [220, 220, 220];

      // ── Background ──────────────────────────────────────────
      doc.setFillColor(...DARK);
      doc.rect(0, 0, PAGE_W, 297, 'F');

      // ── Header bar ──────────────────────────────────────────
      doc.setFillColor(...CARD);
      doc.roundedRect(MARGIN, 10, COL_W, 28, 3, 3, 'F');
      doc.setDrawColor(...BORD);
      doc.setLineWidth(0.3);
      doc.roundedRect(MARGIN, 10, COL_W, 28, 3, 3, 'D');

      // Logo text "ValorB3"
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(16);
      doc.setTextColor(...CYN);
      doc.text('Valor', MARGIN + 4, 20);
      const valorW = doc.getTextWidth('Valor');
      doc.setTextColor(...WHITE);
      doc.text('B3', MARGIN + 4 + valorW, 20);

      // Subtitle
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(...GREY);
      doc.text('Relatório de Análise Fundamentalista', MARGIN + 4, 25);
      doc.text('valorb3.com.br · apenas para fins educacionais', MARGIN + 4, 29.5);

      // Date on the right
      doc.setFontSize(7);
      doc.text(`Gerado em ${dateStr()}`, PAGE_W - MARGIN - 4, 25, { align: 'right' });

      let y = 46;

      // ── Ticker + Price block ─────────────────────────────────
      doc.setFillColor(...CARD);
      doc.roundedRect(MARGIN, y, COL_W, 22, 3, 3, 'F');
      doc.setDrawColor(...BORD);
      doc.roundedRect(MARGIN, y, COL_W, 22, 3, 3, 'D');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(20);
      doc.setTextColor(...CYN);
      doc.text(ticker, MARGIN + 4, y + 9);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(...GREY);
      doc.text(nome, MARGIN + 4, y + 15.5);

      // Price on right
      const priceStr = brl(stock.regularMarketPrice);
      const chg = stock.regularMarketChangePercent ?? 0;
      const chgStr = `${chg >= 0 ? '+' : ''}${chg.toFixed(2)}%`;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.setTextColor(...WHITE);
      doc.text(priceStr, PAGE_W - MARGIN - 4, y + 9, { align: 'right' });
      doc.setFontSize(8);
      doc.setTextColor(chg >= 0 ? GRN[0] : 255, chg >= 0 ? GRN[1] : 80, chg >= 0 ? GRN[2] : 80);
      doc.text(chgStr, PAGE_W - MARGIN - 4, y + 15.5, { align: 'right' });

      y += 28;

      // ── Consensus verdict ────────────────────────────────────
      const { consensus } = valuation;
      const vText = verdictText(consensus.verdict);
      const vColor: [number, number, number] =
        consensus.verdict === 'subavaliada' ? GRN :
        consensus.verdict === 'sobreavaliada' ? [255, 80, 80] : CYN;

      doc.setFillColor(vColor[0], vColor[1], vColor[2], 0.12);
      doc.roundedRect(MARGIN, y, COL_W, 16, 3, 3, 'F');
      doc.setDrawColor(vColor[0], vColor[1], vColor[2]);
      doc.setLineWidth(0.5);
      doc.roundedRect(MARGIN, y, COL_W, 16, 3, 3, 'D');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(...vColor);
      doc.text(`Veredicto: ${vText}`, MARGIN + 4, y + 6.5);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(...GREY);
      const scoreText = `Score de consenso: ${consensus.score}/4 modelos concordam · Preço justo médio: ${brl(consensus.fairPriceAvg)}`;
      doc.text(scoreText, MARGIN + 4, y + 12);

      y += 22;

      // ── Section helper ───────────────────────────────────────
      const section = (title: string) => {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(...CYN);
        doc.text(title.toUpperCase(), MARGIN, y);
        doc.setLineWidth(0.2);
        doc.setDrawColor(...BORD);
        doc.line(MARGIN + doc.getTextWidth(title.toUpperCase()) + 2, y - 0.5, MARGIN + COL_W, y - 0.5);
        y += 5;
      };

      // ── Valuation models table ───────────────────────────────
      section('Modelos de Valuation');

      const modelRows = [
        ['Bazin', brl(valuation.bazin.fairPrice), valuation.bazin.verdict === 'subavaliada' ? '✓ Subavaliada' : valuation.bazin.verdict === 'sobreavaliada' ? '✗ Sobreavaliada' : '~ Justa'],
        ['Graham', brl(valuation.graham.fairPrice), valuation.graham.verdict === 'subavaliada' ? '✓ Subavaliada' : valuation.graham.verdict === 'sobreavaliada' ? '✗ Sobreavaliada' : '~ Justa'],
        ['P/L Múltiplo', brl(valuation.multiple.fairPrice), valuation.multiple.verdict === 'subavaliada' ? '✓ Subavaliada' : valuation.multiple.verdict === 'sobreavaliada' ? '✗ Sobreavaliada' : '~ Justa'],
        ['DCF', brl(valuation.dcf.fairPrice), valuation.dcf.verdict === 'subavaliada' ? '✓ Subavaliada' : valuation.dcf.verdict === 'sobreavaliada' ? '✗ Sobreavaliada' : '~ Justa'],
      ];

      autoTable(doc, {
        startY: y,
        head: [['Modelo', 'Preço Justo', 'Veredito']],
        body: modelRows,
        theme: 'plain',
        styles: { fontSize: 8, textColor: LGREY, cellPadding: 2.5, lineColor: BORD, lineWidth: 0.1 },
        headStyles: { textColor: GREY, fontStyle: 'bold', fontSize: 7 },
        alternateRowStyles: { fillColor: [22, 22, 22] },
        columnStyles: { 0: { fontStyle: 'bold', textColor: WHITE }, 3: { textColor: GRN } },
        tableLineColor: BORD,
        tableLineWidth: 0.1,
        margin: { left: MARGIN, right: MARGIN },
      });

      y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;

      // ── Key indicators ───────────────────────────────────────
      section('Indicadores Fundamentalistas');

      const indRows = [
        ['P/L (Preço/Lucro)', num(stock.priceEarnings, 1) + 'x', 'P/VP (Preço/Patrim.)', num(stock.priceToBook, 2) + 'x'],
        ['LPA (Lucro/Ação)', brl(stock.earningsPerShare), 'VPA (Val. Patrim./Ação)', brl(stock.bookValuePerShareMRQ)],
        ['Dividend Yield', pct(stock.dividendYield), 'ROE', pct(stock.returnOnEquity)],
        ['ROA', pct(stock.returnOnAssets), 'ROIC', pct(stock.roic)],
        ['Dívida/PL', num(stock.debtToEquity, 2) + 'x', 'EV/EBITDA', num(stock.enterpriseToEbitda, 1) + 'x'],
        ['Marg. Líquida', pct(stock.profitMargins), 'Marg. Bruta', pct(stock.grossMargins)],
        ['Market Cap', brl(stock.marketCap), 'Volume', stock.regularMarketVolume ? stock.regularMarketVolume.toLocaleString('pt-BR') : '—'],
        ['Máx. 52s', brl(stock.fiftyTwoWeekHigh), 'Mín. 52s', brl(stock.fiftyTwoWeekLow)],
      ];

      autoTable(doc, {
        startY: y,
        head: [['Indicador', 'Valor', 'Indicador', 'Valor']],
        body: indRows,
        theme: 'plain',
        styles: { fontSize: 8, textColor: LGREY, cellPadding: 2.5, lineColor: BORD, lineWidth: 0.1 },
        headStyles: { textColor: GREY, fontStyle: 'bold', fontSize: 7 },
        alternateRowStyles: { fillColor: [22, 22, 22] },
        columnStyles: { 0: { textColor: GREY, fontStyle: 'bold' }, 2: { textColor: GREY, fontStyle: 'bold' }, 1: { textColor: WHITE }, 3: { textColor: WHITE } },
        tableLineColor: BORD,
        tableLineWidth: 0.1,
        margin: { left: MARGIN, right: MARGIN },
      });

      y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;

      // ── DCF assumptions ──────────────────────────────────────
      if (valuation.dcf.params) {
        section('Premissas do Modelo DCF');
        const p = valuation.dcf.params;
        const dcfRows = [
          ['FCF base (LPA)', brl(valuation.dcf.baseFcfe), 'Taxa crescimento (fase 1)', `${p.growthRate1}%`],
          ['Taxa crescimento (fase 2)', `${p.growthRate2}%`, 'Crescimento terminal', `${p.terminalGrowth}%`],
          ['WACC (taxa de desconto)', `${p.wacc}%`, 'Valor terminal (PV)', brl(valuation.dcf.pvTerminalValue)],
        ];
        autoTable(doc, {
          startY: y,
          head: [['Premissa', 'Valor', 'Premissa', 'Valor']],
          body: dcfRows,
          theme: 'plain',
          styles: { fontSize: 8, textColor: LGREY, cellPadding: 2.5, lineColor: BORD, lineWidth: 0.1 },
          headStyles: { textColor: GREY, fontStyle: 'bold', fontSize: 7 },
          alternateRowStyles: { fillColor: [22, 22, 22] },
          columnStyles: { 0: { textColor: GREY, fontStyle: 'bold' }, 2: { textColor: GREY, fontStyle: 'bold' }, 1: { textColor: WHITE }, 3: { textColor: WHITE } },
          tableLineColor: BORD,
          tableLineWidth: 0.1,
          margin: { left: MARGIN, right: MARGIN },
        });
        y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;
      }

      // ── Dividends ────────────────────────────────────────────
      const cashDivs = stock.dividendsData?.cashDividends;
      if (cashDivs && cashDivs.length > 0) {
        section('Últimos Dividendos / JCP');
        const divRows = cashDivs.slice(0, 8).map((d) => [
          d.paymentDate ? new Date(d.paymentDate).toLocaleDateString('pt-BR') : '—',
          brl(d.rate),
          d.label ?? d.relatedTo ?? '—',
        ]);
        autoTable(doc, {
          startY: y,
          head: [['Data', 'Valor (R$)', 'Tipo']],
          body: divRows,
          theme: 'plain',
          styles: { fontSize: 8, textColor: LGREY, cellPadding: 2.5, lineColor: BORD, lineWidth: 0.1 },
          headStyles: { textColor: GREY, fontStyle: 'bold', fontSize: 7 },
          alternateRowStyles: { fillColor: [22, 22, 22] },
          columnStyles: { 1: { textColor: GRN } },
          tableLineColor: BORD,
          tableLineWidth: 0.1,
          margin: { left: MARGIN, right: MARGIN },
        });
        y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;
      }

      // ── Disclaimer footer ────────────────────────────────────
      const disclaimerY = 285;
      doc.setFillColor(...CARD);
      doc.roundedRect(MARGIN, disclaimerY, COL_W, 10, 2, 2, 'F');
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6);
      doc.setTextColor(...GREY);
      doc.text(
        '⚠  Este relatório é apenas para fins educacionais e informativos. Não constitui recomendação de compra ou venda de valores mobiliários.',
        MARGIN + COL_W / 2,
        disclaimerY + 4.5,
        { align: 'center', maxWidth: COL_W - 4 }
      );

      // ── Save ─────────────────────────────────────────────────
      doc.save(`ValorB3_${ticker}_${new Date().toISOString().slice(0, 10)}.pdf`);
    } catch (err) {
      console.error('PDF export error:', err);
      alert('Erro ao gerar o PDF. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleExport}
      disabled={loading}
      className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all hover:opacity-90 disabled:opacity-50"
      style={{
        background: 'rgba(0,212,255,0.1)',
        border: '1px solid rgba(0,212,255,0.35)',
        color: 'var(--accent-cyan)',
      }}
      title="Exportar relatório em PDF"
    >
      {loading
        ? <Loader2 size={15} className="animate-spin" />
        : <FileDown size={15} />}
      {loading ? 'Gerando PDF…' : 'Exportar PDF'}
    </button>
  );
}
