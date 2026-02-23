"use client";

type SymbolName =
  | "wine_glass"
  | "chess_piece"
  | "camera"
  | "compass"
  | "vinyl_record"
  | "coffee_cup"
  | "fountain_pen"
  | "watch"
  | "globe"
  | "book"
  | "headphones"
  | "cocktail_shaker";

const SYMBOLS: SymbolName[] = [
  "wine_glass",
  "chess_piece",
  "camera",
  "compass",
  "vinyl_record",
  "coffee_cup",
  "fountain_pen",
  "watch",
  "globe",
  "book",
  "headphones",
  "cocktail_shaker"
];

const FRONT_CARDS: SymbolName[] = [...SYMBOLS, ...SYMBOLS];

function SymbolIcon({ name }: { name: SymbolName }) {
  const stroke = "#173248";
  const fill = "#2f4a63";
  const accent = "#b8943b";

  switch (name) {
    case "wine_glass":
      return (
        <svg viewBox="0 0 64 64" className="h-11 w-11" aria-hidden>
          <path d="M18 10h28v6c0 8-6 14-14 14s-14-6-14-14z" fill={fill} stroke={stroke} strokeWidth="2" />
          <path d="M32 30v14" stroke={stroke} strokeWidth="2.5" />
          <path d="M24 48h16" stroke={accent} strokeWidth="2.5" />
        </svg>
      );
    case "chess_piece":
      return (
        <svg viewBox="0 0 64 64" className="h-11 w-11" aria-hidden>
          <circle cx="32" cy="12" r="5" fill={accent} />
          <path d="M24 22h16l-2 10 5 8H21l5-8z" fill={fill} stroke={stroke} strokeWidth="2" />
          <rect x="18" y="44" width="28" height="6" rx="2" fill={accent} />
        </svg>
      );
    case "camera":
      return (
        <svg viewBox="0 0 64 64" className="h-11 w-11" aria-hidden>
          <rect x="10" y="18" width="44" height="30" rx="6" fill={fill} stroke={stroke} strokeWidth="2" />
          <circle cx="32" cy="33" r="9" fill="#102638" stroke={accent} strokeWidth="2.2" />
          <rect x="17" y="14" width="11" height="6" rx="2" fill={accent} />
        </svg>
      );
    case "compass":
      return (
        <svg viewBox="0 0 64 64" className="h-11 w-11" aria-hidden>
          <circle cx="32" cy="32" r="20" fill={fill} stroke={stroke} strokeWidth="2" />
          <path d="M40 24 35 35 24 40l5-11z" fill={accent} stroke={stroke} strokeWidth="2" />
          <circle cx="32" cy="32" r="3" fill="#f2e9d8" />
        </svg>
      );
    case "vinyl_record":
      return (
        <svg viewBox="0 0 64 64" className="h-11 w-11" aria-hidden>
          <circle cx="32" cy="32" r="20" fill="#1a1e27" stroke={stroke} strokeWidth="2" />
          <circle cx="32" cy="32" r="8" fill={fill} />
          <circle cx="32" cy="32" r="2.6" fill={accent} />
        </svg>
      );
    case "coffee_cup":
      return (
        <svg viewBox="0 0 64 64" className="h-11 w-11" aria-hidden>
          <rect x="14" y="24" width="28" height="18" rx="4" fill={fill} stroke={stroke} strokeWidth="2" />
          <path d="M42 28h6a5 5 0 0 1 0 10h-6" fill="none" stroke={stroke} strokeWidth="2" />
          <path d="M16 46h30" stroke={accent} strokeWidth="2.4" />
        </svg>
      );
    case "fountain_pen":
      return (
        <svg viewBox="0 0 64 64" className="h-11 w-11" aria-hidden>
          <path d="M42 10 22 30l12 12 20-20z" fill={fill} stroke={stroke} strokeWidth="2" />
          <path d="M20 42l-4 10 10-4z" fill={accent} stroke={stroke} strokeWidth="2" />
          <circle cx="34" cy="22" r="2" fill={accent} />
        </svg>
      );
    case "watch":
      return (
        <svg viewBox="0 0 64 64" className="h-11 w-11" aria-hidden>
          <rect x="26" y="6" width="12" height="9" rx="2" fill={accent} />
          <circle cx="32" cy="32" r="16" fill={fill} stroke={stroke} strokeWidth="2" />
          <path d="M32 32V22m0 10 7 4" stroke="#f4efe6" strokeWidth="2.4" strokeLinecap="round" />
          <rect x="26" y="49" width="12" height="9" rx="2" fill={accent} />
        </svg>
      );
    case "globe":
      return (
        <svg viewBox="0 0 64 64" className="h-11 w-11" aria-hidden>
          <circle cx="32" cy="28" r="16" fill={fill} stroke={stroke} strokeWidth="2" />
          <path d="M16 28h32M32 12v32M21 18c4 3 18 3 22 0M21 38c4-3 18-3 22 0" stroke="#f4efe6" strokeWidth="1.6" />
          <rect x="24" y="46" width="16" height="4" rx="2" fill={accent} />
        </svg>
      );
    case "book":
      return (
        <svg viewBox="0 0 64 64" className="h-11 w-11" aria-hidden>
          <path d="M14 16h18c4 0 6 2 6 6v24H20c-4 0-6-2-6-6z" fill={fill} stroke={stroke} strokeWidth="2" />
          <path d="M50 16H32c-4 0-6 2-6 6v24h18c4 0 6-2 6-6z" fill="#36516b" stroke={stroke} strokeWidth="2" />
          <path d="M32 16v30" stroke={accent} strokeWidth="2" />
        </svg>
      );
    case "headphones":
      return (
        <svg viewBox="0 0 64 64" className="h-11 w-11" aria-hidden>
          <path d="M16 32a16 16 0 0 1 32 0" fill="none" stroke={stroke} strokeWidth="3" />
          <rect x="14" y="31" width="8" height="15" rx="3" fill={fill} />
          <rect x="42" y="31" width="8" height="15" rx="3" fill={fill} />
          <path d="M22 44c2 4 6 6 10 6s8-2 10-6" stroke={accent} strokeWidth="2" fill="none" />
        </svg>
      );
    case "cocktail_shaker":
      return (
        <svg viewBox="0 0 64 64" className="h-11 w-11" aria-hidden>
          <path d="M26 10h12l-2 8h-8z" fill={accent} />
          <path d="M24 18h16l-5 32h-6z" fill={fill} stroke={stroke} strokeWidth="2" />
          <path d="M24 30h16" stroke="#f4efe6" strokeWidth="2" />
        </svg>
      );
  }
}

function CardFront({ symbol }: { symbol: SymbolName }) {
  return (
    <article className="memory-card-front">
      <div className="memory-card-front-inner">
        <SymbolIcon name={symbol} />
      </div>
    </article>
  );
}

function CardBack() {
  return <article className="memory-card-back" aria-hidden />;
}

export default function MemoryMatchPrintClient() {
  return (
    <div className="memory-print-shell">
      <div className="memory-no-print memory-toolbar">
        <button type="button" className="memory-print-btn" onClick={() => window.print()}>
          Print Memory Match Sheets
        </button>
      </div>

      <section className="memory-print-sheet">
        <header className="memory-header">
          <h1>Memory Match</h1>
          <p>Classic Concentration Game</p>
        </header>
        <div className="memory-grid" role="list" aria-label="Memory card fronts">
          {FRONT_CARDS.map((symbol, idx) => (
            <div key={`${symbol}-${idx}`} role="listitem">
              <CardFront symbol={symbol} />
            </div>
          ))}
        </div>
      </section>

      <section className="memory-print-sheet memory-back-sheet">
        <header className="memory-header">
          <h1>Memory Match</h1>
          <p>Card Backs</p>
        </header>
        <div className="memory-grid" role="list" aria-label="Memory card backs">
          {Array.from({ length: 24 }, (_, idx) => (
            <div key={`back-${idx}`} role="listitem">
              <CardBack />
            </div>
          ))}
        </div>
      </section>

      <style jsx global>{`
        .memory-print-shell {
          min-height: 100vh;
          padding: 1.2rem;
          background: #ece8e1;
          color: #172331;
        }

        .memory-toolbar {
          display: flex;
          justify-content: center;
          margin-bottom: 1rem;
        }

        .memory-print-btn {
          border: 1px solid #b8943b;
          background: #173248;
          color: #f4efe6;
          border-radius: 999px;
          padding: 0.55rem 1rem;
          font-size: 0.8rem;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }

        .memory-print-sheet {
          width: 8.5in;
          min-height: 11in;
          margin: 0 auto 1.2rem;
          padding: 0.35in;
          background: #f5f2eb;
          box-shadow: 0 20px 48px rgba(15, 23, 42, 0.16);
        }

        .memory-header {
          text-align: center;
          margin-bottom: 0.2in;
        }

        .memory-header h1 {
          margin: 0;
          font-family: "Times New Roman", Georgia, serif;
          font-size: 34px;
          font-weight: 600;
          letter-spacing: 0.03em;
          color: #1b2d3f;
        }

        .memory-header p {
          margin: 6px 0 0;
          font-size: 12px;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: #556273;
        }

        .memory-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 0.16in;
        }

        .memory-card-front,
        .memory-card-back {
          aspect-ratio: 1 / 1;
          border-radius: 14px;
          border: 1.3px solid #b8943b;
          box-shadow: 0 10px 18px rgba(25, 35, 45, 0.14);
          overflow: hidden;
        }

        .memory-card-front {
          background: linear-gradient(160deg, #f8f4ec 0%, #f1ece1 100%);
          display: grid;
          place-items: center;
        }

        .memory-card-front-inner {
          width: 82%;
          height: 82%;
          border-radius: 12px;
          display: grid;
          place-items: center;
          background: linear-gradient(160deg, #eef1f5 0%, #dde4eb 100%);
        }

        .memory-card-back {
          background:
            linear-gradient(135deg, rgba(184, 148, 59, 0.22) 0%, rgba(184, 148, 59, 0.05) 100%),
            repeating-linear-gradient(
              45deg,
              rgba(184, 148, 59, 0.2) 0px,
              rgba(184, 148, 59, 0.2) 2px,
              transparent 2px,
              transparent 14px
            ),
            repeating-linear-gradient(
              -45deg,
              rgba(184, 148, 59, 0.12) 0px,
              rgba(184, 148, 59, 0.12) 2px,
              transparent 2px,
              transparent 14px
            ),
            radial-gradient(circle at 50% 50%, #263a54 0%, #15263a 70%, #0f1f32 100%);
          position: relative;
        }

        .memory-card-back::before {
          content: "";
          position: absolute;
          inset: 20%;
          border: 1.2px solid rgba(184, 148, 59, 0.62);
          border-radius: 10px;
        }

        .memory-card-back::after {
          content: "";
          position: absolute;
          inset: 38%;
          border: 1.2px solid rgba(184, 148, 59, 0.72);
          transform: rotate(45deg);
        }

        @media print {
          nav,
          [data-sonner-toaster],
          .memory-no-print {
            display: none !important;
          }

          main {
            padding: 0 !important;
          }

          .memory-print-shell {
            padding: 0;
            background: #fff;
          }

          .memory-print-sheet {
            width: 8.5in;
            min-height: 11in;
            margin: 0;
            box-shadow: none;
            page-break-after: always;
            break-after: page;
          }
        }
      `}</style>
    </div>
  );
}
