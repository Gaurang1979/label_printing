// Doctype-specific button wiring only. The actual execution logic
// (label_printing.execute_job_by_name / preview_pending) lives in the
// globally-loaded label_printing.js so it is also reachable from the
// generic Print Label buttons on every other DocType.
frappe.ui.form.on("Label Print Job", {
    refresh(frm) {
        if (frm.is_new()) return;
        if (frm.doc.docstatus === 1 && ["Queued", "Printing", "Paused"].includes(frm.doc.status)) {
            frm.add_custom_button(__("Print / Resume"), () => label_printing.execute_job_by_name(frm.doc.name, frm));
        }
        if (frm.doc.docstatus === 1) {
            frm.add_custom_button(__("Preview Pending"), () => label_printing.preview_pending(frm));
        }
    }
});
