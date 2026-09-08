frappe.ui.form.on("Stock Entry", {
    refresh(frm) {
        if (frm.doc.docstatus !== 1) return;
        frm.add_custom_button(__("Print Selected Labels"), async () => {
            const rows = (frm.doc.items || []).filter(r => r.serial_and_batch_bundle);
            if (!rows.length) return frappe.msgprint(__("No Serial and Batch Bundle is available."));
            const serials = [];
            for (const row of rows) serials.push(...await label_printing.get_serials_from_bundle(frm, row));
            if (!serials.length) return frappe.msgprint(__("No serial numbers were found."));
            await label_printing.print_job(frm, [...new Set(serials)], {row:rows[0], child_table:"items"});
        }, __("Labels"));
    }
});

frappe.ui.form.on("Stock Entry Detail", {
    form_render(frm, cdt, cdn) {
        const row = locals[cdt][cdn];
        const grid_row = frm.fields_dict.items.grid.grid_rows_by_docname[cdn];
        if (!grid_row || !row || !row.serial_and_batch_bundle) return;
        if (grid_row.row.find(".label-print-row-action").length) return;
        const button = $(`<button type="button" class="btn btn-xs btn-default label-print-row-action" style="margin:4px 8px">${__("Print Labels")}</button>`);
        button.on("click", () => label_printing.print_item_row(frm, row, "items"));
        grid_row.row.find(".grid-static-col:last").append(button);
    }
});
