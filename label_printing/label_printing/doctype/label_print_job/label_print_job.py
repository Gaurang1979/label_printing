import frappe
from frappe.model.document import Document


class LabelPrintJob(Document):
    def validate(self):
        self.total_labels = len(self.items or [])
        self.printed_labels = len([r for r in (self.items or []) if r.status == "Printed"])
        self.pending_labels = self.total_labels - self.printed_labels
        if self.template:
            self.template_version = frappe.db.get_value("Label Template", self.template, "version") or 1
        if self.reprint and not self.reprint_reason:
            frappe.throw("Reprint reason is required for a reprint job.")

    def on_submit(self):
        self.queue_pending_items()

    def queue_pending_items(self):
        for row in self.items or []:
            if not row.status:
                row.status = "Pending"
        self.status = "Queued"
        self.save(ignore_permissions=True)
