frappe.ui.form.on('Label Print Job', {
    refresh(frm) {
        if (frm.is_new()) return;
        if (frm.doc.docstatus === 1 && ['Queued','Printing','Paused'].includes(frm.doc.status)) {
            frm.add_custom_button(__('Print / Resume'), () => label_printing.execute_job(frm));
        }
        if (frm.doc.docstatus === 1) {
            frm.add_custom_button(__('Preview Pending'), () => label_printing.preview_pending(frm));
        }
    }
});

label_printing.execute_job = async function(frm) {
    if (!label_printing.browser_print.available()) return;
    label_printing.browser_print.init(async () => {
        const rows = (frm.doc.items || []).filter(r => ['Pending','Failed','Paused'].includes(r.status));
        for (const row of rows) {
            try {
                await new Promise((resolve, reject) => frappe.call({method:'label_printing.print_api.get_label_zpl', args:{job:frm.doc.name, serial_no:row.serial_no}, callback:r=>r.message ? resolve(r.message) : reject(new Error('ZPL generation failed')), error:reject})).then(zpl => new Promise((resolve,reject)=>label_printing.browser_print.print(zpl,null,err=>err?reject(err):resolve())));
                await frappe.call({method:'label_printing.print_api.mark_printed', args:{job:frm.doc.name, serial_no:row.serial_no}});
                await frm.reload_doc();
            } catch (e) {
                await frappe.call({method:'label_printing.print_api.mark_failed', args:{job:frm.doc.name, serial_no:row.serial_no, error_message:String(e)}});
                await frm.reload_doc();
                frappe.msgprint(__('Printing stopped at serial {0}. Fix the printer and use Print / Resume.', [row.serial_no]));
                break;
            }
        }
    });
};

label_printing.preview_pending = async function(frm) {
    const row = (frm.doc.items || []).find(r => ['Pending','Failed','Paused'].includes(r.status));
    if (!row) return frappe.msgprint(__('There are no pending labels.'));
    const r = await frappe.call({method:'label_printing.print_api.get_label_zpl', args:{job:frm.doc.name, serial_no:row.serial_no}});
    const d = new frappe.ui.Dialog({title:__('ZPL Preview - {0}',[row.serial_no]), fields:[{fieldname:'zpl',fieldtype:'Code',options:'Text',read_only:1}], primary_action_label:__('Close'), primary_action(){d.hide();}});
    d.set_value('zpl', r.message || ''); d.show();
};
