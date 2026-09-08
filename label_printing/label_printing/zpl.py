"""Dependency-light ZPL-II helpers for Zebra printers."""


def esc(value):
    value = "" if value is None else str(value)
    return value.replace("^", " ").replace("~", " ")


def mm_to_dots(mm, dpi=203):
    return round(float(mm or 0) * float(dpi) / 25.4)


def text(x, y, value, height=28, font="0", rotation="0", alignment="Left", dpi=203):
    rotation = {"N":"N","0":"N","R":"R","90":"R","I":"I","180":"I","B":"B","270":"B"}.get(str(rotation), "N")
    h=max(8,int(height));w=h
    return f"^FO{mm_to_dots(x,dpi)},{mm_to_dots(y,dpi)}^A{font}{rotation},{h},{w}^FD{esc(value)}^FS"


def datamatrix(x,y,value,width=10,rotation="0",scale=5,dpi=203):
    rotation={"N":"N","0":"N","R":"R","90":"R","I":"I","180":"I","B":"B","270":"B"}.get(str(rotation),"N")
    return f"^FO{mm_to_dots(x,dpi)},{mm_to_dots(y,dpi)}^BX{rotation},{max(1,int(scale))},200^FD{esc(value)}^FS"


def qr(x,y,value,width=10,rotation="0",magnification=4,dpi=203):
    rotation={"N":"N","0":"N","R":"R","90":"R","I":"I","180":"I","B":"B","270":"B"}.get(str(rotation),"N")
    return f"^FO{mm_to_dots(x,dpi)},{mm_to_dots(y,dpi)}^BQN,{rotation},{max(1,int(magnification))}^FDLA,{esc(value)}^FS"


def barcode(x,y,value,barcode_type="Code 128",height=12,rotation="0",show_text=True,dpi=203):
    r={"N":"N","0":"N","R":"R","90":"R","I":"I","180":"I","B":"B","270":"B"}.get(str(rotation),"N")
    h=max(20,mm_to_dots(height,dpi))
    commands={
      "Code 128":f"^BC{r},{h},{'Y' if show_text else 'N'},N,N",
      "Code 39":f"^B3{r},N,{h},{'Y' if show_text else 'N'},N",
      "Code 93":f"^BA{r},{h},{'Y' if show_text else 'N'},N,N",
      "EAN-8":f"^B8{r},{h},{'Y' if show_text else 'N'},N,N",
      "EAN-13":f"^BE{r},{h},{'Y' if show_text else 'N'},N",
      "UPC-A":f"^BU{r},{h},{'Y' if show_text else 'N'},N",
      "UPC-E":f"^B9{r},{h},{'Y' if show_text else 'N'},N",
      "Codabar":f"^BK{r},N,{h},{'Y' if show_text else 'N'},N",
      "GS1-128":f"^BC{r},{h},{'Y' if show_text else 'N'},N,N",
      "GS1 DataBar":f"^BR{r},{h},{'Y' if show_text else 'N'},N,N"
    }
    command=commands.get(barcode_type,commands["Code 128"])
    return f"^FO{mm_to_dots(x,dpi)},{mm_to_dots(y,dpi)}{command}^FD{esc(value)}^FS"


def pdf417(x,y,value,width=10,height=18,rotation="0",dpi=203):
    r={"0":"N","90":"R","180":"I","270":"B"}.get(str(rotation),"N")
    return f"^FO{mm_to_dots(x,dpi)},{mm_to_dots(y,dpi)}^B7{r},{mm_to_dots(height,dpi)},10,5,2^FD{esc(value)}^FS"


def aztec(x,y,value,rotation="0",magnification=3,dpi=203):
    r={"0":"N","90":"R","180":"I","270":"B"}.get(str(rotation),"N")
    return f"^FO{mm_to_dots(x,dpi)},{mm_to_dots(y,dpi)}^B0{r},{max(1,int(magnification))}^FD{esc(value)}^FS"


def line(x,y,width,height=0,thickness=2,dpi=203):
    return f"^FO{mm_to_dots(x,dpi)},{mm_to_dots(y,dpi)}^GB{mm_to_dots(width,dpi)},{mm_to_dots(height,dpi)},{max(1,int(thickness))}^FS"


def rectangle(x,y,width,height,thickness=2,dpi=203):
    return line(x,y,width,height,thickness,dpi)


def graphic(x,y,width_px,height_px,data_hex,bytes_per_row,dpi=203):
    total=bytes_per_row*height_px
    return f"^FO{mm_to_dots(x,dpi)},{mm_to_dots(y,dpi)}^GFA,{total},{total},{bytes_per_row},{data_hex}^FS"


def label_start(width_mm,height_mm,dpi=203,printer=None):
    commands=["^XA",f"^PW{mm_to_dots(width_mm,dpi)}",f"^LL{mm_to_dots(height_mm,dpi)}"]
    if printer:
        commands.append(f"^LH{int(printer.label_home_x or 0)},{int(printer.label_home_y or 0)}")
        if printer.darkness is not None: commands.append(f"^MD{int(printer.darkness)}")
        if printer.print_speed: commands.append(f"^PR{int(printer.print_speed)}")
        if printer.tear_offset: commands.append(f"~TA{int(printer.tear_offset)}")
        if printer.horizontal_offset: commands.append(f"^LS{int(printer.horizontal_offset)}")
        if printer.vertical_offset: commands.append(f"^LT{int(printer.vertical_offset)}")
        if printer.codepage: commands.append(f"^CI{esc(printer.codepage)}")
    return "".join(commands)


def label_end(copies=1):
    return f"^PQ{max(1,int(copies))}^XZ"
