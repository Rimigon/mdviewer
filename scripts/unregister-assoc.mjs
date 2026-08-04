import { spawnSync } from "node:child_process";

for (const key of [
	"HKCU\\Software\\Classes\\MDViewer.md",
	"HKCU\\Software\\Classes\\.md",
]) {
	spawnSync("reg", ["delete", key, "/f"], { encoding: "utf8" });
}
console.log("OK: ассоциация .md удалена");
