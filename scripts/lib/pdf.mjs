// PDFを文字に起こすための、ごく薄い包み紙。
// 中身は poppler-utils の pdftotext（外部コマンド）に任せています。
// -layout を付けると、表の桁ぞろえを保ったまま文字にしてくれます。
import { execFile } from 'node:child_process';

export function pdfToText(buffer) {
  return new Promise((resolve, reject) => {
    const child = execFile(
      'pdftotext',
      ['-layout', '-enc', 'UTF-8', '-', '-'],
      { maxBuffer: 64 * 1024 * 1024, encoding: 'utf8' },
      (err, stdout) => {
        if (!err) return resolve(stdout);
        reject(new Error(
          err.code === 'ENOENT'
            ? 'pdftotext が見つかりません（poppler-utils を入れてください）'
            : `pdftotext に失敗しました: ${err.message}`
        ));
      }
    );
    child.stdin.on('error', () => {}); // 相手が先に終了したときのEPIPE対策
    child.stdin.end(buffer);
  });
}
