"""Small, dependency-free ZPL-II builder for Zebra Browser Print."""


def esc(value):
    value = "" if value is None else str(value)
    return value.replace("^", " ").replace("~", " ")


def mm_to_dots(mm, dpi=203):
    return round(float(mm or 0) * float(dpi) / 25.4)


def text(x, y, value, font="0", height=30, width=30, rotation="N"):
    return f"^FO{x},{y}^A{font}{rotation},{height},{width}^FD{esc(value)}^FS"


def datamatrix(x, y, value, scale=5):
    # ZPL Data Matrix command. Data is sent as native printer command, not a bitmap.
    return f"^FO{x},{y}^BXN,{int(scale)},200^FD{esc(value)}^FS"


def qr(x, y, value, magnification=5):
    return f"^FO{x},{y}^BQN,2,{int(magnification)}^FDLA,{esc(value)}^FS"


def label_start(width_dots, height_dots, darkness=None, speed=None, home_x=0, home_y=0):
    commands = ["^XA", f"^PW{int(width_dots)}", f"^LL{int(height_dots)}", f"^LH{int(home_x)},{int(home_y)}"]
    if darkness is not None:
        commands.append(f"^MD{int(darkness)}")
    if speed is not None:
        commands.append(f"^PR{int(speed)}")
    return "".join(commands)


def label_end(copies=1):
    return f"^PQ{max(1, int(copies))}^XZ"
