import json, re, base64, os, urllib.request, sys
SP='/private/tmp/claude-501/-Users-user-Documents-----seyeon/ce75b1d2-bdac-4f9d-895a-53aab06d82c4/scratchpad'
OUT='/Users/user/Documents/클로드/seyeon/assets/case/'
CASES={'case01':("https://seyeonchoi.work/LS%20Case%2001%20Trust.dc.html",'c1'),
       'case02':("https://seyeonchoi.work/LS%20Case%2002%20Adaptation.dc.html",'c4'),
       'case03':("https://seyeonchoi.work/LS%20Case%2003%20Memory.dc.html",'c2'),
       'case04':("https://seyeonchoi.work/LS%20Case%2004%20Legibility.dc.html",'c3')}
EXT={'video/mp4':'mp4','image/png':'png','image/jpeg':'jpg','image/webp':'webp','image/gif':'gif'}
index={}
for key,(url,slug) in CASES.items():
    cache=f'{SP}/{key}.page.html'
    if not os.path.exists(cache):
        urllib.request.urlretrieve(url, cache)
    page=open(cache,encoding='utf-8').read()
    man=json.loads(re.search(r'<script type="__bundler/manifest"[^>]*>\s*(.*?)\s*</script>', page, re.S).group(1))
    tpl=json.loads(re.search(r'<script type="__bundler/template">\s*(.*?)\s*</script>', page, re.S).group(1))
    vids=re.findall(r'<video[^>]*\ssrc="([0-9a-f-]{36})"', tpl)
    imgs=re.findall(r'<img[^>]*\ssrc="([0-9a-f-]{36})"', tpl)
    files={'v':[], 'i':[]}
    for kind, uuids in (('v',vids), ('i',imgs)):
        for n,u in enumerate(uuids,1):
            e=man.get(u)
            if not e: continue
            ext=EXT.get(e['mime'],'bin')
            name=f'{slug}-{kind}{n}.{ext}'
            data=base64.b64decode(e['data'])
            open(OUT+name,'wb').write(data)
            files[kind].append(f'assets/case/{name}')
    index[key]=files
    print(key, slug, 'videos', len(files['v']), 'images', len(files['i']))
json.dump(index, open(f'{SP}/vis/media.json','w'))
