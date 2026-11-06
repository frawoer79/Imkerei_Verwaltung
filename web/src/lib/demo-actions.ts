"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { besucherAdresse, istDemo, istDemoPlatz, platzBelegen, platzFreigeben } from "@/lib/demo";
import { aktuellesKonto } from "@/lib/konto";
import { sitzungSetzen } from "@/lib/sitzung";

// Knöpfe der öffentlichen Demo (lib/demo.ts). Ohne DEMO_MODUS tun sie nichts.

async function belegenUndWeiter(): Promise<never> {
  const belegung = await platzBelegen(besucherAdresse(await headers()));
  if ("grund" in belegung) redirect(`/demo?hinweis=${belegung.grund}`);
  await sitzungSetzen(belegung.platz, { bisBrowserZu: true });
  redirect("/");
}

export async function demoStarten(): Promise<void> {
  if (!istDemo()) return;
  await belegenUndWeiter();
}

// Eigene Spielwiese verwerfen und mit frischen Daten neu beginnen.
export async function demoNeuStarten(): Promise<void> {
  if (!istDemo()) return;
  const konto = await aktuellesKonto();
  if (konto?.art === "tester" && istDemoPlatz(konto.testzugangId)) {
    await platzFreigeben(konto.testzugangId);
  }
  await belegenUndWeiter();
}
