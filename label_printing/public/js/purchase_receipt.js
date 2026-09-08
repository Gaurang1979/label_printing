frappe.ui.form.on('Purchase Receipt', {
    refresh(frm) {
        if (frm.doc.docstatus !== 1) return;
        frm.add_custom_button(__('Print Labels'), async () => {
            const rows = (frm.doc.items || []).filter(r => r.serial_and_batch_bundle);
            if (!rows.length) return frappe.msgprint(__('No Serial and Batch Bundle is available on this receipt.'));
            const choices = [];
            for (const row of rows) {
                const serials = await label_printing.get_serials_from_bundle(frm, row);
                serials.forEach(s => choices.push({serial: s, item: row.item_code}));
            }
            if (!choices.length) return frappe.msgprint(__('No serial numbers were found.'));
            const d = new frappe.ui.Dialog({title: __('Select Serial Numbers'), fields: [{fieldname:'serials', fieldtype:'MultiCheck', label:__('Serial Numbers'), options: choices.map(x => x.serial), columns:2}], primary_action_label:__('Create Print Job'), primary_action(values){ label_printing.print_job(frm, values.serials || []).then(() => d.hide()); }});
            d.show();
        }, __('Labels'));
    }
});
