frappe.ui.form.on("Stock Reconciliation", {
    refresh(frm) {
        if (frm.doc.docstatus !== 1) return;
        frm.add_custom_button(__("Print Selected Labels"), async () => {
            const serials = [];
            (frm.doc.items || []).forEach(row => {
                if (row.serial_no) serials.push(...String(row.serial_no).split(/[,\n]/).map(s => s.trim()).filter(Boolean));
            });
            if (!serials.length) return frappe.msgprint(__("No serial numbers are present in this reconciliation."));
            await label_printing.print_job(frm, [...new Set(serials)], {child_table:"items"});
        }, __("Labels"));
    }
});

frappe.ui.form.on("Stock Reconciliation Item", {
    form_render(frm, cdt, cdn) {
        const row = locals[cdt][cdn];
        const grid_row = frm.fields_dict.items.grid.grid_rows_by_docname[cdn];
        if (!grid_row || !row || !row.serial_no) return;
        if (grid_row.row.find(".label-print-row-action").length) return;
        const button = $(`<button type="button" class="btn btn-xs btn-default label-print-row-action" style="margin:4px 8px">${__("Print Labels")}</button>`);
        button.on("click", () => {
            const serials = String(row.serial_no).split(/[,\n]/).map(s => s.trim()).filter(Boolean);
            label_printing.print_job(frm, serials, {row, child_table:"items"});
        });
        grid_row.row.find(".grid-static-col:last").append(button);
    }
});
