import { globalShortcut, BrowserWindow } from "electron";
import { keybindDefinition } from "./helpers/keybindDefinition.js";
import { ipcWebContentsSend } from "./helpers/util.js";

let hudWindows: BrowserWindow[] = [];

export function registerHudWindow(win: BrowserWindow) {
  hudWindows.push(win);
}

export function unregisterHudWindow(win: BrowserWindow) {
  hudWindows = hudWindows.filter((w) => w !== win);
}

export function registerKeybinds() {
  globalShortcut.register("Shift+0", () => {
    console.log("aaa");
  });
  for (const { bind, action } of keybindDefinition) {
    const success = globalShortcut.register(bind, () => {
      for (const win of hudWindows) {
        ipcWebContentsSend("action", win.webContents, { type: action });
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
