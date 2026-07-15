import pathlib
p = pathlib.Path(__file__).parent / "setup-pocketbase.ps1"
text = p.read_text(encoding="utf-8")
for n, line in enumerate(text.splitlines(), 1):
    for j, c in enumerate(line, 1):
        o = ord(c)
        if o in (0x201C, 0x201D, 0x2018, 0x2019):
            print(f"line {n} col {j}: U+{o:04X} in {line!r}")
