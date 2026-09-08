import frappe
from frappe import _


def _get_location_printer(branch):
    if not branch:
        return None
    return frappe.db.get_value("Manage Printer", {"branch": branch, "enabled": 1, "is_default_for_location": 1}, "name")


@frappe.whitelist()
def get_default_printer(branch=None, warehouse=None):
    if branch:
        return _get_location_printer(branch)
    if warehouse:
        branch = frappe.db.get_value("Warehouse", warehouse, "branch")
        return _get_location_printer(branch)
    return frappe.db.get_value("Manage Printer", {"enabled": 1, "is_default_for_location": 1}, "name")


@frappe.whitelist()
def get_printer(printer):
    if not printer:
        frappe.throw(_("Printer is required"))
    return frappe.get_doc("Manage Printer", printer).as_dict()


def _field_options(meta):
    return [{"value": f.fieldname, "label": f.label or f.fieldname, "fieldtype": f.fieldtype} for f in meta.fields if f.fieldname and f.fieldtype not in {"Section Break", "Column Break", "Tab Break", "HTML"}]


@frappe.whitelist()
def get_doctype_fields(doctype, child_table=None):
    if not doctype:
        return []
    meta = frappe.get_meta(doctype)
    fields = [{**f, "group": "Document"} for f in _field_options(meta)]
    if child_table:
        table_field = meta.get_field(child_table)
        if table_field and table_field.fieldtype == "Table":
            child_meta = frappe.get_meta(table_field.options)
            fields.extend({**f, "group": f"Child · {child_meta.name}"} for f in _field_options(child_meta))
    return fields


@frappe.whitelist()
def get_child_tables(doctype):
    """Return every Table field plus its actual child DocType. No user mapping is involved."""
    if not doctype:
        return []
    meta = frappe.get_meta(doctype)
    result = []
    for f in meta.fields:
        if f.fieldtype == "Table" and f.options:
            result.append({
                "value": f.fieldname,
                "label": f.label or f.fieldname,
                "options": f.options,
                "child_doctype": f.options,
                "display": f"{f.label or f.fieldname} ({f.options})",
            })
    return result


@frappe.whitelist()
def get_template_context(source_doctype, source_name, child_table=None, child_row_idx=None):
    doc = frappe.get_doc(source_doctype, source_name)
    result = {"parent": doc.as_dict()}
    if child_table and child_row_idx:
        row = next((r for r in (doc.get(child_table) or []) if int(r.idx) == int(child_row_idx)), None)
        if row:
            result["row"] = row.as_dict()
    return result
