"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { aktuellesKonto } from "@/lib/konto";
import { istDesign } from "@/lib/design-namen";
import { DESIGN_COOKIE } from "@/lib/design";

// Merkt sich das gewählte Design in diesem Browser (ein Jahr). Jedes
// angemeldete Konto darf das, auch Tester.
export async function designSetzen(design: string) {
  if (!(await aktuellesKonto()) || !istDesign(design)) return;
  (await cookies()).set(DESIGN_COOKIE, design, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
  revalidatePath("/", "layout");
}
