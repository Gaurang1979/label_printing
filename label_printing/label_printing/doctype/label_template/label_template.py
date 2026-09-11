import json

import frappe
from frappe.model.document import Document


class LabelTemplate(Document):
    def validate(self):
        self._bump_version_if_layout_changed()

        if not self.printer:
            frappe.throw("Select a printer for this template.")

        printer = frappe.get_doc("Manage Printer", self.printer)
        if not printer.enabled:
            frappe.throw("The selected printer is disabled.")

        if not self.label_width_mm or not self.label_height_mm or self.label_width_mm <= 0 or self.label_height_mm <= 0:
            frappe.throw("Enter the physical Label Width and Label Height for this template.")
        if printer.maximum_print_width_mm and self.label_width_mm > printer.maximum_print_width_mm:
            frappe.throw(
                f"Label Width {self.label_width_mm} mm exceeds {printer.printer_name}'s maximum printable width of {printer.maximum_print_width_mm} mm."
            )
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
            if not self.print_button_label:
                frappe.throw("Enter a Print Button Label before activating this template.")
            clash = frappe.db.get_all(
                "Label Template",
                filters={
                    "source_doctype": self.source_doctype,
                    "status": "Active",
                    "print_button_label": self.print_button_label,
                    "name": ["!=", self.name],
                },
                pluck="name",
                limit=1,
            )
            if clash:
                frappe.throw(
                    f"Template {clash[0]} for {self.source_doctype} already uses the button label \"{self.print_button_label}\". "
                    "Multiple active templates are allowed per DocType, but each needs a distinct button label."
                )

    def _bump_version_if_layout_changed(self):
        """Increment Version whenever the physical layout changes, so a Label
        Print Job / Label Print Log always records exactly which version of
        the template produced a given label (needed to reprint a damaged
        label against the layout it actually used)."""
        if self.is_new():
            self.version = 1
            return
        before = self.get_doc_before_save()
        if not before:
            return
        if self._layout_signature(before) != self._layout_signature(self):
            self.version = frappe.utils.cint(before.version or 1) + 1

    @staticmethod
    def _layout_signature(doc):
        objects = [
            (
                o.object_type, o.fieldname, o.fixed_text, o.barcode_type,
                o.x_mm, o.y_mm, o.width_mm, o.height_mm, o.rotation,
                o.font_size, o.alignment, o.data_matrix_scale, o.image_url, o.z_index,
            )
            for o in (doc.objects or [])
        ]
        return json.dumps(
            [doc.label_width_mm, doc.label_height_mm, doc.orientation, doc.number_of_ups, objects],
            default=str,
        )
