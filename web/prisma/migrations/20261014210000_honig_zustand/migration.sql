-- Optionaler Zustand bei Honig-Buchungen (gerührt / unbearbeitet). Bestehende
-- Buchungen bleiben ohne Angabe.
ALTER TABLE "ErzeugnisBuchung" ADD COLUMN "zustand" TEXT;
