function importNotionData() {
  const url = `https://api.notion.com/v1/databases/${SECRETS.DATABASE_ID}/query`;
  const options = {
    method: "post",
    headers: {
      "Authorization": `Bearer ${SECRETS.NOTION_TOKEN}`,
      "Content-Type": "application/json",
      "Notion-Version": "2022-06-28"
    },
    muteHttpExceptions: true
  };

  const response = UrlFetchApp.fetch(url, options);
  const data = JSON.parse(response.getContentText());

  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("シート1");

  // 📌 シート全体をクリアしてヘッダーだけ書き直す
  sheet.clear();
  sheet.appendRow([
    "日付", "歩数", "歩いた距離", "摂取カロリー", "消費カロリー", "総消費カロリー",
    "塩分", "タンパク質", "脂質", "炭水化物", "ミネラル", "ビタミン", "食物繊維", "コメント"
  ]);

  const rows = [];

  data.results.forEach(page => {
    const props = page.properties;
    const dateValue = props["日付"]?.date?.start || "";
    if (!dateValue) return;

    const steps         = props["歩数"]?.number ?? 0;
    const distance      = props["歩いた距離(km)"]?.number ?? 0;
    const burn          = props["消費Kcal"]?.number ?? 0;
    const totalBurn     = burn + SECRETS.BASAL_METABOLISM;
    const intake        = props["摂取Kcal"]?.number ?? 0;
    const salt          = props["塩分(g)"]?.number ?? 0;
    const protein       = props["タンパク質(g) "]?.number ?? 0;
    const lipid         = props["脂質(g) "]?.number ?? 0;
    const carbs         = props["炭水化物(g) "]?.number ?? 0;
    const mineral       = props["ミネラル(g) "]?.number ?? 0;
    const vitamin       = props["ビタミン(g) "]?.number ?? 0;
    const fiber         = props["食物繊維(g) "]?.number ?? 0;
    const memo          = props["コメント"]?.rich_text?.[0]?.plain_text || "";

    rows.push([
      dateValue, steps, distance, intake, burn, totalBurn,
      salt, protein, lipid, carbs, mineral, vitamin, fiber, memo
    ]);
  });

  // 📅 古い日付順に並び替え（ISO8601なら文字列比較でOK）
  rows.sort((a, b) => a[0].localeCompare(b[0]));

  // 📌 並べたデータを1行ずつ追記
  rows.forEach(row => {
    sheet.appendRow(row);
  });
}
// 📊 グラフを生成して、Googleドライブの「ダイエットフォルダ」に上書き保存
function createCalorieChartAndSaveToDietFolder() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName("シート1");
  const lastRow = sheet.getLastRow();

   const chart = sheet.newChart()
    .setChartType(Charts.ChartType.LINE)
    .addRange(sheet.getRange("A1:A" + lastRow)) // 日付
    .addRange(sheet.getRange("D1:D" + lastRow)) // 摂取カロリー
    .addRange(sheet.getRange("F1:F" + lastRow)) // 総消費カロリー
    .setPosition(2, 8, 0, 0)
    .setOption("title", "摂取カロリーと消費カロリーの推移")
    .setOption("curveType", "function")
    .build();

  sheet.insertChart(chart);
  const blob = chart.getAs('image/png');

  const folderId = SECRETS.FOLDER_ID; // ←このIDに更新！

  const folder = DriveApp.getFolderById(folderId);

  // 同名ファイルがあれば削除してから保存（＝上書き）
  const files = folder.getFilesByName("calorie_chart.png");
  while (files.hasNext()) {
    files.next().setTrashed(true);
  }

  const file = folder.createFile(blob).setName("calorie_chart.png");

  Logger.log("画像URL: https://drive.google.com/uc?export=view&id=" + file.getId());
}

function createRadarChartAndSaveToDietFolder(){
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName("シート1");
  const lastRow = sheet.getLastRow()

  // データ行（直近の1日分）を読み込む
  const labels = ["炭水化物", "脂質", "タンパク質", "ミネラル", "ビタミン"];
  const dataRange = sheet.getRange(lastRow, 10, 1, 5); // J〜N列
  const radarchart = sheet.newChart()
  .setChartType(Charts.ChartType.RADAR)
  
  //一時的な表を作る（A列にラベル、B列に値）
  const tmpSheet = ss.insertSheet("tmpRadarData");
  tmpSheet.getRange(1, 1, labels.length, 1).setValues(labels.map(l => [l]));
  tmpSheet.getRange(1, 2, 1, 5).setValues([dataRange.getValues()[0]]);
  // チャートを作成
  const chart = tmpSheet.newChart()
    .setChartType(Charts.ChartType.RADAR)
    .addRange(tmpSheet.getRange(1, 1, labels.length, 2))
    .setOption("title", "5大栄養素の摂取バランス")
    .setPosition(2, 4, 0, 0)
    .build();

  tmpSheet.insertChart(chart);

  // チャートを画像として保存（Googleドライブ）
  const blob = chart.getAs('image/png');
  const folder = DriveApp.getFolderById(SECRETS.FOLDER_ID);

  const files = folder.getFilesByName("radar_chart.png");
  while (files.hasNext()) {
    files.next().setTrashed(true);
  }

  const file = folder.createFile(blob).setName("radar_chart.png");
  Logger.log("画像URL: https://drive.google.com/uc?export=view&id=" + file.getId());

  // 一時シート削除
  ss.deleteSheet(tmpSheet);

}

