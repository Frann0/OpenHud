import { app, globalShortcut, BrowserWindow } from "electron";
import { keybindDefinition } from "./helpers/keybindDefinition.js";
import { io } from "./api/v2/sockets/sockets.js";
import fs from "fs";
import path from "path";

let hudWindows: BrowserWindow[] = [];

export function registerHudWindow(win: BrowserWindow) {
  console.log(win);
  hudWindows.push(win);
}

export function unregisterHudWindow(win: BrowserWindow) {
  hudWindows = hudWindows.filter((w) => w !== win);
}

export function registerKeybinds() {
  globalShortcut.unregisterAll();

  const user = loadUserKeybinds();

  console.log("[keybinds] loading", user.bindings.length, "binds");

  for (const { bind, action } of user.bindings) {
    const success = globalShortcut.register(bind, () => {
      console.log("[main] shortcut fired:", bind, "->", action);
      io.emit("hudAction", { type: action });
    });

    if (!success) {
      console.warn(`Failed to register keybind: ${bind}`);
    }
  }
}

export function unregisterKeybinds() {
  globalShortcut.unregisterAll();
}

export function saveUserKeybinds(data: any) {
  const file = getUserKeybindPath();
  fs.writeFileSync(file, JSON.stringify(data, null, 2), "utf-8");

  console.log("[keybinds] saved → reloading");
  registerKeybinds(); // 🔥 reapply instantly
}

function getUserKeybindPath() {
  const dir = path.join(app.getPath("home"), "OpenHud-Huds", "config");
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return path.join(dir, "keybinds.user.json");
}

function loadUserKeybinds() {
  const file = getUserKeybindPath();

  if (!fs.existsSync(file)) {
    return { version: 1, bindings: [] };
  }

  try {
    const raw = fs.readFileSync(file, "utf-8");
    return JSON.parse(raw);
  } catch (err) {
    console.error("Failed reading keybinds:", err);
    return { version: 1, bindings: [] };
  }
}
