import { useContext } from "react";
import { CelebrationContext } from "../context/CelebrationContext";

export function useCelebration() {
  return useContext(CelebrationContext);
}
