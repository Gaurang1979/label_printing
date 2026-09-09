app_name = "label_printing"
app_title = "Label Printing"
app_publisher = "Sundaram Technologies"
app_description = "ERPNext Zebra ZPL-II label printing"
app_email = ""
app_license = "GPL-3.0"
required_apps = ["frappe", "erpnext"]
app_include_js = ["/assets/label_printing/js/manage_printer.js", "/assets/label_printing/js/browser_print.js", "/assets/label_printing/js/label_printing.js", "/assets/label_printing/js/label_print_job.js"]
after_install = "label_printing.install.after_install"
after_migrate = ["label_printing.install.remove_printing_workspace_shortcuts"]

doctype_js = {
    "Purchase Receipt": "public/js/purchase_receipt.js",
    "Stock Entry": "public/js/stock_entry.js",
    "Stock Reconciliation": "public/js/stock_reconciliation.js",
    "Serial No": "public/js/serial_no.js",
    "Label Print Job": "public/js/label_print_job.js",
    "Label Template": "public/js/label_template.js",
}

fixtures = []
permission_query_conditions = {}
scheduler_events = {"all": []}
