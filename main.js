function importNotionData() {
  const url =  `https://api.notion.com/v1/databases/${SECRETS.DATABASE_ID}/query`;
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
  sheet.clear(); // 上書きモード
  sheet.appendRow(["日付", "歩数", "歩いた距離", "摂取カロリー", "消費カロリー", "総消費カロリー","コメント"]);

  data.results.forEach(page => {
    const props = page.properties;
    const dateValue = props["日付"]?.date?.start || "";
    // 日付がない行はスキップする
    if (!dateValue) return;
    const steps     = props["歩数"]?.number ?? 0;
    const distance  = props["歩いた距離(km)"]?.number ?? 0;
    const burn      = props["消費Kcal"]?.number ?? 0;
    const totalBurn = (props["消費Kcal"]?.number ?? 0) + 1400;
    const intake    = props["摂取Kcal"]?.number ?? 0;
    const memo      = props["コメント"]?.rich_text?.[0]?.plain_text || "";

    sheet.appendRow([dateValue, steps, distance, intake, burn,totalBurn, memo]);
  });
}

// 📊 グラフを生成して、Googleドライブの「ダイエットフォルダ」に上書き保存
function createChartAndSaveToDietFolder() {
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
    .setOption("series", {
      0: { labelInLegend: "摂取カロリー", color: "blue", lineDashStyle: [4, 4] },
      1: { labelInLegend: "総消費カロリー", color: "red", lineDashStyle: [1, 0] }
    })
    .setOption("legend", { position: "top" })
    .build();


  sheet.insertChart(chart);
  const blob = chart.getAs('image/png');

  const folderId = SECRETS.FOLDER_ID; // ←このIDに更新！

  const folder = DriveApp.getFolderById(folderId);

  const files = folder.getFilesByName("calorie_chart.png");
    if (files.hasNext()) {
      const file = files.next();
      file.setContent(blob.getDataAsString()); // ←上書き保存（ID維持）
    } else {
      folder.createFile(blob).setName("calorie_chart.png"); // なければ新規作成
    }

  Logger.log("画像URL: https://drive.google.com/uc?export=view&id=" + file.getId());
}