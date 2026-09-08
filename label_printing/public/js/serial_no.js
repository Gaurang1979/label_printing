frappe.ui.form.on('Serial No', {
    refresh(frm) {
        if (!frm.doc.name) return;
        frm.add_custom_button(__('Reprint Label'), () => {
            const d = new frappe.ui.Dialog({
                title: __('Reprint Serial Label'),
                fields: [{fieldname:'reason', fieldtype:'Data', label:__('Reason'), reqd:1}],
                primary_action_label: __('Create Reprint Job'),
                primary_action(values) {
                    frappe.call({
                        method: 'label_printing.print_api.find_reprint_source',
                        args: {serial_no: frm.doc.name},
                        callback(r) {
                            if (!r.message) return frappe.msgprint(__('No printable source document was found for this serial.'));
                            label_printing.print_job({doc: frm.doc, doctype: 'Serial No'}, [frm.doc.name], values.reason, r.message).then(() => d.hide());
                        }
                    });
                }
            });
            d.show();
        }, __('Labels'));
    }
});
