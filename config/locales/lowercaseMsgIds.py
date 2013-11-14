import os

for filename in filter(lambda f: 'po' in f, os.listdir('.')):
    with open(filename) as f:
        lines = f.readlines()

    newlines = []

    for l in lines:
        if l.startswith('msgid'):
            newlines.append(l.lower())
        else:
            newlines.append(l)

    with open(filename, 'w') as f:
        f.writelines(newlines)
