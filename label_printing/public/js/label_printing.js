frappe.provide("label_printing");

label_printing.get_default_printer = async function(frm, row=null) {
    const branch = (row && row.branch) || frm.doc.branch || frm.doc.company_branch || null;
    const warehouse = (row && (row.warehouse || row.set_warehouse || row.t_warehouse || row.s_warehouse)) || frm.doc.set_warehouse || null;
    return await new Promise(resolve => frappe.call({method:"label_printing.api.get_default_printer", args:{branch, warehouse}, callback:r=>resolve(r.message)}));
};

label_printing.print_job = async function(frm, serials, options={}) {
    if (!serials || !serials.length) return frappe.msgprint(__("Select at least one serial number."));
    const row = options.row || null;
    const source_doctype = options.source_doctype || frm.doctype;
    const source_name = options.source_name || frm.doc.name;
    const printer = options.printer || await label_printing.get_default_printer(frm, row);
    if (!printer) return frappe.throw(__("No default label printer is configured for this location."));

    const template = await new Promise(resolve => frappe.call({
        method:"frappe.client.get_list",
        args:{doctype:"Label Template", filters:{source_doctype, status:"Active", printer}, fields:["name"], limit_page_length:1},
        callback:r=>resolve((r.message||[])[0] && r.message[0].name)
    }));
    if (!template) return frappe.throw(__("No Active Label Template exists for {0} on printer {1}.",[source_doctype, printer]));

    return await new Promise(resolve => frappe.call({
        method:"label_printing.print_api.create_print_job",
        args:{source_doctype,source_name,template,printer,serials,child_table:options.child_table||null,child_row_idx:row ? row.idx : null,reprint:!!options.reprint,reprint_reason:options.reprint_reason||null},
        callback:r=>{
            if(r.message){
                frappe.show_alert({message:__("Print Job {0} created",[r.message]),indicator:"green"});
                resolve(r.message);
            }
        }
    }));
};

label_printing.get_serials_from_bundle = function(frm, row) {
    if (!row || !row.serial_and_batch_bundle) return Promise.resolve([]);
    return new Promise(resolve => frappe.call({method:"frappe.client.get",args:{doctype:"Serial and Batch Bundle",name:row.serial_and_batch_bundle},callback:r=>resolve((r.message && r.message.entries || []).filter(e=>e.serial_no).map(e=>e.serial_no))}));
};

label_printing.print_item_row = async function(frm, row, child_table) {
    const serials = await label_printing.get_serials_from_bundle(frm, row);
    if (!serials.length) return frappe.msgprint(__("No serial numbers were found for item row {0}.",[row.idx]));
    return label_printing.print_job(frm, serials, {row, child_table});
};
