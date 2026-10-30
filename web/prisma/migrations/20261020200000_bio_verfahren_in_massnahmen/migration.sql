-- Fahrplan eines Verfahrens wahlweise nicht unter Maßnahmen zeigen. Bisherige
-- Verfahren bleiben sichtbar.
ALTER TABLE "BioVerfahren" ADD COLUMN "inMassnahmen" BOOLEAN NOT NULL DEFAULT true;
