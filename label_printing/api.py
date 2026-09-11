import frappe
from frappe import _


def _get_location_printer(branch=None, warehouse=None):
    """Resolve the enabled, default-for-location printer for a branch/warehouse.

    There is deliberately no per-user printer preference doctype (see README):
    the printer is decided purely by location, matching a shared workstation
    printer model rather than a personal one.
    """
    if branch:
        name = frappe.db.get_value('Manage Printer', {'branch': branch, 'enabled': 1, 'is_default_for_location': 1}, 'name')
        if name:
            return name
    if warehouse:
        name = frappe.db.get_value('Manage Printer', {'warehouse': warehouse, 'enabled': 1, 'is_default_for_location': 1}, 'name')
        if name:
            return name
    return frappe.db.get_value('Manage Printer', {'enabled': 1, 'is_default_for_location': 1}, 'name')


@frappe.whitelist()
def get_default_printer(branch=None, warehouse=None):
    return _get_location_printer(branch, warehouse)


@frappe.whitelist()
def get_printer(printer):
    if not printer:
        frappe.throw(_('Printer is required'))
    return frappe.get_doc('Manage Printer', printer).as_dict()


@frappe.whitelist()
def get_doctype_fields(doctype=None, child_doctype=None):
    """Return the selectable fields for a DocType. Accepts either `doctype`
    or `child_doctype` so both the Label Template form and the Label
    Designer page (which historically used different argument names) work
    against the same endpoint.
    """
    doctype = doctype or child_doctype
    if not doctype:
        return []
    meta = frappe.get_meta(doctype)
    return [
        {'value': f.fieldname, 'fieldname': f.fieldname, 'label': f.label or f.fieldname, 'fieldtype': f.fieldtype}
        for f in meta.fields
        if f.fieldname and f.fieldtype not in {'Section Break', 'Column Break', 'Tab Break', 'HTML'}
    ]


@frappe.whitelist()
def get_child_doctypes(parent_doctype):
    """Return only the actual child-table DocTypes used by the selected parent DocType."""
    if not parent_doctype:
        return []
    meta = frappe.get_meta(parent_doctype)
    result = []
    seen = set()
    for field in meta.fields:
        if field.fieldtype == 'Table' and field.options and field.options not in seen:
            seen.add(field.options)
            child_meta = frappe.get_meta(field.options)
            if child_meta.istable:
                result.append({
                    'value': field.options,
                    'label': field.options,
                    'fieldname': field.fieldname,
                    'child_doctype': field.options,
                    'display': f'{field.label or field.fieldname} ({field.options})',
                })
    return result


@frappe.whitelist()
def get_print_buttons(doctype):
    """Active Label Templates registered against this DocType, alphabetically
    by template name. Drives the generic 'Labels' button group on every
    form -- a DocType can have any number of active templates (e.g. one
    button for a shipping label, another for a serial-number label), each
    named by its own Print Button Label."""
    if not doctype:
        return []
    return frappe.db.get_all(
        "Label Template",
        filters={"source_doctype": doctype, "status": "Active"},
        fields=["name", "print_button_label", "source_child_doctype", "source_child_table", "printer"],
        order_by="template_name asc",
    )


@frappe.whitelist()
def get_reprint_candidates(source_doctype, source_name):
    """Distinct label identities (serial numbers / label keys) previously
    printed for this exact document, for the Reprint / Damaged Label
    dialog's autocomplete."""
    if not source_doctype or not source_name:
        return []
    return frappe.db.get_all(
        "Label Print Log",
        filters={"source_doctype": source_doctype, "source_name": source_name},
        pluck="serial_no",
        distinct=True,
        order_by="printed_on desc",
        limit=100,
    )


@frappe.whitelist()
def get_child_doctype_info(doctype):
    """Return parent table mappings and fields for a child DocType."""
    if not doctype:
        return {'parents': [], 'fields': []}
    meta = frappe.get_meta(doctype)
    parents = []
    for parent_name in frappe.get_all('DocType', filters={'istable': 0}, pluck='name'):
        try:
            parent_meta = frappe.get_meta(parent_name)
            for field in parent_meta.fields:
                if field.fieldtype == 'Table' and field.options == doctype:
                    parents.append({'parent': parent_name, 'fieldname': field.fieldname, 'label': field.label or field.fieldname})
        except Exception:
            continue
    return {
        'parents': parents,
        'fields': [
            {'value': f.fieldname, 'fieldname': f.fieldname, 'label': f.label or f.fieldname, 'fieldtype': f.fieldtype}
            for f in meta.fields
            if f.fieldname and f.fieldtype not in {'Section Break', 'Column Break', 'Tab Break', 'HTML'}
        ],
    }

