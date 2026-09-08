frappe.ui.form.on("Label Print Job", {
    refresh(frm) {
        if (frm.is_new()) return;
        if (frm.doc.docstatus === 1 && ["Queued","Printing","Paused"].includes(frm.doc.status)) {
            frm.add_custom_button(__("Print / Resume"), () => label_printing.execute_job(frm));
        }
        if (frm.doc.docstatus === 1) {
            frm.add_custom_button(__("Preview Pending"), () => label_printing.preview_pending(frm));
        }
    }
});

label_printing.execute_job = async function(frm) {
    return label_printing.execute_job_by_name(frm.doc.name, frm);
};

label_printing.execute_job_by_name = async function(job_name, frm=null) {
    if (!label_printing.browser_print.available()) {
        return frappe.msgprint(__("Zebra Browser Print is not detected. Install/start it on this workstation."));
    }
    const job = await frappe.call({method:"frappe.client.get", args:{doctype:"Label Print Job", name:job_name}}).then(r=>r.message);
    if (!job) return;
    const printer = await frappe.call({method:"label_printing.api.get_printer", args:{printer:job.printer}}).then(r=>r.message);
    label_printing.browser_print.init(async () => {
        const rows = (job.items || []).filter(r => ["Pending","Failed","Paused"].includes(r.status));
        for (const row of rows) {
            try {
                const zpl = await frappe.call({method:"label_printing.print_api.get_label_zpl", args:{job:job.name, serial_no:row.serial_no}}).then(r=>r.message);
                await new Promise((resolve,reject) => label_printing.browser_print.sendToConfiguredPrinter(printer.browser_print_name, zpl, err => err ? reject(err) : resolve()));
                await frappe.call({method:"label_printing.print_api.mark_printed", args:{job:job.name, serial_no:row.serial_no}});
            } catch (e) {
                await frappe.call({method:"label_printing.print_api.mark_failed", args:{job:job.name, serial_no:row.serial_no, error_message:String(e)}});
                frappe.msgprint(__("Printing stopped at serial {0}. Fix the printer and use Print / Resume.",[row.serial_no]));
                break;
            }
        }
        if (frm) await frm.reload_doc();
        else frappe.show_alert({message:__("Label print job processed"),indicator:"green"});
    });
};

label_printing.preview_pending = async function(frm) {
    const row = (frm.doc.items || []).find(r => ["Pending","Failed","Paused"].includes(r.status));
    if (!row) return frappe.msgprint(__("There are no pending labels."));
    const r = await frappe.call({method:"label_printing.print_api.get_label_zpl", args:{job:frm.doc.name, serial_no:row.serial_no}});
    const d = new frappe.ui.Dialog({title:__("ZPL Preview - {0}",[row.serial_no]), fields:[{fieldname:"zpl",fieldtype:"Code",options:"Text",read_only:1}], primary_action_label:__("Close"), primary_action(){d.hide();}});
    d.set_value("zpl", r.message || ""); d.show();
};
