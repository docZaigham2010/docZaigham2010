# Assembles overlay.html from the source plus the approved film styles and logo template.
s = open('overlay.src.html').read().replace('{{CSS}}', open('_base.css').read()).replace('{{APPLE}}', open('_apple.tpl').read())
open('overlay.html', 'w').write(s); print('built overlay.html')
