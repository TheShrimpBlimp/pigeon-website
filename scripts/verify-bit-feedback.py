#!/usr/bin/env python3
"""Verify an untouched downloaded feedback CSV with the pinned public key."""
import argparse, base64, csv, io, subprocess, tempfile
from pathlib import Path

def der_integer(raw):
    raw=raw.lstrip(b'\0') or b'\0'
    if raw[0]&128: raw=b'\0'+raw
    return b'\x02'+bytes([len(raw)])+raw

def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('csv',type=Path)
    parser.add_argument('--public-key',type=Path,default=Path(__file__).resolve().parents[1]/'bitfeedback/signing-public-key.txt')
    args=parser.parse_args()
    try:
        data=args.csv.read_bytes()
        prefix=b'"signature",'
        marker=data.rfind(b'\r\n'+prefix)
        if marker<0: raise ValueError('Missing signature')
        payload=data[:marker+2]
        rows=list(csv.reader(io.StringIO(data[marker+2:].decode('utf-8'),newline='')))
        if len(rows)!=1 or len(rows[0])!=2 or rows[0][0]!='signature': raise ValueError('Invalid signature record')
        if not rows[0][1].startswith('p256:'): raise ValueError('Unknown signature format')
        raw=base64.b64decode(rows[0][1][5:],validate=True)
        if len(raw)!=64: raise ValueError('Invalid signature length')
        body=der_integer(raw[:32])+der_integer(raw[32:]); signature=b'\x30'+bytes([len(body)])+body
        with tempfile.TemporaryDirectory() as folder:
            p=Path(folder);(p/'payload').write_bytes(payload);(p/'signature').write_bytes(signature)
            result=subprocess.run(['openssl','dgst','-sha256','-verify',str(args.public_key),'-signature',str(p/'signature'),str(p/'payload')],capture_output=True)
        if result.returncode: raise ValueError('Signature mismatch: file altered or signed with a different key')
    except (ValueError,OSError,UnicodeError,csv.Error) as exc:
        parser.exit(1,'INVALID: '+str(exc)+'\n')
    print('VALID: CSV is unchanged since this site signed it.')

if __name__=='__main__':main()
