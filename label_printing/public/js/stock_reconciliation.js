frappe.ui.form.on("Stock Reconciliation", {
    refresh(frm) {
        if (frm.doc.docstatus !== 1) return;
        frm.add_custom_button(__("Print Selected Labels"), async () => {
            const serials = [];
            (frm.doc.items || []).forEach(row => { if (row.serial_no) serials.push(...String(row.serial_no).split(/[,\n]/).map(s => s.trim()).filter(Boolean)); });
            if (!serials.length) return frappe.msgprint(__("No serial numbers are present in this reconciliation."));
            await label_printing.print_job(frm, [...new Set(serials)], {child_table:"items"});
        }, __("Labels"));
        const grid = frm.fields_dict.items && frm.fields_dict.items.grid;
        if (grid && !grid.__label_print_bound) {
            grid.__label_print_bound = true;
            grid.wrapper.on("grid-row-render.label_printing", function(e, grid_row) {
                const row = grid_row && grid_row.doc;
                if (!row || !row.serial_no || grid_row.row.find(".label-print-row-action").length) return;
                const button = $(`<button type="button" class="btn btn-xs btn-default label-print-row-action" style="margin:4px">${__("Print Labels")}</button>`);
                button.on("click", () => {
                    const serials = String(row.serial_no).split(/[,\n]/).map(s => s.trim()).filter(Boolean);
                    label_printing.print_job(frm, serials, {row, child_table:"items"});
                });
                grid_row.row.find(".grid-static-col:last").append(button);
            });
        }
    }
});
