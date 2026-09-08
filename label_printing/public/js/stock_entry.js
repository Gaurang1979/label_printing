frappe.ui.form.on('Stock Entry', {
    refresh(frm) {
        if (frm.doc.docstatus !== 1) return;
        frm.add_custom_button(__('Print Labels'), async () => {
            const serials = [];
            for (const row of (frm.doc.items || [])) {
                if (!row.serial_and_batch_bundle) continue;
                serials.push(...await label_printing.get_serials_from_bundle(frm, row));
            }
            if (!serials.length) return frappe.msgprint(__('No serial numbers were found in Serial and Batch Bundles.'));
            label_printing.print_job(frm, [...new Set(serials)]);
        }, __('Labels'));
    }
});
