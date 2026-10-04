# Assembles overlay.html from the source plus the brand's apple logo template.
s = open('overlay.src.html').read().replace('{{APPLE}}', open('../problem/_apple.tpl').read())
open('overlay.html', 'w').write(s); print('built overlay.html')
