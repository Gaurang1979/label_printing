import frappe
from frappe import _
from .zpl import label_start, label_end, text, datamatrix, qr, esc, mm_to_dots


@frappe.whitelist()
def resolve_printer(branch=None, warehouse=None):
    return frappe.call('label_printing.api.get_default_printer', branch=branch, warehouse=warehouse)


def _value(doc, fieldname):
    if not fieldname:
        return ''
    value = doc.get(fieldname)
    return '' if value is None else str(value)


def render_label(template, doc, serial_no=None, printer=None):
    printer_doc = frappe.get_doc('Manage Printer', printer) if printer else None
    dpi = int((printer_doc.dpi if printer_doc else 203) or 203)
    width = float((printer_doc.label_width if printer_doc else template.label_width) or template.label_width)
    height = float((printer_doc.label_height if printer_doc else template.label_height) or template.label_height)
    zpl = [label_start(width, height, dpi, printer_doc)]
    for obj in template.objects:
        value = _value(doc, obj.fieldname) if obj.fieldname else (obj.fixed_text or '')
        if obj.object_type == 'DataMatrix':
            value = serial_no or value
            zpl.append(datamatrix(obj.x, obj.y, value, mm_to_dots(obj.width, dpi), obj.rotation or '0', obj.datamatrix_scale or 5, dpi))
        elif obj.object_type == 'QR Code':
            value = serial_no or value
            zpl.append(qr(obj.x, obj.y, value, obj.width, obj.rotation or '0', obj.datamatrix_scale or 4, dpi))
        elif obj.object_type == 'Text':
            zpl.append(text(obj.x, obj.y, value, obj.font_size or 20, obj.font or '0', obj.rotation or '0', obj.alignment or 'L', dpi))
    zpl.append(label_end())
    return ''.join(zpl)


@frappe.whitelist()
def preview_label(source_doctype, source_name, template, serial_no=None, printer=None):
    doc = frappe.get_doc(source_doctype, source_name)
    template_doc = frappe.get_doc('Label Template', template)
    if template_doc.status != 'Active':
        frappe.throw(_('Only an Active template can be previewed.'))
    return {'zpl': render_label(template_doc, doc, serial_no, printer)}


@frappe.whitelist()
def create_print_job(source_doctype, source_name, template, printer, serials, reprint=False, reprint_reason=None):
    if isinstance(serials, str):
        serials = frappe.parse_json(serials)
    if not serials:
        frappe.throw(_('Select at least one serial number.'))
    if reprint and not reprint_reason:
        frappe.throw(_('Reprint reason is required.'))
    template_doc = frappe.get_doc('Label Template', template)
    if template_doc.status != 'Active':
        frappe.throw(_('Only an Active template can be printed.'))
    job = frappe.get_doc({'doctype': 'Label Print Job', 'source_doctype': source_doctype, 'source_name': source_name, 'template': template, 'template_version': template_doc.version, 'printer': printer, 'reprint': int(bool(reprint)), 'reprint_reason': reprint_reason})
    for serial in serials:
        job.append('items', {'serial_no': serial, 'status': 'Pending'})
    job.insert(ignore_permissions=True)
    return job.name
