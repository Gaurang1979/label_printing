frappe.ui.form.on("Manage Printer", {
    refresh(frm) {
        if (frm.is_new()) return;
        frm.add_custom_button(__("Discover Printers"), () => {
            if (!label_printing.browser_print.available()) return frappe.msgprint(__("Zebra Browser Print is not detected on this workstation."));
            label_printing.browser_print.discover(devices => {
                const options = (devices || []).map(d => `<b>${frappe.utils.escape_html(d.name || "Unknown")}</b> ${d.uid ? "(" + frappe.utils.escape_html(d.uid) + ")" : ""}`).join("<br>");
                frappe.msgprint({title:__("Browser Print Devices"),message:options || __("No Zebra printers found.")});
            });
        }, __("Diagnostics"));
        frm.add_custom_button(__("Configuration Check"), () => {
            frappe.call({method:"label_printing.api.get_printer",args:{printer:frm.doc.name},callback:r=>{
                if(r.message) frappe.msgprint({title:__("Printer Configuration"),message:`<pre>${frappe.utils.escape_html(JSON.stringify(r.message,null,2))}</pre>`});
            }});
        }, __("Diagnostics"));
    },
    printer_model(frm) {
        if (frm.doc.printer_model === "Zebra ZD230") {
            frm.set_value("manufacturer", "Zebra");
            frm.set_value("dpi", "203");
            frm.set_value("print_speed", "4");
            frm.set_value("darkness", 10);
            frm.set_value("print_method", "Direct Thermal");
            frm.set_value("connection_type", "Browser Print - USB");
            frm.set_value("codepage", "0");
        }
    },
    connection_type(frm) {
        const network = frm.doc.connection_type === "Browser Print - Network";
        frm.toggle_display("ip_address", network);
        frm.toggle_display("port", network);
        frm.toggle_display("browser_print_name", !network);
    }
});
