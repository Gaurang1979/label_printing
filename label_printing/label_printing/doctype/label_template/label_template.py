import frappe
from frappe.model.document import Document


class LabelTemplate(Document):
    def validate(self):
        if self.label_width_mm <= 0 or self.label_height_mm <= 0:
            frappe.throw("Label width and height must be greater than zero.")
        if not self.objects:
            frappe.throw("Add at least one label object before saving the template.")
        for row in self.objects:
            if row.x_mm < 0 or row.y_mm < 0:
                frappe.throw(f"Object {row.idx}: X/Y cannot be negative.")
            if row.width_mm and row.width_mm < 0 or row.height_mm and row.height_mm < 0:
                frappe.throw(f"Object {row.idx}: width/height cannot be negative.")
            if row.x_mm > self.label_width_mm or row.y_mm > self.label_height_mm:
                frappe.throw(f"Object {row.idx} is outside the label boundary.")

        if self.status == "Active":
            active = frappe.db.get_all(
                "Label Template",
                filters={
                    "source_doctype": self.source_doctype,
                    "status": "Active",
                    "name": ["!=", self.name],
                },
                pluck="name",
                limit=1,
            )
            if active:
                frappe.throw(f"Template {active[0]} is already active for {self.source_doctype}.")
