"""HTML/CSS label renderer for normal (non-Zebra) printers.

Mirrors zpl.py's object model exactly -- same Label Template Object
fields, same mm coordinate system, same field/fixed-text resolution
via print_api._value -- so a single Design tab layout produces both
the Zebra ZPL output and this PDF output. Barcodes/QR are rendered
server-side to PNG data URIs (python-barcode / qrcode) so the PDF
needs no client-side JS to print correctly via wkhtmltopdf.

DataMatrix, PDF417 and Aztec are Zebra-only for now -- see the
'not supported' throw below. Add a symbology library (e.g. treepoem,
which wraps Ghostscript's barcode.ps and covers all three) if you
need them here too.
"""
import base64
import io
import os

import frappe
from frappe import _
from frappe.utils import flt

BARCODE_TYPE_MAP = {
    'Code 128': 'code128',
    'GS1-128': 'code128',
    'Code 39': 'code39',
    'EAN-8': 'ean8',
    'EAN-13': 'ean13',
    'UPC-A': 'upca',
    'ITF': 'itf',
    'Codabar': 'codabar',
    # Not supported by python-barcode: Code 93, UPC-E, GS1 DataBar, MSI, Pharmacode
}

ROTATION_DEG = {'0': 0, 'N': 0, '90': 90, 'R': 90, '180': 180, 'I': 180, '270': 270, 'B': 270}


def _barcode_data_uri(value, barcode_type='Code 128', show_text=True):
    import barcode as barcode_lib
    from barcode.writer import ImageWriter

    key = BARCODE_TYPE_MAP.get(barcode_type)
    if not key:
        frappe.throw(_('{0} barcodes are not supported for PDF/normal-printer output yet (Zebra printing still supports them).').format(barcode_type))
    writer = ImageWriter()
    writer.set_options({'write_text': bool(show_text), 'quiet_zone': 1})
    buf = io.BytesIO()
    barcode_lib.get(key, str(value), writer=writer).write(buf)
    return 'data:image/png;base64,' + base64.b64encode(buf.getvalue()).decode()


def _qr_data_uri(value):
    import qrcode

    img = qrcode.make(str(value))
    buf = io.BytesIO()
    img.save(buf, format='PNG')
    return 'data:image/png;base64,' + base64.b64encode(buf.getvalue()).decode()


def _image_data_uri(image_url):
    if not image_url:
        return ''
    path = frappe.get_site_path(image_url.lstrip('/'))
    if not os.path.exists(path):
        return ''
    ext = (os.path.splitext(path)[1].lstrip('.') or 'png').lower()
    with open(path, 'rb') as f:
        return f'data:image/{ext};base64,' + base64.b64encode(f.read()).decode()


def render_label_html(template, parent, row=None, serial_no=None):
    """One <div class="lp-label"> sized in mm and absolutely positioned
    to match the Zebra output pixel-for-pixel (well, mm-for-mm)."""
    from .print_api import _value

    width, height = flt(template.label_width_mm), flt(template.label_height_mm)
    parts = [f'<div class="lp-label" style="position:relative;width:{width}mm;height:{height}mm;overflow:hidden;background:#fff">']

    for obj in sorted(template.objects, key=lambda x: x.z_index or 1):
        value = _value(parent, row, obj.fieldname) if obj.fieldname else (obj.fixed_text or '')
        if obj.object_type in ('DataMatrix', 'QR Code'):
            value = serial_no or value

        style = f'position:absolute;left:{flt(obj.x_mm)}mm;top:{flt(obj.y_mm)}mm;'
        deg = ROTATION_DEG.get(str(obj.rotation or '0'), 0)

        if obj.object_type == 'Text':
            style += f'font-family:sans-serif;font-size:{flt(obj.font_size or 28) / 4}pt;white-space:nowrap;text-align:{(obj.alignment or "Left").lower()};'
            if deg:
                style += f'transform:rotate({deg}deg);transform-origin:left top;'
            parts.append(f'<div style="{style}">{frappe.utils.escape_html(str(value))}</div>')

        elif obj.object_type == 'Barcode':
            uri = _barcode_data_uri(value, obj.barcode_type or 'Code 128', True)
            style += f'width:{flt(obj.width_mm or 30)}mm;height:{flt(obj.height_mm or 12)}mm;'
            parts.append(f'<img src="{uri}" style="{style}object-fit:fill">')

        elif obj.object_type == 'QR Code':
            uri = _qr_data_uri(value)
            side = flt(obj.width_mm or 10)
            style += f'width:{side}mm;height:{side}mm;'
            parts.append(f'<img src="{uri}" style="{style}">')

        elif obj.object_type == 'Image':
            uri = _image_data_uri(obj.image_url)
            if uri:
                style += f'width:{flt(obj.width_mm or 20)}mm;height:{flt(obj.height_mm or 20)}mm;object-fit:contain;'
                parts.append(f'<img src="{uri}" style="{style}">')

        elif obj.object_type == 'Line':
            style += f'width:{flt(obj.width_mm or 10)}mm;border-top:{max(flt(obj.font_size or 2) / 4, 0.5)}pt solid #000;'
            parts.append(f'<div style="{style}"></div>')

        elif obj.object_type == 'Rectangle':
            style += f'width:{flt(obj.width_mm or 10)}mm;height:{flt(obj.height_mm or 10)}mm;border:{max(flt(obj.font_size or 2) / 4, 0.5)}pt solid #000;box-sizing:border-box;'
            parts.append(f'<div style="{style}"></div>')

        else:
            frappe.throw(_('{0} is not supported for PDF/normal-printer output yet (Zebra printing still supports it).').format(obj.object_type))

    parts.append('</div>')
    return ''.join(parts)


def render_job_pdf(template, source, rows):
    """rows: list of Label Print Job Item rows (or anything with
    .child_row_idx / .serial_no). One PDF page per row, sized exactly to
    the template's label dimensions."""
    from frappe.utils.pdf import get_pdf

    pages = []
    for row in rows:
        child_row = None
        if template.source_child_table and row.child_row_idx:
            child_row = next(
                (r for r in (source.get(template.source_child_table) or []) if int(r.idx) == int(row.child_row_idx)),
                None,
            )
        pages.append(render_label_html(template, source, child_row, row.serial_no))

    width, height = flt(template.label_width_mm), flt(template.label_height_mm)
    html = f'''<html><head><meta charset="utf-8"><style>
        @page {{ size: {width}mm {height}mm; margin: 0; }}
        * {{ margin: 0; padding: 0; }}
        .lp-label {{ page-break-after: always; }}
        .lp-label:last-child {{ page-break-after: auto; }}
    </style></head><body>{"".join(pages)}</body></html>'''
    return get_pdf(html)
