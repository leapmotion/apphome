from collections import defaultdict
import os, os.path


lines = []

msgs = defaultdict(set)

key = ''

for fname in filter(lambda name: name.endswith('.po'), os.listdir('.')):
    with open(fname) as f:
        lines += map(lambda l: l.strip(), f.readlines())

    for i, l in enumerate(lines):
        if 'msgid' in l:
            key = l.replace('msgid', '')
        if 'msgstr' in l:
            msgs[key].add(l.replace('msgstr', ''))

for en, others in msgs.iteritems():
    too_long = []

    for l in others:
        if float(len(l)) / len(en) > 1.5:
            too_long.append(l)

    if too_long:
        print en
        for l in too_long:
            print l

        print



