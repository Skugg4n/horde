# Löser konfliktblock i todo.md: behåller båda sidor och numrerar om dubbla H-id från 600 och uppåt.
import re
p='todo.md'; s=open(p).read()
out=[];mode=None;o=[];t=[]
for l in s.split('\n'):
    if l.startswith('<<<<<<< '): mode='o';o=[];t=[];continue
    if l.startswith('=======') and mode=='o': mode='t';continue
    if l.startswith('>>>>>>> ') and mode=='t':
        seen=set(o); out+=o+[x for x in t if x not in seen]; mode=None; continue
    (o if mode=='o' else t if mode=='t' else out).append(l)
lines=out; seen=set(); used={m.group(1) for l in lines for m in [re.match(r'^- \[.\] H(\d+) ',l)] if m}; n=600
for i,l in enumerate(lines):
    m=re.match(r'^(- \[.\] )H(\d+)( .*)$',l)
    if not m: continue
    if m.group(2) in seen:
        while str(n) in used: n+=1
        lines[i]=f'{m.group(1)}H{n}{m.group(3)}'; used.add(str(n)); n+=1
    else: seen.add(m.group(2))
open(p,'w').write('\n'.join(lines))
