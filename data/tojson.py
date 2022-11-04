import sys
import re
from openpyxl import load_workbook
import json

def subject(row):
    id_, name, credit, semester, _, info = row
    credit = float(credit)
    thisYear = re.search(r'秋(?:A?B?C|学期)|春季休業中|通年', semester) is None
    intro = re.search(r'専門導入科目', info) is not None
    return (id_, [name, credit, thisYear, intro])

wb = load_workbook(sys.argv[1], read_only=True)
ws = wb['開設科目一覧']
rows = dict(map(subject, ws.values))
wb.close()

with open(sys.argv[1].replace('.xlsx', '.json'), 'w') as f:
    json.dump(rows, f, ensure_ascii=False)
