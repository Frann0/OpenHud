import { globalShortcut, BrowserWindow } from "electron";
import { keybindDefinition } from "./helpers/keybindDefinition.js";
import { io } from "./api/v2/sockets/sockets.js";

let hudWindows: BrowserWindow[] = [];

export function registerHudWindow(win: BrowserWindow) {
  console.log(win);
  hudWindows.push(win);
}

export function unregisterHudWindow(win: BrowserWindow) {
  hudWindows = hudWindows.filter((w) => w !== win);
}

export function registerKeybinds() {
  globalShortcut.register("Shift+0", () => {
    console.log("[main] shortcut fired");
    io.emit("hudAction", { type: "radarBigger" });
  });

  for (const { bind, action } of keybindDefinition) {
    const success = globalShortcut.register(bind, () => {
      for (const win of hudWindows) {
        console.log("[main] shortcut fired");
        io.emit("hudAction", { type: action });
      }
    });

    if (!success) {
      console.warn(`Failed to register keybind: ${bind}`);
    }
  }
}

export function unregisterKeybinds() {
  globalShortcut.unregisterAll();
}
