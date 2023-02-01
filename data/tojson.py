import sys
import os.path as path
import re
from openpyxl import load_workbook
import json

def normalize(id_):
    for p in mapping:
        id_n = re.sub(*p, id_)
        if id_n != id_:
            yield id_n
            break

def attr(id_, is_intro):
    f = 0
    for p in flags:
        if is_intro and p[0] == 'intro' or re.match(p[0], id_):
            f |= p[1]
    return f

def subject(row):
    id_, name, credit, semester, _, info = row
    is_intro = re.search(r'専門導入科目', info) is not None
    is_fall_c = re.search(r'秋(?:A?B?C|学期)|春季休業中|通年', semester) is not None
    return (id_, [name, credit, int(is_fall_c), attr(id_, is_intro), *normalize(id_)])

src = path.join(path.dirname(__file__), sys.argv[1])
dest = path.join(path.dirname(path.dirname(__file__)), sys.argv[1] + '.json')

with open(path.join(src, 'template.json'), encoding='utf-8') as f:
    data = json.load(f)
mapping = data.pop('mapping')
flags = data.pop('flags')

wb = load_workbook(path.join(src, 'kdb.xlsx'), read_only=True)
try:
    data['subjects'] = dict(map(subject, wb['開設科目一覧'].values))
finally:
    wb.close()

with open(path.join(src, 'partitions.json'), encoding='utf-8') as f:
    data['partitions'] = json.load(f)

with open(dest, 'w', encoding='utf-8') as f:
    json.dump(data, f, ensure_ascii=False, separators=(',', ':'))
