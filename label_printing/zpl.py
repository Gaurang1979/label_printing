"""Dependency-free ZPL-II builder for Zebra Browser Print."""


def esc(value):
    value = "" if value is None else str(value)
    return value.replace("^", " ").replace("~", " ")


def mm_to_dots(mm, dpi=203):
    return round(float(mm or 0) * float(dpi) / 25.4)


def text(x, y, value, height=30, font="0", rotation="0", alignment="L", dpi=203):
    rotation = {"N":"N", "0":"N", "R":"R", "90":"R", "I":"I", "180":"I", "B":"B", "270":"B"}.get(str(rotation), "N")
    h = max(8, int(height))
    w = h
    return f"^FO{mm_to_dots(x,dpi)},{mm_to_dots(y,dpi)}^A{font}{rotation},{h},{w}^FD{esc(value)}^FS"


def datamatrix(x, y, value, width=50, rotation="0", scale=5, dpi=203):
    rotation = {"N":"N", "0":"N", "R":"R", "90":"R", "I":"I", "180":"I", "B":"B", "270":"B"}.get(str(rotation), "N")
    return f"^FO{mm_to_dots(x,dpi)},{mm_to_dots(y,dpi)}^BX{rotation},{max(1,int(scale))},200^FD{esc(value)}^FS"


def qr(x, y, value, width=10, rotation="0", magnification=5, dpi=203):
    rotation = {"N":"N", "0":"N", "R":"R", "90":"R", "I":"I", "180":"I", "B":"B", "270":"B"}.get(str(rotation), "N")
    return f"^FO{mm_to_dots(x,dpi)},{mm_to_dots(y,dpi)}^BQN,{rotation},2,{max(1,int(magnification))}^FDLA,{esc(value)}^FS"


def line(x, y, width, height=0, thickness=2, dpi=203):
    return f"^FO{mm_to_dots(x,dpi)},{mm_to_dots(y,dpi)}^GB{mm_to_dots(width,dpi)},{mm_to_dots(height,dpi)},{max(1,int(thickness))}^FS"


def rectangle(x, y, width, height, thickness=2, dpi=203):
    return line(x, y, width, height, thickness, dpi)


def label_start(width_mm, height_mm, dpi=203, printer=None):
    width_dots = mm_to_dots(width_mm, dpi)
    height_dots = mm_to_dots(height_mm, dpi)
    commands = ["^XA", f"^PW{width_dots}", f"^LL{height_dots}"]
    if printer:
        commands.append(f"^LH{int(printer.label_home_x or 0)},{int(printer.label_home_y or 0)}")
        if printer.darkness is not None:
            commands.append(f"^MD{int(printer.darkness)}")
        if printer.speed:
            commands.append(f"^PR{int(printer.speed)}")
        if printer.tear_offset:
            commands.append(f"^TA{int(printer.tear_offset)}")
        if printer.label_left:
            commands.append(f"^LS{int(printer.label_left)}")
        if printer.label_top:
            commands.append(f"^LT{int(printer.label_top)}")
    return "".join(commands)


def label_end(copies=1):
    return f"^PQ{max(1, int(copies))}^XZ"
