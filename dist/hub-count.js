// SPDX-License-Identifier: GPL-3.0-only
// Store the Hub snapshot separately; refreshing never increments our own counter.
const SOURCE = 'firmwarehub';
const HOUR = 3600000;
let refreshing;
export async function hubInstalls(DB, {fetcher=fetch, now=Date.now()}={}) {
 let row=await DB.prepare('SELECT total, checked_at FROM external_install_counts WHERE source = ?').bind(SOURCE).first();
 if(row && now-row.checked_at<HOUR)return row.total;
 if(refreshing){await refreshing;return (await DB.prepare('SELECT total FROM external_install_counts WHERE source = ?').bind(SOURCE).first())?.total??row?.total??0;}
 refreshing=(async()=>{
  let total=row?.total??0;
  try {
   const response=await fetcher('https://thefirmwarehub.com/catalog.json',{headers:{Accept:'application/json'},signal:AbortSignal.timeout(5000)});
   if(!response.ok)throw Error('Hub unavailable');
   const catalogue=await response.json();
   const pigeon=catalogue.firmwares?.find(f=>f.id==='pigeon');
   if(!Number.isSafeInteger(pigeon?.installs)||pigeon.installs<0)throw Error('Invalid Hub count');
   total=pigeon.installs;
  } catch { /* Retain the last known count and back off for an hour. */ }
  await DB.prepare('INSERT INTO external_install_counts (source,total,checked_at) VALUES (?,?,?) ON CONFLICT(source) DO UPDATE SET total=excluded.total, checked_at=excluded.checked_at').bind(SOURCE,total,now).run();
  return total;
 })();
 try{return await refreshing;}finally{refreshing=undefined;}
}
