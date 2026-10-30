import { redirect } from "next/navigation";

// Das Lager besteht aus zwei Seiten (Material, Erzeugnisse); welche man will,
// fragt das Menü. Alte Lesezeichen und Links auf /lager landen beim Material.
export default function LagerPage() {
  redirect("/lager/material");
}
