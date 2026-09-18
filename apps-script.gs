/**
 * 咲耶Nounラリー ランキング用 Google Apps Script (Web App)
 *
 * セットアップ手順:
 * 1. Google スプレッドシートを新規作成する（空のままでよい）
 * 2. 拡張機能 → Apps Script を開き、このファイルの内容を貼り付けて保存
 * 3. 「デプロイ」→「新しいデプロイ」→種類「ウェブアプリ」を選択
 *    - 実行するユーザー: 自分
 *    - アクセスできるユーザー: 全員
 * 4. 発行される URL（https://script.google.com/macros/s/.../exec）を
 *    index.html の GAS_URL 定数にセットする
 *
 * シート名も見出し行もこのスクリプトが自動で作るので、事前の準備は要らない。
 *
 * ※ 咲耶スクランブルとは別のスプレッドシートにすること。
 *   列の中身が違う（あちらは「救出キャラ」、こちらは踏破率・回収CNP・クリア）ので、
 *   混ぜると読めなくなる。GAS を共用にすると片方の変更が両方に影響する。
 *
 * スプレッドシートの列（1レコード = 1行）:
 *   スコア | ニックネーム | X ID | 登録日時 | 端末 | 踏破率 | 回収CNP | クリア
 *
 *   踏破率  … そのプレイで塗ったマスの割合（0〜100 の整数）
 *   回収CNP … そのプレイで集めた CNP の数（0〜11）
 *   クリア  … 出口まで戻れたかどうか（"はい" / "いいえ"）
 */

const SHEET_NAME = "ranking";
const MAX_RECORDS_RETURNED = 100; // 取得件数の上限（フロント側で TOP10 に絞る）
const HEADERS = ["スコア", "ニックネーム", "X ID", "登録日時", "端末", "踏破率", "回収CNP", "クリア"];

// 理論上の最高得点は実測で 5,555 点（CNP 2,420 + 塗り 2,335 + ゴール 800）。
// それを超える値は改ざんとみなして弾く。余裕を見て 6,000。
// ※ クライアント側の数字は信用できない。ここが最後の砦。
const MAX_SCORE = 6000;
const MAX_CNP = 11;

function getSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    sheet.appendRow(HEADERS);
    return sheet;
  }
  // 既存シートの見出しが足りない場合だけ補う（何か入っていれば触らない）
  const lastCol = sheet.getLastColumn();
  if (lastCol < HEADERS.length) {
    for (let c = lastCol + 1; c <= HEADERS.length; c++) {
      const cell = sheet.getRange(1, c);
      if (!String(cell.getValue() || "").trim()) cell.setValue(HEADERS[c - 1]);
    }
  }
  return sheet;
}

function doGet(e) {
  const sheet = getSheet_();
  const values = sheet.getDataRange().getValues();
  const rows = values.slice(1); // 見出し行を除く

  const records = rows
    .filter(function (r) {
      return r[1] !== "" && r[1] != null; // ニックネームが空の行は除外
    })
    .map(function (r) {
      return {
        score: Number(r[0] || 0),
        nickname: String(r[1] || ""),
        xid: String(r[2] || ""),
        created: r[3] ? new Date(r[3]).getTime() : null,
        device: String(r[4] || ""),
        paint: Number(r[5] || 0),
        cnp: Number(r[6] || 0),
        cleared: String(r[7] || "") === "はい"
      };
    })
    .sort(function (a, b) {
      return b.score - a.score;
    })
    .slice(0, MAX_RECORDS_RETURNED);

  return jsonOut_({ records: records });
}

function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents);

    if (body.action === "add") {
      const rec = body.record || {};
      const nickname = String(rec.nickname || "").trim().slice(0, 20);
      const xid = String(rec.xid || "").replace(/^@/, "").trim().slice(0, 20);
      const created = rec.created || Date.now();
      const device = String(rec.device || "").trim().slice(0, 20);

      if (!nickname) {
        return jsonOut_({ success: false, error: "nickname is required" });
      }

      // 数値はすべてここで丸める。範囲外は弾くのではなく切り詰める
      // （弾くと「登録できない」としか見えず、原因が伝わらない）
      const score = clampInt_(rec.score, 0, MAX_SCORE);
      const paint = clampInt_(rec.paint, 0, 100);
      const cnp = clampInt_(rec.cnp, 0, MAX_CNP);
      const cleared = rec.cleared === true ? "はい" : "いいえ";

      const sheet = getSheet_();
      sheet.appendRow([score, nickname, xid, new Date(created), device, paint, cnp, cleared]);
      return jsonOut_({ success: true });
    }

    return jsonOut_({ success: false, error: "unknown action" });
  } catch (err) {
    return jsonOut_({ success: false, error: String(err) });
  }
}

function clampInt_(v, lo, hi) {
  const n = Math.floor(Number(v));
  if (!isFinite(n)) return lo;
  return Math.min(hi, Math.max(lo, n));
}

function jsonOut_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
