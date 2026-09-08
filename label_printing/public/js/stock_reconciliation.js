frappe.ui.form.on('Stock Reconciliation', {
    refresh(frm) {
        if (frm.doc.docstatus !== 1) return;
        frm.add_custom_button(__('Print Labels'), () => {
            const serials = [];
            (frm.doc.items || []).forEach(row => {
                if (row.serial_no) serials.push(...String(row.serial_no).split(/[,\n]/).map(s => s.trim()).filter(Boolean));
            });
            if (!serials.length) return frappe.msgprint(__('No serial numbers are present in this reconciliation.'));
            label_printing.print_job(frm, [...new Set(serials)]);
        }, __('Labels'));
    }
});
