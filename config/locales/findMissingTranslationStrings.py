import re
import os
import subprocess

from collections import defaultdict


TRANSLATION_STRING = re.compile("i18n\.translate\([\'\"](.*?)[\'\"]\)")
TRANSLATION_KEY = re.compile('msgid "(.*)"')

languages_for_string = defaultdict(list)
supported_languages = set()

for filename in filter(lambda f: 'po' in f, os.listdir('.')):
    supported_languages.add(filename.split('.')[0])

    with open(filename) as f:
        lines = f.readlines()

    for l in filter(lambda l: l.startswith('msgid'), lines):
        languages_for_string[TRANSLATION_KEY.findall(l)[0]].append(filename.split('.')[0])


#lines = subprocess.check_output(['find', '../../app', '-type', 'f', '|', 'xargs', 'grep', '-i', 'i18n\.translate'])
lines = subprocess.check_output('find ../../app -type f | xargs grep -i i18n\.translate', shell=True)
for l in lines.split('\n'):
    for string_to_translate in TRANSLATION_STRING.findall(l):
        if not string_to_translate in languages_for_string:
            print '"' + string_to_translate + '" needs translation to:', ' '.join(supported_languages)
        else:
            untranslated_languages = supported_languages - set(languages_for_string[string_to_translate])
            if untranslated_languages:
                print '"' + string_to_translate + '" needs translation to:', ' '.join(untranslated_languages)
