import type { TrainMethod } from "@/lib/train/products";

import { RouterControlPlane } from "./RouterControlPlane";

type Props = {
  method: TrainMethod;
};

export function RouterTrainPanel({ method }: Props) {
  return <RouterControlPlane method={method} />;
}
