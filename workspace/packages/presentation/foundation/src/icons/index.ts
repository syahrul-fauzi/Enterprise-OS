export type IconCategory = "action" | "status" | "file" | "social" | "navigation" | "generic";

export interface IconDescriptor {
  readonly name: IconName;
  readonly viewBox: string;
  readonly category: IconCategory;
  readonly aliases?: readonly string[];
}

export const iconNameList = [
  "search",
  "filter",
  "plus",
  "close",
  "arrow-right",
  "arrow-left",
  "arrow-up",
  "arrow-down",
  "check",
  "warning",
  "info",
  "file-text",
  "briefcase",
  "user",
  "settings",
  "home",
  "menu",
  "calendar",
  "clock",
  "download",
  "upload",
  "edit",
  "trash",
  "chevron-down",
  "chevron-up",
  "chevron-left",
  "chevron-right",
] as const;

export type IconName = (typeof iconNameList)[number];

export type IconRegistry = Readonly<Record<IconName, IconDescriptor>>;

const VB = "0 0 24 24";

type D = IconDescriptor;
type C = IconCategory;

const I = (name: IconName, category: C, viewBox = VB, aliases?: readonly string[]): D => ({ name, viewBox, category, aliases });

export const iconRegistry: IconRegistry = {
  "search": I("search", "action", VB, ["find", "magnify", "magnifying-glass"]),
  "filter": I("filter", "action", VB, ["funnel", "sort"]),
  "plus": I("plus", "action", VB, ["add", "new", "create"]),
  "close": I("close", "action", VB, ["x", "remove", "dismiss", "cancel"]),
  "arrow-right": I("arrow-right", "navigation", VB, ["arrow-forward", "next"]),
  "arrow-left": I("arrow-left", "navigation", VB, ["arrow-back", "previous", "prev"]),
  "arrow-up": I("arrow-up", "navigation", VB, ["arrow-top", "increase"]),
  "arrow-down": I("arrow-down", "navigation", VB, ["arrow-bottom", "decrease"]),
  "check": I("check", "status", VB, ["success", "tick", "done", "confirm"]),
  "warning": I("warning", "status", VB, ["alert", "attention", "exclamation-triangle"]),
  "info": I("info", "status", VB, ["information", "help"]),
  "file-text": I("file-text", "file", VB, ["document", "page", "doc", "paper"]),
  "briefcase": I("briefcase", "generic", VB, ["case", "work", "portfolio"]),
  "user": I("user", "generic", VB, ["profile", "person", "account", "avatar"]),
  "settings": I("settings", "action", VB, ["gear", "preferences", "config", "cog"]),
  "home": I("home", "navigation", VB, ["dashboard", "house"]),
  "menu": I("menu", "navigation", VB, ["hamburger", "list", "nav"]),
  "calendar": I("calendar", "generic", VB, ["date", "schedule", "event"]),
  "clock": I("clock", "generic", VB, ["time", "watch", "timer"]),
  "download": I("download", "action", VB, ["get", "save", "export-down"]),
  "upload": I("upload", "action", VB, ["send", "submit", "import-up"]),
  "edit": I("edit", "action", VB, ["pencil", "write", "modify", "update"]),
  "trash": I("trash", "action", VB, ["delete", "remove", "bin", "garbage"]),
  "chevron-down": I("chevron-down", "navigation", VB, ["caret-down", "expand", "open"]),
  "chevron-up": I("chevron-up", "navigation", VB, ["caret-up", "collapse", "close"]),
  "chevron-left": I("chevron-left", "navigation", VB, ["caret-left", "back"]),
  "chevron-right": I("chevron-right", "navigation", VB, ["caret-right", "forward"]),
} as const;

export const defaultIcons: IconRegistry = iconRegistry;
