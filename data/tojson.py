import os.path as path
import re
from openpyxl import load_workbook
import json

dir_ = path.dirname(__file__)

patterns = [
    (r'FCA1961|FE11431', r'EB00001'),
    (r'FA01([12])[2-9A-E]1', r'FA01\g<1>11'),
    (r'FA01([3-8])[2-6CD]1', r'FA01\g<1>11'),
    (r'FCB1([23])[1-3]1', r'FCB1\g<1>01'),
    (r'FCB1([23])[56]1', r'FCB1\g<1>41'),
    (r'FCB1([23])[89]1', r'FCB1\g<1>71'),
    (r'FE112([7-9])1', r'FE111\g<1>1'),
    (r'GA182[23]2|FH604[7-9]4', r'GA18212'),
    (r'GA15([1-3])[2-4]1', r'GA15\g<1>11'),
    (r'GA14121', r'GA14111'),
    (r'HC30241', r'HC30141'),
    (r'HC21371', r'HC36191'),
    (r'HC21271', r'HC21071'),
    (r'21...[2468]', r'19'),
    (r'21...[3579]', r'20')
]

def normalize(id_):
    for p in patterns:
        id_n = re.sub(*p, id_)
        if id_n != id_:
            yield id_n
            break

subjects = {
    '0': ['全ての科目', 0, 1],
    '1': ['全ての科目(初修外国語・体育を除く)', 0, 2],
    '2': ['専門基礎科目・専門科目', 0, 4],
    '3': ['専門導入科目', 0, 8],
    '4': ['専門導入科目・看護学類が指定する科目', 0, 16],
    '5': ['医学類開設科目', 0, 32],
    '6': ['体育(春・秋)', 1, 128],
    '7': ['英語(春)', 2, 256],
    '8': ['英語(春・秋)', 4, 512],
    '9': ['情報', 4, 1024],
    '10': ['ファーストイヤーセミナー', 1, 0],
    '11': ['学問への誘い', 1, 0],
    '12': ['情報リテラシー(講義)', 1, 1024],
    '13': ['情報リテラシー(演習)', 1, 1024],
    '14': ['データサイエンス', 2, 1024],
    '15': ['English Reading Skills I', 1, 256 | 512],
    '16': ['English Presentation Skills I', 1, 256 | 512],
    '17': ['English Reading Skills II', 1, 256],
    '18': ['English Presentation Skills II', 1, 256],
    '19': ['基礎体育(春)', 0.5, 128],
    '20': ['基礎体育(秋)', 0.5, 128]
}

def subject(row):
    id_, name, credit, semester, _, info = row
    credit = float(credit)
    if int(credit) == credit:
        credit = int(credit)
    flags = 1 | 2
    if re.match(r'[A-Y].*', id_) is not None:
        flags |= 4
        if (re.search(r'専門導入科目', info) or re.match(r'FCA1961|FE11431', id_)) is not None:
            flags |= 8 | 16
        if re.match(r'HB(?:211[046-9]|212[03]|3113)1', id_) is not None:
            flags |= 16
        if re.match(r'AB6.*|C[CE].*|AC(?:50H[1267]|6[34]E4|63G[01]|64A[2-5]|65E[2-5]|65A[1-467])1', id_) is not None:
            flags |= 32
    elif re.match(r'(?:2|3[2-7]).*', id_) is not None:
        flags = 1
    if re.search(r'秋(?:A?B?C|学期)|春季休業中|通年', semester) is not None:
        flags |= 64
    return (id_, [name, credit, flags, *normalize(id_)])

wb = load_workbook(path.join(dir_, 'kdb.xlsx'), read_only=True)
try:
    ws = wb['開設科目一覧']
    subjects.update(map(subject, ws.values))
finally:
    wb.close()

common = list(range(10, 21))

with open(path.join(dir_, 'info.json'), encoding='utf-8') as f:
    data = json.load(f)

with open(path.join(dir_, 'table.json'), encoding='utf-8') as f:
    table = json.load(f)

data.update(subjects=subjects, common=common, table=table)

with open(path.join(dir_, 'data.json'), 'w', encoding='utf-8') as f:
    json.dump(data, f, ensure_ascii=False, separators=(',', ':'))
