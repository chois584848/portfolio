import json, re, os, html as ihtml
from html.parser import HTMLParser

SP='/private/tmp/claude-501/-Users-user-Documents-----seyeon/ce75b1d2-bdac-4f9d-895a-53aab06d82c4/scratchpad'
PROJ='/Users/user/Documents/클로드/seyeon/'
ORDER=[('case01','AUTOVIEW','assets/cover-1.webp','https://seyeonchoi.work/LS%20Case%2001%20Trust.dc.html'),
       ('case03','TEXT HUMANIZER','assets/cover-2.webp','https://seyeonchoi.work/LS%20Case%2003%20Memory.dc.html'),
       ('case04','CONTEXT GENERATOR','assets/cover-3.webp','https://seyeonchoi.work/LS%20Case%2004%20Legibility.dc.html'),
       ('case02','AI SUMMARIZER','assets/cover-4.webp','https://seyeonchoi.work/LS%20Case%2002%20Adaptation.dc.html')]
MEDIA=json.load(open(f'{SP}/vis/media.json'))
TEXT={'h1','h2','h3','h4','p','li','figcaption'}
VOID={'br','img','input','meta','link','hr','source','path','circle','rect','use','col'}

# what each measured box actually is, per case
PLAN={
 'case01':{7:'cite',8:'bars',9:'stats',10:'steps',11:'flow',12:'figure',13:'cta',17:'stats'},
 'case03':{7:'cite',13:'cta'},
 'case04':{7:'cite',9:'persona',10:'journey',11:'journey',12:'journey',13:'journey',
           14:'persona',15:'journey',16:'journey',17:'journey',18:'journey',19:'cta',25:'stats'},
 'case02':{7:'cite',8:'wire',9:'wire',10:'wire',11:'wire',12:'cta',16:'stats'},
}
FIGURE={'case01':'assets/case/c1-i1.png'}
TAGS={  # three categories per case, shown in the popup
 'AUTOVIEW':          (['AI','DESIGN TOOLING','PRODUCT DESIGN'], ['AI','디자인 툴링','프로덕트 디자인']),
 'TEXT HUMANIZER':    (['AI','WRITING','PRODUCT DESIGN'],        ['AI','글쓰기','프로덕트 디자인']),
 'CONTEXT GENERATOR': (['DEVELOPMENT','DESIGN TOOLING','FIGMA'], ['개발','디자인 툴링','피그마']),
 'AI SUMMARIZER':     (['AI','PRODUCTIVITY','PRODUCT DESIGN'],   ['AI','생산성','프로덕트 디자인']),
}

class Tree(HTMLParser):
    def __init__(s):
        super().__init__(convert_charrefs=True); s.root={'tag':'#root','attrs':{},'kids':[]}; s.stack=[s.root]
    def handle_starttag(s,t,a):
        n={'tag':t,'attrs':dict(a),'kids':[]}; s.stack[-1]['kids'].append(n)
        if t not in VOID: s.stack.append(n)
    def handle_startendtag(s,t,a): s.stack[-1]['kids'].append({'tag':t,'attrs':dict(a),'kids':[]})
    def handle_endtag(s,t):
        for i in range(len(s.stack)-1,0,-1):
            if s.stack[i]['tag']==t: del s.stack[i:]; return
    def handle_data(s,d): s.stack[-1]['kids'].append({'tag':'#text','attrs':{},'kids':[],'text':d})

def txt(n):
    if n['tag']=='#text': return n.get('text','')
    return ''.join(txt(k) for k in n['kids'])
def norm(t): return re.sub(r'\s+',' ',t).strip()
def has(n,tags): return any(k['tag'] in tags or has(k,tags) for k in n['kids'])
def styled(n):
    if re.search(r'background|border\s*:', n['attrs'].get('style','')): return True
    return any(styled(k) for k in n['kids'] if k['tag']!='#text')
WORD=re.compile(r'[A-Za-z0-9가-힣]')
def real(t): return bool(WORD.search(t))

def leaves(n,out):
    st=n['attrs'].get('style','')
    w=re.search(r'width:\s*(\d+(?:\.\d+)?)%', st)
    own=norm(''.join(k.get('text','') for k in n['kids'] if k['tag']=='#text'))
    if w and not own: out.append(('BAR', w.group(1)))
    if own: out.append((n['tag'], own))
    for k in n['kids']:
        if k['tag']!='#text': leaves(k,out)

def build_box(kind, ls, case):
    """turn a measured box into something this site can draw itself"""
    words=[(t,v) for t,v in ls if t!='BAR']
    bars=[v for t,v in ls if t=='BAR']
    if kind=='cite':
        v=[v for t,v in words if real(v)]
        return {'t':'cite','x':v[-1]} if v else None
    if kind=='bars':
        cap=words[0][1] if words and words[0][0]=='figcaption' else ''
        rest=[v for t,v in words[1:]]
        rows=[]
        bi=0
        for i in range(0,len(rest)-1,2):
            if bi<len(bars): rows.append([rest[i], float(bars[bi]), rest[i+1]]); bi+=1
        return {'t':'bars','cap':cap,'rows':rows}
    if kind=='stats':
        v=[x for _,x in words]
        return {'t':'stats','rows':[[v[i],v[i+1]] for i in range(0,len(v)-1,2)]}
    if kind=='steps':
        cap=words[0][1] if words[0][0]=='figcaption' else ''
        rest=[x for _,x in words[1:]]
        note=rest.pop() if rest and rest[-1].startswith(('↳','↺')) else ''
        rows=[rest[i:i+3] for i in range(0,len(rest)-2,3)]
        return {'t':'steps','cap':cap,'rows':rows,'note':note}
    if kind=='flow':
        cap=words[0][1] if words[0][0]=='figcaption' else ''
        rest=[x for _,x in words[1:] if x!='→']
        note=rest.pop() if rest and rest[-1].startswith(('↳','↺')) else ''
        rows=[rest[i:i+3] for i in range(0,len(rest)-2,3)]
        return {'t':'flow','cap':cap,'rows':rows,'note':note}
    if kind=='cta':
        v=[x for _,x in words if x!='▶']
        return {'t':'cta','x':v[0],'note':v[1] if len(v)>1 else ''}
    if kind=='persona':
        v=[x for _,x in words if real(x)]
        return {'t':'persona','x':v[0],'k':v[1] if len(v)>1 else ''}
    if kind=='journey':
        v=[x for _,x in words if real(x)]
        return {'t':'jitem','k':v[0],'h':v[1],'lines':v[2:]}
    if kind=='wire':
        cap=words[-1][1] if words and words[-1][0]=='figcaption' else ''
        tabs=[x for t,x in words if t=='span'][:4]
        chips=[x for t,x in words if t=='div' and x not in ('SOURCE','SUMMARY')]
        return {'t':'wire','cap':cap,'tabs':tabs,'chips':chips,
                'src':[float(b) for b in bars[4:8]][:4],'sum':[float(b) for b in bars[-8:]][:8]}
    if kind=='figure':
        cap=''
        for t,v in words:
            if t=='figcaption': cap=re.sub(r'\s*Click to enlarge\.?','',v)
        return {'t':'img','src':FIGURE[case],'cap':cap}
    return None

def build(case_key):
    page=open(f'{SP}/{case_key}.page.html',encoding='utf-8').read()
    tpl=json.loads(re.search(r'<script type="__bundler/template">\s*(.*?)\s*</script>', page, re.S).group(1))
    m=re.search(r'var KO = (\{.*?\});', tpl, re.S)
    ko=json.loads(m.group(1)) if m else {}
    body=re.sub(r'<(script|style)[^>]*>.*?</\1>','',tpl,flags=re.S|re.I)
    t=Tree(); t.feed(body)
    def find(n):
        if n['attrs'].get('id')=='casewrap': return n
        for k in n['kids']:
            r=find(k)
            if r: return r
        return None
    root=find(t.root) or t.root
    plan=PLAN[case_key]; vids=list(MEDIA[case_key]['v'])
    blocks=[]; idx=[0]
    def is_vis(n):
        if n['tag'] in ('figure','video','img'): return True
        if n['tag']!='div': return False
        if has(n,TEXT): return False
        return styled(n) and len(norm(txt(n)))<400
    def walk(n):
        for k in n['kids']:
            if k['tag']=='#text': continue
            if k['tag'] in TEXT:
                s=norm(txt(k))
                if s: blocks.append({'t':k['tag'],'x':s})
                continue
            if is_vis(k):
                i=idx[0]; idx[0]+=1
                if k['tag']=='video':
                    if vids: blocks.append({'t':'video','src':vids.pop(0)})
                    continue
                kind=plan.get(i)
                if not kind: continue
                ls=[]; leaves(k,ls)
                b=build_box(kind, ls, case_key)
                if b: blocks.append(b)
                continue
            if k['tag']=='a':
                s=norm(txt(k)); href=k['attrs'].get('href','')
                if s and href.startswith('http'): blocks.append({'t':'link','x':s,'href':href})
                continue
            if not any(x['tag']!='#text' for x in k['kids']):
                s=norm(txt(k))
                if s and len(s)<90 and re.search(r'[A-Za-z0-9가-힣]', s) and real(s):
                    blocks.append({'t':'label','x':s})
                continue
            walk(k)
    walk(root)
    # merge runs of journey items into one grid
    out=[]
    for b in blocks:
        if b['t']=='jitem' and out and out[-1]['t']=='journey':
            out[-1]['items'].append({'k':b['k'],'h':b['h'],'lines':b['lines']})
        elif b['t']=='jitem':
            out.append({'t':'journey','items':[{'k':b['k'],'h':b['h'],'lines':b['lines']}]})
        else: out.append(b)
    drop=re.compile(r'^(←\s*)?back to the system$|^ARTIFACT \d|^THE QUESTION$', re.I)
    return [b for b in out if 'x' not in b or not drop.match(b['x'])], ko

def tr_of(ko):
    def tr(t):
        v=ko.get(t)
        if not v: return t
        return norm(ihtml.unescape(re.sub(r'<[^>]+>','',v)))
    return tr

def conv(b, f):
    d=dict(b)
    for key in ('x','cap','note','k','h'):
        if key in d and isinstance(d[key],str): d[key]=f(d[key])
    if 'rows' in d:
        d['rows']=[[f(c) if isinstance(c,str) else c for c in r] for r in d['rows']]
    if 'items' in d:
        d['items']=[{'k':f(i['k']),'h':f(i['h']),'lines':[f(l) for l in i['lines']]} for i in d['items']]
    for key in ('tabs','chips'):
        if key in d: d[key]=[f(c) for c in d[key]]
    return d

out=[]
for key,title,cover,url in ORDER:
    blocks,ko=build(key); tr=tr_of(ko)
    q=next((b['x'] for b in blocks if b['t']=='h1'), title)
    meta=[]; body=[]; i=0
    while i<len(blocks):
        b=blocks[i]
        if b['t']=='label' and b.get('x') in ('ROLE','TEAM','TIMELINE','SURFACE','SCOPE','PLATFORM') \
           and i+1<len(blocks) and blocks[i+1]['t']=='label':
            meta.append([b['x'],blocks[i+1]['x']]); i+=2; continue
        if b['t']!='h1': body.append(b)
        i+=1
    ten,tkr = TAGS.get(title, ([], []))
    out.append({'title':title,'cover':cover,'url':url,
                'en':{'question':q,'meta':meta,'tags':ten,
                      'blocks':[conv(b,lambda t:t) for b in body]},
                'kr':{'question':tr(q),'meta':[[tr(a),tr(c)] for a,c in meta],'tags':tkr,
                      'blocks':[conv(b,tr) for b in body]}})
    kinds={}
    for b in body: kinds[b['t']]=kinds.get(b['t'],0)+1
    print(title, kinds)
json.dump(out, open(PROJ+'cases.json','w',encoding='utf-8'), ensure_ascii=False, separators=(',',':'))
print('written', os.path.getsize(PROJ+'cases.json')//1024,'KB')

# Run:  python3 _dev/gen_cases.py
# Pulls the four case studies from seyeonchoi.work and rewrites cases.json.
# Text and the boxed figures (bars / steps / stats / journeys / wireframes)
# come out as data, so this site draws them with its own components — nothing
# is screenshotted. Videos and bitmap images are extracted as real files into
# assets/case/ by the media step (see _dev/media.py).
