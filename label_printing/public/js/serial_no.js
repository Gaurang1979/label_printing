frappe.ui.form.on("Serial No", {
    refresh(frm) {
        if (!frm.doc.name) return;
        frm.add_custom_button(__("Reprint Label"), () => {
            const d = new frappe.ui.Dialog({
                title:__("Reprint Serial Label"),
                fields:[{fieldname:"reason",fieldtype:"Data",label:__("Reason"),reqd:1}],
                primary_action_label:__("Print"),
                primary_action:async values=>{
                    const source = await frappe.call({method:"label_printing.print_api.find_reprint_source",args:{serial_no:frm.doc.name}}).then(r=>r.message);
                    if (!source) return frappe.msgprint(__("No printable source document was found for this serial."));
                    await label_printing.print_job(frm,[frm.doc.name],{source_doctype:source.source_doctype,source_name:source.source_name,printer:source.printer,reprint:true,reprint_reason:values.reason});
                    d.hide();
                }
            });
            d.show();
        }, __("Labels"));
    }
});
