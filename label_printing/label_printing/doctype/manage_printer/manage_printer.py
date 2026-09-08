import frappe
from frappe.model.document import Document


class ManagePrinter(Document):
    def validate(self):
        if self.enabled and self.is_default_for_location:
            existing = frappe.db.get_all(
                "Manage Printer",
                filters={
                    "branch": self.branch,
                    "is_default_for_location": 1,
                    "enabled": 1,
                    "name": ["!=", self.name],
                },
                pluck="name",
                limit=1,
            )
            if existing:
                frappe.throw(
                    f"Printer {existing[0]} is already the default printer for {self.branch}."
                )

        if self.connection_type == "Browser Print - Network" and not self.ip_address:
            frappe.throw("IP Address is required for Browser Print - Network.")
