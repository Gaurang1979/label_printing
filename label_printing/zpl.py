"""Dependency-free ZPL-II builder for Zebra Browser Print."""

def esc(value):
    value = "" if value is None else str(value)
    return value.replace("^", " ").replace("~", " ")

def mm_to_dots(mm, dpi=203):
    return round(float(mm or 0) * float(dpi) / 25.4)

def _rot(rotation):
    return {"N":"N","0":"N","R":"R","90":"R","I":"I","180":"I","B":"B","270":"B"}.get(str(rotation),"N")

def text(x,y,value,height=30,font="0",rotation="0",alignment="L",dpi=203):
    h=max(8,int(height)); return f"^FO{mm_to_dots(x,dpi)},{mm_to_dots(y,dpi)}^A{font}{_rot(rotation)},{h},{h}^FD{esc(value)}^FS"

def datamatrix(x,y,value,width=10,rotation="0",scale=5,dpi=203):
    return f"^FO{mm_to_dots(x,dpi)},{mm_to_dots(y,dpi)}^BX{_rot(rotation)},{max(1,int(scale))},200^FD{esc(value)}^FS"

def qr(x,y,value,width=10,rotation="0",magnification=5,dpi=203):
    return f"^FO{mm_to_dots(x,dpi)},{mm_to_dots(y,dpi)}^BQN,{_rot(rotation)},2,{max(1,int(magnification))}^FDLA,{esc(value)}^FS"

def line(x,y,width,height=0,thickness=2,dpi=203):
    return f"^FO{mm_to_dots(x,dpi)},{mm_to_dots(y,dpi)}^GB{mm_to_dots(width,dpi)},{mm_to_dots(height,dpi)},{max(1,int(thickness))}^FS"

def rectangle(x,y,width,height,thickness=2,dpi=203):
    return line(x,y,width,height,thickness,dpi)

def label_start(width_mm,height_mm,dpi=203,printer=None):
    commands=["^XA",f"^PW{mm_to_dots(width_mm,dpi)}",f"^LL{mm_to_dots(height_mm,dpi)}"]
    if printer:
        commands.append(f"^LH{int(printer.label_home_x or 0)},{int(printer.label_home_y or 0)}")
        if printer.codepage: commands.append(f"^CI{esc(printer.codepage)}")
        if printer.darkness is not None: commands.append(f"^MD{int(printer.darkness)}")
        if printer.print_speed: commands.append(f"^PR{int(printer.print_speed)}")
        if printer.tear_offset: commands.append(f"^TA{int(printer.tear_offset)}")
        if printer.horizontal_offset: commands.append(f"^LS{int(printer.horizontal_offset)}")
        if printer.vertical_offset: commands.append(f"^LT{int(printer.vertical_offset)}")
        if printer.advanced_zpl: commands.append(str(printer.advanced_zpl))
    return "".join(commands)

def label_end(copies=1):
    return f"^PQ{max(1,int(copies))}^XZ"
