// Create a local development key; never commit the private key or .dev.vars.
import {generateKeyPairSync} from 'node:crypto';
import {readFile,writeFile} from 'node:fs/promises';
const privatePath=new URL('../domain/.dev.vars',import.meta.url),publicPath=new URL('../bitfeedback/signing-public-key.txt',import.meta.url);
let existing='';try{existing=await readFile(privatePath,'utf8');}catch(e){if(e.code!=='ENOENT')throw e;}
if(/FEEDBACK_SIGNING_KEY\s*=/.test(existing))throw Error('A key already exists. Keep the matching public key; do not overwrite it.');
try{await readFile(publicPath);throw Error('A public key already exists; recover its private key instead of overwriting it.');}catch(e){if(e.code!=='ENOENT')throw e;}
const {privateKey,publicKey}=generateKeyPairSync('ec',{namedCurve:'prime256v1'});
await writeFile(privatePath,existing+'\nFEEDBACK_SIGNING_KEY="'+privateKey.export({type:'pkcs8',format:'der'}).toString('base64')+'"\n',{mode:0o600});
await writeFile(publicPath,publicKey.export({type:'spki',format:'pem'}));
console.log('Created ignored local signing secret and pinned public verification key.');
