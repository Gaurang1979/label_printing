frappe.provide('label_printing');

label_printing.print_job = async function(frm, serials, reprint_reason=null, source_override=null) {
    if (!serials || !serials.length) return frappe.msgprint(__('Select at least one serial number.'));
    const source_doctype = source_override ? source_override.source_doctype : frm.doctype;
    const source_name = source_override ? source_override.source_name : frm.doc.name;
    const branch = frm.doc.branch || frm.doc.company_branch || null;
    const printer = await new Promise(resolve => frappe.call({method:'label_printing.api.get_default_printer', args:{branch, warehouse:frm.doc.set_warehouse || null}, callback:r=>resolve(r.message)}));
    if (!printer) return frappe.throw(__('No default label printer is configured for this location.'));
    const template = await new Promise(resolve => frappe.call({method:'frappe.client.get_list', args:{doctype:'Label Template', filters:{source_doctype:source_doctype,status:'Active'}, fields:['name'], limit_page_length:1}, callback:r=>resolve((r.message||[])[0] && r.message[0].name)}));
    if (!template) return frappe.throw(__('No Active Label Template exists for {0}.',[source_doctype]));
    return new Promise(resolve => frappe.call({method:'label_printing.print_api.create_print_job', args:{source_doctype,source_name,template,printer,serials,reprint:!!reprint_reason,reprint_reason}, callback:r=>{if(r.message){frappe.show_alert({message:__('Print Job {0} created',[r.message]),indicator:'green'});resolve(r.message);}}}));
};

label_printing.get_serials_from_bundle = function(frm, row) {
    if (!row || !row.serial_and_batch_bundle) return Promise.resolve([]);
    return new Promise(resolve => frappe.call({method:'frappe.client.get',args:{doctype:'Serial and Batch Bundle',name:row.serial_and_batch_bundle},callback:r=>resolve((r.message && r.message.entries || []).filter(e=>e.serial_no).map(e=>e.serial_no))}));
};
