import re,sys
src=open('midia_live.html',encoding='utf8').read()
css=open('midia-ai.css',encoding='utf8').read()
ai=open('midia-ai.js',encoding='utf8').read()
shim=open('apk-shim.js',encoding='utf8').read()
nat=open('apk-native.js',encoding='utf8').read()
assert src.count('<script>')==1 and src.count('</script>')==1
i=src.index('<script>'); j=src.index('</script>')+len('</script>')
tail_add=f'<style id="md-ai-css">{css}</style><script id="md-ai">{ai}</script>'
art=src[:j]+tail_add+src[j:]
apk=src[:i]+f'<script id="md-shim">{shim}</script>'+src[i:j]+tail_add+f'<script id="md-native">{nat}</script>'+src[j:]
# artifact: strip skeleton
b=art.index('<body>')+len('<body>'); e=art.rindex('</body></html>')
open('midia_artifact.html','w',encoding='utf8').write(art[b:e])
open('midia_full_test.html','w',encoding='utf8').write(art)
open('midia_apk_index.html','w',encoding='utf8').write(apk)
print(len(art),len(apk))
