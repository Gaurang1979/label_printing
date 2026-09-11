import os
import frappe
from frappe import _
from frappe.utils import flt
from .zpl import label_start, label_end, text, barcode, datamatrix, qr, pdf417, aztec, line, rectangle, graphic


def _value(parent, row, fieldname):
    if not fieldname:
        return ''
    if row and row.get(fieldname) is not None:
        return str(row.get(fieldname))
    value = parent.get(fieldname)
    return '' if value is None else str(value)


def _image_zpl(image_url, x, y, width_mm, height_mm, dpi):
    if not image_url:
        return ''
    try:
        from PIL import Image
        path = frappe.get_site_path(image_url.lstrip('/'))
        if not os.path.exists(path):
            return ''
        image = Image.open(path).convert('L')
        target_w = max(1, int(float(width_mm or 20) * dpi / 25.4))
        target_h = max(1, int(float(height_mm or 20) * dpi / 25.4))
        image.thumbnail((target_w, target_h), Image.Resampling.LANCZOS)
        canvas = Image.new('L', (target_w, target_h), 255)
        canvas.paste(image, ((target_w-image.width)//2, (target_h-image.height)//2))
        threshold = canvas.point(lambda p: 0 if p < 180 else 255)
        pixels = threshold.load(); bpr=(target_w+7)//8; raw=bytearray()
        for yy in range(target_h):
            for bx in range(bpr):
                value=0
                for bit in range(8):
                    xx=bx*8+bit
                    if xx<target_w and pixels[xx,yy]==0: value |= 1 << (7-bit)
                raw.append(value)
        return graphic(x,y,target_w,target_h,raw.hex().upper(),bpr,dpi)
    except Exception:
        frappe.log_error(frappe.get_traceback(),'Label image rendering failed')
        return ''


def render_label(template, parent, row=None, serial_no=None, printer=None):
    printer_doc=frappe.get_doc('Manage Printer',printer or template.printer); dpi=int(printer_doc.dpi or 203)
    zpl=[label_start(template.label_width_mm,template.label_height_mm,dpi,printer_doc)]
    for obj in sorted(template.objects,key=lambda x:x.z_index or 1):
        value=_value(parent,row,obj.fieldname) if obj.fieldname else (obj.fixed_text or '')
        if obj.object_type in ('DataMatrix','QR Code'): value=serial_no or value
        if obj.object_type=='DataMatrix': zpl.append(datamatrix(obj.x_mm,obj.y_mm,value,obj.width_mm or 10,obj.rotation or '0',obj.data_matrix_scale or 5,dpi))
        elif obj.object_type=='QR Code': zpl.append(qr(obj.x_mm,obj.y_mm,value,obj.width_mm or 10,obj.rotation or '0',obj.data_matrix_scale or 4,dpi))
        elif obj.object_type=='Barcode': zpl.append(barcode(obj.x_mm,obj.y_mm,value,obj.barcode_type or 'Code 128',obj.height_mm or 12,obj.rotation or '0',True,dpi))
        elif obj.object_type=='PDF417': zpl.append(pdf417(obj.x_mm,obj.y_mm,value,obj.width_mm or 10,obj.height_mm or 18,obj.rotation or '0',dpi))
        elif obj.object_type=='Aztec': zpl.append(aztec(obj.x_mm,obj.y_mm,value,obj.rotation or '0',obj.data_matrix_scale or 3,dpi))
        elif obj.object_type=='Image': zpl.append(_image_zpl(obj.image_url,obj.x_mm,obj.y_mm,obj.width_mm,obj.height_mm,dpi))
        elif obj.object_type=='Text': zpl.append(text(obj.x_mm,obj.y_mm,value,obj.font_size or 28,obj.font or '0',obj.rotation or '0',obj.alignment or 'Left',dpi))
        elif obj.object_type=='Line': zpl.append(line(obj.x_mm,obj.y_mm,obj.width_mm or 1,obj.height_mm or 0,obj.font_size or 2,dpi))
        elif obj.object_type=='Rectangle': zpl.append(rectangle(obj.x_mm,obj.y_mm,obj.width_mm or 1,obj.height_mm or 1,obj.font_size or 2,dpi))
    zpl.append(label_end()); return ''.join(zpl)


@frappe.whitelist()
def preview_label(source_doctype,source_name,template,serial_no=None,child_table=None,child_row_idx=None,printer=None):
    parent=frappe.get_doc(source_doctype,source_name); template_doc=frappe.get_doc('Label Template',template)
    if template_doc.status!='Active': frappe.throw(_('Only an Active template can be previewed.'))
    row=None
    if child_table and child_row_idx: row=next((r for r in (parent.get(child_table) or []) if int(r.idx)==int(child_row_idx)),None)
    return {'zpl':render_label(template_doc,parent,row,serial_no,printer or template_doc.printer)}


@frappe.whitelist()
def create_print_job(source_doctype,source_name,template,printer,serials,child_table=None,child_row_idx=None,reprint=False,reprint_reason=None):
    if isinstance(serials,str): serials=frappe.parse_json(serials)
    if not serials: frappe.throw(_('Select at least one serial number.'))
    if reprint and not reprint_reason: frappe.throw(_('Reprint reason is required.'))
    template_doc=frappe.get_doc('Label Template',template)
    if template_doc.status!='Active': frappe.throw(_('Only an Active template can be printed.'))
    max_width=flt(frappe.db.get_value('Manage Printer',printer,'maximum_print_width_mm') or 0)
    if max_width and flt(template_doc.label_width_mm)>max_width: frappe.throw(_('Label width exceeds printer maximum printable width.'))
    job=frappe.get_doc({'doctype':'Label Print Job','source_doctype':source_doctype,'source_name':source_name,'template':template,'template_version':template_doc.version,'printer':printer,'reprint':int(bool(reprint)),'reprint_reason':reprint_reason})
    for serial in serials: job.append('items',{'serial_no':serial,'status':'Pending','child_row_idx':child_row_idx or 0})
    job.insert(ignore_permissions=True); job.submit(); return job.name


@frappe.whitelist()
def get_label_zpl(job,serial_no):
    job_doc=frappe.get_doc('Label Print Job',job); row=next((r for r in job_doc.items if r.serial_no==serial_no),None)
    if not row: frappe.throw(_('Serial {0} is not part of this print job.').format(serial_no))
    template=frappe.get_doc('Label Template',job_doc.template); source=frappe.get_doc(job_doc.source_doctype,job_doc.source_name); child_row=None
    if template.source_child_table and row.child_row_idx: child_row=next((r for r in (source.get(template.source_child_table) or []) if int(r.idx)==int(row.child_row_idx)),None)
    return render_label(template,source,child_row,serial_no,job_doc.printer)


@frappe.whitelist()
def mark_printed(job,serial_no):
    job_doc=frappe.get_doc('Label Print Job',job); row=next((r for r in job_doc.items if r.serial_no==serial_no),None)
    if not row: frappe.throw(_('Serial {0} is not part of this print job.').format(serial_no))
    row.status='Printed'; row.attempts=(row.attempts or 0)+1; row.printed_on=frappe.utils.now_datetime(); row.error_message=''; job_doc.save(ignore_permissions=True)
    frappe.get_doc({'doctype':'Label Print Log','print_job':job,'source_doctype':job_doc.source_doctype,'source_name':job_doc.source_name,'serial_no':serial_no,'template':job_doc.template,'template_version':job_doc.template_version,'printer':job_doc.printer,'user':frappe.session.user,'printed_on':frappe.utils.now_datetime(),'is_reprint':job_doc.reprint,'reprint_reason':job_doc.reprint_reason}).insert(ignore_permissions=True); _refresh_job_status(job_doc); return True


@frappe.whitelist()
def mark_failed(job,serial_no,error_message=None):
    job_doc=frappe.get_doc('Label Print Job',job); row=next((r for r in job_doc.items if r.serial_no==serial_no),None)
    if not row: frappe.throw(_('Serial {0} is not part of this print job.').format(serial_no))
    row.status='Failed'; row.attempts=(row.attempts or 0)+1; row.error_message=error_message or _('Unknown printer error'); job_doc.status='Paused'; job_doc.save(ignore_permissions=True); return True


def _refresh_job_status(job_doc):
    printed=len([r for r in job_doc.items if r.status=='Printed']); pending=len([r for r in job_doc.items if r.status!='Printed']); job_doc.printed_labels=printed; job_doc.pending_labels=pending; job_doc.last_completed_serial=next((r.serial_no for r in reversed(job_doc.items) if r.status=='Printed'),''); job_doc.status='Completed' if pending==0 else 'Printing'; job_doc.db_update()


@frappe.whitelist()
def find_open_job(source_doctype, source_name, template):
    """An existing not-yet-completed Print Job for this exact document +
    template, if any, so the UI can offer to resume it instead of creating
    a duplicate job that would reprint already-completed labels."""
    return frappe.db.get_value(
        'Label Print Job',
        {
            'source_doctype': source_doctype,
            'source_name': source_name,
            'template': template,
            'docstatus': 1,
            'status': ['in', ['Queued', 'Printing', 'Paused']],
        },
        'name',
        order_by='creation desc',
    )


@frappe.whitelist()
def find_reprint_source(serial_no):
    rows=frappe.db.sql('''select source_doctype, source_name, template, template_version, printer from `tabLabel Print Log` where serial_no=%s order by printed_on desc limit 1''',serial_no,as_dict=True)
    return rows[0] if rows else None
