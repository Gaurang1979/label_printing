frappe.ui.form.on("Purchase Receipt", {
    refresh(frm) {
        if (frm.doc.docstatus !== 1) return;

        frm.add_custom_button(__("Preview Label"), async () => {
            const row = (frm.doc.items || []).find(r => r.serial_and_batch_bundle);
            if (!row) return frappe.msgprint(__("No Serial and Batch Bundle is available on this receipt."));
            const serials = await label_printing.get_serials_from_bundle(frm, row);
            await label_printing.open_live_preview(frm, row, serials[0] || null);
        }, __("Labels"));

        frm.add_custom_button(__("Print Selected Labels"), async () => {
            const rows = (frm.doc.items || []).filter(r => r.serial_and_batch_bundle);
            if (!rows.length) return frappe.msgprint(__("No Serial and Batch Bundle is available on this receipt."));
            const choices = [];
            for (const row of rows) {
                const serials = await label_printing.get_serials_from_bundle(frm, row);
                serials.forEach(serial => choices.push({serial, row_idx:row.idx}));
            }
            if (!choices.length) return frappe.msgprint(__("No serial numbers were found."));
            const d = new frappe.ui.Dialog({
                title:__("Select Labels to Print"), size:"large",
                fields:[
                    {fieldname:"serials",fieldtype:"MultiCheck",label:__("Serial Numbers"),options:choices.map(x=>x.serial),columns:3},
                    {fieldname:"template_info",fieldtype:"HTML"}
                ],
                primary_action_label:__("Print"),
                primary_action:async values=>{
                    const selected = new Set(values.serials || []);
                    if (!selected.size) return frappe.msgprint(__("Select at least one serial number."));
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

        const grid = frm.fields_dict.items && frm.fields_dict.items.grid;
        if (grid && !grid.__label_print_bound) {
            grid.__label_print_bound = true;
            grid.wrapper.on("grid-row-render.label_printing", function(e, grid_row) {
                const row = grid_row && grid_row.doc;
                if (!row || !row.serial_and_batch_bundle || grid_row.row.find(".label-print-row-action").length) return;
                const actions = $(`<div class="label-print-row-actions" style="display:inline-flex;gap:4px;margin:4px"></div>`);
                const preview = $(`<button type="button" class="btn btn-xs btn-default label-preview-row-action">${__("Preview Label")}</button>`);
                const button = $(`<button type="button" class="btn btn-xs btn-default label-print-row-action">${__("Print Labels")}</button>`);
                preview.on("click", async () => {
                    const serials = await label_printing.get_serials_from_bundle(frm, row);
                    await label_printing.open_live_preview(frm, row, serials[0] || null);
                });
                button.on("click", () => label_printing.print_item_row(frm, row, "items"));
                actions.append(preview).append(button);
                grid_row.row.find(".grid-static-col:last").append(actions);
            });
        }
    }
});
