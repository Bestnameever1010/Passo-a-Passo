import { useEffect, useState, useSyncExternalStore } from "react";
import { AppDataController } from "./app-data-controller";

function createController(): AppDataController {
  return new AppDataController({
    getItem: (key) => window.localStorage.getItem(key),
    setItem: (key, value) => window.localStorage.setItem(key, value),
    removeItem: (key) => window.localStorage.removeItem(key),
  });
}

export function useAppData() {
  const [controller] = useState(createController);
  const snapshot = useSyncExternalStore(
    controller.subscribe,
    controller.getSnapshot,
    controller.getSnapshot,
  );

  useEffect(() => {
    controller.load();
  }, [controller]);

  return { ...snapshot, controller };
}
