import frappe
from frappe import _
from .zpl import label_start, label_end, text, datamatrix, qr, line, rectangle


def _value(doc, fieldname):
    if not fieldname: return ''
    value = doc.get(fieldname)
    return '' if value is None else str(value)


def render_label(template, doc, serial_no=None, printer=None):
    printer_doc = frappe.get_doc('Manage Printer', printer) if printer else None
    dpi = int((printer_doc.dpi if printer_doc else 203) or 203)
    width = float((printer_doc.label_width if printer_doc else template.label_width_mm) or template.label_width_mm)
    height = float((printer_doc.label_height if printer_doc else template.label_height_mm) or template.label_height_mm)
    zpl = [label_start(width, height, dpi, printer_doc)]
    for obj in template.objects:
        value = _value(doc, obj.fieldname) if obj.fieldname else (obj.fixed_text or '')
        if obj.object_type == 'DataMatrix': zpl.append(datamatrix(obj.x,obj.y,serial_no or value,obj.width or 10,obj.rotation or '0',obj.datamatrix_scale or 5,dpi))
        elif obj.object_type == 'QR Code': zpl.append(qr(obj.x,obj.y,serial_no or value,obj.width or 10,obj.rotation or '0',obj.datamatrix_scale or 4,dpi))
        elif obj.object_type == 'Text': zpl.append(text(obj.x,obj.y,value,obj.font_size or 20,obj.font or '0',obj.rotation or '0',obj.alignment or 'L',dpi))
        elif obj.object_type == 'Line': zpl.append(line(obj.x,obj.y,obj.width or 1,obj.height or 0,obj.font_size or 2,dpi))
        elif obj.object_type == 'Rectangle': zpl.append(rectangle(obj.x,obj.y,obj.width or 1,obj.height or 1,obj.font_size or 2,dpi))
    zpl.append(label_end())
    return ''.join(zpl)


@frappe.whitelist()
def preview_label(source_doctype, source_name, template, serial_no=None, printer=None):
    doc=frappe.get_doc(source_doctype,source_name); template_doc=frappe.get_doc('Label Template',template)
    if template_doc.status != 'Active': frappe.throw(_('Only an Active template can be previewed.'))
    return {'zpl':render_label(template_doc,doc,serial_no,printer)}


@frappe.whitelist()
def create_print_job(source_doctype, source_name, template, printer, serials, reprint=False, reprint_reason=None):
    if isinstance(serials,str): serials=frappe.parse_json(serials)
    if not serials: frappe.throw(_('Select at least one serial number.'))
    if reprint and not reprint_reason: frappe.throw(_('Reprint reason is required.'))
    template_doc=frappe.get_doc('Label Template',template)
    if template_doc.status != 'Active': frappe.throw(_('Only an Active template can be printed.'))
    job=frappe.get_doc({'doctype':'Label Print Job','source_doctype':source_doctype,'source_name':source_name,'template':template,'template_version':template_doc.version,'printer':printer,'reprint':int(bool(reprint)),'reprint_reason':reprint_reason})
    for serial in serials: job.append('items',{'serial_no':serial,'status':'Pending'})
    job.insert(ignore_permissions=True); job.submit(); return job.name


@frappe.whitelist()
def get_label_zpl(job, serial_no):
    job_doc=frappe.get_doc('Label Print Job',job)
    if not any(r.serial_no==serial_no for r in job_doc.items): frappe.throw(_('Serial {0} is not part of this print job.').format(serial_no))
    return render_label(frappe.get_doc('Label Template',job_doc.template),frappe.get_doc(job_doc.source_doctype,job_doc.source_name),serial_no,job_doc.printer)


@frappe.whitelist()
def mark_printed(job, serial_no):
    job_doc=frappe.get_doc('Label Print Job',job); row=next((r for r in job_doc.items if r.serial_no==serial_no),None)
    if not row: frappe.throw(_('Serial {0} is not part of this print job.').format(serial_no))
    now=frappe.utils.now_datetime(); row.status='Printed'; row.attempts=(row.attempts or 0)+1; row.printed_on=now; row.error_message=''
    job_doc.save(ignore_permissions=True)
    frappe.get_doc({'doctype':'Label Print Log','print_job':job,'source_doctype':job_doc.source_doctype,'source_name':job_doc.source_name,'serial_no':serial_no,'template':job_doc.template,'template_version':job_doc.template_version,'printer':job_doc.printer,'user':frappe.session.user,'printed_on':now,'is_reprint':job_doc.reprint,'reprint_reason':job_doc.reprint_reason}).insert(ignore_permissions=True)
    _refresh_job_status(job_doc); return True


@frappe.whitelist()
def mark_failed(job, serial_no, error_message=None):
    job_doc=frappe.get_doc('Label Print Job',job); row=next((r for r in job_doc.items if r.serial_no==serial_no),None)
    if not row: frappe.throw(_('Serial {0} is not part of this print job.').format(serial_no))
    row.status='Failed'; row.attempts=(row.attempts or 0)+1; row.error_message=error_message or _('Unknown printer error'); job_doc.status='Paused'; job_doc.save(ignore_permissions=True); return True


def _refresh_job_status(job_doc):
    printed=len([r for r in job_doc.items if r.status=='Printed']); pending=len(job_doc.items)-printed
    job_doc.printed_labels=printed; job_doc.pending_labels=pending; job_doc.last_completed_serial=next((r.serial_no for r in reversed(job_doc.items) if r.status=='Printed'),''); job_doc.status='Completed' if pending==0 else 'Printing'; job_doc.db_update()


@frappe.whitelist()
def find_reprint_source(serial_no):
    rows=frappe.db.sql('''select source_doctype,source_name,template,template_version,printer from `tabLabel Print Log` where serial_no=%s order by printed_on desc limit 1''',serial_no,as_dict=True)
    return rows[0] if rows else None


@frappe.whitelist()
def create_reprint_job(serial_no, reprint_reason):
    source=find_reprint_source(serial_no)
    if not source: frappe.throw(_('No previous print record exists for Serial No {0}.').format(serial_no))
    if not reprint_reason: frappe.throw(_('Reprint reason is required.'))
    return create_print_job(source['source_doctype'],source['source_name'],source['template'],source['printer'],[serial_no],True,reprint_reason)
