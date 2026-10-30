import { SeitenNavigation } from "@/components/seiten-navigation";
import { BienenhalterInhalt } from "../_teile/bienenhalter";

export default function BienenhalterPage() {
  return <BienenhalterInhalt kopf={<SeitenNavigation className="mb-2" />} />;
}
