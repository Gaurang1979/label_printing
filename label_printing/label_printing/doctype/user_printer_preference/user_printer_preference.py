import frappe
from frappe.model.document import Document


class UserPrinterPreference(Document):
    def validate(self):
        if self.user and self.branch and self.default_printer:
            printer = frappe.db.get_value(
                "Manage Printer",
                self.default_printer,
                ["branch", "enabled"],
                as_dict=True,
            )
            if not printer or not printer.enabled:
                frappe.throw("Selected printer is not enabled.")
            if printer.branch != self.branch:
                frappe.throw("Default printer must belong to the selected location/branch.")
