CREATE TABLE "screener_cache" (
	"ticker" text PRIMARY KEY NOT NULL,
	"name" text,
	"sector" text,
	"price" real,
	"change_pct" real,
	"market_cap" real,
	"pl" real,
	"pvp" real,
	"psr" real,
	"ev_ebitda" real,
	"ev_ebit" real,
	"dy" real,
	"roe" real,
	"roa" real,
	"roic" real,
	"net_margin" real,
	"ebit_margin" real,
	"gross_margin" real,
	"debt_equity" real,
	"current_ratio" real,
	"revenue_growth_5y" real,
	"type" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "screener_pl_idx" ON "screener_cache" USING btree ("pl");--> statement-breakpoint
CREATE INDEX "screener_dy_idx" ON "screener_cache" USING btree ("dy");--> statement-breakpoint
CREATE INDEX "screener_roe_idx" ON "screener_cache" USING btree ("roe");