app_name = "label_printing"
app_title = "Label Printing"
app_publisher = "Sundaram Technologies"
app_description = "ERPNext Zebra ZPL-II label printing"
app_email = ""
app_license = "GPL-3.0"
required_apps = ["frappe", "erpnext"]
app_include_js = ["/assets/label_printing/js/manage_printer.js", "/assets/label_printing/js/browser_print.js", "/assets/label_printing/js/label_printing.js", "/assets/label_printing/js/label_designer_core.js"]
after_install = "label_printing.install.after_install"
after_migrate = ["label_printing.install.remove_orphaned_designer_page", "label_printing.install.ensure_label_printing_workspace"]

doctype_js = {
    "Label Print Job": "public/js/label_print_job.js",
    "Label Template": "public/js/label_template.js",
}

doctype_list_js = {
    "Label Template": "public/js/label_printing_list.js",
    "Manage Printer": "public/js/label_printing_list.js",
    "Label Print Job": "public/js/label_printing_list.js",
    "Label Print Log": "public/js/label_printing_list.js",
}

fixtures = []
permission_query_conditions = {}
scheduler_events = {"all": []}
