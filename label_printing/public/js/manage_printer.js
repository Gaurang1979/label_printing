frappe.ui.form.on('Manage Printer', {
    refresh(frm) {
        if (frm.is_new()) return;
        frm.add_custom_button(__('Discover Printers'), () => {
            label_printing.browser_print.discover(devices => {
                const rows = (devices || []).map(d => `<tr><td>${frappe.utils.escape_html(d.name || '')}</td><td>${frappe.utils.escape_html(d.connection || '')}</td><td>${frappe.utils.escape_html(d.uid || '')}</td></tr>`).join('');
                frappe.msgprint({title:__('Zebra Printers'),message:`<table class="table"><tr><th>Name</th><th>Connection</th><th>UID</th></tr>${rows || '<tr><td colspan="3">No printer detected</td></tr>'}</table>`});
            });
        }, __('Diagnostics'));
        frm.add_custom_button(__('Test Print'), () => {
            const zpl = '^XA^FO40,40^A0N,35,35^FDERPNext Label Printing^FS^FO40,90^A0N,25,25^FDZebra Browser Print Test^FS^XZ';
            label_printing.browser_print.init(device => label_printing.browser_print.print(zpl, device, err => err ? frappe.msgprint(String(err)) : frappe.show_alert({message:__('Test label sent'),indicator:'green'})));
        }, __('Diagnostics'));
        frm.add_custom_button(__('Feed'), () => {
            label_printing.browser_print.init(device => label_printing.browser_print.print('^XA^FO0,0^FDFEED^FS^XZ', device, err => err && frappe.msgprint(String(err))));
        }, __('Diagnostics'));
        frm.add_custom_button(__('Printer Settings Check'), () => {
            frappe.call({method:'label_printing.api.get_printer',args:{printer:frm.doc.name},callback:r=>r.message&&frappe.msgprint({title:__('Printer Configuration'),message:`<pre>${frappe.utils.escape_html(JSON.stringify(r.message,null,2))}</pre>`})});
        }, __('Diagnostics'));
    }
});
