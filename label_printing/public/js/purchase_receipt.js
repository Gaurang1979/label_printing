frappe.ui.form.on("Purchase Receipt", {
    refresh(frm) {
        if (frm.doc.docstatus !== 1) return;
        frm.add_custom_button(__("Print Selected Labels"), async () => {
            const rows = (frm.doc.items || []).filter(r => r.serial_and_batch_bundle);
            if (!rows.length) return frappe.msgprint(__("No Serial and Batch Bundle is available on this receipt."));
            const choices = [];
            for (const row of rows) {
                const serials = await label_printing.get_serials_from_bundle(frm, row);
                serials.forEach(serial => choices.push({serial, row_idx:row.idx, item_code:row.item_code}));
            }
            if (!choices.length) return frappe.msgprint(__("No serial numbers were found."));
            const d = new frappe.ui.Dialog({
                title:__("Select Labels to Print"), size:"large",
                fields:[{fieldname:"serials",fieldtype:"MultiCheck",label:__("Serial Numbers"),options:choices.map(x=>x.serial),columns:3}],
                primary_action_label:__("Print"),
                primary_action:async values=>{
                    const selected = new Set(values.serials || []);
                    const groups = {};
                    choices.forEach(x => { if (selected.has(x.serial)) (groups[x.row_idx] ||= []).push(x.serial); });
                    for (const row_idx of Object.keys(groups)) {
                        const row = frm.doc.items.find(r=>String(r.idx)===String(row_idx));
                        if (row) await label_printing.print_job(frm, groups[row_idx], {row,child_table:"items"});
                    }
                    d.hide();
                }
            });
            d.show();
        }, __("Labels"));
    }
});

frappe.ui.form.on("Purchase Receipt Item", {
    form_render(frm, cdt, cdn) {
        const row = locals[cdt][cdn];
        const grid_row = frm.fields_dict.items.grid.grid_rows_by_docname[cdn];
        if (!grid_row || !row) return;
        if (grid_row.row.find(".label-print-row-action").length) return;
        const button = $(`<button type="button" class="btn btn-xs btn-default label-print-row-action" style="margin:4px 8px">${__("Print Labels")}</button>`);
        button.on("click", () => label_printing.print_item_row(frm, row, "items"));
        grid_row.row.find(".grid-static-col:last").append(button);
    }
});
