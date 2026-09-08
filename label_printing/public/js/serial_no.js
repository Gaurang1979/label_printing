frappe.ui.form.on('Serial No', {
    refresh(frm) {
        if (!frm.doc.name) return;
        frm.add_custom_button(__('Reprint Label'), () => {
            const d = new frappe.ui.Dialog({title:__('Reprint Serial Label'),fields:[{fieldname:'reason',fieldtype:'Data',label:__('Reason'),reqd:1}],primary_action_label:__('Create Reprint Job'),primary_action(values){
                frappe.call({method:'label_printing.print_api.create_reprint_job',args:{serial_no:frm.doc.name,reprint_reason:values.reason},callback:r=>{if(r.message){d.hide();frappe.show_alert({message:__('Reprint Job {0} created',[r.message]),indicator:'green'});}}});
            }}); d.show();
        }, __('Labels'));
    }
});
