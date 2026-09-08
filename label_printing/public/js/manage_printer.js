frappe.ui.form.on("Manage Printer", {
    refresh(frm) {
        if (frm.is_new()) return;
        frm.add_custom_button(__("Printer Settings Check"), () => {
            frappe.call({
                method: "label_printing.api.get_printer",
                args: { printer: frm.doc.name },
                callback(r) {
                    if (r.message) {
                        frappe.msgprint({
                            title: __("Printer Configuration"),
                            message: `<pre>${frappe.utils.escape_html(JSON.stringify(r.message, null, 2))}</pre>`,
                        });
                    }
                },
            });
        }, __("Diagnostics"));
    },
});
