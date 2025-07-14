// build.js
const fs = require("fs");
const path = require("path");

const secrets = fs.readFileSync(path.join(__dirname, "secrets.js"), "utf-8");
const main = fs.readFileSync(path.join(__dirname, "main.js"), "utf-8");

const combined = `${secrets}\n\n${main}`;

// 出力フォルダを作成（なければ）
const distDir = path.join(__dirname, "dist");
if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir);
}

fs.writeFileSync(path.join(distDir, "code.gs"), combined);

console.log("✅ build完了 → dist/code.gs に出力されました！");
