-- Ein Rähmchenmaß, das nur als Brutraum taugt (Zander 1,5, Zadant, DNM
-- anderthalb, Dadant-Brutraum, ...), ist bereits eine hohe Zarge für sich und
-- wird nie gestapelt. Schon angelegte Zargen mit einer falschen Zargenzahl
-- (z.B. aus der Zeit vor dieser Regel) auf einräumig zurücksetzen.

UPDATE "Zarge" z
SET "zargenAnzahl" = 1
FROM "Wabenmass" w
WHERE z."wabenmassId" = w.id
  AND z.verwendung = 'BRUTRAUM'
  AND w.eignung = 'BRUTRAUM'
  AND z."zargenAnzahl" <> 1;
