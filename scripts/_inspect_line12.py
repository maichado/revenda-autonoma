import pathlib
p = pathlib.Path(__file__).parent / "setup-pocketbase.ps1"
line = p.read_text(encoding="utf-8").splitlines()[11]
for j, c in enumerate(line, 1):
    print(f"{j:3} {repr(c)} U+{ord(c):04X}")
