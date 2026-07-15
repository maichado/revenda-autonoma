import pathlib
import sys

scripts = pathlib.Path(__file__).parent
for name in ("setup-pocketbase.ps1", "import-schema.ps1", "start-pocketbase.ps1"):
    p = scripts / name
    b = p.read_bytes()
    print(f"=== {name} ===")
    print("BOM:", b[:4])
    text = p.read_text(encoding="utf-8")
    for n, line in enumerate(text.splitlines(), 1):
        for j, c in enumerate(line):
            o = ord(c)
            if o in (0x201C, 0x201D, 0x2018, 0x2019):
                print(f"  SMART QUOTE line {n} col {j+1}: U+{o:04X}")
    # show non-ascii on line 55 for setup
    if name == "setup-pocketbase.ps1":
        lines = text.splitlines()
        if len(lines) >= 55:
            line55 = lines[54]
            print("Line 55 chars:", [(c, hex(ord(c))) for c in line55])
