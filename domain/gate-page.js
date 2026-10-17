// SPDX-License-Identifier: GPL-3.0-only
// The neutral acknowledgement page. `next` is escaped by the request handler.
export function gatePage(next,font,path){
 return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>whats up</title>
<style>@font-face{font-family:Little;src:url('${font}')}*{box-sizing:border-box}body{margin:0;min-height:100svh;display:grid;place-items:center;background:#11150f;color:#edf1e8;font-family:Little,monospace}main{text-align:center;padding:32px}h1{font-size:clamp(38px,8vw,64px);font-weight:400;margin:0 0 30px}button{font:20px Little,monospace;background:#b9ef77;color:#11150f;border:1px solid #b9ef77;padding:14px 26px;cursor:pointer}button:focus-visible{outline:3px solid #edf1e8;outline-offset:6px}</style>
</head>
<body>
<main>
<h1>whats up</h1>
<form action="${path}" method="post">
<input type="hidden" name="returnTo" value="${next}">
<button type="submit">acknowledge</button>
</form>
</main>
</body>
</html>`;
}
