import sys
import os

def lowercasePoFile(filename):
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

if len(sys.argv) > 1:
    lowercasePoFile(sys.argv[1])
else:
    for filename in filter(lambda f: 'po' in f, os.listdir('.')):
        lowercasePoFile(filename)
