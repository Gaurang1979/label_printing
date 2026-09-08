import frappe
from frappe.model.document import Document


class LabelTemplate(Document):
    def validate(self):
        if not self.printer:
            frappe.throw("Select a printer for this template.")

        printer = frappe.get_doc("Manage Printer", self.printer)
        if not printer.enabled:
            frappe.throw("The selected printer is disabled.")

        self.label_width_mm = printer.label_width_mm
        self.label_height_mm = printer.label_height_mm

        if self.label_width_mm <= 0 or self.label_height_mm <= 0:
            frappe.throw("Configure a valid label size in Manage Printer first.")
        if not self.objects:
            frappe.throw("Add at least one label object before saving the template.")

        child_fields = set()
        if self.source_child_table:
            meta = frappe.get_meta(self.source_doctype)
            table_field = meta.get_field(self.source_child_table)
            if not table_field or table_field.fieldtype != "Table":
                frappe.throw("Item / Child Table must be a Table field in the selected ERPNext DocType.")
            child_meta = frappe.get_meta(table_field.options)
            child_fields = {f.fieldname for f in child_meta.fields if f.fieldname}

        parent_fields = {f.fieldname for f in frappe.get_meta(self.source_doctype).fields if f.fieldname}

        for row in self.objects:
            if row.x_mm < 0 or row.y_mm < 0:
                frappe.throw(f"Object {row.idx}: X/Y cannot be negative.")
            if row.width_mm < 0 or row.height_mm < 0:
                frappe.throw(f"Object {row.idx}: width/height cannot be negative.")
            if row.x_mm + (row.width_mm or 0) > self.label_width_mm:
                frappe.throw(f"Object {row.idx} exceeds label width.")
            if row.y_mm + (row.height_mm or 0) > self.label_height_mm:
                frappe.throw(f"Object {row.idx} exceeds label height.")
            if row.object_type in ("Text", "DataMatrix", "QR Code") and not row.fieldname and not row.fixed_text:
                frappe.throw(f"Object {row.idx}: select an ERPNext field or enter fixed text.")
            if row.fieldname and row.fieldname not in parent_fields and row.fieldname not in child_fields:
                frappe.throw(f"Object {row.idx}: field '{row.fieldname}' is not available in the selected DocType.")

        if self.status == "Active":
            active = frappe.db.get_all(
                "Label Template",
                filters={"source_doctype": self.source_doctype, "status": "Active", "name": ["!=", self.name]},
                pluck="name",
                limit=1,
            )
            if active:
                frappe.throw(f"Template {active[0]} is already active for {self.source_doctype}.")
